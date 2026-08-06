<?php

namespace AppApi\Auth;

use AppApi\Core\Sanitizer;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Gestion des REFRESH TOKENS : stockés en base (table dédiée, pas en JWT),
 * ce qui permet de les RÉVOQUER individuellement (logout, "se déconnecter de
 * tous les appareils", compromission détectée) — impossible avec un JWT pur
 * côté refresh token, d'où ce choix hybride (access = JWT stateless,
 * refresh = opaque + stateful).
 *
 * Le refresh token brut n'est JAMAIS stocké tel quel en base : on stocke son
 * hash (SHA-256), comme un mot de passe. Si la base fuite, les refresh
 * tokens ne sont pas directement réutilisables.
 *
 * SESSION TYPE "RÉSEAU SOCIAL" (fenêtre glissante) : contrairement à une
 * session bancaire à durée fixe, la session ici ne s'éteint QUE sur :
 *   1. une déconnexion explicite (POST /auth/logout),
 *   2. une inactivité prolongée au-delà de SLIDING_TTL_DAYS (voir plus bas),
 *   3. un changement de mot de passe ou une réutilisation de token détectée
 *      (signal de compromission).
 *
 * Le mécanisme : à CHAQUE refresh réussi, un nouveau token est émis avec une
 * expiration recalculée à partir de maintenant (voir rotate() -> issue()).
 * Tant que l'utilisateur revient sur l'app au moins une fois tous les
 * SLIDING_TTL_DAYS, la fenêtre glisse indéfiniment et il ne revoit jamais
 * l'écran de connexion — exactement le comportement d'Instagram, LinkedIn
 * ou Facebook, qui n'ont pas de case "se souvenir de moi" : on reste
 * connecté par défaut, jusqu'à déconnexion explicite.
 *
 * Compromis assumé : plus une session est longue, plus la fenêtre
 * d'exploitation d'un vol de refresh token (appareil volé/partagé) est
 * large. C'est atténué par trois filets de sécurité déjà en place et
 * INCHANGÉS par ce choix de durée :
 *   - la rotation à chaque refresh (un token volé et déjà utilisé par le
 *     propriétaire légitime déclenche la révocation de toute la famille,
 *     cf. rotate() ci-dessous) ;
 *   - la révocation de toutes les sessions au changement de mot de passe
 *     (AuthController::change_password / reset_password) ;
 *   - le cookie reste httpOnly + Secure ; SameSite=None si SPA cross-origin
 *     (sinon Lax/Strict via APP_COOKIE_SAMESITE), donc inatteignable XSS.
 *     CSRF atténué par path /auth + APP_ALLOWED_ORIGINS.
 * Si le produit a besoin d'un contrôle plus fin (ex. "gérer mes appareils
 * connectés"), la table existante permet déjà de lister/révoquer par ligne
 * — c'est une évolution UI, pas une évolution de schéma.
 */
final class RefreshTokenService {

    /**
     * Durée de la fenêtre glissante. 60 jours est un compromis courant côté
     * réseaux sociaux (Facebook/Instagram vont souvent plus loin, mais sans
     * documentation publique fiable sur leur valeur exacte) : assez long
     * pour qu'un utilisateur actif au moins une fois par mois et demi ne
     * soit jamais déconnecté, assez court pour limiter la fenêtre de risque
     * d'un token volé et jamais utilisé par son propriétaire légitime (donc
     * jamais détecté par la détection de réutilisation).
     */
    private const SLIDING_TTL_DAYS = 60;

    private static function table(): string {
        global $wpdb;
        return $wpdb->prefix . 'app_refresh_tokens';
    }

    private static function hash_token( string $raw_token ): string {
        return hash( 'sha256', $raw_token );
    }

    /**
     * Émet un nouveau refresh token pour un utilisateur et le persiste.
     * Retourne le token BRUT (à ne renvoyer qu'une seule fois au client,
     * dans un cookie httpOnly — jamais dans le corps JSON en clair côté
     * logs applicatifs).
     *
     * @param bool $remember_me Conservé pour compatibilité de signature et
     *             pour une éventuelle option future "ne pas rester connecté
     *             sur cet appareil" (ordinateur public, etc.), mais n'influe
     *             plus sur la durée par défaut — cf. note de classe.
     */
    public static function issue( int $user_id, bool $remember_me, string $user_agent, string $ip ): string {
        global $wpdb;

        $raw_token = Sanitizer::generate_secure_token( 48 );
        $ttl_days  = self::SLIDING_TTL_DAYS;

        $wpdb->insert(
            self::table(),
            [
                'user_id'      => $user_id,
                'token_hash'   => self::hash_token( $raw_token ),
                'user_agent'   => mb_substr( $user_agent, 0, 255 ),
                'ip_address'   => $ip,
                'remember_me'  => $remember_me ? 1 : 0,
                'created_at'   => current_time( 'mysql', true ),
                'expires_at'   => gmdate( 'Y-m-d H:i:s', time() + $ttl_days * DAY_IN_SECONDS ),
                'revoked_at'   => null,
            ],
            [ '%d', '%s', '%s', '%s', '%d', '%s', '%s', '%s' ]
        );

        return $raw_token;
    }

    /**
     * Valide un refresh token présenté par le client. Si valide : révoque
     * l'ancien (rotation) et retourne l'user_id + le remember_me d'origine.
     * Si le token est valide mais déjà révoqué -> signal de réutilisation
     * (vol potentiel) : on révoque toute la famille de tokens de l'utilisateur.
     *
     * @return array{user_id:int, remember_me:bool}|\WP_Error
     */
    public static function rotate( string $raw_token, string $user_agent, string $ip ) {
        global $wpdb;

        $hash = self::hash_token( $raw_token );
        $row  = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM " . self::table() . " WHERE token_hash = %s",
                $hash
            ),
            ARRAY_A
        );

        if ( ! $row ) {
            return new \WP_Error( 'app_auth_invalid_refresh', 'Refresh token invalide.', [ 'status' => 401 ] );
        }

        if ( ! empty( $row['revoked_at'] ) ) {
            // Token déjà utilisé/révoqué mais présenté à nouveau : signal fort
            // de compromission. On coupe TOUTES les sessions de l'utilisateur
            // par prudence (l'utilisateur légitime devra se reconnecter).
            self::revoke_all_for_user( (int) $row['user_id'] );
            return new \WP_Error(
                'app_auth_refresh_reuse_detected',
                'Session invalidée pour raison de sécurité, merci de vous reconnecter.',
                [ 'status' => 401 ]
            );
        }

        if ( strtotime( $row['expires_at'] . ' UTC' ) < time() ) {
            return new \WP_Error( 'app_auth_refresh_expired', 'Session expirée.', [ 'status' => 401 ] );
        }

        // Rotation : on révoque l'actuel (il ne sera plus jamais valide).
        $wpdb->update(
            self::table(),
            [ 'revoked_at' => current_time( 'mysql', true ) ],
            [ 'id' => $row['id'] ],
            [ '%s' ],
            [ '%d' ]
        );

        return [
            'user_id'     => (int) $row['user_id'],
            'remember_me' => (bool) $row['remember_me'],
        ];
    }

    /** Révoque un refresh token précis (logout simple). */
    public static function revoke( string $raw_token ): void {
        global $wpdb;
        $wpdb->update(
            self::table(),
            [ 'revoked_at' => current_time( 'mysql', true ) ],
            [ 'token_hash' => self::hash_token( $raw_token ) ],
            [ '%s' ],
            [ '%s' ]
        );
    }

    /**
     * Révoque toutes les sessions d'un utilisateur ("déconnecter tous les
     * appareils"). $wpdb->update() ne sait pas générer un "IS NULL" dans sa
     * clause WHERE (il génère "revoked_at = NULL", toujours faux en SQL),
     * d'où l'usage d'une requête préparée directe ici.
     */
    public static function revoke_all_for_user( int $user_id ): void {
        global $wpdb;
        $wpdb->query(
            $wpdb->prepare(
                "UPDATE " . self::table() . "
                 SET revoked_at = %s
                 WHERE user_id = %d AND revoked_at IS NULL",
                current_time( 'mysql', true ),
                $user_id
            )
        );
    }
}

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
 * Stratégie "remember me" : durée de vie 30 jours si remember_me=true,
 * sinon 1 jour (session courte, alignée sur une session de navigation
 * classique).
 *
 * Rotation à chaque refresh : un refresh token n'est utilisable qu'une seule
 * fois. À chaque appel à /auth/refresh, l'ancien est révoqué et un nouveau
 * est émis (+ nouvel access token). Cela permet de détecter le vol de token :
 * si un refresh token déjà utilisé est présenté à nouveau, c'est un signal
 * de compromission -> on révoque TOUTE la famille de tokens de l'utilisateur.
 */
final class RefreshTokenService {

    private const SHORT_TTL_DAYS = 1;
    private const LONG_TTL_DAYS  = 30;

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
     */
    public static function issue( int $user_id, bool $remember_me, string $user_agent, string $ip ): string {
        global $wpdb;

        $raw_token = Sanitizer::generate_secure_token( 48 );
        $ttl_days  = $remember_me ? self::LONG_TTL_DAYS : self::SHORT_TTL_DAYS;

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

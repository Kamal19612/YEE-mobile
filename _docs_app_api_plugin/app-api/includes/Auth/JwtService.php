<?php

namespace AppApi\Auth;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Génération / vérification des ACCESS TOKENS JWT (HS256).
 *
 * Choix technique : implémentation manuelle minimale plutôt que la librairie
 * firebase/php-jwt, pour ne pas dépendre de Composer/Packagist dans cet
 * environnement de démonstration. EN PRODUCTION : remplacer par
 * firebase/php-jwt (mieux auditée, gère plus d'algorithmes) dès que l'accès
 * à Packagist est possible dans le pipeline de build. L'interface publique
 * de cette classe ne changerait pas, donc aucun impact sur les appelants.
 *
 * Durée de vie volontairement COURTE (15 min) : un access token qui fuite
 * (ex. XSS) n'est exploitable que sur une fenêtre réduite. La session longue
 * est portée par le refresh token (RefreshTokenService), qui lui n'est
 * jamais accessible en JS (cookie httpOnly).
 */
final class JwtService {

    private const ALGORITHM   = 'HS256';
    private const ACCESS_TTL  = 15 * MINUTE_IN_SECONDS;

    /**
     * Clé de signature. DOIT être définie dans wp-config.php, jamais en dur
     * dans le code versionné :
     *   define('APP_JWT_SECRET', getenv('APP_JWT_SECRET'));
     * Rotation : voir la note en bas de fichier.
     */
    private static function secret(): string {
        if ( ! defined( 'APP_JWT_SECRET' ) || empty( APP_JWT_SECRET ) ) {
            // Échec volontairement bruyant : on ne doit JAMAIS tourner en
            // production avec un secret par défaut/absent.
            wp_die( 'APP_JWT_SECRET n’est pas configuré. Voir wp-config.php.' );
        }
        return APP_JWT_SECRET;
    }

    private static function base64url_encode( string $data ): string {
        return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' );
    }

    private static function base64url_decode( string $data ): string {
        $padded = str_pad( $data, strlen( $data ) % 4 === 0 ? strlen( $data ) : strlen( $data ) + 4 - strlen( $data ) % 4, '=' );
        return base64_decode( strtr( $padded, '-_', '+/' ) );
    }

    /**
     * Génère un access token pour un utilisateur donné.
     *
     * @param int   $user_id
     * @param array $extra_claims Claims additionnels (ex. ['roles' => [...]])
     */
    public static function issue_access_token( int $user_id, array $extra_claims = [] ): string {
        $now = time();

        $header = [ 'alg' => self::ALGORITHM, 'typ' => 'JWT' ];
        $payload = array_merge( [
            'sub' => $user_id,
            'iat' => $now,
            'exp' => $now + self::ACCESS_TTL,
            'iss' => home_url(),
        ], $extra_claims );

        $segments = [
            self::base64url_encode( wp_json_encode( $header ) ),
            self::base64url_encode( wp_json_encode( $payload ) ),
        ];

        $signature = hash_hmac( 'sha256', implode( '.', $segments ), self::secret(), true );
        $segments[] = self::base64url_encode( $signature );

        return implode( '.', $segments );
    }

    /**
     * Vérifie un access token : signature + expiration.
     *
     * @return array|\WP_Error Les claims décodés, ou une WP_Error explicite.
     */
    public static function verify_access_token( string $token ) {
        $parts = explode( '.', $token );
        if ( count( $parts ) !== 3 ) {
            return new \WP_Error( 'app_auth_malformed_token', 'Token malformé.', [ 'status' => 401 ] );
        }

        [ $header_b64, $payload_b64, $signature_b64 ] = $parts;

        $expected_signature = hash_hmac(
            'sha256',
            $header_b64 . '.' . $payload_b64,
            self::secret(),
            true
        );

        // Comparaison en temps constant obligatoire (évite les attaques par
        // timing sur la vérification de signature).
        if ( ! hash_equals( self::base64url_encode( $expected_signature ), $signature_b64 ) ) {
            return new \WP_Error( 'app_auth_invalid_signature', 'Signature invalide.', [ 'status' => 401 ] );
        }

        $payload = json_decode( self::base64url_decode( $payload_b64 ), true );
        if ( ! is_array( $payload ) || ! isset( $payload['exp'], $payload['sub'] ) ) {
            return new \WP_Error( 'app_auth_invalid_payload', 'Payload invalide.', [ 'status' => 401 ] );
        }

        if ( time() >= (int) $payload['exp'] ) {
            return new \WP_Error( 'app_auth_token_expired', 'Token expiré.', [ 'status' => 401 ] );
        }

        return $payload;
    }
}

/**
 * NOTE — Rotation des clés :
 * Prévoir dans wp-config.php un tableau de secrets versionnés plutôt qu'une
 * seule chaîne (ex. APP_JWT_SECRETS = ['v2' => '...', 'v1' => '...']), avec
 * l'id de version dans le header JWT ("kid"). Cela permet de faire tourner
 * la clé sans invalider immédiatement tous les tokens en circulation. Prévu
 * pour un sprint de durcissement ultérieur, pas bloquant pour le sprint 1.
 */

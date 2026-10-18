<?php

namespace AppApi\Auth;

use AppApi\Core\AbstractController;
use AppApi\Core\ApiResponse;
use AppApi\Core\RestNamespace;
use AppApi\Core\Sanitizer;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Endpoints d'authentification. Namespace : /wp-json/app/v1/auth/*
 *
 * Le refresh token est TOUJOURS transporté en cookie httpOnly/Secure,
 * jamais dans le corps JSON — inaccessible au JS (XSS). L'access token
 * est renvoyé dans le JSON et doit rester en mémoire côté frontend.
 *
 * SameSite par défaut = None : requis pour une SPA cross-origin
 * (ex. GitHub Pages → API Hostinger). Override via APP_COOKIE_SAMESITE
 * (Lax/Strict) si front et API sont same-site. CSRF atténué par path
 * scoped /auth + whitelist APP_ALLOWED_ORIGINS (credentials).
 */
final class AuthController extends AbstractController {

    private const REFRESH_COOKIE_NAME = 'app_refresh_token';

    public static function register_routes(): void {
        $ns = RestNamespace::NAMESPACE;

        register_rest_route( $ns, '/auth/register', [
            'methods'             => 'POST',
            'callback'            => [ self::class, 'register' ],
            'permission_callback' => '__return_true',
        ] );

        register_rest_route( $ns, '/auth/verify-email', [
            'methods'             => 'POST',
            'callback'            => [ self::class, 'verify_email' ],
            'permission_callback' => '__return_true',
        ] );

        register_rest_route( $ns, '/auth/login', [
            'methods'             => 'POST',
            'callback'            => [ self::class, 'login' ],
            'permission_callback' => '__return_true',
        ] );

        register_rest_route( $ns, '/auth/refresh', [
            'methods'             => 'POST',
            'callback'            => [ self::class, 'refresh' ],
            'permission_callback' => '__return_true', // Auth par cookie, pas par header ici.
        ] );

        register_rest_route( $ns, '/auth/logout', [
            'methods'             => 'POST',
            'callback'            => [ self::class, 'logout' ],
            'permission_callback' => [ self::class, 'require_authenticated_user' ],
        ] );

        register_rest_route( $ns, '/auth/forgot-password', [
            'methods'             => 'POST',
            'callback'            => [ self::class, 'forgot_password' ],
            'permission_callback' => '__return_true',
        ] );

        register_rest_route( $ns, '/auth/reset-password', [
            'methods'             => 'POST',
            'callback'            => [ self::class, 'reset_password' ],
            'permission_callback' => '__return_true',
        ] );

        register_rest_route( $ns, '/auth/me', [
            'methods'             => 'GET',
            'callback'            => [ self::class, 'me' ],
            'permission_callback' => [ self::class, 'require_authenticated_user' ],
        ] );
    }

    /* -----------------------------------------------------------------
     * POST /auth/register
     * Body: { email, password, displayName }
     * --------------------------------------------------------------- */
    public static function register( \WP_REST_Request $request ) {
        $ip = RateLimiter::get_client_ip();

        // 5 inscriptions max / heure / IP : limite les créations de comptes
        // en masse (spam, bots) sans gêner un utilisateur légitime.
        if ( RateLimiter::is_rate_limited( 'register', $ip, 5, HOUR_IN_SECONDS ) ) {
            return ApiResponse::error( 'rate_limited', 'Trop de tentatives, réessayez plus tard.', 429 );
        }

        $email        = sanitize_email( $request->get_param( 'email' ) ?? '' );
        $password     = (string) ( $request->get_param( 'password' ) ?? '' );
        $display_name = Sanitizer::clean_text( $request->get_param( 'displayName' ) ?? '' );

        $errors = [];

        if ( ! Sanitizer::is_valid_email( $email ) ) {
            $errors['email'] = 'Adresse email invalide.';
        } elseif ( email_exists( $email ) ) {
            // Message volontairement générique pour ne pas confirmer à un
            // attaquant qu'un email précis est déjà enregistré (énumération
            // de comptes). Le vrai détail reste dans les logs serveur.
            return ApiResponse::success( [
                'message' => 'Si cet email n’est pas déjà utilisé, un lien de vérification vient d’être envoyé.',
            ], 202 );
        }

        $password_errors = Sanitizer::password_errors( $password );
        if ( ! empty( $password_errors ) ) {
            $errors['password'] = $password_errors;
        }

        if ( strlen( $display_name ) < 2 || strlen( $display_name ) > 60 ) {
            $errors['displayName'] = 'Le nom doit contenir entre 2 et 60 caractères.';
        }

        if ( ! empty( $errors ) ) {
            return self::validation_error( $errors );
        }

        // username WP dérivé de l'email, mais l'authentification métier se
        // fait toujours par email côté API (le username WP interne n'est
        // jamais exposé au frontend).
        $username = sanitize_user( current( explode( '@', $email ) ) . '_' . wp_generate_password( 4, false ) );

        $user_id = wp_insert_user( [
            'user_login'   => $username,
            'user_email'   => $email,
            'user_pass'    => $password, // wp_insert_user hash via wp_hash_password en interne.
            'display_name' => $display_name,
        ] );

        if ( is_wp_error( $user_id ) ) {
            return ApiResponse::error( 'registration_failed', 'Impossible de créer le compte.', 500 );
        }

        // Compte créé mais NON activé tant que l'email n'est pas vérifié.
        update_user_meta( $user_id, 'app_email_verified', false );

        $verification_token = Sanitizer::generate_secure_token();
        // Stocké hashé, comme un mot de passe : si la base fuite, le token
        // en clair (envoyé par email) reste le seul moyen de l'utiliser.
        update_user_meta( $user_id, 'app_email_verification_token_hash', hash( 'sha256', $verification_token ) );
        update_user_meta( $user_id, 'app_email_verification_expires', time() + DAY_IN_SECONDS );

        self::send_verification_email( $email, $verification_token );

        return ApiResponse::success( [
            'message' => 'Compte créé. Vérifiez votre boîte mail pour l’activer.',
        ], 201 );
    }

    private static function send_verification_email( string $email, string $token ): void {
        // Sprint 1 : envoi via wp_mail(). À faire évoluer vers un provider
        // transactionnel (SES/SendGrid/Mailgun) au sprint "Notifications" pour
        // la délivrabilité à l'échelle visée (wp_mail via SMTP local ne tient
        // pas la charge à plusieurs centaines de milliers d'utilisateurs).
        $verify_url = self::frontend_url( '/verify-email', [ 'token' => $token ] );

        wp_mail(
            $email,
            __( 'Confirmez votre adresse email', 'app-api' ),
            sprintf(
                /* translators: %s: lien de vérification */
                __( "Bienvenue !\n\nConfirmez votre adresse email en cliquant sur ce lien (valable 24h) :\n%s\n\nSi vous n'êtes pas à l'origine de cette inscription, ignorez cet email.", 'app-api' ),
                $verify_url
            )
        );
    }

    /* -----------------------------------------------------------------
     * POST /auth/verify-email
     * Body: { token }
     * --------------------------------------------------------------- */
    public static function verify_email( \WP_REST_Request $request ) {
        $token = (string) ( $request->get_param( 'token' ) ?? '' );

        if ( empty( $token ) ) {
            return self::validation_error( [ 'token' => 'Token manquant.' ] );
        }

        $token_hash = hash( 'sha256', $token );

        $users = get_users( [
            'meta_key'   => 'app_email_verification_token_hash',
            'meta_value' => $token_hash,
            'number'     => 1,
        ] );

        if ( empty( $users ) ) {
            return ApiResponse::error( 'invalid_token', 'Lien de vérification invalide ou déjà utilisé.', 400 );
        }

        $user = $users[0];
        $expires = (int) get_user_meta( $user->ID, 'app_email_verification_expires', true );

        if ( time() > $expires ) {
            return ApiResponse::error( 'expired_token', 'Lien de vérification expiré, demandez-en un nouveau.', 400 );
        }

        update_user_meta( $user->ID, 'app_email_verified', true );
        delete_user_meta( $user->ID, 'app_email_verification_token_hash' );
        delete_user_meta( $user->ID, 'app_email_verification_expires' );

        return ApiResponse::success( [ 'message' => 'Email vérifié avec succès.' ] );
    }

    /* -----------------------------------------------------------------
     * POST /auth/login
     * Body: { email, password, rememberMe? }
     *
     * Depuis le passage à une session "réseau social" (fenêtre glissante,
     * cf. RefreshTokenService), TOUTE connexion reste ouverte jusqu'à
     * déconnexion explicite — il n'y a plus de session "courte" par
     * défaut. `rememberMe` n'influence donc plus la durée de vie du token
     * ; le paramètre est conservé uniquement pour une évolution future
     * (ex. case "Ordinateur public — ne pas rester connecté" avec une
     * session délibérément plus courte). Le frontend peut continuer à
     * envoyer ce champ sans effet, ou cesser de l'envoyer.
     * --------------------------------------------------------------- */
    public static function login( \WP_REST_Request $request ) {
        $ip    = RateLimiter::get_client_ip();
        $email = sanitize_email( $request->get_param( 'email' ) ?? '' );

        // Double clé de rate limiting : par IP (bloque un attaquant qui
        // teste beaucoup de comptes) ET par email ciblé (bloque un
        // attaquant distribué qui vise un seul compte depuis plusieurs IP).
        if (
            RateLimiter::is_rate_limited( 'login_ip', $ip, 20, 15 * MINUTE_IN_SECONDS ) ||
            RateLimiter::is_rate_limited( 'login_email', $email, 5, 15 * MINUTE_IN_SECONDS )
        ) {
            return ApiResponse::error( 'rate_limited', 'Trop de tentatives, réessayez plus tard.', 429 );
        }

        $password    = (string) ( $request->get_param( 'password' ) ?? '' );
        $remember_me = (bool) $request->get_param( 'rememberMe' );

        $user = get_user_by( 'email', $email );

        // Message d'erreur IDENTIQUE que ce soit l'email ou le mot de passe
        // qui soit incorrect (évite l'énumération de comptes valides).
        $invalid_credentials = fn() => ApiResponse::error(
            'invalid_credentials',
            'Email ou mot de passe incorrect.',
            401
        );

        if ( ! $user || ! wp_check_password( $password, $user->user_pass, $user->ID ) ) {
            return $invalid_credentials();
        }

        if ( ! get_user_meta( $user->ID, 'app_email_verified', true ) ) {
            return ApiResponse::error( 'email_not_verified', 'Merci de vérifier votre email avant de vous connecter.', 403 );
        }

        // Ajouté au sprint 2 (module Profil) : un compte désactivé via
        // DELETE /users/me (ProfileController::delete_account) ne doit
        // plus jamais pouvoir se reconnecter, même avec le bon mot de passe.
        if ( get_user_meta( $user->ID, 'app_account_deactivated', true ) ) {
            return ApiResponse::error( 'account_deactivated', 'Ce compte a été désactivé.', 403 );
        }

        // Point d'ancrage 2FA (cf. TwoFactorService) : si activée, on
        // s'arrêterait ici avec un challenge_token au lieu des tokens finaux.
        if ( TwoFactorService::is_enabled_for_user( $user->ID ) ) {
            return ApiResponse::error( 'not_implemented', '2FA non encore implémentée dans ce sprint.', 501 );
        }

        RateLimiter::reset( 'login_email', $email );
        RateLimiter::reset( 'login_ip', $ip );

        return self::issue_session( $user->ID, $remember_me, $request );
    }

    /**
     * Émet une nouvelle session complète (access token + refresh token en
     * cookie). Factorisé car réutilisé par login() ET refresh().
     */
    private static function issue_session( int $user_id, bool $remember_me, \WP_REST_Request $request ): \WP_REST_Response {
        $access_token = JwtService::issue_access_token( $user_id );

        $refresh_token = RefreshTokenService::issue(
            $user_id,
            $remember_me,
            $request->get_header( 'user-agent' ) ?? '',
            RateLimiter::get_client_ip()
        );

        self::set_refresh_cookie( $refresh_token, $remember_me );

        return ApiResponse::success( [
            'accessToken' => $access_token,
            'expiresIn'   => 15 * MINUTE_IN_SECONDS,
            'user'        => self::public_user_payload( $user_id ),
        ] );
    }

    /**
     * Attributs cookie refresh. SameSite=None par défaut (SPA cross-origin).
     * define( 'APP_COOKIE_SAMESITE', 'Lax' ) si front et API sont same-site.
     */
    private static function refresh_cookie_options( int $expires ): array {
        $samesite = 'None';
        if ( defined( 'APP_COOKIE_SAMESITE' ) && is_string( APP_COOKIE_SAMESITE ) && APP_COOKIE_SAMESITE !== '' ) {
            $samesite = APP_COOKIE_SAMESITE;
        }

        return [
            'expires'  => $expires,
            'path'     => '/wp-json/' . RestNamespace::NAMESPACE . '/auth',
            'domain'   => defined( 'APP_COOKIE_DOMAIN' ) ? APP_COOKIE_DOMAIN : '',
            'secure'   => true,
            'httponly' => true,
            'samesite' => $samesite,
        ];
    }

    /**
     * Durée du cookie navigateur, alignée sur la fenêtre glissante côté
     * serveur (RefreshTokenService::SLIDING_TTL_DAYS). Les deux valeurs
     * doivent rester synchronisées : si le cookie expire avant le token en
     * base, le navigateur cesse d'envoyer un token pourtant encore valide
     * server-side, et l'utilisateur est déconnecté "trop tôt" sans raison
     * de sécurité réelle.
     */
    private static function set_refresh_cookie( string $token, bool $remember_me ): void {
        // $remember_me conservé pour signature ; TTL = fenêtre glissante 60j.
        $ttl = 60 * DAY_IN_SECONDS;
        setcookie( self::REFRESH_COOKIE_NAME, $token, self::refresh_cookie_options( time() + $ttl ) );
    }

    /* -----------------------------------------------------------------
     * POST /auth/refresh
     * Refresh token lu depuis le cookie httpOnly, pas depuis le body.
     * --------------------------------------------------------------- */
    public static function refresh( \WP_REST_Request $request ) {
        $raw_token = $_COOKIE[ self::REFRESH_COOKIE_NAME ] ?? '';

        if ( empty( $raw_token ) ) {
            return ApiResponse::error( 'app_auth_missing_refresh', 'Aucune session active.', 401 );
        }

        $result = RefreshTokenService::rotate(
            $raw_token,
            $request->get_header( 'user-agent' ) ?? '',
            RateLimiter::get_client_ip()
        );

        if ( is_wp_error( $result ) ) {
            // On efface le cookie côté client dans tous les cas d'échec,
            // pour éviter des tentatives de refresh en boucle sur un
            // cookie devenu invalide.
            self::clear_refresh_cookie();
            return ApiResponse::error( $result->get_error_code(), $result->get_error_message(), (int) ( $result->get_error_data()['status'] ?? 401 ) );
        }

        return self::issue_session( $result['user_id'], $result['remember_me'], $request );
    }

    /* -----------------------------------------------------------------
     * POST /auth/logout
     * Nécessite un access token valide (route protégée).
     * --------------------------------------------------------------- */
    public static function logout( \WP_REST_Request $request ) {
        $raw_token = $_COOKIE[ self::REFRESH_COOKIE_NAME ] ?? '';
        if ( ! empty( $raw_token ) ) {
            RefreshTokenService::revoke( $raw_token );
        }
        self::clear_refresh_cookie();

        return ApiResponse::success( [ 'message' => 'Déconnecté.' ] );
    }

    private static function clear_refresh_cookie(): void {
        setcookie(
            self::REFRESH_COOKIE_NAME,
            '',
            self::refresh_cookie_options( time() - HOUR_IN_SECONDS )
        );
    }

    /* -----------------------------------------------------------------
     * POST /auth/forgot-password
     * Body: { email }
     * --------------------------------------------------------------- */
    public static function forgot_password( \WP_REST_Request $request ) {
        $ip    = RateLimiter::get_client_ip();
        $email = sanitize_email( $request->get_param( 'email' ) ?? '' );

        if ( RateLimiter::is_rate_limited( 'forgot_password', $ip, 5, HOUR_IN_SECONDS ) ) {
            return ApiResponse::error( 'rate_limited', 'Trop de tentatives, réessayez plus tard.', 429 );
        }

        $user = get_user_by( 'email', $email );

        // Toujours une réponse 202 identique, que l'email existe ou non
        // (anti énumération de comptes).
        $generic_response = ApiResponse::success( [
            'message' => 'Si cet email est associé à un compte, un lien de réinitialisation vient d’être envoyé.',
        ], 202 );

        if ( ! $user ) {
            return $generic_response;
        }

        $reset_token = Sanitizer::generate_secure_token();
        update_user_meta( $user->ID, 'app_password_reset_token_hash', hash( 'sha256', $reset_token ) );
        update_user_meta( $user->ID, 'app_password_reset_expires', time() + HOUR_IN_SECONDS );

        $reset_url = self::frontend_url( '/reset-password', [ 'token' => $reset_token ] );

        wp_mail(
            $email,
            __( 'Réinitialisation de votre mot de passe', 'app-api' ),
            sprintf(
                /* translators: %s: lien de réinitialisation */
                __( "Vous avez demandé une réinitialisation de mot de passe (valable 1h) :\n%s\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe reste inchangé.", 'app-api' ),
                $reset_url
            )
        );

        return $generic_response;
    }

    /* -----------------------------------------------------------------
     * POST /auth/reset-password
     * Body: { token, newPassword }
     * --------------------------------------------------------------- */
    public static function reset_password( \WP_REST_Request $request ) {
        $token        = (string) ( $request->get_param( 'token' ) ?? '' );
        $new_password = (string) ( $request->get_param( 'newPassword' ) ?? '' );

        $password_errors = Sanitizer::password_errors( $new_password );
        if ( ! empty( $password_errors ) ) {
            return self::validation_error( [ 'newPassword' => $password_errors ] );
        }

        $token_hash = hash( 'sha256', $token );
        $users = get_users( [
            'meta_key'   => 'app_password_reset_token_hash',
            'meta_value' => $token_hash,
            'number'     => 1,
        ] );

        if ( empty( $users ) ) {
            return ApiResponse::error( 'invalid_token', 'Lien de réinitialisation invalide ou déjà utilisé.', 400 );
        }

        $user = $users[0];
        $expires = (int) get_user_meta( $user->ID, 'app_password_reset_expires', true );

        if ( time() > $expires ) {
            return ApiResponse::error( 'expired_token', 'Lien de réinitialisation expiré.', 400 );
        }

        wp_set_password( $new_password, $user->ID );
        delete_user_meta( $user->ID, 'app_password_reset_token_hash' );
        delete_user_meta( $user->ID, 'app_password_reset_expires' );

        // Changement de mot de passe = signal de sécurité fort : on coupe
        // toutes les sessions actives (l'utilisateur légitime se reconnecte
        // avec son nouveau mot de passe, tout attaquant ayant une session
        // volée est éjecté).
        RefreshTokenService::revoke_all_for_user( $user->ID );

        return ApiResponse::success( [ 'message' => 'Mot de passe réinitialisé avec succès.' ] );
    }

    /* -----------------------------------------------------------------
     * GET /auth/me — utile au frontend pour restaurer une session au
     * chargement de l'app (avec un access token encore valide en mémoire).
     * --------------------------------------------------------------- */
    public static function me( \WP_REST_Request $request ) {
        $user_id = (int) $request->get_param( 'app_user_id' );
        return ApiResponse::success( self::public_user_payload( $user_id ) );
    }

    /**
     * Construit une URL frontend sans double slash.
     * Tolère APP_FRONTEND_URL avec ou sans slash final
     * (ex. https://kamal19612.github.io/Buddyboss/).
     *
     * @param string $path  Chemin commençant par / (ex. /verify-email).
     * @param array  $query Query string (valeurs encodées).
     */
    private static function frontend_url( string $path, array $query = [] ): string {
        if ( ! defined( 'APP_FRONTEND_URL' ) || APP_FRONTEND_URL === '' ) {
            return '#';
        }

        $base = rtrim( (string) APP_FRONTEND_URL, '/' );
        $path = '/' . ltrim( $path, '/' );
        $url  = $base . $path;

        if ( ! empty( $query ) ) {
            $url .= '?' . http_build_query( $query, '', '&', PHP_QUERY_RFC3986 );
        }

        return $url;
    }

    /**
     * Transforme un utilisateur WP en payload public. C'est ICI que se
     * matérialise le principe "React ne voit jamais un objet WP brut" —
     * même pour un simple utilisateur. À enrichir au sprint Profil avec
     * avatar, cover, bio, etc. (données BuddyPress).
     */
    private static function public_user_payload( int $user_id ): array {
        $user = get_userdata( $user_id );
        return [
            'id'          => (string) $user->ID,
            'displayName' => $user->display_name,
            'email'       => $user->user_email, // Uniquement sur /me, jamais sur un profil tiers.
        ];
    }
}

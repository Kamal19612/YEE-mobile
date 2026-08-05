<?php

namespace AppApi\Users;

use AppApi\Core\AbstractController;
use AppApi\Core\ApiResponse;
use AppApi\Core\RestNamespace;
use AppApi\Core\Sanitizer;
use AppApi\Media\UploadValidator;
use AppApi\Auth\RefreshTokenService;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Endpoints profil. Namespace : /wp-json/app/v1/users/*
 */
final class ProfileController extends AbstractController {

    public static function register_routes(): void {
        $ns = RestNamespace::NAMESPACE;

        register_rest_route( $ns, '/users/me', [
            'methods'             => 'GET',
            'callback'            => [ self::class, 'get_me' ],
            'permission_callback' => [ self::class, 'require_authenticated_user' ],
        ] );

        register_rest_route( $ns, '/users/me', [
            'methods'             => 'PATCH',
            'callback'            => [ self::class, 'update_me' ],
            'permission_callback' => [ self::class, 'require_authenticated_user' ],
        ] );

        register_rest_route( $ns, '/users/me/password', [
            'methods'             => 'PUT',
            'callback'            => [ self::class, 'change_password' ],
            'permission_callback' => [ self::class, 'require_authenticated_user' ],
        ] );

        register_rest_route( $ns, '/users/me/avatar', [
            'methods'             => 'POST',
            'callback'            => [ self::class, 'upload_avatar' ],
            'permission_callback' => [ self::class, 'require_authenticated_user' ],
        ] );

        register_rest_route( $ns, '/users/me/cover', [
            'methods'             => 'POST',
            'callback'            => [ self::class, 'upload_cover' ],
            'permission_callback' => [ self::class, 'require_authenticated_user' ],
        ] );

        register_rest_route( $ns, '/users/me', [
            'methods'             => 'DELETE',
            'callback'            => [ self::class, 'delete_account' ],
            'permission_callback' => [ self::class, 'require_authenticated_user' ],
        ] );

        // Profil public : accessible sans authentification, mais le
        // contenu réellement renvoyé dépend de la visibilité (cf.
        // UserTransformer + note "sprint suivant" plus bas pour la
        // gestion fine des profils privés).
        register_rest_route( $ns, '/users/(?P<id>\d+)', [
            'methods'             => 'GET',
            'callback'            => [ self::class, 'get_public_profile' ],
            'permission_callback' => '__return_true',
            'args'                => [
                'id' => [ 'validate_callback' => fn( $param ) => is_numeric( $param ) ],
            ],
        ] );
    }

    /* ----------------------------------------------------------------- */

    public static function get_me( \WP_REST_Request $request ) {
        $user_id = (int) $request->get_param( 'app_user_id' );
        return ApiResponse::success( UserTransformer::to_public_profile( $user_id, true ) );
    }

    public static function get_public_profile( \WP_REST_Request $request ) {
        $user_id = (int) $request->get_param( 'id' );

        if ( ! get_userdata( $user_id ) ) {
            return ApiResponse::error( 'user_not_found', 'Utilisateur introuvable.', 404 );
        }

        // NOTE pour un sprint ultérieur (visibilité de profil) : c'est ICI
        // qu'il faudra vérifier un éventuel réglage "profil privé" avant de
        // renvoyer les données complètes. Pas implémenté dans ce sprint —
        // le cahier des charges ne mentionne pas cette exigence pour le
        // profil (contrairement aux groupes, où c'est déjà prévu).
        return ApiResponse::success( UserTransformer::to_public_profile( $user_id, false ) );
    }

    /* ----------------------------------------------------------------- */

    public static function update_me( \WP_REST_Request $request ) {
        $user_id = (int) $request->get_param( 'app_user_id' );
        $body    = $request->get_json_params() ?? [];

        [ $clean_meta, $errors ] = ProfileFields::validate_and_sanitize( $body );

        if ( ! empty( $errors ) ) {
            return self::validation_error( $errors );
        }

        // displayName n'est pas dans ProfileFields (c'est un champ WP natif,
        // pas une meta) : traité séparément avec ses propres règles.
        if ( array_key_exists( 'displayName', $body ) ) {
            $display_name = Sanitizer::clean_text( (string) $body['displayName'] );
            if ( mb_strlen( $display_name ) < 2 || mb_strlen( $display_name ) > 60 ) {
                return self::validation_error( [ 'displayName' => 'Le nom doit contenir entre 2 et 60 caractères.' ] );
            }
            wp_update_user( [ 'ID' => $user_id, 'display_name' => $display_name ] );
        }

        foreach ( $clean_meta as $meta_key => $value ) {
            update_user_meta( $user_id, $meta_key, $value );
        }

        return ApiResponse::success( UserTransformer::to_public_profile( $user_id, true ) );
    }

    /* ----------------------------------------------------------------- */

    /**
     * Changement de mot de passe AUTHENTIFIÉ (différent de reset-password
     * qui repose sur un token email pour un utilisateur déconnecté).
     * Exige le mot de passe actuel : évite qu'une session volée (ex. via un
     * appareil déverrouillé oublié) permette de changer le mot de passe et
     * d'exclure le vrai propriétaire du compte.
     */
    public static function change_password( \WP_REST_Request $request ) {
        $user_id = (int) $request->get_param( 'app_user_id' );
        $body    = $request->get_json_params() ?? [];

        $current_password = (string) ( $body['currentPassword'] ?? '' );
        $new_password      = (string) ( $body['newPassword'] ?? '' );

        $user = get_userdata( $user_id );

        if ( ! wp_check_password( $current_password, $user->user_pass, $user_id ) ) {
            return ApiResponse::error( 'invalid_current_password', 'Mot de passe actuel incorrect.', 401 );
        }

        $password_errors = Sanitizer::password_errors( $new_password );
        if ( ! empty( $password_errors ) ) {
            return self::validation_error( [ 'newPassword' => $password_errors ] );
        }

        wp_set_password( $new_password, $user_id );

        // Même logique que reset-password : un changement de mot de passe
        // révoque toutes les sessions actives, y compris celle en cours —
        // le frontend doit donc rediriger vers /login après cet appel
        // (l'access token courant reste valide jusqu'à expiration, 15 min
        // max, mais le refresh échouera ensuite).
        RefreshTokenService::revoke_all_for_user( $user_id );

        return ApiResponse::success( [ 'message' => 'Mot de passe modifié. Merci de vous reconnecter.' ] );
    }

    /* ----------------------------------------------------------------- */

    public static function upload_avatar( \WP_REST_Request $request ) {
        return self::handle_image_upload( $request, 'app_avatar_attachment_id' );
    }

    public static function upload_cover( \WP_REST_Request $request ) {
        return self::handle_image_upload( $request, 'app_cover_attachment_id' );
    }

    private static function handle_image_upload( \WP_REST_Request $request, string $meta_key ) {
        $user_id = (int) $request->get_param( 'app_user_id' );
        $files   = $request->get_file_params();

        $file_key = array_key_first( $files );
        if ( ! $file_key ) {
            return ApiResponse::error( 'missing_file', 'Aucun fichier reçu.', 400 );
        }

        $validation = UploadValidator::validate_image( $files[ $file_key ] );
        if ( is_wp_error( $validation ) ) {
            return ApiResponse::error( $validation->get_error_code(), $validation->get_error_message(), 422 );
        }

        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';

        // Sprint 1 de ce module : upload vers le stockage local WordPress.
        // Migration vers S3 (Media\S3Adapter) prévue au sprint Média dédié,
        // sans impact sur ce contrôleur : media_handle_upload() sera
        // remplacé par un appel à l'adapter, la réponse JSON ne change pas.
        $attachment_id = media_handle_upload( $file_key, 0 );

        if ( is_wp_error( $attachment_id ) ) {
            return ApiResponse::error( 'upload_failed', 'Échec de l’upload.', 500 );
        }

        // Supprime l'ancienne image pour ne pas accumuler des fichiers
        // orphelins (coût de stockage à l'échelle visée).
        $previous_id = get_user_meta( $user_id, $meta_key, true );
        if ( $previous_id ) {
            wp_delete_attachment( (int) $previous_id, true );
        }

        update_user_meta( $user_id, $meta_key, $attachment_id );

        return ApiResponse::success( [
            'url' => wp_get_attachment_image_url( $attachment_id, 'large' ),
        ] );
    }

    /* ----------------------------------------------------------------- */

    /**
     * Suppression de compte : exige une confirmation explicite du mot de
     * passe dans le body (même logique de défense que change_password),
     * pour éviter une suppression déclenchée par erreur ou via une session
     * volée sans que l'attaquant connaisse le mot de passe.
     *
     * NOTE : ce sprint anonymise/désactive le compte plutôt que de le
     * supprimer physiquement (wp_delete_user), pour préserver l'intégrité
     * des données liées (posts, commentaires d'autres utilisateurs qui le
     * mentionnent, etc.) — la suppression physique différée (purge RGPD à
     * J+30) sera traitée dans le sprint dédié "Conformité RGPD".
     */
    public static function delete_account( \WP_REST_Request $request ) {
        $user_id = (int) $request->get_param( 'app_user_id' );
        $body    = $request->get_json_params() ?? [];
        $password = (string) ( $body['password'] ?? '' );

        $user = get_userdata( $user_id );

        if ( ! wp_check_password( $password, $user->user_pass, $user_id ) ) {
            return ApiResponse::error( 'invalid_password', 'Mot de passe incorrect.', 401 );
        }

        update_user_meta( $user_id, 'app_account_deactivated', true );
        update_user_meta( $user_id, 'app_account_deactivated_at', current_time( 'mysql', true ) );

        // Anonymisation immédiate des champs affichables publiquement.
        wp_update_user( [ 'ID' => $user_id, 'display_name' => 'Utilisateur supprimé' ] );
        foreach ( array_keys( ProfileFields::editable_fields() ) as $meta_key ) {
            delete_user_meta( $user_id, $meta_key );
        }

        RefreshTokenService::revoke_all_for_user( $user_id );

        return ApiResponse::success( [ 'message' => 'Compte désactivé.' ] );
    }
}

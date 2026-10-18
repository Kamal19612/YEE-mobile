<?php

namespace AppApi\Core;

use AppApi\Auth\JwtService;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Base commune à tous les contrôleurs REST du plugin. Centralise :
 * - la résolution de l'utilisateur courant à partir du JWT (permission_callback)
 * - un helper d'erreur de validation uniforme
 *
 * Chaque module (Feed, Groups, Forums...) étendra cette classe à partir du
 * sprint 2. Pour ce sprint, seul AuthController s'appuie dessus pour les
 * routes qui nécessitent d'être authentifié (ex. logout, refresh).
 */
abstract class AbstractController {

    /**
     * permission_callback générique : exige un access token JWT valide.
     * Attache l'utilisateur résolu à la requête ($request['app_user_id'])
     * pour que le contrôleur n'ait pas à re-décoder le token.
     */
    public static function require_authenticated_user( \WP_REST_Request $request ) {
        $auth_header = $request->get_header( 'authorization' );

        if ( ! $auth_header || stripos( $auth_header, 'Bearer ' ) !== 0 ) {
            return new \WP_Error(
                'app_auth_missing_token',
                __( 'Token d’authentification manquant.', 'app-api' ),
                [ 'status' => 401 ]
            );
        }

        $token = trim( substr( $auth_header, 7 ) );
        $claims = JwtService::verify_access_token( $token );

        if ( is_wp_error( $claims ) ) {
            return $claims; // Propage l'erreur (token expiré/invalide) telle quelle.
        }

        $request->set_param( 'app_user_id', (int) $claims['sub'] );

        return true;
    }

    /**
     * Construit une réponse d'erreur de validation à partir d'une liste de
     * messages (ex. Sanitizer::password_errors()).
     */
    protected static function validation_error( array $messages ): \WP_REST_Response {
        return ApiResponse::error(
            'validation_failed',
            __( 'La requête contient des données invalides.', 'app-api' ),
            422,
            [ 'fields' => $messages ]
        );
    }
}

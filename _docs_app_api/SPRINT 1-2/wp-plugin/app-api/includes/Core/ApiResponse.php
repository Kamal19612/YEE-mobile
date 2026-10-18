<?php

namespace AppApi\Core;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Format de réponse JSON unifié pour TOUS les modules (Auth, Feed, Groups...).
 * C'est ce contrat, et non la structure interne de WordPress, que React
 * consomme. Le garder stable dans le temps est ce qui permet de faire évoluer
 * ou remplacer le backend sans casser le frontend.
 */
final class ApiResponse {

    /**
     * Réponse de succès standardisée.
     *
     * @param mixed $data    Donnée métier (déjà transformée, jamais un objet WP brut).
     * @param int   $status  Code HTTP.
     * @param array $meta    Métadonnées optionnelles (pagination, curseur...).
     */
    public static function success( $data, int $status = 200, array $meta = [] ): \WP_REST_Response {
        $body = [ 'success' => true, 'data' => $data ];
        if ( ! empty( $meta ) ) {
            $body['meta'] = $meta;
        }
        return new \WP_REST_Response( $body, $status );
    }

    /**
     * Réponse d'erreur standardisée. Le "code" est un identifiant machine
     * stable (utilisé par le frontend pour du traitement conditionnel),
     * distinct du code HTTP.
     */
    public static function error( string $code, string $message, int $status = 400, array $details = [] ): \WP_REST_Response {
        $body = [
            'success' => false,
            'error'   => [
                'code'    => $code,
                'message' => $message,
            ],
        ];
        if ( ! empty( $details ) ) {
            $body['error']['details'] = $details;
        }
        return new \WP_REST_Response( $body, $status );
    }
}

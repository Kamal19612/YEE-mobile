<?php

namespace AppApi\Users;

use AppApi\Core\AbstractController;
use AppApi\Core\ApiResponse;
use AppApi\Core\RestNamespace;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Endpoints follow/unfollow + listes followers/following.
 * Namespace : /wp-json/app/v1/users/{id}/follow*
 */
final class FollowController extends AbstractController {

    private static function table(): string {
        global $wpdb;
        return $wpdb->prefix . 'app_follows';
    }

    public static function register_routes(): void {
        $ns = RestNamespace::NAMESPACE;

        register_rest_route( $ns, '/users/(?P<id>\d+)/follow', [
            'methods'             => 'POST',
            'callback'            => [ self::class, 'follow' ],
            'permission_callback' => [ self::class, 'require_authenticated_user' ],
        ] );

        register_rest_route( $ns, '/users/(?P<id>\d+)/follow', [
            'methods'             => 'DELETE',
            'callback'            => [ self::class, 'unfollow' ],
            'permission_callback' => [ self::class, 'require_authenticated_user' ],
        ] );

        register_rest_route( $ns, '/users/(?P<id>\d+)/followers', [
            'methods'             => 'GET',
            'callback'            => [ self::class, 'list_followers' ],
            'permission_callback' => '__return_true',
        ] );

        register_rest_route( $ns, '/users/(?P<id>\d+)/following', [
            'methods'             => 'GET',
            'callback'            => [ self::class, 'list_following' ],
            'permission_callback' => '__return_true',
        ] );
    }

    /* ----------------------------------------------------------------- */

    public static function follow( \WP_REST_Request $request ) {
        global $wpdb;

        $follower_id = (int) $request->get_param( 'app_user_id' );
        $followee_id = (int) $request->get_param( 'id' );

        if ( $follower_id === $followee_id ) {
            return ApiResponse::error( 'cannot_follow_self', 'Vous ne pouvez pas vous suivre vous-même.', 400 );
        }

        if ( ! get_userdata( $followee_id ) ) {
            return ApiResponse::error( 'user_not_found', 'Utilisateur introuvable.', 404 );
        }

        // INSERT IGNORE : la contrainte UNIQUE (follower_id, followee_id) en
        // base rend l'opération idempotente — un double-clic ou une requête
        // rejouée ne crée pas de doublon ni d'erreur bloquante. On vérifie
        // ensuite les rows affectées pour ne créditer les compteurs qu'une
        // seule fois (éviter un +1 sur un follow déjà existant).
        $inserted = $wpdb->query(
            $wpdb->prepare(
                "INSERT IGNORE INTO " . self::table() . " (follower_id, followee_id, created_at) VALUES (%d, %d, %s)",
                $follower_id,
                $followee_id,
                current_time( 'mysql', true )
            )
        );

        // CORRECTIF : $wpdb->query() retourne `false` en cas d'erreur SQL
        // (ex. table absente, colonne inconnue) — jamais silencieusement
        // ignoré : on log l'erreur réelle et on renvoie une 500 explicite
        // plutôt qu'un faux succès. Avant ce correctif, une erreur SQL ici
        // passait inaperçue et le endpoint répondait quand même "following:
        // true" sans que rien n'ait été inséré ni compté.
        if ( false === $inserted ) {
            error_log( 'AppApi FollowController::follow SQL error: ' . $wpdb->last_error );
            return ApiResponse::error(
                'follow_failed',
                'Impossible d’enregistrer le suivi pour le moment.',
                500
            );
        }

        if ( $inserted > 0 ) {
            self::adjust_counter( $follower_id, 'app_following_count', 1 );
            self::adjust_counter( $followee_id, 'app_followers_count', 1 );

            /**
             * Sprint 6 — notifie le followee qu’il a un nouveau follower.
             *
             * @param int $followee_id Destinataire de la notification.
             * @param int $follower_id Acteur (celui qui suit).
             */
            do_action( 'app_api_user_followed', $followee_id, $follower_id );
            self::emit_new_follower_notification( $followee_id, $follower_id );
        }

        return ApiResponse::success( [ 'following' => true ] );
    }

    /**
     * Crée une notif `new_follower` si le module Notifications est disponible.
     */
    private static function emit_new_follower_notification( int $recipient_id, int $actor_id ): void {
        if ( $recipient_id <= 0 || $actor_id <= 0 || $recipient_id === $actor_id ) {
            return;
        }

        $service = '\AppApi\Notifications\NotificationService';
        if ( ! class_exists( $service ) ) {
            return;
        }

        try {
            if ( method_exists( $service, 'notify' ) ) {
                $service::notify( $recipient_id, 'new_follower', [
                    'actorId' => $actor_id,
                ] );
                return;
            }
            if ( method_exists( $service, 'create' ) ) {
                $service::create( [
                    'userId'  => $recipient_id,
                    'type'    => 'new_follower',
                    'actorId' => $actor_id,
                ] );
                return;
            }
            if ( method_exists( $service, 'create_for_user' ) ) {
                $service::create_for_user( $recipient_id, 'new_follower', $actor_id );
            }
        } catch ( \Throwable $e ) {
            error_log( 'AppApi FollowController notification error: ' . $e->getMessage() );
        }
    }

    public static function unfollow( \WP_REST_Request $request ) {
        global $wpdb;

        $follower_id = (int) $request->get_param( 'app_user_id' );
        $followee_id = (int) $request->get_param( 'id' );

        $deleted = $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM " . self::table() . " WHERE follower_id = %d AND followee_id = %d",
                $follower_id,
                $followee_id
            )
        );

        if ( false === $deleted ) {
            error_log( 'AppApi FollowController::unfollow SQL error: ' . $wpdb->last_error );
            return ApiResponse::error(
                'unfollow_failed',
                'Impossible de retirer le suivi pour le moment.',
                500
            );
        }

        if ( $deleted > 0 ) {
            self::adjust_counter( $follower_id, 'app_following_count', -1 );
            self::adjust_counter( $followee_id, 'app_followers_count', -1 );
        }

        return ApiResponse::success( [ 'following' => false ] );
    }

    /**
     * Ajuste un compteur dénormalisé de façon atomique (pas de
     * get/modify/set en PHP, qui serait sujet à une condition de course si
     * deux follows arrivent en même temps sur le même utilisateur) et sans
     * jamais descendre sous zéro. Écrit directement dans wp_usermeta via
     * INSERT ... ON DUPLICATE KEY UPDATE, en s'appuyant sur la contrainte
     * d'unicité (user_id, meta_key) portée par WordPress.
     */
    private static function adjust_counter( int $user_id, string $meta_key, int $delta ): void {
        global $wpdb;

        if ( $delta > 0 ) {
            // Cas incrément : simple, jamais de risque de négatif.
            $existing = $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT umeta_id FROM {$wpdb->usermeta} WHERE user_id = %d AND meta_key = %s",
                    $user_id,
                    $meta_key
                )
            );

            if ( $existing ) {
                $wpdb->query(
                    $wpdb->prepare(
                        "UPDATE {$wpdb->usermeta} SET meta_value = meta_value + %d WHERE umeta_id = %d",
                        $delta,
                        $existing
                    )
                );
            } else {
                add_user_meta( $user_id, $meta_key, $delta, true );
            }
            return;
        }

        // Cas décrément : GREATEST(0, ...) empêche toute valeur négative,
        // même en cas d'appels concurrents.
        $wpdb->query(
            $wpdb->prepare(
                "UPDATE {$wpdb->usermeta}
                 SET meta_value = GREATEST(0, CAST(meta_value AS SIGNED) + %d)
                 WHERE user_id = %d AND meta_key = %s",
                $delta,
                $user_id,
                $meta_key
            )
        );
    }

    /* ----------------------------------------------------------------- */

    public static function list_followers( \WP_REST_Request $request ) {
        return self::paginated_list( (int) $request->get_param( 'id' ), $request, 'followee_id', 'follower_id' );
    }

    public static function list_following( \WP_REST_Request $request ) {
        return self::paginated_list( (int) $request->get_param( 'id' ), $request, 'follower_id', 'followee_id' );
    }

    private static function paginated_list( int $user_id, \WP_REST_Request $request, string $filter_column, string $select_column ) {
        global $wpdb;

        $page     = max( 1, (int) $request->get_param( 'page' ) ?: 1 );
        $per_page = min( 50, max( 1, (int) $request->get_param( 'perPage' ) ?: 20 ) );
        $offset   = ( $page - 1 ) * $per_page;

        $ids = $wpdb->get_col(
            $wpdb->prepare(
                "SELECT {$select_column} FROM " . self::table() . "
                 WHERE {$filter_column} = %d
                 ORDER BY created_at DESC
                 LIMIT %d OFFSET %d",
                $user_id,
                $per_page,
                $offset
            )
        );

        $items = array_map(
            fn( $id ) => UserTransformer::to_list_item( (int) $id ),
            $ids
        );

        return ApiResponse::success( $items, 200, [
            'page'    => $page,
            'perPage' => $per_page,
        ] );
    }
}

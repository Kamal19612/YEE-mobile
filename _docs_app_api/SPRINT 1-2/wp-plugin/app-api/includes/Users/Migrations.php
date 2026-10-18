<?php

namespace AppApi\Users;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Table wp_app_follows : relation asymétrique follower -> followee.
 *
 * Les compteurs (followersCount, followingCount) sont DÉNORMALISÉS dans
 * user_meta plutôt que recalculés via COUNT(*) à chaque affichage de profil
 * — indispensable pour tenir la charge à l'échelle visée (cf. stratégie de
 * cache de l'architecture : "les compteurs doivent être dénormalisés").
 * Ils sont incrémentés/décrémentés de façon atomique au moment du
 * follow/unfollow (FollowController), jamais recalculés à la volée.
 */
final class Migrations {

    private const DB_VERSION_OPTION  = 'app_api_users_db_version';
    private const CURRENT_DB_VERSION = '1.0.0';

    public static function run(): void {
        global $wpdb;

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        $charset_collate = $wpdb->get_charset_collate();
        $table = $wpdb->prefix . 'app_follows';

        $sql = "CREATE TABLE {$table} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            follower_id BIGINT UNSIGNED NOT NULL,
            followee_id BIGINT UNSIGNED NOT NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY follower_followee (follower_id, followee_id),
            KEY follower_id (follower_id),
            KEY followee_id (followee_id)
        ) {$charset_collate};";

        dbDelta( $sql );

        update_option( self::DB_VERSION_OPTION, self::CURRENT_DB_VERSION );
    }

    public static function maybe_upgrade(): void {
        if ( get_option( self::DB_VERSION_OPTION ) !== self::CURRENT_DB_VERSION ) {
            self::run();
        }
    }
}

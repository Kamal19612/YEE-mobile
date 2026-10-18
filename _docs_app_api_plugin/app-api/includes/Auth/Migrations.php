<?php

namespace AppApi\Auth;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Gère la création/mise à jour des tables custom du module Auth.
 * Utilise dbDelta(), qui est idempotent : peut être rappelé sans risque à
 * chaque déploiement pour appliquer les évolutions de schéma.
 */
final class Migrations {

    private const DB_VERSION_OPTION = 'app_api_db_version';
    private const CURRENT_DB_VERSION = '1.0.0';

    public static function run(): void {
        global $wpdb;

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        $charset_collate = $wpdb->get_charset_collate();
        $table = $wpdb->prefix . 'app_refresh_tokens';

        $sql = "CREATE TABLE {$table} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            token_hash CHAR(64) NOT NULL,
            user_agent VARCHAR(255) NULL,
            ip_address VARCHAR(45) NULL,
            remember_me TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL,
            expires_at DATETIME NOT NULL,
            revoked_at DATETIME NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY token_hash (token_hash),
            KEY user_id (user_id),
            KEY expires_at (expires_at)
        ) {$charset_collate};";

        dbDelta( $sql );

        update_option( self::DB_VERSION_OPTION, self::CURRENT_DB_VERSION );
    }

    /**
     * Rappelé à chaque chargement du plugin (plugins_loaded) : ne relance la
     * migration que si la version en base diffère, pour éviter un dbDelta()
     * coûteux à chaque requête HTTP.
     */
    public static function maybe_upgrade(): void {
        if ( get_option( self::DB_VERSION_OPTION ) !== self::CURRENT_DB_VERSION ) {
            self::run();
        }
    }
}

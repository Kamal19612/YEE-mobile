<?php

namespace AppApi\Auth;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Rate limiting anti brute-force pour les endpoints sensibles
 * (login, register, forgot-password, verify-email).
 *
 * Implémentation via wp_cache_*() : si le drop-in object-cache.php Redis est
 * en place (cf. stratégie de cache de l'architecture), ces compteurs vivent
 * dans Redis et sont donc partagés entre toutes les instances WordPress
 * (indispensable avec un load balancer / plusieurs serveurs applicatifs).
 * Sans Redis, wp_cache_* retombe sur un cache mémoire non persistant : à
 * éviter en production pour cette raison précise.
 *
 * Stratégie : fenêtre glissante simple (compteur + expiration), à double
 * clé (par IP ET par identifiant ciblé) pour bloquer aussi bien un attaquant
 * distribué (plusieurs IP visant un seul compte) qu'un attaquant mono-IP
 * visant plusieurs comptes.
 */
final class RateLimiter {

    private const GROUP = 'app_rate_limit';

    /**
     * @param string $action     Nom logique de l'action ('login', 'register'...)
     * @param string $identifier IP ou email ciblé.
     * @param int    $max_hits   Nombre de tentatives autorisées dans la fenêtre.
     * @param int    $window     Durée de la fenêtre en secondes.
     *
     * @return bool True si la limite est dépassée (requête à bloquer).
     */
    public static function is_rate_limited( string $action, string $identifier, int $max_hits, int $window ): bool {
        $key = self::cache_key( $action, $identifier );
        $hits = wp_cache_get( $key, self::GROUP );

        if ( false === $hits ) {
            wp_cache_set( $key, 1, self::GROUP, $window );
            return false;
        }

        if ( (int) $hits >= $max_hits ) {
            return true;
        }

        wp_cache_incr( $key, 1, self::GROUP );
        return false;
    }

    /** Réinitialise le compteur (ex. après une connexion réussie). */
    public static function reset( string $action, string $identifier ): void {
        wp_cache_delete( self::cache_key( $action, $identifier ), self::GROUP );
    }

    private static function cache_key( string $action, string $identifier ): string {
        return $action . ':' . hash( 'sha256', $identifier );
    }

    /**
     * Résout l'IP cliente en tenant compte d'un éventuel reverse proxy
     * (Nginx/Cloudflare). ATTENTION : X-Forwarded-For n'est fiable que si le
     * reverse proxy en amont écrase systématiquement l'en-tête (sinon un
     * attaquant peut le falsifier pour contourner le rate limiting) — à
     * configurer explicitement au niveau Nginx (`proxy_set_header`).
     */
    public static function get_client_ip(): string {
        if ( ! empty( $_SERVER['HTTP_CF_CONNECTING_IP'] ) ) {
            return sanitize_text_field( wp_unslash( $_SERVER['HTTP_CF_CONNECTING_IP'] ) );
        }
        if ( ! empty( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) {
            $ips = explode( ',', sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) );
            return trim( $ips[0] );
        }
        return isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '0.0.0.0';
    }
}

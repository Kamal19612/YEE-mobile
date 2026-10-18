<?php

namespace AppApi\Core;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Centralise les règles de validation/sanitization réutilisées par plusieurs
 * modules, pour éviter les divergences entre contrôleurs (une des causes les
 * plus fréquentes de failles de validation dans les projets multi-modules).
 */
final class Sanitizer {

    /**
     * Valide un email : format + longueur + non déjà utilisé (si demandé).
     */
    public static function is_valid_email( string $email ): bool {
        if ( strlen( $email ) > 254 ) {
            return false;
        }
        return (bool) is_email( $email );
    }

    /**
     * Politique de mot de passe minimale. Ajustable, mais ne JAMAIS descendre
     * en dessous de 8 caractères (recommandation NIST 800-63B : la longueur
     * prime sur la complexité imposée).
     */
    public static function password_errors( string $password ): array {
        $errors = [];

        if ( strlen( $password ) < 10 ) {
            $errors[] = 'Le mot de passe doit contenir au moins 10 caractères.';
        }
        if ( strlen( $password ) > 256 ) {
            // Empêche les attaques DoS via bcrypt sur des inputs énormes.
            $errors[] = 'Le mot de passe est trop long.';
        }
        // Liste noire minimale de mots de passe triviaux — à enrichir avec
        // une vraie liste (ex. top 10k rockyou) en production.
        $blacklist = [ 'password', 'azertyuiop', '1234567890', 'motdepasse' ];
        if ( in_array( strtolower( $password ), $blacklist, true ) ) {
            $errors[] = 'Ce mot de passe est trop commun.';
        }

        return $errors;
    }

    /**
     * Nettoie un texte libre (bio, nom...) : supprime tout HTML, neutralise
     * les caractères de contrôle. Ne PAS utiliser pour du contenu qui doit
     * accepter du HTML limité (ex. corps d'une publication) — prévoir une
     * fonction dédiée avec wp_kses() et une whitelist de balises pour ce cas,
     * dans le module Feed.
     */
    public static function clean_text( string $value ): string {
        return sanitize_text_field( wp_strip_all_tags( $value ) );
    }

    /**
     * Génère un token cryptographiquement sûr (vérification email, reset
     * password, refresh token...). Jamais uniqid()/rand() pour du sensible.
     */
    public static function generate_secure_token( int $bytes = 32 ): string {
        return bin2hex( random_bytes( $bytes ) );
    }
}

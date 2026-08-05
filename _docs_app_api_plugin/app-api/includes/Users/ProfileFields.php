<?php

namespace AppApi\Users;

use AppApi\Core\Sanitizer;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Centralise la liste des champs de profil éditables, leur clé de stockage
 * (user_meta), leur règle de sanitization et leur longueur max.
 *
 * Pourquoi une classe dédiée plutôt que de coder ça en dur dans le
 * contrôleur : c'est LE seul endroit à modifier pour ajouter un champ de
 * profil (ex. "site web") — le contrôleur, le transformer et la validation
 * itèrent tous sur cette même définition, donc rien ne peut diverger entre
 * "ce qu'on accepte en écriture" et "ce qu'on expose en lecture".
 *
 * Ces champs sont volontairement stockés en user_meta natif WordPress
 * (pas en xprofile BuddyPress) : cela évite une dépendance dure à
 * BuddyPress pour des données de profil basiques, et reste cohérent avec
 * le principe "BuddyPress = moteur de données social (groupes, activité),
 * pas source de vérité pour tout le profil".
 */
final class ProfileFields {

    public const BIO          = 'app_bio';
    public const PROFESSION   = 'app_profession';
    public const ORGANIZATION = 'app_organization';
    public const LOCATION     = 'app_location';
    public const SOCIAL_LINKS = 'app_social_links'; // JSON : { linkedin, twitter, website }

    /**
     * @return array<string, array{maxLength:int}> Clé meta => règles.
     */
    public static function editable_fields(): array {
        return [
            self::BIO          => [ 'max_length' => 500 ],
            self::PROFESSION   => [ 'max_length' => 120 ],
            self::ORGANIZATION => [ 'max_length' => 120 ],
            self::LOCATION     => [ 'max_length' => 120 ],
        ];
    }

    /**
     * Valide et nettoie le payload d'édition de profil envoyé par le
     * frontend. Retourne [valeurs_nettoyées, erreurs].
     *
     * @param array $input Ex. ['bio' => '...', 'profession' => '...', 'socialLinks' => [...]]
     * @return array{0: array<string,mixed>, 1: array<string,string>}
     */
    public static function validate_and_sanitize( array $input ): array {
        $clean  = [];
        $errors = [];

        $map = [
            'bio'          => self::BIO,
            'profession'   => self::PROFESSION,
            'organization' => self::ORGANIZATION,
            'location'     => self::LOCATION,
        ];

        foreach ( $map as $frontend_key => $meta_key ) {
            if ( ! array_key_exists( $frontend_key, $input ) ) {
                continue; // Champ absent du payload = non modifié (PATCH sémantique).
            }

            $value = Sanitizer::clean_text( (string) $input[ $frontend_key ] );
            $rules = self::editable_fields()[ $meta_key ];

            if ( mb_strlen( $value ) > $rules['max_length'] ) {
                $errors[ $frontend_key ] = sprintf(
                    'Ce champ ne doit pas dépasser %d caractères.',
                    $rules['max_length']
                );
                continue;
            }

            $clean[ $meta_key ] = $value;
        }

        if ( array_key_exists( 'socialLinks', $input ) && is_array( $input['socialLinks'] ) ) {
            $allowed_keys = [ 'linkedin', 'twitter', 'website' ];
            $social = [];

            foreach ( $allowed_keys as $key ) {
                if ( empty( $input['socialLinks'][ $key ] ) ) {
                    continue;
                }
                $url = esc_url_raw( (string) $input['socialLinks'][ $key ] );

                // N'accepte que du https:// — bloque javascript:, data:, etc.
                // (protection contre l'injection de liens malveillants dans
                // un champ affiché tel quel sur un profil public).
                if ( ! $url || stripos( $url, 'https://' ) !== 0 ) {
                    $errors['socialLinks'] = 'Les liens doivent être des URL https:// valides.';
                    continue;
                }
                $social[ $key ] = $url;
            }

            $clean[ self::SOCIAL_LINKS ] = wp_json_encode( $social );
        }

        return [ $clean, $errors ];
    }
}

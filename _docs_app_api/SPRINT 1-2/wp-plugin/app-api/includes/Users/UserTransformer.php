<?php

namespace AppApi\Users;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Transforme un utilisateur WordPress (+ ses meta) en payload JSON stable.
 * C'est le "Transformer" évoqué dans l'architecture : React ne voit jamais
 * un WP_User brut, toujours cette structure — qui ne change pas si demain
 * la source de la donnée change (BuddyPress -> service dédié, etc.).
 */
final class UserTransformer {

    public const AVATAR_META = 'app_avatar_attachment_id';
    public const COVER_META  = 'app_cover_attachment_id';

    /**
     * URL de l'avatar uploadé via App API, ou null si absent.
     */
    public static function custom_avatar_url( int $user_id, string $size = 'large' ): ?string {
        $attachment_id = (int) get_user_meta( $user_id, self::AVATAR_META, true );
        if ( $attachment_id <= 0 ) {
            return null;
        }
        $url = wp_get_attachment_image_url( $attachment_id, $size );
        return $url ? $url : null;
    }

    /**
     * URL de la couverture uploadée via App API, ou null si absente.
     */
    public static function custom_cover_url( int $user_id, string $size = 'large' ): ?string {
        $attachment_id = (int) get_user_meta( $user_id, self::COVER_META, true );
        if ( $attachment_id <= 0 ) {
            return null;
        }
        $url = wp_get_attachment_image_url( $attachment_id, $size );
        return $url ? $url : null;
    }

    /**
     * Avatar affiché : upload App API en priorité, sinon Gravatar WP.
     * Le filtre get_avatar_url (app-api.php) utilise custom_avatar_url : pas de boucle.
     */
    public static function avatar_url( int $user_id, int $pixel_size = 300 ): string {
        $custom = self::custom_avatar_url( $user_id, $pixel_size >= 200 ? 'large' : 'thumbnail' );
        if ( $custom ) {
            return $custom;
        }
        return (string) get_avatar_url( $user_id, [ 'size' => $pixel_size ] );
    }

    /**
     * @param bool $is_self  True si le viewer consulte son propre profil :
     *                       débloque les champs privés (email, settings...).
     */
    public static function to_public_profile( int $user_id, bool $is_self = false ): array {
        $user = get_userdata( $user_id );

        if ( ! $user ) {
            return [];
        }

        $social_links_raw = get_user_meta( $user_id, ProfileFields::SOCIAL_LINKS, true );
        $social_links      = $social_links_raw ? json_decode( $social_links_raw, true ) : [];

        $payload = [
            'id'           => (string) $user->ID,
            'displayName'  => $user->display_name,
            'mentionName'  => $user->user_nicename ?: $user->user_login,
            'bio'          => (string) get_user_meta( $user_id, ProfileFields::BIO, true ),
            'profession'   => (string) get_user_meta( $user_id, ProfileFields::PROFESSION, true ),
            'organization' => (string) get_user_meta( $user_id, ProfileFields::ORGANIZATION, true ),
            'location'     => (string) get_user_meta( $user_id, ProfileFields::LOCATION, true ),
            'socialLinks'  => is_array( $social_links ) ? $social_links : [],
            // IMPORTANT : lire app_avatar_attachment_id, pas get_avatar_url seul
            // (sinon l'upload “réussit” mais disparaît après reconnexion → Gravatar).
            'avatarUrl'    => self::avatar_url( $user_id, 300 ),
            'coverUrl'     => self::custom_cover_url( $user_id, 'large' ),
            'stats' => [
                // Dénormalisés (cf. Migrations.php) — jamais un COUNT() à la volée.
                'followersCount' => (int) get_user_meta( $user_id, 'app_followers_count', true ),
                'followingCount' => (int) get_user_meta( $user_id, 'app_following_count', true ),
                // Postes à 0 tant que le module Feed n'est pas branché (sprint ultérieur) ;
                // le contrat de sortie ne changera pas, seule la valeur se peuplera.
                'postsCount'     => (int) get_user_meta( $user_id, 'app_posts_count', true ),
            ],
            'joinedAt' => mysql2date( 'c', $user->user_registered, false ),
        ];

        // Champs privés : uniquement visibles par le propriétaire du profil.
        if ( $is_self ) {
            $payload['email'] = $user->user_email;
        }

        return $payload;
    }

    /**
     * Version allégée utilisée dans les listes (followers/following, résultats
     * de recherche...) — évite de transporter bio/socialLinks/stats complets
     * quand seule une carte "avatar + nom" est affichée, ce qui réduit le
     * poids des réponses de liste à grande échelle.
     */
    public static function to_list_item( int $user_id ): array {
        $user = get_userdata( $user_id );
        if ( ! $user ) {
            return [];
        }

        return [
            'id'          => (string) $user->ID,
            'displayName' => $user->display_name,
            'avatarUrl'   => self::avatar_url( $user_id, 100 ),
            'profession'  => (string) get_user_meta( $user_id, ProfileFields::PROFESSION, true ),
        ];
    }
}

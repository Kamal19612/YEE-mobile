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
            'bio'          => (string) get_user_meta( $user_id, ProfileFields::BIO, true ),
            'profession'   => (string) get_user_meta( $user_id, ProfileFields::PROFESSION, true ),
            'organization' => (string) get_user_meta( $user_id, ProfileFields::ORGANIZATION, true ),
            'location'     => (string) get_user_meta( $user_id, ProfileFields::LOCATION, true ),
            'socialLinks'  => is_array( $social_links ) ? $social_links : [],
            'avatarUrl'    => get_avatar_url( $user_id, [ 'size' => 300 ] ),
            'coverUrl'     => get_user_meta( $user_id, 'app_cover_attachment_id', true )
                ? wp_get_attachment_image_url( (int) get_user_meta( $user_id, 'app_cover_attachment_id', true ), 'large' )
                : null,
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
            'avatarUrl'   => get_avatar_url( $user_id, [ 'size' => 100 ] ),
            'profession'  => (string) get_user_meta( $user_id, ProfileFields::PROFESSION, true ),
        ];
    }
}

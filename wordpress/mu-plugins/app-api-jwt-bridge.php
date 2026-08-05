<?php
/**
 * Plugin Name: App API JWT → WordPress User Bridge
 * Description: Fait reconnaître le Bearer JWT App API (app/v1) comme utilisateur
 *              WordPress courant pour BuddyPress / wp/v2 (écriture activity, media…).
 * Version: 1.0.0
 *
 * INSTALLATION (Hostinger) :
 *   1. Copier ce fichier dans wp-content/mu-plugins/app-api-jwt-bridge.php
 *      (créer le dossier mu-plugins s’il n’existe pas)
 *   2. Vérifier que le plugin « App API » est actif et APP_JWT_SECRET défini
 *   3. Aucune activation manuelle : les must-use plugins se chargent seuls
 *
 * SANS CE BRIDGE : login App API fonctionne, mais POST /buddypress/v1/activity
 * et /wp/v2/* authentifiés restent en 401 (JWT App API ≠ auth WP native).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_filter( 'determine_current_user', 'app_api_jwt_bridge_determine_user', 20 );

/**
 * @param int|false $user_id
 * @return int|false
 */
function app_api_jwt_bridge_determine_user( $user_id ) {
	if ( $user_id ) {
		return $user_id;
	}

	// Uniquement sur les requêtes REST (évite d’impacter le front WP classique).
	if ( ! defined( 'REST_REQUEST' ) || ! REST_REQUEST ) {
		return $user_id;
	}

	$auth = '';
	if ( isset( $_SERVER['HTTP_AUTHORIZATION'] ) ) {
		$auth = sanitize_text_field( wp_unslash( $_SERVER['HTTP_AUTHORIZATION'] ) );
	} elseif ( isset( $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ) ) {
		$auth = sanitize_text_field( wp_unslash( $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ) );
	}

	if ( ! $auth || stripos( $auth, 'Bearer ' ) !== 0 ) {
		return $user_id;
	}

	$token = trim( substr( $auth, 7 ) );
	if ( $token === '' ) {
		return $user_id;
	}

	if ( ! class_exists( '\AppApi\Auth\JwtService' ) ) {
		return $user_id;
	}

	$claims = \AppApi\Auth\JwtService::verify_access_token( $token );
	if ( is_wp_error( $claims ) ) {
		return $user_id;
	}

	$uid = isset( $claims['sub'] ) ? (int) $claims['sub'] : 0;
	if ( $uid <= 0 || ! get_userdata( $uid ) ) {
		return $user_id;
	}

	return $uid;
}

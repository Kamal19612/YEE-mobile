<?php
/**
 * Plugin Name: App API (Headless Layer)
 * Description: Couche d'API custom exposant la plateforme communautaire à React.
 *              Namespace REST : app/v1. Aucun endpoint BuddyPress/WP natif ne doit
 *              être consommé directement par le frontend : tout passe par ici.
 * Version:     1.0.0-sprint1
 * Author:      Équipe technique
 *
 * SÉCURITÉ : ce fichier ne doit contenir aucune logique métier, uniquement le
 * bootstrap (chargement des classes + hooks d'init). Toute la logique vit dans
 * includes/.
 */

// Empêche l'accès direct au fichier.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'APP_API_VERSION', '1.0.0-sprint1' );
define( 'APP_API_DIR', plugin_dir_path( __FILE__ ) );
define( 'APP_API_NAMESPACE', 'app/v1' );

/**
 * Autoload manuel simple (PSR-4 léger) pour includes/.
 * Sur un projet plus mûr : remplacer par l'autoload Composer généré
 * (composer dump-autoload -o) une fois le plugin sur un registry accessible.
 */
spl_autoload_register( function ( $class ) {
    $prefix = 'AppApi\\';
    if ( strpos( $class, $prefix ) !== 0 ) {
        return;
    }
    $relative = substr( $class, strlen( $prefix ) );
    $path     = APP_API_DIR . 'includes/' . str_replace( '\\', '/', $relative ) . '.php';
    if ( file_exists( $path ) ) {
        require_once $path;
    }
} );

use AppApi\Core\RestNamespace;
use AppApi\Auth\Migrations;
use AppApi\Auth\AuthController;
use AppApi\Users\Migrations as UsersMigrations;
use AppApi\Users\ProfileController;
use AppApi\Users\FollowController;

/**
 * Active le mode headless strict : coupe tout ce qui pousse WordPress à faire
 * du rendu HTML côté serveur (le thème actif doit rester un thème "vide", mais
 * on ceinture-bretelles ici pour ne dépendre de rien côté thème).
 */
add_action( 'init', function () {
    remove_action( 'wp_head', 'wp_generator' ); // Ne pas divulguer la version WP.
}, 1 );

/**
 * Création / mise à jour des tables custom nécessaires (refresh tokens, etc.)
 * Exécuté à l'activation du plugin ET vérifié à chaque chargement (dbDelta est
 * idempotent) pour couvrir les mises à jour via déploiement Git plutôt que
 * l'UI d'activation WordPress.
 */
register_activation_hook( __FILE__, [ Migrations::class, 'run' ] );
register_activation_hook( __FILE__, [ UsersMigrations::class, 'run' ] );
add_action( 'plugins_loaded', [ Migrations::class, 'maybe_upgrade' ] );
add_action( 'plugins_loaded', [ UsersMigrations::class, 'maybe_upgrade' ] );

/**
 * Enregistrement des routes REST. Chaque module (Auth, Users, Feed, ...)
 * expose une méthode statique register_routes() appelée ici. Seul Auth est
 * implémenté dans ce sprint ; les autres seront ajoutés module par module.
 */
add_action( 'rest_api_init', function () {
    AuthController::register_routes();
    ProfileController::register_routes();
    FollowController::register_routes();
} );

/**
 * CORS strict : whitelist explicite du domaine frontend (jamais de wildcard).
 * À adapter par environnement (dev/staging/prod) via une constante définie
 * dans wp-config.php, PAS en dur ici.
 */
add_action( 'rest_api_init', function () {
    remove_filter( 'rest_pre_serve_request', 'rest_send_cors_headers' );

    add_filter( 'rest_pre_serve_request', function ( $value ) {
        $allowed_origins = defined( 'APP_ALLOWED_ORIGINS' )
            ? APP_ALLOWED_ORIGINS
            : []; // Ex. dans wp-config.php : define('APP_ALLOWED_ORIGINS', ['https://app.example.com']);

        $origin = get_http_origin();

        if ( $origin && in_array( $origin, $allowed_origins, true ) ) {
            header( 'Access-Control-Allow-Origin: ' . esc_url_raw( $origin ) );
            header( 'Access-Control-Allow-Credentials: true' );
            header( 'Access-Control-Allow-Headers: Authorization, Content-Type' );
            header( 'Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS' );
            header( 'Vary: Origin' );
        }

        return $value;
    }, 15 );
}, 1 );

/**
 * DÉFENSE EN PROFONDEUR CONTRE LE CACHE PAGE/OBJET DE TIERS (LiteSpeed,
 * WP Rocket, W3TC, cache géré par l'hébergeur...).
 *
 * Symptôme observé sans ce correctif : un plugin de cache "page" (LiteSpeed
 * Cache notamment) peut mettre en cache la réponse JSON d'un endpoint REST
 * comme n'importe quelle URL classique. Résultat : une lecture juste après
 * une écriture (ex. follow puis GET /users/{id}) renvoie une valeur périmée
 * tant que le cache n'est pas purgé manuellement — un comportement invisible
 * en développement mais potentiellement trompeur en production.
 *
 * On ne peut pas compter uniquement sur la configuration admin du plugin de
 * cache (exclusion de /wp-json/*) car elle diffère d'un environnement à
 * l'autre et peut être oubliée lors d'un déploiement. On force donc
 * explicitement, au niveau du code, deux choses pour TOUTES les routes de
 * notre namespace :
 *   1. Les en-têtes HTTP standards no-cache (nocache_headers()).
 *   2. La constante LSCACHE_NO_CACHE, reconnue spécifiquement par LiteSpeed
 *      Cache pour exclure une requête de son cache de page, même si
 *      l'exclusion n'est pas configurée dans son panneau d'administration.
 *
 * Cette API est par nature dynamique et souvent authentifiée (JWT) : aucune
 * réponse ne doit jamais être servie depuis un cache de page tiers. Le cache
 * applicatif volontaire (Redis object cache, React Query côté frontend) est
 * géré séparément et reste inchangé.
 */
add_action( 'rest_api_init', function () {
    if ( ! defined( 'LSCACHE_NO_CACHE' ) ) {
        define( 'LSCACHE_NO_CACHE', true );
    }

    add_filter( 'rest_pre_serve_request', function ( $value ) {
        if ( ! headers_sent() ) {
            nocache_headers();
            header( 'X-LiteSpeed-Cache-Control: no-cache' );
        }
        return $value;
    }, 20 ); // Après le filtre CORS (priorité 15) pour ne pas interférer.
}, 5 ); // Avant l'enregistrement CORS pour poser LSCACHE_NO_CACHE au plus tôt.

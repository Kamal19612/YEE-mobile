# Bridge JWT App API → WordPress / BuddyPress

## Pourquoi
Le JWT émis par `/app/v1/auth/login` n’est reconnu **que** par les routes App API.
Sans bridge, `POST /buddypress/v1/activity`, `/wp/v2/media`, etc. restent en **401**.

## Installation Hostinger
1. Ouvre le gestionnaire de fichiers (ou FTP).
2. Va dans `wp-content/`.
3. Crée le dossier `mu-plugins` s’il n’existe pas.
4. Upload le fichier :
   `wordpress/mu-plugins/app-api-jwt-bridge.php`
   vers
   `wp-content/mu-plugins/app-api-jwt-bridge.php`
5. Vérifie que le plugin **App API** est actif et que `APP_JWT_SECRET` est défini dans `wp-config.php`.
6. Corrige aussi (si besoin) :
   ```php
   define('APP_COOKIE_DOMAIN', ''); // pas .example.com
   ```

## Vérification
1. Connecte-toi sur le frontend React.
2. Publie une story depuis le composer.
3. Si 401 → le bridge n’est pas chargé (mauvais chemin ou App API inactif).

## Avatar / couverture App API

Les uploads sont stockés en user_meta :
- `app_avatar_attachment_id`
- `app_cover_attachment_id`

Le plugin **doit** exposer ces URLs via `UserTransformer` (pas seulement `get_avatar_url` / Gravatar).
Après mise à jour du plugin sur Hostinger, reconnecte-toi : photo + cover persistent, et l’avatar apparaît aussi dans l’annuaire / le feed BuddyPress.

Fichiers à redéployer (plugin App API) :
- `includes/Users/UserTransformer.php`
- `includes/Auth/AuthController.php`
- `includes/Users/FollowController.php` (GET follow status + `is_following`)
- `includes/Users/ProfileController.php` (`isFollowing` sur profil public)
- `includes/Core/AbstractController.php` (`maybe_authenticate`)
- `app-api.php` (filtres `get_avatar_url` + BP REST)

## Feed actuel
- CPT `recits` : **absent** sur le site → non utilisé.
- Source live : **BuddyPress Activity** (`/buddypress/v1/activity`).
- Si le CPT `recit` est déployé plus tard, `src/api/feed.js` bascule automatiquement.

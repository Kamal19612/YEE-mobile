# BuddyBoss (React + Vite)

Reconstruction React + Tailwind du thème BuddyBoss (App API WordPress).

## Dev

```bash
npm install
npm run dev
```

Copier `.env.example` → `.env`. En local, le proxy Vite relaie `/wp-json` vers `https://wp.socialracine.com`.

## GitHub Pages

Site : https://kamal19612.github.io/YEE/

1. **Settings → Actions → General** : autoriser les Actions, puis **Settings → Pages → Source** : **GitHub Actions** (pas « Deploy from a branch »).
2. Après un push sur `main`, le workflow build avec `base: /YEE/` et des **URLs absolues** vers WordPress (`VITE_WP_API_URL` / `VITE_APP_API_URL`).

### Important : domaines front ≠ API

- **Frontend** = GitHub Pages (`kamal19612.github.io/YEE/`) ou `https://yee.socialracine.com`
- **API** = WordPress (`https://wp.socialracine.com`)

### CORS (obligatoire en prod)

Dans `wp-config.php` WordPress, autoriser les origines front :

```php
define('APP_ALLOWED_ORIGINS', [
  'https://kamal19612.github.io',
  'https://yee.socialracine.com',
]);
```

Sans ça, le navigateur bloquera les appels `wp-json` même si l’API répond en 200.

En local, pour tester le build Pages :

```bash
$env:VITE_BASE='/YEE/'; $env:VITE_WP_API_URL='https://wp.socialracine.com/wp-json'; $env:VITE_APP_API_URL='https://wp.socialracine.com/wp-json/app/v1'; npm run build
npm run preview
```

# BuddyBoss (React + Vite)

Reconstruction React + Tailwind du thème BuddyBoss (App API WordPress).

## Dev

```bash
npm install
npm run dev
```

Copier `.env.example` → `.env`. En local, le proxy Vite relaie `/wp-json` vers Hostinger.

## GitHub Pages

Site : https://kamal19612.github.io/Buddyboss/

1. **Settings → Pages → Build and deployment → Source** : **GitHub Actions** (pas « Deploy from a branch »).
2. Après un push sur `main`, le workflow build avec `base: /Buddyboss/` et des **URLs absolues** vers WordPress Hostinger (`VITE_WP_API_URL` / `VITE_APP_API_URL`).

### Important : domaine Hostinger ≠ GitHub Pages

- **Frontend** = GitHub Pages (`kamal19612.github.io/Buddyboss/`)
- **API** = WordPress Hostinger (`sandybrown-rail-456461.hostingersite.com`)

Configurer un domaine personnalisé dans WordPress Hostinger ne branche pas l’app React dessus. Pour un domaine custom sur le front, il faut le déclarer dans **GitHub → Settings → Pages → Custom domain** (+ DNS).

### CORS (obligatoire en prod)

Dans `wp-config.php` Hostinger, autoriser l’origine Pages :

```php
define('APP_ALLOWED_ORIGINS', [
  'https://kamal19612.github.io',
]);
```

Sans ça, le navigateur bloquera les appels `wp-json` même si l’API répond en 200.

En local, pour tester le build Pages :

```bash
$env:VITE_BASE='/Buddyboss/'; $env:VITE_WP_API_URL='https://sandybrown-rail-456461.hostingersite.com/wp-json'; $env:VITE_APP_API_URL='https://sandybrown-rail-456461.hostingersite.com/wp-json/app/v1'; npm run build
npm run preview
```

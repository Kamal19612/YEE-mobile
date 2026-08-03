# BuddyBoss (React + Vite)

Reconstruction React + Tailwind du thème BuddyBoss (mock data).

## Dev

```bash
npm install
npm run dev
```

## GitHub Pages

Site : https://kamal19612.github.io/Buddyboss/

1. **Settings → Pages → Build and deployment → Source** : **GitHub Actions** (pas « Deploy from a branch »).
2. Après un push sur `main`, le workflow **Deploy GitHub Pages** build Vite avec `base: /Buddyboss/` et publie `dist/`.

En local, pour tester le build Pages :

```bash
$env:VITE_BASE='/Buddyboss/'; npm run build
npm run preview
```

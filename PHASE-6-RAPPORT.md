# Rapport Phase 6 — Recherche, ressources, offline & multilingue

## Couvert

| Exigence | Implémentation |
|----------|----------------|
| Recherche multi-critères | Mot-clé + pays / langue / thématique ; onglets récits, membres, cohortes, forums, discussions, ressources |
| Ressources & Guides | `/resources` — bibliothèque (guide, vidéo, document, toolkit) |
| PWA | `manifest.webmanifest` + `sw.js` (enregistré en prod) |
| Sync offline | `useOffline` + file `localStorage` ; composeur enqueue hors-ligne ; `OfflineBanner` |
| i18n | FR/EN étendu (stories, members, groups, forums, moderation, resources, search) |

## Fichiers clés

```
src/features/resources/ResourcesPage.jsx
src/features/search/SearchPage.jsx (filtres)
src/hooks/useSearch.js, useOffline.js
src/components/ui/OfflineBanner.jsx
public/sw.js, public/manifest.webmanifest
```

## Hors scope Phase 7 (optionnelle)

- Matomo / Google Analytics
- App mobile native (PWA installable déjà amorcée)

## Synthèse globale AfrEA-YEE

Phases 1→6 livrées selon le prompt TDR juillet 2026. Modules abandonnés (Shop, Courses, Events, Jobs, Memberships) hors routes.

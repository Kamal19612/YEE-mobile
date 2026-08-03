# Rapport Phase 2 — Fil d'activité

**Références thème :** `buddypress/activity/index.php`, `buddypress/activity/entry.php`  
**Note :** `activity/post-form` et `media/actions` sont fournis par BuddyBoss Platform (plugin), pas par le thème — reconstruits via classes CSS `#whats-new-form` / `#whats-new-toolbar` observées dans `buddypress.css`.

## Templates / zones couverts

| Source | React |
|--------|--------|
| `activity/index.php` (directory + stream + placeholders) | `ActivityPage`, `ActivityFeed`, `ActivityPlaceholder` |
| `activity/entry.php` (carte, header user/groupe, content, comments) | `ActivityCard` |
| Post form / toolbar (Platform) | `ActivityComposer` |
| Filtres scope (Everything / Mentions / Groups / Follows…) | `ActivityFilters` |
| Actions like / comment / share | `ActivityActions` |
| Commentaires imbriqués + reply | `ActivityComments` |
| API REST activity | `src/api/activity.js` + `useActivity` |

## Fonctionnel

- Composer : texte, photo (preview locale), sondage, privacy Public/Members
- Cartes : avatar, groupe (double avatar), media, poll votable, edited, privacy
- Like / commentaires threadés (depth 2) / share (Web Share API)
- Filtres scope + recherche locale
- Load more + skeleton loaders
- Mode mock par défaut (`VITE_USE_MOCK` ≠ `false`) ; bascule API via `VITE_WP_API_URL`

## Non couvert (volontairement / plus tard)

- GIF / emoji picker / Medium Editor formatting
- Dropzone multi-fichiers / vidéos / documents
- Topics selector (`bb-topic`)
- Modal lightbox média
- Favorite sync serveur réelle (mock local)

## Phase suivante (Phase 3)

Profils membres & annuaire :
- `buddypress/members/index.php`, `single/home.php`, settings, invites
- API `members`, `xprofile`, `friends`

# Rapport Phase 2 — Fil de récits (AfrEA-YEE)

**Référence :** prompt TDR juillet 2026 — module central narration  
**Base visuelle :** BuddyBoss activity (`entry.php`, post-form)

## Couvert

| Exigence TDR | Implémentation |
|--------------|----------------|
| Composeur multimédia | Texte + photo / audio / vidéo |
| Tags structurés | Pays, thématique, langue (selects) |
| Consentement explicite | Checkbox obligatoire pour soumission |
| Anonymisation | Option « masquer mon nom » |
| Statuts publication | `draft` → `pending` → `published` (+ `rejected`) |
| Carte de récit | Titre, tags, badge statut, média, réactions/commentaires si publié |
| Filtres | Publiés / Mes récits / En modération / Favoris / Cohortes |
| API | `src/api/activity.js` étendu (meta consent/tags/status) |

## Fichiers

```
src/data/activityData.js          ← récits YEE + taxonomies
src/features/activity/ActivityComposer.jsx
src/features/activity/ActivityCard.jsx
src/features/activity/ActivityFilters.jsx
src/features/activity/ActivityFeed.jsx
src/features/activity/ActivityPage.jsx
src/hooks/useActivity.js
src/api/activity.js
src/i18n/locales/{fr,en}.json     ← clés stories.*
```

## Comportement mock

- Fil « Publiés » : uniquement `status === published`
- Soumission → `pending` (pas de mise en ligne immédiate)
- Brouillon → `draft` (visible dans « Mes récits »)
- Commentaires / likes uniquement sur récits publiés

## Non couvert (phases suivantes)

- Interface modérateur approve/reject → Phase 5
- Sync offline des brouillons → Phase 6
- Upload réel vers WP media library (mock blob URL pour l’instant)

## Phase suivante

**Phase 3 — Profils & annuaire** : filtres pays / région / langue / thématique + champs Xprofile YEE.

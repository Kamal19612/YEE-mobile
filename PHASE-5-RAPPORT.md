# Rapport Phase 5 — File de modération (AfrEA-YEE)

## Couvert

| Exigence TDR | Implémentation |
|--------------|----------------|
| File pré-publication | Liste des récits `status === pending` |
| Aperçu | Titre, contenu, tags, média, anonymat, consentement |
| Approbation | → `published` (visible dans le fil public) |
| Rejet | Commentaire obligatoire → `rejected` |
| Rôles | `canModerate()` — YEE / moderator / secretariat |

## Fichiers

```
src/features/moderation/ModerationPage.jsx
src/features/moderation/ModerationCard.jsx
src/hooks/useModeration.js
src/api/moderation.js
```

## Phase suivante

**Phase 6** — Recherche multi-critères, Ressources & Guides, PWA / sync offline, i18n contenu.

# Rapport Phase 1 — Fondations & design system (AfrEA-YEE)

**Référence :** prompt reconstruction TDR juillet 2026  
**Thème source :** BuddyBoss Theme v2.21.0 (référence visuelle)  
**Stack :** React 19 + Vite + Tailwind CSS 3 + react-i18next

## Objectif

Recentrer le layout BuddyBoss existant sur le périmètre AfrEA-YEE : narration YEE, pas réseau social générique ni modules commerciaux.

## Couvert

| Élément | Statut |
|---------|--------|
| `tailwind.config.js` + `tokens.css` | Consolidés (inchangés, cohérents avec BuddyBoss) |
| Layout : Header, BuddyPanel, Footer, MobileHeader, dropdowns | OK, branding AfrEA-YEE |
| Navigation TDR | Récits, Membres, Groupes, Forums, Ressources |
| BuddyPanel | + Messages, Notifications, Modération |
| Modules abandonnés retirés des routes/nav | Shop, Courses, Events, Jobs, Memberships, Cart |
| i18n | Structure `src/i18n` + locales FR/EN + LanguageSwitcher |
| Placeholders | `/resources` (Phase 6), `/moderation` (Phase 5) |

## Fichiers clés

```
src/i18n/index.js, locales/{fr,en}.json
src/components/ui/LanguageSwitcher.jsx, ComingSoonPage.jsx
src/data/demoData.js          ← nav AfrEA
src/App.jsx                   ← routes recentrées
src/layout/*                  ← sans panier, labels i18n
```

## Hors Phase 1 (volontaire)

- Composeur de récits / consentement → Phase 2
- Champs profil pays/région/langue → Phase 3
- File de modération fonctionnelle → Phase 5
- PWA / sync offline → Phase 6
- Contenu traduction des features existantes (activity, etc.) → progressive

## Notes

- Les dossiers `features/{shop,courses,events,jobs,memberships}` restent orphelins (non routés) ; nettoyage possible plus tard.
- Langue par défaut : **fr** (stockée dans `localStorage` clé `afrea-lng`).

## Phase suivante

**Phase 2 — Fil de récits** : composeur multimédia, tags, consentement + anonymisation, statuts brouillon → modération → publié.

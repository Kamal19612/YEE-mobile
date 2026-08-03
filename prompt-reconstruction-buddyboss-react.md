# Prompt : Reconstruction du thème BuddyBoss Theme (v2.21.0) en React + Tailwind (backend WordPress headless)

## Contexte à donner à l'agent

Un fichier ZIP est joint à ce prompt : c'est le code source complet du **BuddyBoss Theme officiel v2.21.0** (thème GPL v3 pour WordPress/BuddyPress). Il contient les templates PHP, les feuilles de style, le JS et les assets qui définissent l'apparence et le comportement d'un réseau social communautaire (profils, groupes, fil d'activité, messagerie, notifications, forums).

**Objectif** : reconstruire à l'identique (visuellement et fonctionnellement) l'interface de ce thème en **React + Tailwind CSS**, consommant les données via une **API WordPress headless** (REST API `/wp-json/` et/ou WPGraphQL + BuddyPress REST endpoints). Le PHP du zip ne doit pas être copié/transpilé tel quel : il sert de **référence de structure, de comportement et de design** pour reconstruire chaque composant proprement en React.

## Ce que l'agent doit faire AVANT de coder

1. Extraire le zip et inventorier :
   - `style.css` (header du thème) → confirmer version/nom
   - `assets/css/theme.css`, `buddypress.css`, `bbpress.css` → règles visuelles de référence
   - `inc/admin/options/custom-css.php` → **système de design tokens dynamiques** : le thème génère des variables CSS (`--bb-primary-color`, `--bb-body-background-color`, `--bb-content-background-color`, `--bb-headings-color`, etc.) à partir des réglages du Customizer WordPress. C'est ce système qu'il faut répliquer en React (ex: variables CSS injectées via un ThemeProvider ou fichier `:root` généré depuis les réglages du back-office headless).
   - `template-parts/` → structure du layout global (header, nav, sidebar, footer, dropdowns)
   - `buddypress/` → templates du cœur social
   - `bbpress.php` + dossier `bbpress/` → forums
   - Dossiers tiers (`woocommerce/`, `learndash/`, `lifterlms/`, `tutor/`, `academy/`, `memberpress/`, `paid-memberships-pro/`, `job_manager/`, `tribe-events/`) → modules d'intégration, à traiter en Phase 5 (voir plus bas), car ce sont des plugins tiers optionnels et non le cœur BuddyBoss.

2. Extraire la palette de couleurs, la typographie et les espacements réels utilisés (ne pas inventer, se baser sur les valeurs trouvées dans `assets/css/theme.css` et `custom-css.php`) et les convertir en `tailwind.config.js` (extension du thème : colors, fontFamily, spacing, borderRadius, boxShadow).

3. Extraire les icônes SVG (`assets/images/svg/`, `assets/icons/`) réutilisables telles quelles (SVG en composants React) — c'est un gain de temps direct.

## Architecture cible

```
/src
  /styles         → tokens Tailwind + variables CSS dynamiques (thème customizable)
  /layout         → Header, TopNav, BuddyPanel (sidebar), Footer, MobileHeader
  /components/ui  → Boutons, Cards, Dropdowns, Modals, Tabs, Avatar, Badge (design system générique)
  /features
    /activity      → Fil d'activité (feed, entry, composer, commentaires, réactions)
    /members       → Annuaire membres, profil (home, profile, notifications, settings, invites)
    /groups        → Annuaire groupes, page groupe (home, membres, invite)
    /messages      → Messagerie (liste conversations, thread, dropdown notif messages)
    /notifications → Centre de notifications (dropdown + page dédiée)
    /forums        → bbPress (liste forums, sujet, réponses)
    /search        → Recherche globale multi-onglets
  /api            → clients REST/GraphQL par domaine (activity.js, members.js, groups.js, messages.js, notifications.js, forums.js)
  /hooks          → useActivity, useProfile, useGroups, useAuth (JWT), etc.
```

## Phases de construction (à suivre dans l'ordre, une phase = une session de travail)

### Phase 1 — Fondations & design system
- Générer `tailwind.config.js` à partir des tokens extraits (`custom-css.php`, `theme.css`)
- Construire le layout global : `header.php`, `template-parts/header.php`, `header-2.php`, `header-3.php`, `header-mobile.php`, `header-profile-menu.php`, `header-search.php`, `template-parts/site-navigation.php`, `template-parts/buddypanel.php` (sidebar contextuelle), `template-parts/footer.php`, `site-logo.php`
- Reproduire les dropdowns génériques : `messages-dropdown.php`, `notification-dropdown.php`, `unread-messages.php`, `unread-notifications.php`

### Phase 2 — Fil d'activité (BuddyPress activity)
- Référence : `buddypress/activity/index.php`, `buddypress/activity/entry.php`, `buddypress/media/actions.php`
- Composants : composer de post (texte, media, sondage), carte d'activité, actions (like/comment/share), fil de commentaires imbriqués, filtres (Tout/Mentions/Mes groupes/Follows)
- API : endpoints BuddyPress REST `wp-json/buddypress/v1/activity` (GET liste + filtres, POST création, PUT/DELETE)

### Phase 3 — Profils membres & annuaire
- Référence : `buddypress/members/index.php` (annuaire + filtres/tri), `buddypress/members/single/home.php` (page profil), `profile.php`, `notifications.php`, `settings.php`, `invites.php`, `template-parts/author-box.php`
- Composants : carte membre (grille annuaire), header de profil (cover + avatar + stats), onglets profil (Activité/À propos/Photos/Amis/Groupes), formulaires de settings, gestion des champs de profil (Xprofile)
- API : `wp-json/buddypress/v1/members`, `xprofile`, `friends`

### Phase 4 — Groupes, messagerie, notifications
- Groupes : `buddypress/groups/index.php` (annuaire), `single/home.php` (page groupe : fil, membres, photos, docs), `single/invite-anyone.php`
- Messagerie : reconstruire liste de conversations + thread (structure inspirée de `messages-dropdown.php`, à étendre en page complète — le thème ne fournit qu'un dropdown, la page complète reprend les mêmes patterns visuels)
- Notifications : page dédiée reprenant le pattern du dropdown mais en liste paginée
- API : `wp-json/buddypress/v1/groups`, `messages`, `notifications`

### Phase 5 — Forums (bbPress) & recherche globale
- Référence : `bbpress.php`, dossier `bbpress/`
- Composants : liste des forums, sujet + réponses imbriquées, formulaire de réponse
- Recherche : `buddypress/search/results-page.php`, `results-page-content.php`, `common/search/search-form.php` → recherche multi-types avec onglets (posts, membres, groupes, forums)
- API : bbPress REST (`wp-json/wp/v2/topics`, etc. selon config) + BuddyPress search

### Phase 6 (optionnelle, à ne traiter que si le projet en a besoin réellement)
- Intégrations tierces présentes dans le zip mais non prioritaires pour un réseau social pur : WooCommerce (boutique), LearnDash/LifterLMS/Tutor/Academy (e-learning), MemberPress/Paid Memberships Pro (abonnements payants), WP Job Manager (offres d'emploi), The Events Calendar
- Ne construire ces modules que si le projet cible en a explicitement besoin — sinon les ignorer pour éviter de la complexité inutile

## Consignes de fidélité visuelle

- Respecter la hiérarchie visuelle réelle du thème (cards avec `--bb-content-background-color`, bordures `--bb-content-border-color`, coins arrondis, ombres légères) plutôt que réinventer un style
- Respecter les breakpoints responsive observés dans le CSS (mobile-first, sidebar qui se transforme en drawer sur mobile via `header-mobile.php`)
- Garder la palette dynamique : ne pas coder les couleurs en dur, les piloter par variables CSS/Tailwind pour permettre un thème personnalisable plus tard (comme le fait le Customizer WordPress d'origine)

## Consignes techniques backend headless

- Authentification : JWT (plugin JWT Authentication for WP REST API) ou Application Passwords
- CORS : activer les headers appropriés côté WordPress pour le domaine du frontend React
- Champs de profil personnalisés (ACF/Xprofile) : les exposer via REST (`register_rest_field`) ou WPGraphQL avec l'extension BuddyPress
- Pagination : reproduire le système de pagination/infinite scroll du fil d'activité BuddyPress d'origine

## Livrable attendu de l'agent

- Une arborescence de composants React fonctionnels avec Tailwind, fidèle visuellement aux templates PHP analysés
- Un dossier `/api` avec les appels REST typés par domaine
- Un rapport court en fin de phase listant les templates PHP couverts et ceux restant à traiter dans la phase suivante

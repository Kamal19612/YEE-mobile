# Prompt : Reconstruction de l'interface BuddyBoss en React + Tailwind pour la plateforme AfrEA-YEE

## Contexte à donner à l'agent

Un ZIP contenant le code source du **BuddyBoss Theme officiel v2.21.0** (GPL v3, WordPress/BuddyPress) est joint à ce prompt. Il sert de **référence de structure, de comportement et de design** pour reconstruire une interface en **React + Tailwind CSS**, consommant les données via une **API WordPress headless**.

**Projet cible** : plateforme numérique de narration et de partage de connaissances pour les Jeunes Évaluateurs Émergents (YEE) de l'AfrEA (African Evaluation Association), conforme au TDR de juillet 2026. Objectif : permettre aux YEE de publier des récits multimédias sur leurs expériences d'évaluation, d'échanger entre pairs, et de servir de vitrine de plaidoyer pour l'AfrEA — lancement prévu à la 12e Conférence AfrEA au Maroc, novembre 2026. Calendrier global : 14 semaines.

Le PHP du zip ne doit pas être copié/transpilé tel quel : uniquement une référence pour rebâtir chaque composant proprement en React.

## Périmètre fonctionnel (recadré selon le TDR)

### Modules BuddyBoss à reconstruire

- **Fil d'activité / narration** — module central, à adapter en composeur de récits riches (texte, audio, vidéo, images), pas un simple statut social
- **Membres / profils** — avec champs personnalisés : pays, région, langue, thématique d'évaluation
- **Groupes** — cohortes régionales ou thématiques, échanges entre pairs
- **Forums** — espaces de discussion explicitement demandés par le TDR (§1.2)
- **Messages** — priorité secondaire, échanges privés pairs-à-pairs
- **Notifications** — engagement (réactions, commentaires sur récits)
- **Recherche globale** — utile vu la diversité de contenus/langues/régions

### Modules explicitement abandonnés (hors périmètre TDR)

- **Shop / WooCommerce** — aucune dimension commerciale dans le TDR
- **Jobs (WP Job Manager)** — hors sujet
- **Memberships (MemberPress / Paid Memberships Pro)** — pas de modèle payant prévu
- **Courses (LearnDash / LifterLMS / Tutor / Academy)** — le TDR demande des sessions de formation ponctuelles + un manuel/boîte à outils (§4.v, §5.vii), pas un LMS structuré. Remplacer par une simple section "Ressources & Guides" (bibliothèque de documents/vidéos)
- **Events (The Events Calendar)** — optionnel, basse priorité ; la 12e Conférence AfrEA semble gérée par le site principal de l'AfrEA, pas par cette plateforme

### Fonctionnalités additionnelles requises par le TDR mais absentes de BuddyBoss

Ces briques ne sont pas fournies par le thème et doivent être conçues comme des lots de travail à part entière :

1. **Consentement et modération pré-publication** (§1.2, §8) — flux de publication avec case de consentement explicite, option d'anonymisation du récit, file de modération *avant* mise en ligne (contrairement au comportement par défaut de BuddyPress, qui publie immédiatement)
2. **Mode hors-ligne / synchronisation différée** (§1.2, fracture numérique) — PWA avec service worker + file d'attente de synchronisation pour les zones à connectivité intermittente
3. **Multilingue** (§4.iv, §10.c) — intégration WPML/Polylang côté headless + i18n (ex. `react-i18next`) côté React
4. **Application mobile complémentaire** (§5.vi, §6 Phase 2) — au-delà du responsive web ; à cadrer séparément (PWA installable en première approche, ou app native si le budget le permet)
5. **Analytique** (§10.c) — intégration Google Analytics / Matomo, hors périmètre BuddyBoss
6. **Taxonomie de tags/catégorisation structurée** (§4.iii) — le modèle d'activité BuddyPress est plat ; étendre le modèle de données headless (custom post type + taxonomies WP, exposées en REST/GraphQL) pour un tagging par thématique, pays, langue

## Ce que l'agent doit faire AVANT de coder

1. Extraire le zip et inventorier :
   - `style.css` → confirmer version/nom
   - `assets/css/theme.css`, `buddypress.css`, `bbpress.css` → règles visuelles de référence
   - `inc/admin/options/custom-css.php` → système de **design tokens dynamiques** : variables CSS (`--bb-primary-color`, `--bb-body-background-color`, `--bb-content-background-color`, `--bb-headings-color`, etc.) générées depuis le Customizer WordPress. À répliquer en React (variables CSS + config Tailwind, comme dans le projet actuel)
   - `template-parts/` → structure du layout global (header, nav, sidebar, footer, dropdowns)
   - `buddypress/` → templates du cœur social (activity, members, groups, messages, notifications)
   - `bbpress.php` + dossier `bbpress/` → forums
   - Ignorer les dossiers `woocommerce/`, `learndash/`, `lifterlms/`, `tutor/`, `academy/`, `memberpress/`, `paid-memberships-pro/`, `job_manager/`, `tribe-events/` — hors périmètre

2. Extraire la palette de couleurs, typographie et espacements réels (déjà fait dans `tailwind.config.js` du projet actuel — vérifier cohérence, ne pas réinventer)

3. Réutiliser les icônes SVG du thème (`assets/images/svg/`, `assets/icons/`) telles quelles en composants React

## Architecture cible

```
/src
  /styles         → tokens Tailwind + variables CSS dynamiques
  /layout         → Header, TopNav, BuddyPanel (sidebar), Footer, MobileHeader
  /components/ui  → Boutons, Cards, Dropdowns, Modals, Tabs, Avatar, Badge
  /features
    /activity      → Fil de récits (feed, composeur multimédia, commentaires, réactions, tags)
    /members       → Annuaire membres (filtrable par pays/région/langue), profil YEE
    /groups        → Cohortes régionales/thématiques
    /messages       → Messagerie pairs-à-pairs
    /notifications → Centre de notifications
    /forums        → Espaces de discussion
    /search        → Recherche globale multi-critères (contenu, langue, pays, thématique)
    /moderation    → File de modération pré-publication (nouveau, hors BuddyBoss)
    /resources     → Bibliothèque de ressources/guides (remplace le module Courses)
  /api            → clients REST/GraphQL par domaine
  /hooks          → useActivity, useProfile, useGroups, useAuth (JWT), useOffline (sync queue)
  /i18n           → fichiers de traduction, config react-i18next
```

## Phases de construction

### Phase 1 — Fondations & design system
- `tailwind.config.js` (déjà en place, vérifier/consolider)
- Layout global : header, nav, sidebar (`buddypanel`), footer, dropdowns messages/notifications
- Mise en place i18n (structure des fichiers de traduction, même vide au départ)

### Phase 2 — Fil de récits (module central)
- Composeur de récit : texte + upload media (photo/audio/vidéo), tags (pays/thématique/langue), **case de consentement + option d'anonymisation**
- Carte de récit, fil de commentaires, réactions
- Statut de publication : brouillon → en modération → publié (au lieu de publication immédiate)
- API : endpoints BuddyPress REST activity + custom fields pour consentement/anonymisation/tags

### Phase 3 — Profils membres & annuaire
- Annuaire filtrable par pays/région/langue/thématique
- Page profil YEE (récits publiés, groupes, activité)
- Champs Xprofile personnalisés (pays, langue, thématique d'évaluation)

### Phase 4 — Groupes, messagerie, notifications, forums
- Groupes = cohortes régionales/thématiques
- Messagerie pairs-à-pairs (priorité secondaire)
- Notifications
- Forums (espaces de discussion)

### Phase 5 — File de modération (nouveau module, hors BuddyBoss)
- Interface admin/modérateur : liste des récits en attente, aperçu, approbation/rejet avec commentaire
- Rôles : YEE sélectionnés + Secrétariat AfrEA (§7.iii du TDR)

### Phase 6 — Recherche globale, ressources, offline & multilingue
- Recherche multi-critères
- Section "Ressources & Guides" (remplace Courses) : bibliothèque de documents/vidéos de formation
- PWA : service worker, cache offline, file de synchronisation pour publications hors-ligne
- Activation complète du multilingue (contenu + interface)

### Phase 7 (optionnelle) — Analytique & app mobile
- Intégration Matomo/Google Analytics
- Cadrage séparé de l'application mobile complémentaire (PWA installable vs app native)

## Consignes de fidélité visuelle

- Respecter la hiérarchie visuelle réelle du thème (cards, bordures, coins arrondis, ombres légères) plutôt que réinventer un style
- Respecter les breakpoints responsive observés dans le CSS d'origine
- Garder la palette pilotée par variables CSS/Tailwind (pas de couleurs en dur) pour permettre une personnalisation future

## Consignes techniques backend headless

- Authentification : JWT ou Application Passwords
- CORS configuré pour le domaine du frontend React
- Champs personnalisés (ACF/Xprofile) exposés via REST (`register_rest_field`) ou WPGraphQL
- Modèle de données étendu pour tags/taxonomie (custom post type + taxonomies WP)
- Pagination/infinite scroll pour le fil de récits

## Livrable attendu de l'agent

- Arborescence de composants React fonctionnels avec Tailwind, fidèle visuellement aux templates PHP analysés, recentrée sur le périmètre ci-dessus
- Dossier `/api` avec les appels REST typés par domaine
- Rapport court en fin de chaque phase listant ce qui est couvert et ce qui reste

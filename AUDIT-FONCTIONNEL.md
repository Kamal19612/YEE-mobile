# Audit fonctionnel détaillé — AfrEA-YEE

**Date :** 15 octobre 2026  
**Dépôt :** `/var/www/html/YEE`  
**Stack :** React 19 + Vite · Spring Boot (Java 21) · Postgres / Flyway (Supabase)  
**Méthode :** revue statique du code (routes, features, API, migrations). Pas de parcours navigateur automatisé.

---

## Verdict

Plateforme communautaire **opérationnelle** sur le cœur métier. Ce document liste les pages, les actions utilisateur, les permissions et les parcours E2E.

**Blocages avant ouverture publique :**

- Recherche globale (stub)
- Textes légaux (placeholder)
- Quelques écarts UX (édition de post, offline réel, visibilité profil)

| Indicateur | Valeur |
|---|---|
| Routes applicatives | 22+ |
| Modules métier | 14 |
| Parcours E2E documentés | 20 |
| Maturité pondérée | ~85 % |
| Modules complets / partiels / stub | 10 / 3 / 1 |

---

## 1. Synthèse maturité par module

| Module | Rôle | Maturité | API | Écart |
|---|---|---|---|---|
| Auth | Inscription → session JWT | Complet | `/api/auth/*` | SMTP optionnel |
| Fil d'activité | Posts, likes, commentaires, médias | Complet | `/api/feed/*` | Pas d'édition de post |
| Membres / profils | Annuaire, follow, réglages | Complet | `/api/users/*` | `whoCanSee` UI non persistée |
| Groupes | CRUD, join, modération, chat | Complet | `/api/groups/*` | Cover groupe sans upload |
| Institutions | Arbre clubs, affiliations, référents | Complet | `/api/institutions/*` | — |
| Messages | DM + chat groupe, médias, SSE | Complet | `/api/conversations/*` | Pas d'email notif |
| Notifications | Inbox, badge, SSE, Web Push | Complet | `/api/notifications/*` | DM hors inbox |
| Événements | Catalogue admin-curated | Complet | `/api/events/*` | Lecture JWT requise |
| Ressources PDF | Bibliothèque + catégories | Complet | `/api/resources/*` | Lecture JWT requise |
| Admin comptes | Gestion comptes / sessions | Complet | `/api/admin/*` | Pas de console éditoriale |
| i18n FR/EN | Interface bilingue | Complet | — | — |
| PWA / offline | Install, SW, file d'attente | Partiel | — | Queue non branchée |
| Pages légales | About, privacy, terms, contact | Partiel | — | Textes placeholder |
| Recherche globale | Page `/search` | Stub | — | Toujours `[]` |

---

## 2. Architecture & chrome applicatif

### Stack

| Couche | Techno | Rôle |
|---|---|---|
| Front | React 19 + Vite | ProtectedLayout, AuthProvider, ThemeProvider, i18n, PWA, SSE, look BuddyBoss |
| API | Spring Boot / Java 21 | Préfixe `/api`, JWT + refresh cookie, 18 controllers, permissions service-layer |
| Data | Postgres + Flyway | 30 migrations V1–V30, rôle `yee_api` + RLS, retention job, buckets médias |

L’API Spring **remplace** WordPress/BuddyBoss (pas d’intégration runtime WP).

### Shell (AppShell) — pages connectées

| Élément | Fonctions | Fichier |
|---|---|---|
| BuddyPanel | Nav : `/`, `/members`, `/groups`, `/institutions`, `/events`, `/resources`, `/admin/accounts` (admin) · LanguageSwitcher mobile · toggle drawer | `layout/BuddyPanel.jsx` |
| Header desktop | Logo · langue · recherche overlay · MessagesDropdown · NotificationDropdown · HeaderProfileMenu (profil, compte, settings, admin, logout) | `layout/Header*.jsx` |
| Header mobile | Équivalent compact | `layout/HeaderMobile.jsx` |
| Footer | Liens `/legal/about\|privacy\|terms\|contact` · masqué sur `/messages` | `layout/Footer.jsx` |
| PwaInstallBanner | iOS instructions / Android `beforeinstallprompt` · dismiss localStorage | `components/ui/PwaInstallBanner.jsx` |
| PushOptInBanner | Opt-in Web Push (VAPID + subscribe) | `components/ui/PushOptInBanner.jsx` |
| OfflineBanner | État hors-ligne + compteur file sync (file non branchée aux composers) | `components/ui/OfflineBanner.jsx` |
| LiveToastHost | Toasts temps réel | `components/ui/LiveToastHost.jsx` |

**Navigation panel** (`src/data/layoutData.js`) : Actualités, Membres, Groupes, Institutions, Événements, Ressources, Admin comptes (adminOnly).

---

## 3. Cartographie complète des pages / routes

Source : `src/App.jsx` · basename = `BASE_URL` Vite  
Garde : `ProtectedLayout` — invité → `/login` ; boot → écran chargement.

### 3.1 Pages publiques (auth)

| Route | Page | Fonctions présentes | API |
|---|---|---|---|
| `/login` | LoginPage | Email + mot de passe · Se souvenir · redirect `state.from` · reasons `session_expired` / `account_deactivated` / `account_deleted` / `password_changed` · bandeau `email_not_verified` + ResendVerification · liens register / forgot | `POST /auth/login` · enrichSessionUser |
| `/register` | RegisterPage | displayName + email + password · succès sans session · `verificationUrl` (dev) · ResendVerification + cooldown | `POST /auth/register` · `/auth/resend-verification` |
| `/verify-email?token=` | VerifyEmailPage | Auto-vérif au mount · états loading / missing / ok / error · CTA login | `POST /auth/verify-email` |
| `/forgot-password` | ForgotPasswordPage | Saisie email · message générique anti-énumération · redirect si déjà connecté | `POST /auth/forgot-password` |
| `/reset-password?token=` | ResetPasswordPage | Nouveau mot de passe + confirmation · erreur si token absent | `POST /auth/reset-password` |

**Session :** `AuthProvider` restaure via `POST /auth/refresh` (cookie) si hint `localStorage` · logout `POST /auth/logout` · 401 → `/login?reason=session_expired`.

Fichiers : `src/features/auth/`.

---

### 3.2 Fil d'activité

| Route | Page | Fonctions présentes | API |
|---|---|---|---|
| `/` | ActivityPage | Fil global + FeedComposer · sidebar lg+ : stats communauté + 5 prochains events · load more · bandeau nouvelles publications si scroll bas | `GET /feed` · `GET /users/summary` · `GET /events?status=upcoming` |
| `/feed/:postId` | FeedPostPage | Détail post · `?comment=` focus commentaire · like · commenter / répondre · supprimer si `isOwnPost` · partage Web Share / copie URL · likers dialog · médias protégés blob | `GET/DELETE /feed/:id` · likes · comments |
| `/activity` · `/stories` | Redirect → `/` | Alias historiques | — |

#### Actions FeedComposer

- Texte libre
- Médias exclusifs : images (max 4, 5 Mo) **OU** audio (1, 20 Mo, micro ou fichier) **OU** PDF (1, 15 Mo)
- Barre progression upload · validation client + serveur
- Option `groupId` quand composé depuis un fil de groupe
- `POST /feed` (JSON ou multipart)

#### Actions carte post (FeedPostCard)

- Like / Unlike → `POST|DELETE /feed/:id/like`
- Ouvrir commentaires paginés → `GET /feed/:id/comments`
- Poster commentaire / réponse → `POST /feed/:id/comments`
- Supprimer commentaire (auteur) → `DELETE /feed/comments/:id`
- Supprimer post (auteur) → `DELETE /feed/:id`
- Dialog likers · lightbox images · PdfCoverReader lazy

**Écart :** pas d’édition de post (create + delete seulement).  
Fichiers : `src/features/activity/`.

---

### 3.3 Membres & profils

#### Annuaire

| Route | Page | Fonctions | Accès |
|---|---|---|---|
| `/members` | MembersPage | Annuaire paginé 12 · recherche · filtre institution · vue grille/liste · follow/unfollow confirm · MemberCard | Connecté |

#### Onglets profil `/members/:memberId/*`

| Route | Page / onglet | Fonctions | Accès |
|---|---|---|---|
| `/members/:id` | ProfileTimeline | Fil auteur `GET /feed?authorId=` · composer si propriétaire | Connecté |
| `/members/:id/profile` | ProfileAbout | Champs xprofile · édition/sauvegarde si propriétaire | Connecté |
| `/members/:id/friends` | ProfileFriends | Followers + following paginés (modèle follow, label « friends ») | Connecté |
| `/members/:id/groups` | ProfileGroups | Groupes du membre | Connecté |
| `/members/:id/institutions` | ProfileInstitutions | Affiliations · actions si propriétaire | Connecté |
| `/members/:id/notifications` | ProfileNotifications | Même inbox que `/notifications` | Propriétaire seul |
| `/members/:id/invites` | ProfileInvites | Invitations de groupe · accepter / refuser | Propriétaire seul |
| `/members/:id/settings` | ProfileSettings | Sous-onglets `general` \| `profile` \| `danger` · password · `whoCanMessage` · delete compte | Propriétaire seul |

#### ProfileHeader (toutes fiches)

- Propriétaire : upload avatar → `POST /users/me/avatar` · cover → `/users/me/cover`
- Autre membre : Follow / Unfollow · Message (si `canMessage`) → createThread → `/messages/:threadId`
- Stats : stories, peers, cohortes
- Alias `/members/me` résolu vers l’id réel (`HeaderProfileMenu`)

#### ProfileSettings — détail

- Changer mot de passe → `PATCH /users/me/password` → logout → `/login?reason=password_changed`
- Confidentialité messagerie `whoCanMessage` (`everyone` \| `friends` \| `nobody`) → `PATCH /users/me`
- UI « qui peut voir mon profil » affichée mais **NON persistée** (écart)
- Suppression compte (mdp) → `DELETE /users/me` → `/login?reason=account_deleted`

Fichiers : `src/features/members/`.

---

### 3.4 Groupes

| Route | Contenu | Fonctions | Permission |
|---|---|---|---|
| `/groups` | GroupsPage | Liste + search · filtre mine · créer groupe · join/leave · répondre invitation · supprimer (site admin) | Créer : site admin **OU** référent institution |
| `/groups/:id` | Fil groupe | FeedComposer si membre actif · mêmes actions posts | Voir : public **OU** membre actif **OU** site admin |
| `/groups/:id/members` | Membres actifs | Liste membres | Public si groupe public sinon membre/admin |
| `/groups/:id/discussion` | Redirect chat | `openGroupConversation` → `/messages/:threadId` | Membre actif ou site admin |
| `/groups/:id/moderation` | Modération | Approuver / rejeter pending · changer rôle · retirer membre | moderator / admin groupe ou site admin |
| `/groups/:id/invite` | Invitations | UserPicker + POST invitations | Membre actif |
| `/groups/:id/settings` | Paramètres | Nom, description, visibilité · supprimer groupe | admin groupe ou site admin |

**Modèle :**

- Visibilités : `public` \| `private` \| `secret`
- Rôles : `member` \| `moderator` \| `admin`
- Statuts : `active` \| `pending` \| `invited` \| `banned`
- Cover URL en schéma DB **sans upload API**

Fichiers : `src/features/groups/`.

---

### 3.5 Institutions / clubs

| Route | Page | Fonctions | Permission |
|---|---|---|---|
| `/institutions` | InstitutionsPage + ClubsSection | Liste clubs locaux + recherche · créer club (hiérarchie admin) · edit/delete | Créer club : référent pays ou site admin |
| `/institutions/:id` | InstitutionPage overview | Demander / annuler / quitter affiliation · membres actifs · enfants (pays/clubs) | Affiliation : tout membre |
| `/institutions/:id?tab=referent` | ReferentPanel | Approuver / rejeter pending · nommer référent · retirer référent / membre (garde `last_referent`) | `viewerIsReferent` |

**Arbre :** continent → pays → club (local)  
**Affiliations :** `pending` \| `active` \| `rejected`

Fichiers : `src/features/institutions/`.

---

### 3.6 Événements

| Route | Rôle | Fonctions |
|---|---|---|
| `/events` | Membre | Liste filtrée : recherche (debounce), catégorie, `upcoming`\|`past` · cartes → détail |
| `/events` | Site admin | Créer événement (lieu online/in_person, dates, cover photo/vidéo URL) · CRUD catégories · supprimer |
| `/events/:eventId` | Membre | Cover photo/vidéo · description · lien join / adresse · télécharger rapport PDF · galerie visuels |
| `/events/:eventId` | Site admin | Upload/supprimer rapport PDF · upload/supprimer visuels · édition / suppression |

Fichiers : `src/features/events/`.

---

### 3.7 Ressources (bibliothèque PDF)

| Route | Rôle | Fonctions |
|---|---|---|
| `/resources` | Membre | Filtres recherche / catégorie / langue · groupé par catégorie · cartes |
| `/resources` | Site admin | Upload document · CRUD catégories · delete |
| `/resources/:resourceId` | Membre | Preview PDF · téléchargement `GET /resources/:id/file` · cover auto |
| `/resources/:resourceId` | Site admin | Édition métadonnées · suppression |

Fichiers : `src/features/resources/`.

---

### 3.8 Messages

| Route | Fonctions présentes | API / temps réel |
|---|---|---|
| `/messages` | Liste threads · desktop auto-select 1er · compose nouveau DM (UserPicker) · unread count · layout immersif (footer masqué) | `GET /conversations` · unread-count |
| `/messages/:threadId` | Fil messages · texte + images (compression) + audio (micro/fichier) · typing · read receipts ✓/✓✓ · pagination anciens · recherche locale ≥2 chars · supprimer message (auteur) · supprimer conversation · chat groupe via `/groups/:id/discussion` | POST messages · typing · read · search · SSE `messageRealtime` |

**Restriction :** bouton Message désactivé si `member.canMessage === false` (préférence `whoCanMessage`).

Fichiers : `src/features/messages/`.

---

### 3.9 Notifications

| Surface | Fonctions |
|---|---|
| `/notifications` | Filtres all \| unread \| read · mark one / mark all · PushEnableCard |
| NotificationDropdown (header) | Preview 5–8 · reload à l’ouverture · mark all · badge unread · CTA push |

#### Types de notification → destination

| Type | Destination |
|---|---|
| `new_follower` | `/members/:acteur` |
| `group_invitation` / join_request / approved / rejected | `/groups/:id` |
| `institution_affiliation_request` | `/institutions/:id?tab=referent` |
| institution affiliation approved/rejected | `/institutions/:id` |
| `post_like` · `post_comment` | `/feed/:postId` |
| `comment_reply` | `/feed/:id?comment=` |
| `new_message` (push/SSE, pas de ligne inbox) | `/messages/:threadId` |

Stream SSE : `GET /notifications/stream` · fallback poll.

Fichiers : `src/features/notifications/`.

---

### 3.10 Recherche (stub)

> **Stub documenté :** `src/api/search.js` retourne toujours des tableaux vides. Les filtres country / language / thematic sont UI-only (non envoyés).

| Route / params | UI | Backend |
|---|---|---|
| `/search?s=\|q=&type=&country=&language=&thematic=` | Onglets all \| activity \| members \| groups · compteurs · empty state · entrée HeaderSearch → `/search?s=` | Aucun endpoint Spring `/search` |

Fichiers : `src/features/search/`, `src/api/search.js`.

---

### 3.11 Admin comptes

Garde UI : `AdminGuard` (`isSiteAdmin`) · sinon redirect `/`.

| Route | Onglets / actions | API |
|---|---|---|
| `/admin/accounts` | Liste · `q` · status all\|active\|unverified\|deactivated\|admins · pagination 20 · delete · lien fiche | `GET/DELETE /admin/accounts` |
| `/admin/accounts/:userId` — overview | Identité · stats · sessions actives · lien profil public | `GET /admin/accounts/:id` |
| … — activity | Timeline fusionnée posts/likes/comments/follows/groups/institutions · filtres · load more | `GET …/activity` |
| … — conversations | Liste conversations utilisateur · delete conversation admin | `GET …/conversations` · `DELETE /admin/conversations/:id` |
| … — actions | Désactiver/réactiver · forcer `emailVerified` · grant/revoke `siteAdmin` · révoquer toutes sessions · supprimer compte | `PATCH` · `POST …/sessions/revoke` · `DELETE` |

Fichiers : `src/features/admin/`.

---

### 3.12 Pages légales

| Route | Contenu | État |
|---|---|---|
| `/legal/about` | i18n `legal.about.*` | Placeholder |
| `/legal/privacy` | i18n `legal.privacy.*` | Placeholder |
| `/legal/terms` | i18n `legal.terms.*` | Placeholder |
| `/legal/contact` | i18n `legal.contact.*` | Placeholder |

`pageId` invalide → redirect `/`. Rédaction juridique AfrEA requise avant ouverture publique.

Fichier : `src/features/legal/LegalPage.jsx`.

---

### 3.13 Catch-all

Route `*` → Navigate to `/` (pas de page 404 dédiée).  
Invité non authentifié sur route protégée → `/login` avec `state.from`.

---

## 4. Acteurs et matrice de permissions

| Capacité | Visiteur | Membre | Référent | Modo / Admin groupe | Site admin |
|---|---|---|---|---|---|
| Accéder au shell | — | Oui | Oui | Oui | Oui |
| Auth (login/register…) | Oui | — | — | — | — |
| Fil global + poster | — | Oui | Oui | Oui | Oui |
| Follow / messagerie | — | Oui* | Oui* | Oui* | Oui* |
| Rejoindre groupe / affiliation | — | Oui | Oui | Oui | Oui |
| Créer groupe | — | — | Oui | — | Oui |
| Créer club / pays / continent | — | — | Club (pays) | — | Oui (tout) |
| Panneau référent | — | — | Oui | — | Oui |
| Modération groupe | — | — | — | Oui | Oui |
| Settings / delete groupe | — | — | — | Admin groupe | Oui |
| CRUD events / resources | — | Lecture | Lecture | Lecture | Oui |
| `/admin/accounts` | — | — | — | — | Oui |

\* Messagerie soumise à `whoCanMessage` (`everyone` \| `friends` \| `nobody`) et `canMessage` côté profil cible.

---

## 5. Parcours utilisateur (E2E)

### P01 — Onboarding nouveau membre · Complet

1. `/register` → email + password + displayName → `POST /auth/register`
2. Email (SMTP) ou `verificationUrl` (dev) → `/verify-email?token=` → `POST /auth/verify-email`
3. `/login` → session JWT + refresh cookie → `/`
4. Menu profil → `/members/me/profile` : compléter xprofile
5. Upload avatar / cover sur ProfileHeader
6. `/institutions` → demander affiliation → statut pending
7. Référent approuve → `/institutions/:id?tab=referent`
8. `/groups` → rejoindre OU accepter invite dans `/members/:id/invites`

### P02 — Poster / liker / commenter sur le fil · Complet

1. `/` → FeedComposer : texte ± image/audio/PDF → `POST /feed`
2. Post apparaît en tête ; autres : bandeau « nouvelles publications » si scroll bas
3. Like → `POST /feed/:id/like` → notif `post_like` à l’auteur
4. Commentaire / reply → notif `post_comment` ou `comment_reply`
5. Clic notif → `/feed/:id` ou `/feed/:id?comment=`
6. Auteur peut `DELETE` post ou commentaire

### P03 — Créer et animer un groupe · Complet

1. Prérequis : `isSiteAdmin` OU référent d’au moins une institution
2. `/groups` → Créer : nom, description, visibilité → `POST /groups`
3. `/groups/:id/invite` → UserPicker → invitations
4. Invité : ProfileInvites → accept/decline
5. Private : demandes pending → `/groups/:id/moderation` approve/reject
6. Membres actifs postent sur le fil groupe
7. `/groups/:id/discussion` → conversation groupe → `/messages/:threadId`
8. Admin groupe : settings (visibilité) ou delete soft + cascade posts

### P04 — Institution & référent · Complet

1. Admin crée continent/pays ; référent pays crée club local
2. Membre demande affiliation sur `/institutions/:id`
3. Référent : `?tab=referent` → approve/reject
4. Référent peut nommer co-référents (UserPicker) et retirer membres
5. Garde `last_referent` : impossible de retirer le dernier référent

### P05 — Messagerie DM · Complet

1. Depuis profil : Message (si `canMessage`) → createThread → `/messages/:id`
2. Ou `/messages` → compose → UserPicker + premier message
3. Envoi texte / images / audio · typing SSE · read receipts
4. Destinataire : push/SSE (pas de ligne inbox notification DM)
5. Supprimer message (auteur) ou masquer conversation

### P06 — Mot de passe oublié / changé · Complet

- Forgot : `/forgot-password` → email → `/reset-password?token=` → login
- Settings : change password → logout forcé → `/login?reason=password_changed`

### P07 — Admin : désactiver / gérer un compte · Complet

1. Site admin → BuddyPanel / menu → `/admin/accounts`
2. Filtrer `q` + status → ouvrir fiche
3. Actions : deactivate → user voit `account_deactivated` au login
4. Force `emailVerified` · grant/revoke `siteAdmin` · revoke sessions
5. Onglet activity : audit comportement · conversations : purge admin
6. Delete compte (protections self / last admin)

### P08 — Événement & ressource (admin → membre) · Complet

- Events : admin crée + catégories + cover → membre consulte `/events/:id` · télécharge rapport · galerie
- Resources : admin upload PDF → membre `/resources/:id` preview + download
- Sidebar fil : 5 prochains events affichés sur `/`

### P09 — Follow social · Complet

- `/members` ou ProfileHeader → Follow → `POST /users/:id/follow`
- Notif `new_follower` → deep link profil
- Onglet friends : listes followers / following
- Unfollow avec ConfirmDialog

### P10 — PWA / Push / Offline · Partiel

- PWA : banner install · SW precache shell (prod) · pas de cache `/api`
- Push : banner ou NotificationsPage PushEnableCard · VAPID + subscribe
- Offline : OfflineBanner visible · file `localStorage` présente mais composers n’enqueue pas (**écart**)

### P11 — Recherche globale · Stub

- HeaderSearch ou `/search` → saisie critères
- Résultats toujours vides tant que `GET /api/search` n’existe pas
- Filtres pays/langue/thématique décoratifs

### P12 — Suppression de compte (self-service) · Complet

- `/members/:id/settings` → danger → confirmation mdp → `DELETE /users/me`
- Redirect `/login?reason=account_deleted`
- Site admins bloqués en self-delete (règle API)

### Autres parcours courts

| # | Parcours |
|---|---|
| P13 | Session expirée : 401 → refresh fail → `/login?reason=session_expired` |
| P14 | Resend verification depuis login/register (cooldown) |
| P15 | Partage post : Web Share API ou copie URL `/feed/:id` |
| P16 | Médias groupe privé : fetch blob authentifié (pas d’URL publique) |
| P17 | Link preview API existe (`GET /feed/link-preview`) mais non utilisée dans UI features |
| P18 | i18n : LanguageSwitcher auth + header + panel · persist `afrea-lng` |
| P19 | Catch-all URL inconnue connecté → `/` |
| P20 | GitHub Pages : coquille front seule (`VITE_API_URL` vide) — pas de comptes live |

---

## 6. Catalogue API par domaine

Préfixe `/api` · enveloppe `{ success, data, meta? }` · 18 controllers Spring.

### Auth · Users · Follow

| Méthode | Chemin | Action métier |
|---|---|---|
| POST | `/auth/register\|login\|refresh\|logout\|verify-email\|resend\|forgot\|reset` | Cycle de vie identité |
| GET | `/auth/me` | Résumé session |
| GET/PATCH | `/users/me` | Profil + prefs |
| PUT | `/users/me/password` | Changer mdp |
| POST | `/users/me/avatar\|cover` | Médias profil |
| GET | `/users/me/group-invites` | Invitations |
| DELETE | `/users/me` | Self-delete |
| GET | `/users` · `/users/:id` · `/users/summary` · `/users/search` | Annuaire / fiche / stats |
| POST\|DELETE\|GET | `/users/:id/follow` · followers · following | Graphe social |

### Feed · Groups · Institutions

| Domaine | Endpoints clés |
|---|---|
| Feed | `GET/POST/DELETE /feed` · link-preview · likes · comments · media |
| Groups | CRUD `/groups` · join · membership · invitations · members approve/reject/role/remove |
| Institutions | CRUD `/institutions` · affiliation · affiliations approve/reject · referents |

### Conversations · Notifications · Events · Resources · Admin

| Domaine | Endpoints clés |
|---|---|
| Conversations | CRUD threads · messages · media · read · typing · `group/{groupId}` · hide |
| Notifications | list · unread-count · read · read-all · stream SSE · push vapid/subscribe |
| Events | CRUD events · categories · cover · report · visuals |
| Resources | CRUD resources · categories · file · cover |
| Admin | `/admin/accounts` · activity · sessions/revoke · conversations delete |

**Fichiers front API :** `src/api/*.js` · catalogue `src/config/api.js` · client `src/api/client.js`.

---

## 7. Écarts et backlog fonctionnel

| Prio | Écart | Impact utilisateur | Action |
|---|---|---|---|
| **P1** | Recherche globale | Page montée, résultats toujours vides | `GET /api/search` + brancher `useSearch` + filtres |
| **P1** | Contenu légal | Non conforme ouverture publique | Rédaction AfrEA about/privacy/terms/contact |
| **P2** | Édition de posts | Corriger = supprimer + republier | `PATCH /feed/:id` + UI |
| **P2** | Visibilité profil | Réglage `whoCanSee` affiché non sauvé | Persister côté API + PATCH me |
| **P2** | Cover de groupe | Champ DB sans parcours | Endpoint upload + settings UI |
| **P2** | Link preview UI | API prête, features n’appellent pas | Brancher dans FeedComposer / cartes |
| **P3** | Offline publisher | Banner sans file réelle | `enqueue` FeedComposer / messages |
| **P3** | Export RGPD | Delete ok, export absent | Endpoint export compte |
| **P3** | Lectures events/resources anonymes | Pas de marketing sans JWT | `permitAll` GET si besoin |
| **P3** | Page 404 dédiée | Catch-all → `/` | Page NotFound optionnelle |

---

## 8. Hors périmètre (retiré / non livré)

### Retiré du produit

- Forums / topics BuddyPress
- Shop / WooCommerce
- Cours LMS (LearnDash, Tutor…)
- Jobs / Job Manager
- 2FA (ajoutée V16, retirée V17)
- Intégration runtime WordPress/BuddyBoss

### Héritage doc

- `_docs_app_api/SPRINT 1-2` : référence PHP historique
- `buddyboss-theme/` : thème WP non branché à l’app React
- `AUDIT-ACTIONS-RAPPORT.md` (2 oct. 2026) : events/resources marqués « retirés » — **désormais livrés**
- GitHub Pages = coquille UI sans API (`https://kamal19612.github.io/YEE/`)

---

## 9. Fichiers clés

| Zone | Chemins |
|---|---|
| Routes | `src/App.jsx`, `src/layout/ProtectedLayout.jsx` |
| Features | `src/features/{auth,activity,members,groups,institutions,events,resources,messages,notifications,search,admin,legal}/` |
| API client | `src/api/*.js`, `src/config/api.js` |
| Shell | `src/layout/`, `src/data/layoutData.js` |
| Controllers Spring | `spring-boot/src/main/java/com/afrea/yee/**/*Controller.java` |
| Migrations | `spring-boot/src/main/resources/db/migration/` (V1–V30) |
| Sécurité HTTP | `spring-boot/.../common/config/SecurityConfig.java` |

---

## Note

Ce document complète / remplace la vue « état » de `AUDIT-ACTIONS-RAPPORT.md` pour le périmètre fonctionnel actuel (octobre 2026).  
Référence sécurité séparée : `AUDIT-SECURITE-2026-10-01.txt`.  
Version interactive : canvas Cursor `audit-fonctionnel.canvas.tsx`.

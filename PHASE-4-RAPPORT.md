# Rapport Phase 4 — Groupes, messagerie, notifications

## Templates PHP couverts

| Source | React |
|--------|--------|
| `buddypress/groups/index.php` | `GroupsPage`, `GroupCard` |
| `buddypress/groups/single/home.php` | `GroupPage`, header, nav, activity |
| `groups/single/invite-anyone.php` | `GroupInvite` |
| Members tab groupe | `GroupMembers` |
| `messages-dropdown.php` (étendu page) | `MessagesPage` + dropdown mis à jour |
| `notification-dropdown.php` (étendu page) | `NotificationsPage` + dropdown mis à jour |
| API groups / messages / notifications | `src/api/{groups,messages,notifications}.js` |

## Routes

- `/groups` — annuaire (search, filtres, grid/list, join/leave)
- `/groups/:id` — activity / members / invite
- `/messages` · `/messages/:threadId` — inbox + thread
- `/notifications` — liste paginée + filtres All/Unread/Read

## Fonctionnel

- Groupes public/private/hidden, join/leave/request, invite members
- Messagerie 2 colonnes : liste conversations + thread, envoi messages
- Notifications paginées (Load more), mark read / mark all
- Dropdowns header liés aux pages réelles

## Non couvert / partiel

- Photos / docs onglets groupe (souvent Platform / BB App)
- Création de nouveau thread (compose) UI dédiée
- WebSocket / polling temps réel

## Phase suivante (Phase 5)

Forums bbPress + recherche globale multi-onglets

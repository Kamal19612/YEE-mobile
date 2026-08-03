# Rapport Phase 3 — Profils membres & annuaire

**Références thème :**  
`buddypress/members/index.php`, `single/home.php`, `profile.php`, `profile/profile-loop.php`, `settings.php`, `invites.php`, `notifications.php`, `parts/item-subnav.php`

## Templates couverts

| Source PHP | React |
|------------|--------|
| `members/index.php` | `MembersPage`, `MembersFilters`, `MemberCard` |
| `members/single/home.php` + `#item-header` | `ProfilePage`, `ProfileHeader`, `ProfileNav` |
| `profile.php` + `profile-loop.php` (XProfile) | `ProfileAbout` |
| Timeline membre | `ProfileTimeline` (réutilise Activity) |
| Friends / Groups tabs | `ProfileFriends`, `ProfileGroups` |
| `settings.php` | `ProfileSettings` (general, privacy, email, export) |
| `invites.php` | `ProfileInvites` |
| `notifications.php` | `ProfileNotifications` |
| API members / xprofile / friends | `src/api/members.js`, `useMembers`, `useMember` |

## Routes

- `/` — Activity (Phase 2)
- `/members` — Annuaire (grid/list, search, sort, type filter)
- `/members/:id` — Timeline profil
- `/members/:id/profile|friends|groups|notifications|invites|settings`

## Fonctionnel

- Cartes membre grid/list + statut online + Add Friend
- Header profil : cover, avatar, stats, actions
- Onglets profil + édition XProfile (mock)
- Settings formulaires locaux
- Invites email + liste sent
- Navigation header / BuddyPanel / menu profil branchée via `react-router-dom`

## Non couvert / partiel

- `author-box.php` (blog post — hors scope social pur)
- Change avatar / cover upload réel
- Friend requests accept/reject UI dédiée
- Photos tab média

## Phase suivante (Phase 4)

Groupes, messagerie, notifications page :
- `buddypress/groups/*`, messages, notifications API

# Rapport Phase 1 — Fondations & design system

**Thème source :** BuddyBoss Theme v2.21.0 (confirmé via `style.css`)  
**Stack :** React 19 + Vite + Tailwind CSS 3

## Inventaire source

| Zone | Chemin | Statut |
|------|--------|--------|
| Header thème | `style.css` | Version 2.21.0 OK |
| Tokens CSS | `inc/admin/options/custom-css.php` | Extraits → `src/styles/tokens.css` |
| Presets couleurs | `inc/admin/options-init.php` | Preset `default` appliqué |
| CSS visuel | `assets/css/theme.css` | Breakpoints, panel, container |
| SVG | `assets/images/svg/*` | Copiés dans `src/assets/svg/` |

## Templates PHP couverts (Phase 1)

- `header.php` → `src/layout/AppShell.jsx` + `Header.jsx`
- `template-parts/header.php` → `Header.jsx`
- `template-parts/header-mobile.php` → `HeaderMobile.jsx`
- `template-parts/site-logo.php` → `SiteLogo.jsx`
- `template-parts/site-navigation.php` → `SiteNavigation.jsx`
- `template-parts/header-aside.php` → `HeaderAside.jsx`
- `template-parts/header-search.php` → `HeaderSearch.jsx`
- `template-parts/header-profile-menu.php` → `HeaderProfileMenu.jsx`
- `template-parts/buddypanel.php` → `BuddyPanel.jsx`
- `template-parts/footer.php` → `Footer.jsx`
- `template-parts/messages-dropdown.php` → `MessagesDropdown.jsx`
- `template-parts/notification-dropdown.php` → `NotificationDropdown.jsx`
- `template-parts/unread-messages.php` → `UnreadMessages.jsx`
- `template-parts/unread-notifications.php` → `UnreadNotifications.jsx`

## Partiellement / non couverts en Phase 1

- `template-parts/header-2.php`, `header-3.php` (variantes de header — style 1 implémenté)
- `template-parts/cart-dropdown.php` (WooCommerce → Phase 6)
- Intégrations LMS dans header (LearnDash / Tutor) → Phase 6

## Livrables créés

```
src/
  styles/tokens.css, index.css
  context/ThemeProvider.jsx, LayoutProvider.jsx
  layout/* (shell complet)
  components/ui/{Button,Avatar,Badge,Dropdown}.jsx
  components/icons/index.jsx
  api/client.js (stub headless)
  data/demoData.js
tailwind.config.js  ← tokens BuddyBoss
```

## Tokens clés (preset default)

- Primary `#385DFF` · Body `#FAFBFD` · Content `#FFFFFF` · Border `#D6D9DD`
- Header height `76px` · Button radius `6px` (style 2.0) · Block radius `10px`
- BuddyPanel `68px` / `230px` · Breakpoint `800px` · Container `1200px`

## Phase suivante (Phase 2)

Fil d’activité BuddyPress :
- `buddypress/activity/index.php`, `entry.php`, `media/actions.php`
- Composer, cartes, commentaires, réactions, filtres
- API `wp-json/buddypress/v1/activity`

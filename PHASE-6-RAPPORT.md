# Rapport Phase 6 — Intégrations tierces (optionnelle)

Modules construits pour couvrir les dossiers d’intégration du thème BuddyBoss, en restant volontairement **léger** (UI + mock + stubs API, pas de paiement réel ni LMS complet).

## Modules livrés

| Domaine thème | React | Routes |
|---------------|--------|--------|
| WooCommerce + `cart-dropdown.php` | Shop, Product, Cart, Checkout, `CartDropdown` | `/shop`, `/shop/:id`, `/shop/cart`, `/shop/checkout` |
| LearnDash `ld30` course grid/course | `CoursesPage`, `CoursePage` (curriculum + progress) | `/courses`, `/courses/:id` |
| The Events Calendar `tribe-events` | `EventsPage`, `EventPage` | `/events`, `/events/:id` |
| WP Job Manager `content-job.php` | `JobsPage`, `JobPage` | `/jobs`, `/jobs/:id` |
| MemberPress / PMPro (pricing) | `MembershipsPage` | `/memberships` |

## Technique

- `CartProvider` pour panier partagé header ↔ pages shop
- Stubs API : `src/api/integrations.js` (wc / ldlms / tribe / jobs / mp)
- Nav header + BuddyPanel étendus (Courses, Shop, Events, Jobs, Memberships)

## Non couvert (volontaire)

- LifterLMS / Tutor / Academy (même pattern que LearnDash — non dupliqué)
- Paiement Stripe / Woo checkout réel
- Focus mode LearnDash / quiz engine
- Job applications + resumes plugin
- Events map / calendar month view

## État du projet

Phases **1 → 6** livrées. Le cœur social (1–5) + intégrations optionnelles (6) forment une base React/Tailwind headless prête à brancher sur WordPress REST.

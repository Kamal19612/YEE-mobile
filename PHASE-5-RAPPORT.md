# Rapport Phase 5 — Forums (bbPress) & recherche globale

## Templates PHP couverts

| Source | React |
|--------|--------|
| `bbpress.php` + archive forums | `ForumsPage` |
| `loop-forum-card.php` | `ForumCard` |
| `content-single-forum.php` / `loop-topics.php` | `ForumPage` |
| `form-topic.php` | `TopicForm` |
| `content-single-topic.php` / `loop-single-reply.php` | `TopicPage` |
| `form-reply.php` | `ReplyForm` |
| `buddypress/search/results-page.php` + `results-page-content.php` | `SearchPage` |
| `common/search/search-form.php` / `header-search.php` | `HeaderSearch` → `/search?s=` |
| API forums / search | `src/api/forums.js`, `src/api/search.js` |

## Routes

- `/forums` — grille forums + recherche locale
- `/forums/:id` — liste discussions + création topic
- `/forums/:id/topics/:topicId` — lead + réponses imbriquées + reply form
- `/search?s=` — résultats multi-onglets (All / Members / Groups / Forums / Discussions / Activity)

## Fonctionnel

- Cartes forum (cover, counts, freshness)
- Sticky / closed badges sur topics
- Réponses threadées (depth 2) + post reply
- Recherche globale mock agrégée ; bascule REST via `VITE_USE_MOCK=false`
- Loupe header navigue vers la page search

## Phases 1–5 = cœur social reconstruit

Phase 6 (optionnelle) : WooCommerce, LearnDash, MemberPress, Events, Job Manager — uniquement si besoin métier.

## Non couvert / partiel

- Tags topics bbPress
- Modal reply exacte du thème
- Recherche posts WordPress classiques (slot `posts` prévu vide en mock)

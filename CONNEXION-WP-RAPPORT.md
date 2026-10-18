# Connexion front ↔ API — AfrEA-YEE

Mise à jour : 1er octobre 2026.

Le branchement WordPress décrit plus bas (Partie B, JWT `wp-json`, `VITE_USE_MOCK`, `sessionStorage`) n’est plus celui du dépôt. `src/config/api.js` ignore les anciennes bases `wp-json`. Ne pas réactiver ce parcours.

## Branchement actuel

| Sujet | Fait |
|---|---|
| API | Spring Boot, chemins `/auth`, `/users`, `/feed`, `/groups`, `/institutions`, `/notifications`, `/conversations`, `/media`, `/admin` |
| Dev | `VITE_API_URL` vide, proxy Vite vers l’API (`VITE_API_PROXY_TARGET`) |
| Prod front | `VITE_API_URL` = URL absolue de l’API, sans slash final |
| Access token | Mémoire uniquement (`src/api/client.js`) |
| Refresh | Cookie httpOnly `app_refresh_token`, path `/auth` |
| Indicateur local | `localStorage` clé `app_had_session` seulement (pas le JWT) |
| Pages | `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password` |
| Garde | `ProtectedLayout` renvoie les invités vers `/login` |

Démarrage documenté dans `README.md` : Supabase (Postgres), puis API Spring, puis Vite. Les scripts `stack:start` sont en PowerShell ; sur ce serveur Linux il faut les équivalents shell, sans copier les secrets d’exemple en profil `dev` si l’instance est exposée.

Sécurité de session et d’e-mail : `AUDIT-SECURITE-2026-10-01.txt`.

## Archive — livrable Partie B (WordPress, périmé)

Ce bloc est historique. Il ne faut plus le suivre.

- Variables alors prévues : `VITE_WP_API_URL`, `VITE_JWT_AUTH_ENDPOINT`, `VITE_USE_MOCK`.
- Token alors prévu : mémoire + `sessionStorage` (`afrea_jwt`).
- Activation alors prévue : plugins WP, CORS, `VITE_USE_MOCK=false`, appels `/wp-json/…`.

Tout cela a été remplacé par l’API Spring ci-dessus.

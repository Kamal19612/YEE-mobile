# Connexion WordPress ↔ React — livrable Partie B

## Fait

| Étape | Détail |
|---|---|
| `.env` / `.env.example` | `VITE_WP_API_URL`, `VITE_JWT_AUTH_ENDPOINT`, `VITE_USE_MOCK` |
| `src/config/api.js` | Source unique URL / mock flag |
| `src/api/client.js` | Bearer auto, 401 → logout + `/login` |
| `src/api/auth.js` | login / logout / getCurrentUser |
| `src/hooks/useAuth.js` + `AuthProvider` | user, isAuthenticated, login, logout |
| `src/api/recits.js` | CPT récits (ACF + draft/pending/publish) |
| Clients domaine | members, groups, forums, messages, notifications, moderation |
| Header profil | nom/avatar réels, lien `/members/:id`, déconnexion |
| Page `/login` | formulaire JWT |
| Hooks | `USE_MOCK` centralisé ; erreurs API visibles (plus de fallback silencieux en live) |

## Token

Stockage : **mémoire + sessionStorage** (`afrea_jwt`).  
Limitation XSS documentée dans `src/config/api.js` — cookie httpOnly à prévoir plus tard.

## Activer le backend réel

1. Terminer **Partie A** du guide (plugins, CPT, CORS, curl JWT OK).
2. Dans `.env` : `VITE_USE_MOCK=false` (+ URLs correctes).
3. Redémarrer Vite (`npm run dev`).
4. Se connecter via `/login` et vérifier Network → `/index.php/wp-json/…` + header `Authorization`.

## Mock par défaut

`.env` local garde `VITE_USE_MOCK=true` tant que le JWT WP n’est pas validé — l’UI reste utilisable hors ligne.

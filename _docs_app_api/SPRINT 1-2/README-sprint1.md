# Sprint 1 — Authentification & structure API de base

## Objectifs
- Poser la structure du plugin `app-api` (Core + Auth), réutilisable par tous les modules futurs.
- Livrer un flux d'authentification complet et sécurisé : inscription, vérification email, connexion, déconnexion, refresh token rotatif, remember me, mot de passe oublié/réinitialisation.
- Poser l'architecture 2FA sans l'implémenter (stub documenté).
- Mettre en place le rate limiting anti brute-force sur les endpoints sensibles.
- Livrer le module React `features/auth` consommant cette API (store, hooks, formulaires).

## Fichiers livrés

**WordPress (`wp-plugin/app-api/`)**
```
app-api.php
includes/Core/RestNamespace.php
includes/Core/ApiResponse.php
includes/Core/AbstractController.php
includes/Core/Sanitizer.php
includes/Auth/JwtService.php
includes/Auth/RefreshTokenService.php
includes/Auth/RateLimiter.php
includes/Auth/TwoFactorService.php
includes/Auth/Migrations.php
includes/Auth/AuthController.php
```

**React (`react/src/`)**
```
types/auth.ts
shared/api/endpoints.ts
shared/api/axiosClient.ts
shared/utils/apiError.ts
features/auth/store/authStore.ts
features/auth/api/authApi.ts
features/auth/hooks/useAuth.ts
features/auth/hooks/useLogin.ts
features/auth/hooks/useRegister.ts
features/auth/components/LoginForm.tsx
features/auth/components/RegisterForm.tsx
```

## Dépendances
- **WordPress** : aucune dépendance externe ajoutée (JWT implémenté manuellement, cf. note dans `JwtService.php` pour la migration vers `firebase/php-jwt` dès que Packagist est accessible dans le pipeline).
- **React** : `axios`, `zustand`, `@tanstack/react-query` (déjà prévus dans la stack du projet).
- **Config requise dans `wp-config.php`** (à ajouter avant déploiement) :
  ```php
  define('APP_JWT_SECRET', getenv('APP_JWT_SECRET'));       // 64+ caractères aléatoires
  define('APP_ALLOWED_ORIGINS', ['https://app.example.com']);
  define('APP_FRONTEND_URL', 'https://app.example.com');
  // Slash final optionnel — le plugin le normalise (évite Buddyboss//verify-email).
  // Ex. GitHub Pages : define('APP_FRONTEND_URL', 'https://kamal19612.github.io/Buddyboss');
  define('APP_COOKIE_DOMAIN', '.example.com');
  ```
- **Config requise côté React** (`.env`) :
  ```
  VITE_API_BASE_URL=https://api.example.com/wp-json/app/v1
  ```

## Documentation des endpoints

### `POST /app/v1/auth/register`
| | |
|---|---|
| Body | `{ email: string, password: string, displayName: string }` |
| Succès | `201` — compte créé, email de vérification envoyé |
| Erreurs | `422` validation · `429` rate limit (5/h/IP) |
| Note | Réponse `202` identique si l'email existe déjà (anti-énumération) |

### `POST /app/v1/auth/verify-email`
| | |
|---|---|
| Body | `{ token: string }` |
| Succès | `200` |
| Erreurs | `400 invalid_token` · `400 expired_token` (24h) |

### `POST /app/v1/auth/login`
| | |
|---|---|
| Body | `{ email: string, password: string, rememberMe?: boolean }` |
| Succès | `200` — `{ accessToken, expiresIn, user }` + cookie `app_refresh_token` (httpOnly) |
| Erreurs | `401 invalid_credentials` · `403 email_not_verified` · `429` rate limit (20/15min/IP, 5/15min/email) |

### `POST /app/v1/auth/refresh`
| | |
|---|---|
| Body | aucun — refresh token lu depuis le cookie |
| Succès | `200` — nouveaux `accessToken` + cookie refresh (rotation) |
| Erreurs | `401 app_auth_invalid_refresh` · `401 app_auth_refresh_expired` · `401 app_auth_refresh_reuse_detected` (révoque toute la session) |

### `POST /app/v1/auth/logout` *(authentifié)*
| | |
|---|---|
| Header | `Authorization: Bearer <accessToken>` |
| Succès | `200` — cookie refresh effacé + révoqué en base |

### `POST /app/v1/auth/forgot-password`
| | |
|---|---|
| Body | `{ email: string }` |
| Succès | `202` — toujours le même message (anti-énumération) |
| Erreurs | `429` rate limit (5/h/IP) |

### `POST /app/v1/auth/reset-password`
| | |
|---|---|
| Body | `{ token: string, newPassword: string }` |
| Succès | `200` — révoque toutes les sessions actives de l'utilisateur |
| Erreurs | `422` validation · `400 invalid_token` · `400 expired_token` (1h) |

### `GET /app/v1/auth/me` *(authentifié)*
| | |
|---|---|
| Header | `Authorization: Bearer <accessToken>` |
| Succès | `200` — `{ id, displayName, email }` |

## Tests à écrire avant merge (PHPUnit + `WP_UnitTestCase`)
- Inscription : succès, email déjà utilisé (réponse identique), mot de passe trop faible, rate limit déclenché.
- Vérification email : token valide, token expiré, token déjà utilisé.
- Login : succès, mauvais mot de passe, email non vérifié, rate limit par IP et par email, cookie refresh bien posé (httpOnly/Secure/SameSite).
- Refresh : rotation correcte (l'ancien token devient invalide), détection de réutilisation (révocation de toute la famille), expiration.
- Logout : cookie effacé, token révoqué en base, réutilisation du refresh token échoue ensuite.
- Reset password : toutes les sessions révoquées après reset.
- Test d'intégration bout en bout côté React : login → accès à une route protégée → expiration simulée de l'access token → refresh automatique transparent (vérifier qu'une seule requête `/auth/refresh` part même si plusieurs requêtes échouent en parallèle).

## Risques identifiés
| Risque | Sévérité | Mitigation prise dans ce sprint |
|---|---|---|
| Implémentation JWT manuelle moins auditée qu'une librairie tierce | Moyenne | Comparaison en temps constant (`hash_equals`), TTL court (15 min), migration vers `firebase/php-jwt` documentée dès accès Packagist possible |
| `wp_mail()` pas fiable à grande échelle (délivrabilité) | Moyenne | Acceptable pour ce sprint (volumes faibles en dev/staging) ; migration vers provider transactionnel planifiée au sprint Notifications |
| Rate limiting reposant sur `wp_cache_*` sans Redis en prod | Élevée si oublié | Doit être vérifié en checklist de déploiement — sans Redis, la protection anti brute-force ne survit pas à un redémarrage PHP-FPM |
| `X-Forwarded-For` falsifiable si le reverse proxy n'écrase pas l'en-tête | Élevée si mal configuré | Documenté dans `RateLimiter::get_client_ip()` — à valider explicitement dans la config Nginx du sprint infra |
| 2FA non implémentée alors qu'exigée à terme | Faible (assumé pour ce sprint) | Architecture posée (`TwoFactorService`, point d'ancrage dans `login()`) pour ne pas casser le flux existant à l'activation |

## Checklist avant de considérer ce sprint terminé
- [ ] `APP_JWT_SECRET` généré (64+ caractères aléatoires) et injecté via variable d'environnement, jamais commité
- [ ] `APP_ALLOWED_ORIGINS` configuré avec le(s) domaine(s) réel(s) du frontend
- [ ] Redis actif et `object-cache.php` drop-in en place (rate limiting + object cache WP)
- [ ] Nginx configuré pour écraser `X-Forwarded-For` (pas juste l'ajouter)
- [ ] Cookies vérifiés en HTTPS réel : `Secure`, `HttpOnly`, `SameSite=Strict` bien présents (inspecter dans DevTools, pas juste relire le code)
- [ ] `wp_mail()` testé en environnement réel (SMTP configuré, sinon les emails de vérification/reset partent dans le vide)
- [ ] Tests PHPUnit ci-dessus écrits et verts
- [ ] Test manuel du scénario de rotation de refresh token (relire deux fois le même cookie → doit invalider toute la session)
- [ ] Revue de code sécurité dédiée sur `AuthController.php` avant merge en production

## Prochain sprint proposé
**Sprint 2 — Module Profil & Followers**, qui s'appuiera sur `AbstractController::require_authenticated_user()` posé dans ce sprint pour protéger les routes de profil, et sur BuddyPress pour les données de followers/following. Je ne démarre ce sprint qu'après votre validation de celui-ci.

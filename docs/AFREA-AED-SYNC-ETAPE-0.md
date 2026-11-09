# AfrEA ↔ AED — Étape 0 figée (contrat + décisions)

Source : classeur `AfrEA-AED-Sync.xlsx` (lu localement ; **ne pas versionner** ; clé API hors Git).  
Auth : **décision A** (mot de passe local pour la connexion AED).  
Date de gel : 2026-11-09.

---

## 1. Principes alignés

| # | Principe |
|---|---|
| 1 | AfrEA = source de vérité membres / orgs / memberships. AED = **miroir** en lecture. |
| 2 | L’AED **lit** AfrEA ; aucun write dans la base AfrEA. |
| 3 | Inclus : membres consentants + adhésion courante. Test : people `externalId` 2231 et 3986 uniquement. |
| 4 | Connexion AED = **e-mail + mot de passe local** (après vérif admin). Pas de Step 3 AfrEA en v1. |
| 5 | Édition profil = redirect vers le hub AfrEA ; sync ramène les changements au prochain read. |
| 6 | Upsert people sur **`externalId`** (pas l’email). Fallback email **uniquement** pour lier un compte YEE déjà existant sans `externalId`. |

---

## 2. Auth (décision A) + emplacements futurs

### 2.1 Connexion (v1) — Option A

1. Sync crée / met à jour le miroir : `status = A_VERIFIER`, **`password_hash` NULL**.
2. Login local **refusé** tant que pas de mot de passe / pas `ACTIF`.
3. Admin « Vérifier » → e-mail lien one-shot → set password → `status = ACTIF`, `email_verified = true`.
4. Sessions / JWT / refresh = 100 % YEE (existant).

### 2.2 Mot de passe nullable

- Migration : `users.password_hash` **nullable**.
- Comptes importés sans mdp : `password_hash IS NULL`.
- Comptes historiques / après set-password : hash BCrypt comme aujourd’hui.
- `AuthService.login` : refuser explicitement si hash null (même message générique que credentials invalides, ou code dédié sans énumération abusive).

### 2.3 Édition profil (Step 4)

- Phase 1 : bouton « Modifier mon profil » → `app.afrea.profile-edit-url` (URL hub **à obtenir** auprès d’AfrEA ; absente du classeur).
- Champs synchronisés en **lecture seule** dans l’UI AED.

### 2.4 Step 3 AfrEA (lien signé hub → AED) — **prévu, non activé**

Le classeur propose : *from the AfrEA member hub, the member goes to the AED with a short-lived signed link, and the AED starts its own session.*

**Emplacement réservé (feature flag off) :**

- Endpoint prévu : `POST /auth/afrea-session` (nom exact à figer au commit auth).
- Service prévu : vérification du jeton / lien signé AfrEA (clé publique / secret partagé **non encore fournis**).
- Comportement futur : valider le jeton → charger user par `externalId` → `issueSession` YEE.
- **v1** : endpoint absent du `SecurityConfig` public **ou** présent mais renvoie `501` / `feature_disabled` ; aucun branchement UI.
- La vérif admin AED reste pour les comptes hors flux AfrEA (« anyone outside AfrEA »).

### 2.5 SSO AED → AfrEA (édition) — stub phase 2

- `JwtSsoTokenService` RS256 (TTL ~60 s, claims `externalId`, `email`, `aud`, `jti`) : **écrit, non branché**.
- Distinct du Step 3 (sens inverse).

### 2.6 Réponse à formuler vers AfrEA

- Step 3 : pas pour la v1 ; emplacement technique prévu pour plus tard.
- Step 4 : OK — merci l’**URL exacte** du member hub.
- Colonne jaune Fields : OK (sous réserve décisions §4).

---

## 3. API sync (Connection)

| Élément | Valeur |
|---|---|
| Base URL test | `https://afrea.org/aed-feed/` |
| Auth | clé API via env (`AFREA_API_KEY`) — en-tête **`X-AFREA-KEY`** (ou `Authorization: Bearer`) ; `X-Api-Key` → 401. Jamais dans Git |
| Envelope people | JSON live : **`users`** (pas `people`) ; institutions / affiliations / referents inchangés |
| Format | JSON read-only ; dates `YYYY-MM-DD` ; ids texte ; vide = `null` |
| Pagination | `?after=<next_after>` tant que `has_more` ; 1ʳᵉ page ≤ 500 people + **toutes** institutions + liens de ces people |
| Delta | `?updated_since=<ISO>` (utiliser `generatedAt` du dernier read) |
| Réconciliation | `?ids=1` → ids absents chez nous → `DESACTIVE` (pas de delete physique) |
| Limites | 120 req/min ; 10 mauvaises clés / 10 min → ban 10 min |
| Jamais envoyé | paiements, notes staff, mdp, date de naissance, téléphone |

Config yml : `app.afrea.base-url`, `api-key`, timeouts, retries, `sync.cron` (défaut 02:00), `profile-edit-url`, `signed-link.enabled=false`.

---

## 4. Fields — mapping + décisions `languages` / `membership`

### 4.1 People (colonnes **synchronisées** — écrasées à chaque sync)

| AfrEA | Colonne AED | Décision |
|---|---|---|
| `externalId` | `users.external_id` UNIQUE nullable | Upsert principal |
| `email` | `users.email` | Lower-case |
| `displayName` | `users.display_name` | |
| `bio` | `users.bio` | `""` si null |
| `profession` | `users.profession` | Un seul texte (OK) |
| `location` | `users.location` | |
| `organization` | `users.organization` | Libellé libre ≠ institution |
| `socialLinks` | `users.social_links_json` | `{linkedin,twitter,website}` |
| `avatarUrl` | `users.avatar_url` | |
| `coverUrl` | `users.cover_url` | Toujours null côté AfrEA — OK |
| `languages` | `users.languages` | **Voir §4.3** |
| `membership` | colonnes dédiées | **Voir §4.4** |
| `updatedAt` | (méta sync) | Filtre `updated_since` |

### 4.2 Colonnes **locales** (jamais touchées par la sync)

`password_hash`, `status`, `is_site_admin`, tokens verify/reset, dates login/sessions, `email_verified` (sauf bascule contrôlée à l’activation), préférences (`who_can_message`, …), compteurs sociaux locaux, storage paths avatar/cover uploadés localement si un jour distincts.

### 4.3 Décision `languages` — **confirmée**

- **Stockage** : `users.languages VARCHAR(255) NULL` — **texte tel que reçu** (CSV AfrEA : `"English, French"`).
- **Pourquoi pas JSON array** : le feed envoie une string CSV ; parser/re-sérialiser ajoute de la complexité sans gain sync.
- **API publique** : exposer `languages` string (ou split en liste en lecture seule dans le transformer si l’UI préfère un tableau — dérivé, non source).
- **Sync** : colonne synchronisée (écrasée).
- **UI** : lecture seule avec le reste du profil miroir.

### 4.4 Décision `membership` — **confirmée**

AfrEA envoie :

```json
{ "type": "individual|vope_member|inst_member", "expiresOn": "YYYY-MM-DD", "yee": true|false }
```

**Stockage (3 colonnes, pas un blob opaque) :**

| Colonne | Type | Sync |
|---|---|---|
| `membership_type` | `VARCHAR(20) NULL` | oui |
| `membership_expires_on` | `DATE NULL` | oui |
| `membership_yee` | `BOOLEAN NOT NULL DEFAULT false` | oui |

**Pourquoi colonnes plutôt que JSON unique :**
- filtre admin / annuaire (`yee = true`, adhésion expirée) sans JSON path ;
- contraintes CHECK simples sur `membership_type` ;
- aligné JPA / requêtes existantes.

**Règles sync :**
- `individual` → pas d’affiliation attendue ;
- `vope_member` / `inst_member` → affiliations fournies séparément ;
- `expiresOn` passé / membership non courant : la **réconciliation `?ids=1`** et/ou absence du feed mène à `DESACTIVE` (AfrEA ne renvoie que les adhésions courantes + consentement).

**API** : exposer un objet `membership: { type, expiresOn, yee }` dans les DTO profil (lecture seule).

---

## 5. Institutions / affiliations / referents

| Ressource | Règles |
|---|---|
| Types | `continent` = AfrEA (`afrea-africa`), `country` = VOPE, `local` = institution |
| Parent | **plat** : tout VOPE/institution a `parentExternalId = afrea-africa` ; AfrEA a `null` |
| Affiliations | `userExternalId`, `institutionExternalId`, `status` `active`\|`inactive` |
| Referents | paire user ↔ institution |
| Creation status AED | imports → `PENDING` ; admin crée/rejette (`CREEE` / `REJETEE`) — commit organisations |

---

## 6. Plan d’implémentation (commits) — mis à jour

| Commit | Contenu |
|---|---|
| **1 — Modèle** | Flyway V31+ : `external_id`, `status`, `deleted_at`, `last_synced_at`, **`password_hash` nullable**, `languages`, `membership_*`, institutions `external_id` + `creation_status`, `sync_log` / `sync_state` ; backfill status legacy ; matching email documenté |
| **2 — Client API** | RestClient, config env, DTOs Fields, WireMock |
| **3 — Job sync** | cron + admin run, ordre, upsert, verrou, `ids=1` → DESACTIVE |
| **4 — Vérif admin** | A_VERIFIER, invite set-password, login local ; **stub** `POST /auth/afrea-session` flag off |
| **5 — Organisations** | PENDING / créer / rejeter / message adhésion |
| **6 — Profil** | read-only sync fields, bouton hub URL config, `JwtSsoTokenService` stub off |

Qualité : tests upsert/matching, IT WireMock, rejouabilité ; logs sans PII en clair.

---

## 7. Ouverts restants (bloquants mineurs)

| # | Sujet | Statut |
|---|---|---|
| O1 | URL exacte member hub (Step 4) | À demander AfrEA |
| O2 | Format du short-lived signed link (Step 3 futur) | Reporté ; stub seulement |
| O3 | Confirmer `languages` = VARCHAR CSV | **OK** |
| O4 | Confirmer `membership_*` en 3 colonnes | **OK** |
| O5 | Rapprochement institutions locales existantes (nom+type vs parallèle) | À trancher avant commit 5 |
| O6 | Création institutions : admin only (durcir vs référents) | À trancher avant commit 5 |
| O7 | Colonne jaune Fields renvoyée à AfrEA | Après OK user |

---

## 8. Hors scope étape 0

Aucun code métier sync tant que §4.3 / §4.4 (et ce document) ne sont pas explicitement OK.  
Ne jamais committer `AfrEA-AED-Sync.xlsx` ni la clé API.

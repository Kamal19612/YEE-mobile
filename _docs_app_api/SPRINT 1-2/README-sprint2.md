# Sprint 2 — Module Profil & Followers

## Objectifs
- Lecture/édition du profil (bio, profession, organisation, localisation, réseaux sociaux).
- Upload avatar/couverture avec validation de sécurité stricte.
- Changement de mot de passe authentifié, suppression (désactivation) de compte.
- Système de **follow asymétrique** (custom, distinct du modèle "amis" de BuddyPress — voir justification en tête de sprint) avec compteurs dénormalisés.

## Décision d'architecture clé : follow custom plutôt que BuddyPress Friends
Le cahier des charges décrit un modèle "followers/following" (Twitter/Instagram) : je peux suivre quelqu'un sans qu'il me suive en retour. Le composant "Amis" de BuddyPress est **symétrique** (demande + acceptation mutuelle, façon Facebook) — un modèle de données différent, qu'il aurait fallu détourner de son usage prévu. J'ai donc créé une table dédiée `wp_app_follows`, plus simple à maintenir et alignée sur le vrai besoin.

## Fichiers livrés

**WordPress**
```
includes/Users/Migrations.php
includes/Users/ProfileFields.php
includes/Users/UserTransformer.php
includes/Users/ProfileController.php
includes/Users/FollowController.php
includes/Media/UploadValidator.php
includes/Auth/AuthController.php   (patché : blocage login si compte désactivé)
app-api.php                        (routes + migrations enregistrées)
```

**React**
```
types/profile.ts
shared/api/endpoints.ts   (étendu)
features/profile/api/profileApi.ts
features/profile/hooks/useProfile.ts
features/profile/hooks/useFollow.ts
features/profile/hooks/useFollowLists.ts
features/profile/components/FollowButton.tsx
features/profile/components/ProfileEditForm.tsx
features/profile/components/AvatarUploader.tsx
```

## Endpoints

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | oui | Profil complet (avec email) |
| PATCH | `/users/me` | oui | Édition partielle du profil |
| PUT | `/users/me/password` | oui | Changement de mot de passe (exige l'actuel) |
| POST | `/users/me/avatar` | oui | Upload avatar (multipart) |
| POST | `/users/me/cover` | oui | Upload couverture (multipart) |
| DELETE | `/users/me` | oui | Désactivation de compte (exige le mot de passe) |
| GET | `/users/{id}` | non | Profil public |
| POST | `/users/{id}/follow` | oui | Suivre |
| DELETE | `/users/{id}/follow` | oui | Ne plus suivre |
| GET | `/users/{id}/followers` | non | Liste paginée |
| GET | `/users/{id}/following` | non | Liste paginée |

## Points de sécurité notables
- **Upload** : validation sur le contenu binaire réel (`finfo` + `getimagesize`), jamais sur l'extension/Content-Type déclaré — bloque les fichiers polyglottes.
- **Changement de mot de passe / suppression de compte** exigent une reconfirmation (mot de passe actuel) : une session volée seule ne suffit pas à prendre le contrôle total du compte.
- **Compteurs follow** ajustés par requête SQL atomique (`UPDATE ... + %d`, `GREATEST(0, ...)`) plutôt qu'en lecture/modification/écriture PHP — évite les races conditions et les compteurs négatifs sous forte concurrence.
- **`INSERT IGNORE`** sur la table de follows : un double-clic ou une requête rejouée reste idempotente, sans créer de doublon ni fausser les compteurs.
- **Anti-énumération conservée** : la désactivation de compte anonymise immédiatement les champs publics.
- **Frontend** : validation client sur l'upload = confort UX uniquement, jamais une garantie de sécurité — clairement documenté dans le code pour éviter toute confusion future.

## Tests à écrire avant merge
- `ProfileFields::validate_and_sanitize` : champs trop longs, URLs non-https rejetées, champ absent = non modifié.
- `UploadValidator::validate_image` : fichier renommé en `.jpg` mais contenant un script → rejeté ; image valide → acceptée ; fichier > 5 Mo → rejeté.
- Follow : idempotence (2 appels `POST /follow` consécutifs ne doublent pas le compteur), unfollow ramène bien à 0 et jamais en négatif, `cannot_follow_self`.
- `change_password` : mauvais mot de passe actuel → 401 ; toutes les sessions révoquées après succès.
- Login avec un compte désactivé → `403 account_deactivated`.
- Test de charge léger sur `adjust_counter` : 50 follows concurrents sur le même utilisateur → compteur final exact (pas de perte par race condition).

## Risques identifiés
| Risque | Sévérité | Mitigation |
|---|---|---|
| Upload avatar stocké en local WordPress, pas encore S3 | Moyenne | Assumé pour ce sprint ; migration prévue au sprint Média dédié, sans impact sur le contrat d'API (`url` reste le même type de champ) |
| Pas de génération de thumbnails asynchrone | Faible | `wp_get_attachment_image_url` avec la taille `large` suffit pour ce sprint ; à optimiser si le poids des images pénalise le feed plus tard |
| Profils privés non gérés | Faible (hors scope confirmé) | Noté explicitement dans `ProfileController::get_public_profile` comme point d'ancrage pour un sprint futur si le besoin apparaît |
| Compte "désactivé" et non supprimé physiquement | Faible, conforme au choix RGPD différé | Purge physique à programmer dans un sprint Conformité RGPD dédié |

## Checklist avant de considérer ce sprint terminé
- [ ] Remplacer `includes/Auth/AuthController.php` du sprint 1 par la version patchée de ce sprint (vérification compte désactivé)
- [ ] Vérifier que `wp-content/uploads` est bien exclu de toute exécution PHP côté serveur (`.htaccess`/config Nginx) — mesure de défense en profondeur même après validation applicative
- [ ] Tester l'upload avec un fichier `.jpg` renommé contenant du PHP → doit être rejeté
- [ ] Vérifier qu'un follow/unfollow rapide (double-clic) ne fausse jamais les compteurs (test manuel + test automatisé)
- [ ] Tests PHPUnit ci-dessus écrits et verts

## Prochain sprint proposé
**Sprint 3 — Fil d'actualité (Feed)** : publications, réactions, commentaires — le module qui viendra peupler `stats.postsCount`, actuellement à 0. C'est aussi le module le plus sensible en performance (cf. stratégie de cache : pagination par curseur, compteurs dénormalisés, cache Redis court). Je ne démarre qu'après votre validation de ce sprint 2.

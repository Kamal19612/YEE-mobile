# Audit actions interactives — AfrEA-YEE

Date : 2026-08-04 · Projet : `Buddyboss-push`

## Corrections layout (préalable)

- Marque **AfrEA-YEE** rattachée à la **sidebar** (pastille AY + titre/tagline)
- Header desktop sans marque ni menu central
- Sidebar : sections Navigation / Espace perso, footer tagline
- `overflow-x-hidden` déplacé hors de `#page` (dropdowns plus clipés)

## Tableaux de suivi

### Header / Navigation

| Action | Handler ? | API ? | Erreur/loading ? | Avant | Correction | Après |
|---|---|---|---|---|---|---|
| Dropdown profil ouverture | oui | n/a | n/a | Coupe / clic mort (overflow) | Dropdown `fixed` + stopPropagation | OK |
| Items profil (profil/réglages) | Link | mock | n/a | Peu fiable | navigate + close | OK |
| Déconnexion | non | — | — | Lien mort `/` | alert mock + navigate | OK mock |
| Dropdown messages | Link | mock | — | OK nav | inchangé | OK |
| Dropdown notifications + mark read | oui local | mock | — | OK local | inchangé | OK local |
| Recherche header | oui | n/a | — | OK | inchangé | OK |
| Nav sidebar | NavLink | n/a | — | OK | sections UI | OK |
| Menu mobile hamburger | oui | n/a | — | OK | inchangé | OK |

### Membres / Profils

| Action | Handler ? | API ? | Erreur/loading ? | Avant | Correction | Après |
|---|---|---|---|---|---|---|
| Carte → profil | Link | mock | loading | OK | — | OK |
| Onglets profil | NavLink | n/a | — | OK | — | OK |
| Connecter (profil) | partiel | mock | non | État non mis à jour | `useMember.toggleFriend` | OK |
| Filtres annuaire | oui | mock | — | OK | — | OK |
| Settings save | oui | mock toast | oui | OK | — | OK |
| Request Export | non | — | — | Mort | alert mock | OK mock |
| Timeline like/comment | partiel | mock | — | status manquant / nest cassé | helpers + status | OK |

### Fil de récits

| Action | Handler ? | API ? | Erreur/loading ? | Avant | Correction | Après |
|---|---|---|---|---|---|---|
| Publier / brouillon | oui | mock | submitting | OK | — | OK |
| Consentement | oui | n/a | erreur UI | OK | — | OK |
| Media preview | oui | local blob | — | OK | — | OK |
| Like / comment | oui | mock | — | OK feed | — | OK |
| Share | partiel | n/a | silencieux | Mort desktop | clipboard fallback | OK |
| Filtres / Load more | oui | mock | loading | OK | — | OK |
| Liens auteur | `<a>` | — | — | reload | `Link` | OK |

### Groupes

| Action | Handler ? | API ? | Erreur/loading ? | Avant | Correction | Après |
|---|---|---|---|---|---|---|
| Carte → groupe | Link | mock | — | OK | — | OK |
| Join/Leave | oui | mock | — | OK | — | OK |
| Créer cohorte | absent | — | — | Manquant | formulaire + `createGroup` | OK |
| Invite | UI | mock | — | OK | — | OK |
| Fil groupe actions | partiel | mock | — | status / nest | helpers | OK |

### Forums

| Action | Handler ? | API ? | Erreur/loading ? | Avant | Correction | Après |
|---|---|---|---|---|---|---|
| Forum → sujets | Link | mock | — | OK | — | OK |
| Sujet → réponses | Link | mock | — | OK | — | OK |
| Répondre / Nouveau sujet | oui | mock | — | OK | — | OK |

### Messages

| Action | Handler ? | API ? | Erreur/loading ? | Avant | Correction | Après |
|---|---|---|---|---|---|---|
| Ouvrir thread | Link | mock | — | OK | — | OK |
| Envoyer | oui | mock | — | OK | — | OK |
| Nouvelle conversation | absent | — | — | Manquant | compose + `createThread` | OK |

### Notifications

| Action | Handler ? | API ? | Erreur/loading ? | Avant | Correction | Après |
|---|---|---|---|---|---|---|
| Clic → navigation | Link | mock | — | OK | — | OK |
| Mark read / all | oui | mock | — | OK page | — | OK |
| Sync dropdown↔page | non | — | — | Silo | **reste** (store partagé) | Partiel |

### Modération

| Action | Handler ? | API ? | Erreur/loading ? | Avant | Correction | Après |
|---|---|---|---|---|---|---|
| Approuver / Rejeter | oui | mock | actingId | OK | — | OK |
| Commentaire rejet | oui | mock | required | OK | — | OK |

### Ressources

| Action | Handler ? | API ? | Erreur/loading ? | Avant | Correction | Après |
|---|---|---|---|---|---|---|
| Ouvrir | `href="#"` | — | — | Mort | PDF demo + `target=_blank` | OK mock |
| Filtres | oui | local | — | OK | — | OK |

### Recherche

| Action | Handler ? | API ? | Erreur/loading ? | Avant | Correction | Après |
|---|---|---|---|---|---|---|
| Soumettre / onglets / filtres | oui | mock | loading | OK | — | OK |
| Deep-link récit | vers `/` | — | — | Faible | **reste** | Partiel |

## Reste (backend headless / suite)

1. Store partagé messages/notifications pour sync header ↔ pages
2. Deep-link vers `#activity-:id` depuis recherche/notifications
3. Auth réelle (Sign in/up actuellement hors flux logged-in)
4. Upload média vers WP Media Library
5. Statut « Request Join » privé réellement pending côté API

## Projet de travail recommandé

`C:\Users\DEV\Documents\apprentissage\Buddyboss-push` (clone Git sain).

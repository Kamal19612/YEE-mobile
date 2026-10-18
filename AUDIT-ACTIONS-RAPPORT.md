# Audit actions interactives — AfrEA-YEE

Date d’origine : 2026-08-04 · Projet d’alors : interface mock `Buddyboss-push`

Mise à jour : 2 octobre 2026, revue de code (pas de clic navigateur).

Le tableau d’août est conservé en annexe. Il ne décrit plus l’application : l’API Spring est branchée, l’auth n’est plus un mock, les forums / la modération / les ressources ne sont plus des parcours.

Référence sécurité : `AUDIT-SECURITE-2026-10-01.txt`.

## État au 2 octobre 2026

| Zone | Branchement | Écart restant |
|---|---|---|
| Login, inscription, verify, reset, logout | API `/auth` + cookie refresh | SMTP dès `SPRING_MAIL_HOST`. Sans hôte : pas d’envoi ; en dev le lien peut encore être dans le JSON |
| Fil publier, like, commentaire, média | API `/feed` | Fil et fichiers private/secret réservés aux membres. URL publique seulement pour le fil global et les groupes public |
| Annuaire, profil, follow, réglages | API `/users` | Export de données toujours absent |
| Groupes créer, rejoindre, invitations | API `/groups` | Roster private/secret réservé aux membres actifs. La fiche private reste un résumé |
| Institutions / clubs | API `/institutions` | — |
| Messages | API `/conversations` + SSE | Pièces via `/conversations/{id}/media/{mediaId}`, participant seulement |
| Notifications | API + SSE | — |
| Admin comptes | API `/admin` + garde UI | Pas de modération éditoriale. 2FA retirée (V17) |
| Base | Flyway V1–V19, RLS V15 et V18 | L’exemple se connecte encore en `postgres`, qui contourne le RLS |
| Débit | Table `rate_limit_buckets` | Commun aux instances. Les tests restent en mémoire |
| Recherche | Page routée | Le client historique BuddyPress ne couvre pas le contrat Spring |
| Forums, ressources, modération, shop, cours, jobs, events | Retirés du dépôt | Catch-all `*` vers `/` |
| Pied de page | `/legal/about|privacy|terms|contact` | Textes provisoires ; rédaction juridique AfrEA à venir |

## Annexe — relevé du 4 août 2026 (obsolète)

À cette date, presque toutes les actions étaient mock. Points alors ouverts, et ce qu’il en est :

1. Store messages / notifications header ↔ page : le header lit désormais les hooks API (`useMessages`, notifications).
2. Deep-link récit `#activity-:id` : le fil live est `/feed/:postId`, plus une ancre.
3. Auth réelle : faite (Spring), plus WordPress JWT.
4. Upload vers la médiathèque WordPress : remplacé par stockage local ou Supabase.
5. Join privé en attente : implémenté (`pending` si visibilité `private`).

Le chemin Windows `Buddyboss-push` cité en 2026-08-04 n’est plus le projet de travail. Le dépôt servi ici est `/var/www/html/YEE`.

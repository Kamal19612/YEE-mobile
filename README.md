# AfrEA-YEE (React + Vite + Spring Boot)

Frontend React + Tailwind, API Spring Boot locale.

## Dev

```bash
# 1) Supabase local (Postgres :15422, API :15421)
npm run supabase:start

# 2) API Spring + React Vite (arrière-plan)
# Prérequis : spring-boot/.env (déjà calé sur Supabase local dans .env.example)
npm run stack:start
# Arrêt :
npm run stack:stop
```

Logs : `.tmp/logs/spring-boot.*.log` et `.tmp/logs/vite.*.log`.

- Front : `http://localhost:5173`
- API : `http://localhost:8080` (proxy Vite same-origin)
- Studio Supabase : `http://127.0.0.1:15423`

### E-mails (SMTP)

Sans `SPRING_MAIL_HOST`, l’API ne tente pas d’envoi. En profil `dev`,
`APP_DEV_EXPOSE_EMAIL_LINKS=true` peut renvoyer le lien d’activation dans
la réponse d’inscription.

Pour tester un vrai envoi en local (Mailpit) :

```bash
docker run -d --name mailpit -p 8025:8025 -p 1025:1025 axllent/mailpit
```

Dans `spring-boot/.env` :

```env
SPRING_MAIL_HOST=127.0.0.1
SPRING_MAIL_PORT=1025
SPRING_MAIL_SMTP_AUTH=false
SPRING_MAIL_SMTP_STARTTLS=false
APP_MAIL_FROM=AfrEA-YEE <noreply@localhost>
APP_DEV_EXPOSE_EMAIL_LINKS=false
```

Puis redémarrer la stack et ouvrir http://127.0.0.1:8025. En production :
profil `prod`, SMTP réel (auth + STARTTLS), jamais d’exposition des liens.

## Coquille statique (GitHub Pages)

Ce n’est pas l’application en ligne : le workflow Pages construit seulement le frontend, avec `VITE_API_URL` vide. Aucun compte, aucun fil, aucune API.

Adresse de la coquille : https://kamal19612.github.io/YEE/

1. **Settings → Actions → General** : autoriser les Actions, puis **Settings → Pages → Source** : **GitHub Actions**.
2. Le build utilise `base: /YEE/` et `VITE_API_URL` vide (stack locale — pas d’URL distante).

Pour tester le build Pages en local :

```bash
$env:VITE_BASE='/YEE/'; $env:VITE_API_URL=''; npm run build
npm run preview
```

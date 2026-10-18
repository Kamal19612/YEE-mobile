#!/usr/bin/env bash
# Charge spring-boot/.env sans l'afficher, puis lance SmtpLiveIT.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${1:-$ROOT/spring-boot/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Fichier manquant : $ENV_FILE" >&2
  exit 1
fi

import_dotenv() {
  local line key value
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" || "$line" == \#* ]] && continue
    [[ "$line" != *=* ]] && continue
    key="${line%%=*}"
    value="${line#*=}"
    key="${key%"${key##*[![:space:]]}"}"
    value="${value#"${value%%[![:space:]]*}"}"
    if [[ ${#value} -ge 2 && "$value" == \"*\" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ ${#value} -ge 2 && "$value" == \'*\' ]]; then
      value="${value:1:${#value}-2}"
    fi
    export "$key=$value"
  done < "$1"
}

import_dotenv "$ENV_FILE"

if [[ -z "${SPRING_MAIL_HOST:-}" ]]; then
  echo "SPRING_MAIL_HOST absent dans l'environnement chargé — test SMTP ignoré." >&2
  exit 2
fi

# Destinataire optionnel : SMTP_TEST_TO=vous@example.com ./scripts/test-smtp.sh
echo "SMTP live test : host configuré, port=${SPRING_MAIL_PORT:-?} (secrets non affichés)"

cd "$ROOT/spring-boot"
./gradlew test --tests com.afrea.yee.auth.SmtpLiveIT --info

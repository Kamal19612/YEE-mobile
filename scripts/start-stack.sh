#!/usr/bin/env bash
# Démarre Spring Boot (:8080) + React/Vite (:5173) en arrière-plan.
# Usage:
#   ./scripts/start-stack.sh
#   ./scripts/start-stack.sh --no-browser
#   npm run stack:start

set -euo pipefail

NO_BROWSER=0
API_PORT=8080
WEB_PORT=5173

while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-browser) NO_BROWSER=1; shift ;;
        --api-port) API_PORT="$2"; shift 2 ;;
        --web-port) WEB_PORT="$2"; shift 2 ;;
        -h|--help)
            echo "Usage: $0 [--no-browser] [--api-port N] [--web-port N]"
            exit 0
            ;;
        *)
            echo "Option inconnue: $1" >&2
            exit 1
            ;;
    esac
done

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/stack-common.sh"

PROJECT_ROOT="$(stack_project_root)"
SPRING_DIR="$PROJECT_ROOT/spring-boot"
LOGS_DIR="$PROJECT_ROOT/.tmp/logs"
PID_FILE="$PROJECT_ROOT/.tmp/stack.pids"
ENV_FILE="$SPRING_DIR/.env"

mkdir -p "$LOGS_DIR"

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

ensure_java_home() {
    if [[ -n "${JAVA_HOME:-}" && -x "$JAVA_HOME/bin/java" ]]; then
        return 0
    fi

    local candidate
    for candidate in \
        /usr/lib/jvm/java-21-openjdk-amd64 \
        /usr/lib/jvm/java-21-openjdk-arm64 \
        /usr/lib/jvm/openjdk-21 \
        /usr/lib/jvm/java-17-openjdk-amd64 \
        /usr/lib/jvm/java-25-openjdk-amd64
    do
        if [[ -x "$candidate/bin/java" ]]; then
            export JAVA_HOME="$candidate"
            export PATH="$JAVA_HOME/bin:$PATH"
            echo "JAVA_HOME=$JAVA_HOME"
            return 0
        fi
    done

    if command -v java >/dev/null 2>&1; then
        local java_bin
        java_bin="$(readlink -f "$(command -v java)")"
        export JAVA_HOME="$(dirname "$(dirname "$java_bin")")"
        export PATH="$JAVA_HOME/bin:$PATH"
        echo "JAVA_HOME=$JAVA_HOME"
        return 0
    fi

    echo "JAVA_HOME introuvable. Installe OpenJDK 21 ou définis JAVA_HOME." >&2
    exit 1
}

if [[ ! -f "$ENV_FILE" ]]; then
    example="$SPRING_DIR/.env.example"
    if [[ ! -f "$example" ]]; then
        echo "Fichier manquant : spring-boot/.env.example" >&2
        exit 1
    fi
    cp "$example" "$ENV_FILE"
    echo "Créé spring-boot/.env depuis .env.example"
    echo "IMPORTANT : renseigne SPRING_DATASOURCE_PASSWORD (et l’URL Supabase) dans spring-boot/.env"
fi

if grep -q 'db\.<PROJECT_REF>' "$ENV_FILE"; then
    echo ""
    echo "ATTENTION : SPRING_DATASOURCE_URL contient encore <PROJECT_REF>."
    echo "Pour le local : jdbc:postgresql://127.0.0.1:15422/postgres (supabase start)"
    echo ""
    echo "Configuration DB incomplète dans spring-boot/.env" >&2
    exit 1
fi

if grep -Eq '^SPRING_DATASOURCE_PASSWORD=[[:space:]]*$' "$ENV_FILE"; then
    echo ""
    echo "ATTENTION : SPRING_DATASOURCE_PASSWORD est vide."
    echo "Supabase local : password = postgres"
    echo ""
    echo "Configuration DB incomplète dans spring-boot/.env" >&2
    exit 1
fi

ensure_java_home
import_dotenv "$ENV_FILE"

if [[ "${SPRING_DATASOURCE_URL:-}" =~ jdbc:postgresql://([^:/]+):([0-9]+) ]]; then
    db_host="${BASH_REMATCH[1]}"
    db_port="${BASH_REMATCH[2]}"
    if [[ "$db_host" == "127.0.0.1" || "$db_host" == "localhost" ]]; then
        if ! timeout 2 bash -c "echo >/dev/tcp/${db_host}/${db_port}" 2>/dev/null; then
            echo "Postgres local injoignable sur ${db_host}:${db_port}. Lance d'abord : npm run supabase:start" >&2
            exit 1
        fi
    fi
fi

export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-dev}"
export SERVER_PORT="${SERVER_PORT:-$API_PORT}"

echo "Arrêt éventuel des processus sur :$API_PORT et :$WEB_PORT..."
stack_stop_port "$API_PORT"
stack_stop_port "$WEB_PORT"
sleep 0.5

api_out="$LOGS_DIR/spring-boot.out.log"
api_err="$LOGS_DIR/spring-boot.err.log"
web_out="$LOGS_DIR/vite.out.log"
web_err="$LOGS_DIR/vite.err.log"
stamp="$(date +%Y%m%d-%H%M%S)"

for f in "$api_out" "$api_err" "$web_out" "$web_err"; do
    if [[ -f "$f" ]]; then
        mv "$f" "${f%.log}.$stamp.log" 2>/dev/null || true
    fi
done

echo "Démarrage Spring Boot (arrière-plan)..."
nohup bash -c 'cd "$1" && exec ./gradlew bootRun --no-daemon' _ "$SPRING_DIR" \
    >"$api_out" 2>"$api_err" </dev/null &
api_pid=$!
disown "$api_pid" 2>/dev/null || true

echo "Démarrage React/Vite (arrière-plan)..."
nohup bash -c 'cd "$1" && exec npm run dev -- --port "$2" --strictPort' _ "$PROJECT_ROOT" "$WEB_PORT" \
    >"$web_out" 2>"$web_err" </dev/null &
web_pid=$!
disown "$web_pid" 2>/dev/null || true

cat >"$PID_FILE" <<EOF
apiPid=$api_pid
webPid=$web_pid
apiPort=$API_PORT
webPort=$WEB_PORT
startedAt=$(date -Iseconds)
EOF

echo ""
echo "Stack lancée en arrière-plan."
echo "  API  : http://localhost:$API_PORT  (PID $api_pid)"
echo "  Web  : http://localhost:$WEB_PORT  (PID $web_pid)"
echo "  Logs : $LOGS_DIR"
echo "  Stop : ./scripts/stop-stack.sh   ou  npm run stack:stop"
echo ""

if [[ "$NO_BROWSER" -eq 0 && -n "${DISPLAY:-${WAYLAND_DISPLAY:-}}" ]] && command -v xdg-open >/dev/null 2>&1; then
    sleep 2
    xdg-open "http://localhost:$WEB_PORT" >/dev/null 2>&1 || true
fi

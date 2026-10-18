#!/usr/bin/env bash
# Libère le port Vite (défaut 5173) puis relance le serveur de dev.
# Usage:
#   ./scripts/dev.sh
#   ./scripts/dev.sh --kill-only
#   ./scripts/dev.sh --port 5174
#   npm run dev:fresh
#   npm run dev:kill

set -u

PORT=5173
KILL_ONLY=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --port) PORT="$2"; shift 2 ;;
        --kill-only) KILL_ONLY=1; shift ;;
        -h|--help)
            echo "Usage: $0 [--port N] [--kill-only]"
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
cd "$PROJECT_ROOT"

if [[ -z "$(stack_port_pids "$PORT")" ]]; then
    echo "Port $PORT already free."
else
    stack_stop_port "$PORT"
fi

if [[ "$KILL_ONLY" -eq 1 ]]; then
    exit 0
fi

echo "Starting Vite on port $PORT..."
exec npm run dev -- --port "$PORT"

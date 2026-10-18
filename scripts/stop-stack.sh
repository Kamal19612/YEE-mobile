#!/usr/bin/env bash
# Arrête Spring Boot + React démarrés via start-stack.sh.
# Usage:
#   ./scripts/stop-stack.sh
#   ./scripts/stop-stack.sh --api-port 8080 --web-port 5173
#   npm run stack:stop

set -u

API_PORT=8080
WEB_PORT=5173

while [[ $# -gt 0 ]]; do
    case "$1" in
        --api-port) API_PORT="$2"; shift 2 ;;
        --web-port) WEB_PORT="$2"; shift 2 ;;
        -h|--help)
            echo "Usage: $0 [--api-port N] [--web-port N]"
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
PID_FILE="$PROJECT_ROOT/.tmp/stack.pids"

if [[ -f "$PID_FILE" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
        if [[ "$line" =~ ^(apiPid|webPid)=([0-9]+)$ ]]; then
            pid="${BASH_REMATCH[2]}"
            label="${BASH_REMATCH[1]}"
            if kill -0 "$pid" 2>/dev/null; then
                name="$(stack_proc_name "$pid")"
                stack_kill_tree "$pid"
                if [[ -n "$name" ]]; then
                    echo "Arrêté PID $pid ($label, $name)"
                else
                    echo "Arrêté PID $pid ($label)"
                fi
            fi
        fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
fi

stack_stop_port "$API_PORT"
stack_stop_port "$WEB_PORT"

echo "Stack arrêtée."

# Fonctions partagées par les scripts de stack (Linux).

stack_project_root() {
    local here
    here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    (cd "$here/.." && pwd)
}

stack_proc_name() {
    ps -p "$1" -o comm= 2>/dev/null | tr -d ' ' || true
}

# Tue un processus et ses enfants (Gradle/npm laissent souvent un fils).
stack_kill_tree() {
    local pid="$1" child
    [[ -z "$pid" || "$pid" -le 1 ]] && return 0
    kill -0 "$pid" 2>/dev/null || return 0

    while read -r child; do
        [[ -n "$child" ]] && stack_kill_tree "$child"
    done < <(pgrep -P "$pid" 2>/dev/null || true)

    kill -TERM "$pid" 2>/dev/null || true
}

stack_port_pids() {
    local port="$1"
    lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
}

stack_stop_port() {
    local port="$1" pid name
    local found=0
    while read -r pid; do
        [[ -z "$pid" || "$pid" -le 1 ]] && continue
        found=1
        name="$(stack_proc_name "$pid")"
        stack_kill_tree "$pid"
        if [[ -n "$name" ]]; then
            echo "Arrêté PID $pid ($name) sur :$port"
        else
            echo "Arrêté PID $pid sur :$port"
        fi
    done < <(stack_port_pids "$port")

    if [[ "$found" -eq 0 ]]; then
        return 0
    fi

    sleep 0.4
    while read -r pid; do
        [[ -z "$pid" || "$pid" -le 1 ]] && continue
        kill -KILL "$pid" 2>/dev/null || true
    done < <(stack_port_pids "$port")
}

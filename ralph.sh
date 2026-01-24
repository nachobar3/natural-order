#!/bin/bash
#############################################
# Ralph Wiggum Loop - Natural Order MVP
#
# Un loop que ejecuta Claude iterativamente
# para completar tareas del MVP.
#
# Uso: ./ralph.sh [duración_minutos]
# Ejemplo: ./ralph.sh 60  # Correr por 1 hora
#############################################

set -e

# Configuración
DURATION_MINUTES=${1:-60}
MAX_TURNS_PER_ITERATION=50
LOG_DIR="./ralph_logs"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="$LOG_DIR/ralph_$TIMESTAMP.log"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de logging
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"
}

# Crear directorio de logs
mkdir -p "$LOG_DIR"

# Header
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           🔄 Ralph Wiggum Loop - Natural Order             ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  Duración máxima: ${DURATION_MINUTES} minutos                              ║"
echo "║  Log file: $LOG_FILE     ║"
echo "║  Inicio: $(date '+%Y-%m-%d %H:%M:%S')                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Guardar tiempo de inicio
START_TIME=$(date +%s)
END_TIME=$((START_TIME + DURATION_MINUTES * 60))
ITERATION=0

# Estado inicial
log "📁 Directorio de trabajo: $(pwd)"
log "📝 Archivos de configuración: PROMPT.md, TASKS.md"

# Verificar que existen los archivos necesarios
if [ ! -f "PROMPT.md" ]; then
    log_error "PROMPT.md no encontrado!"
    exit 1
fi

if [ ! -f "TASKS.md" ]; then
    log_error "TASKS.md no encontrado!"
    exit 1
fi

# Verificar que node_modules existe
if [ ! -d "node_modules" ]; then
    log "📦 Instalando dependencias..."
    npm install >> "$LOG_FILE" 2>&1
    log_success "Dependencias instaladas"
fi

# Función para contar tareas
count_tasks() {
    local pending completed
    pending=$(grep -c "^\- \[ \]" TASKS.md 2>/dev/null) || pending=0
    completed=$(grep -c "^\- \[x\]" TASKS.md 2>/dev/null) || completed=0
    echo "$completed/$((pending + completed))"
}

# Función para verificar tiempo restante
check_time() {
    local current=$(date +%s)
    local remaining=$((END_TIME - current))
    if [ $remaining -le 0 ]; then
        return 1
    fi
    echo $((remaining / 60))
    return 0
}

# Loop principal
while true; do
    ITERATION=$((ITERATION + 1))

    # Verificar tiempo
    REMAINING=$(check_time) || {
        log_warning "⏰ Tiempo agotado!"
        break
    }

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "🚀 ITERACIÓN $ITERATION | Tiempo restante: ${REMAINING}min | Tareas: $(count_tasks)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Guardar hash de TASKS.md para detectar cambios
    TASKS_HASH_BEFORE=$(md5sum TASKS.md | cut -d' ' -f1)
    COMMITS_BEFORE=$(git rev-list --count HEAD 2>/dev/null || echo "0")

    # Ejecutar Claude
    log "🤖 Iniciando agente Claude..."

    # Timeout de 10 minutos por iteración para evitar que se quede pegado
    # Nota: El prompt se pasa como argumento, no por pipe
    timeout 600 claude --dangerously-skip-permissions --max-turns "$MAX_TURNS_PER_ITERATION" "$(cat PROMPT.md)" 2>&1 | tee -a "$LOG_FILE" || {
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 124 ]; then
            log_warning "Iteración terminó por timeout (10 min)"
        else
            log_warning "Agente terminó con código: $EXIT_CODE"
        fi
    }

    # Verificar progreso
    TASKS_HASH_AFTER=$(md5sum TASKS.md | cut -d' ' -f1)
    COMMITS_AFTER=$(git rev-list --count HEAD 2>/dev/null || echo "0")
    NEW_COMMITS=$((COMMITS_AFTER - COMMITS_BEFORE))

    if [ "$TASKS_HASH_BEFORE" != "$TASKS_HASH_AFTER" ]; then
        log_success "TASKS.md fue actualizado"
    fi

    if [ $NEW_COMMITS -gt 0 ]; then
        log_success "$NEW_COMMITS nuevo(s) commit(s) creado(s)"
        git log --oneline -$NEW_COMMITS | while read line; do
            log "   📝 $line"
        done
    fi

    # Verificar build
    log "🔨 Verificando build..."
    if npm run build >> "$LOG_FILE" 2>&1; then
        log_success "Build exitoso"
    else
        log_error "Build falló - el agente debería arreglarlo en la próxima iteración"
    fi

    # Verificar si hay cambios sin commitear
    if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
        log_warning "Hay cambios sin commitear"
    fi

    # Verificar si todas las tareas están completas
    PENDING=$(grep -c "^\- \[ \]" TASKS.md 2>/dev/null || echo "0")
    if [ "$PENDING" -eq 0 ]; then
        log_success "🎉 ¡TODAS LAS TAREAS COMPLETADAS!"
        break
    fi

    # Pequeña pausa entre iteraciones
    log "⏸️  Pausa de 5 segundos antes de la siguiente iteración..."
    sleep 5
done

# Resumen final
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    📊 RESUMEN FINAL                        ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  Iteraciones completadas: $ITERATION"
echo "║  Tareas completadas: $(count_tasks)"
echo "║  Duración total: $(($(date +%s) - START_TIME)) segundos"
echo "║  Log guardado en: $LOG_FILE"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Mostrar últimos commits
echo "📜 Últimos 10 commits:"
git log --oneline -10

echo ""
echo "📋 Estado final de TASKS.md:"
grep -E "^### |^\- \[" TASKS.md | head -30

echo ""
log_success "Ralph Loop finalizado"

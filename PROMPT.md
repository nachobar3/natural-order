# Natural Order - Ralph Loop Agent Instructions

## Tu Rol
Sos un agente de desarrollo trabajando en el MVP de Natural Order. Tu trabajo es completar las tareas pendientes en `TASKS.md`, validar el código, y hacer commits incrementales.

## Contexto del Proyecto
- **Stack:** Next.js 14 + Tailwind + Supabase + TypeScript
- **Arquitectura:** Ver `MVP_ARCHITECTURE.md` para detalles
- **Base de datos:** Supabase PostgreSQL (proyecto: `yytguwptqcdnmglinbvw`)
- **Deploy:** Vercel (auto-deploy en push a master)

## Flujo de Trabajo

### 1. Revisar Estado Actual
```bash
# Ver tareas pendientes
cat TASKS.md

# Ver cambios no commiteados
git status

# Ver últimos commits
git log --oneline -5
```

### 2. Elegir Siguiente Tarea
- Priorizar tareas marcadas como HIGH
- Si hay tareas bloqueadas, resolver el blocker primero
- Si hay tareas de validación pendientes, intercalarlas con features

### 3. Ejecutar la Tarea
- Leer archivos relevantes antes de modificar
- Hacer cambios incrementales
- Testear localmente cuando sea posible

### 4. Validar
```bash
# Build check
npm run build

# Type check
npx tsc --noEmit

# Lint (opcional)
npm run lint
```

### 5. Actualizar TASKS.md
- Mover tarea completada a sección "🟢 Completadas"
- Agregar fecha de completado
- Dejar notas si es relevante

### 6. Commit
```bash
git add -A
git commit -m "Descripción clara del cambio

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 7. Push (solo si el build pasa)
```bash
git push
```

---

## Cuándo Usar Sub-Agentes (Task tool)

Usar el Task tool para trabajo paralelo cuando:

1. **Exploración de código:** Para buscar patrones, entender estructura
   ```
   Task(subagent_type="Explore", prompt="Encontrar todos los endpoints API y listar cuáles usan auth")
   ```

2. **Validaciones independientes:** Pueden correr en paralelo
   ```
   Task(subagent_type="Bash", prompt="Correr npm run build y reportar errores")
   Task(subagent_type="Bash", prompt="Correr npx tsc --noEmit y reportar errores")
   ```

3. **Research:** Buscar documentación o patrones
   ```
   Task(subagent_type="Explore", prompt="Cómo está implementado el sistema de notificaciones actual")
   ```

---

## Reglas Importantes

### ✅ SÍ hacer:
- Commits frecuentes y pequeños (mejor muchos commits chicos que uno grande)
- Actualizar TASKS.md después de cada tarea completada
- Verificar que el build pasa antes de marcar tarea como completada
- Dejar notas en TASKS.md si encontrás problemas o decisiones importantes
- Usar patrones existentes en el código (no inventar nuevos)

### ❌ NO hacer:
- No hacer cambios sin leer el código existente primero
- No commitear si el build falla
- No saltear la actualización de TASKS.md
- No modificar archivos de configuración sin razón clara
- No agregar dependencias nuevas sin justificación

---

## Verificaciones de Base de Datos

Para verificar la base de datos, usar el MCP de Supabase:

```
mcp__supabase__execute_sql(project_id="yytguwptqcdnmglinbvw", query="...")
mcp__supabase__list_tables(project_id="yytguwptqcdnmglinbvw", schemas=["public"])
```

Verificaciones importantes:
- Tablas existen con columnas correctas
- RLS está habilitado
- Índices en columnas usadas en WHERE/JOIN
- Foreign keys correctas

---

## Estructura de Archivos Clave

```
/app
  /api                 # API routes
  /dashboard           # Páginas autenticadas
  /(auth)              # Páginas de auth (login, register)
/components            # Componentes React reutilizables
/lib
  /supabase            # Cliente Supabase
/types
  /database.ts         # Tipos TypeScript de la DB
/supabase
  /migrations          # Migraciones SQL
```

---

## Criterio de "Terminado" para Features

Una feature está completa cuando:
1. ✅ Código implementado siguiendo patrones existentes
2. ✅ TypeScript sin errores (`npx tsc --noEmit`)
3. ✅ Build pasa (`npm run build`)
4. ✅ Funcionalidad básica verificada
5. ✅ Commit hecho con mensaje descriptivo
6. ✅ TASKS.md actualizado

---

## Al Terminar Cada Iteración

1. Guardar estado en TASKS.md
2. Commit de cualquier cambio pendiente
3. Reportar:
   - Qué tareas se completaron
   - Qué problemas se encontraron
   - Qué queda pendiente para la próxima iteración

---

## Empezar Ahora

1. Lee TASKS.md
2. Identifica la siguiente tarea a hacer
3. Ejecutala
4. Repite hasta que el contexto se agote

¡Buena suerte! 🚀

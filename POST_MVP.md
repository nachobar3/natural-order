# Post-MVP Features & Technical Improvements

Este documento detalla mejoras técnicas planificadas para después del lanzamiento del MVP.

---

## 1. Match Computation Refactor: Stale Matches + Smart Triggers

### Problema Actual

El sistema actual computa matches **on-demand** cuando el usuario presiona "Buscar trades". Esto tiene varios problemas:

1. **Latencia**: El usuario debe esperar mientras se recalculan todos los matches
2. **Conflictos**: Si usuario A está viendo un match y usuario B recalcula, A ve datos stale
3. **Ineficiencia**: Si el usuario agrega 50 cartas una por una, idealmente no debería recalcular 50 veces
4. **Inconsistencia**: Cambios de location de un usuario afectan matches de otros usuarios

### Opciones Consideradas

#### Opción A: On-Demand (actual)
```
Usuario presiona "Buscar trades" → Recalcular todos los matches
```
- **Pros**: Simple, sin storage adicional
- **Cons**: Latencia alta, conflictos posibles, no escala bien
- **Escala**: < 200 usuarios

#### Opción B: Match Documents Persistentes
```
Match existe siempre para cada par de usuarios cercanos
Se actualiza incrementalmente con cada cambio
```
- **Pros**: Sin conflictos, baja latencia de lectura
- **Cons**: Storage de matches "vacíos", complejidad de cuándo crear/borrar
- **Escala**: > 2000 usuarios

#### Opción C: Stale Matches + Smart Triggers (ELEGIDA)
```
Cambios marcan matches como "stale" → Recálculo lazy en momentos estratégicos
```
- **Pros**: Balance entre simplicidad y eficiencia, buena UX
- **Cons**: Eventual consistency (acceptable para este caso de uso)
- **Escala**: 200-2000 usuarios

### Decisión: Opción C - Stale Matches + Smart Triggers

### Diseño Detallado

#### Schema Changes

```sql
-- Agregar a tabla matches
ALTER TABLE matches ADD COLUMN needs_recompute BOOLEAN DEFAULT false;
ALTER TABLE matches ADD COLUMN stale_reason TEXT; -- 'cards_changed' | 'location_changed'
ALTER TABLE matches ADD COLUMN stale_since TIMESTAMPTZ;

-- Índice para queries eficientes
CREATE INDEX idx_matches_needs_recompute
ON matches(user_a_id, user_b_id)
WHERE needs_recompute = true;
```

#### Database Triggers

```sql
-- Función genérica para marcar matches como stale
CREATE OR REPLACE FUNCTION mark_user_matches_stale()
RETURNS TRIGGER AS $$
DECLARE
  affected_user_id UUID;
  change_reason TEXT;
BEGIN
  affected_user_id := COALESCE(NEW.user_id, OLD.user_id);

  -- Determinar razón basado en la tabla que disparó el trigger
  change_reason := CASE TG_TABLE_NAME
    WHEN 'collections' THEN 'cards_changed'
    WHEN 'wishlist' THEN 'cards_changed'
    WHEN 'locations' THEN 'location_changed'
    ELSE 'unknown'
  END;

  UPDATE matches
  SET
    needs_recompute = true,
    stale_reason = change_reason,
    stale_since = NOW()
  WHERE (user_a_id = affected_user_id OR user_b_id = affected_user_id)
    AND needs_recompute = false;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers para cada tabla
CREATE TRIGGER on_collection_change
AFTER INSERT OR UPDATE OR DELETE ON collections
FOR EACH ROW EXECUTE FUNCTION mark_user_matches_stale();

CREATE TRIGGER on_wishlist_change
AFTER INSERT OR UPDATE OR DELETE ON wishlist
FOR EACH ROW EXECUTE FUNCTION mark_user_matches_stale();

CREATE TRIGGER on_location_change
AFTER INSERT OR UPDATE ON locations
FOR EACH ROW EXECUTE FUNCTION mark_user_matches_stale();
```

#### Triggers de Recálculo (Frontend)

| Evento | Acción |
|--------|--------|
| Usuario SALE de `/collection` o `/wishlist` | Si tiene matches stale → recalcular async |
| Usuario ENTRA a `/matches` (dashboard) | Si tiene matches stale → mostrar banner + recalcular |
| Usuario presiona "Actualizar matches" | Forzar recálculo |
| Debounce 60s después del último cambio | Recálculo en background (opcional) |

#### UX: Banner de Matches Stale

```tsx
// En dashboard cuando hay matches stale
{hasStaleMatches && (
  <Banner variant="warning">
    Tus matches pueden haber cambiado desde tu última búsqueda
    <Button onClick={recompute} loading={isRecomputing}>
      Actualizar
    </Button>
  </Banner>
)}
```

#### UX: Indicador en Match Individual

```tsx
// Cuando el OTRO usuario cambió su location
{match.stale_reason === 'location_changed' && (
  <Badge variant="warning">
    Este usuario cambió su ubicación
  </Badge>
)}
```

#### API Changes

```typescript
// GET /api/matches - agregar flag
{
  matches: [...],
  has_stale_matches: true,
  stale_since: "2026-01-20T10:00:00Z"
}

// POST /api/matches/compute - limpiar flag al final
await supabase
  .from('matches')
  .update({
    needs_recompute: false,
    stale_reason: null,
    stale_since: null
  })
  .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
```

### Matriz de Eventos y Acciones

| Evento | Marca stale a | Momento de recálculo |
|--------|--------------|----------------------|
| Collection INSERT/UPDATE/DELETE | Matches del usuario | Lazy (salir de collection, entrar a matches) |
| Wishlist INSERT/UPDATE/DELETE | Matches del usuario | Lazy |
| Location UPDATE (misma zona) | Matches del usuario | Lazy |
| Location UPDATE (nueva zona) | Matches del usuario | Lazy (matches viejos quedan stale hasta expirar) |
| Location desactivada | Matches del usuario | Considerar borrado inmediato |

### Flujo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE DATOS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Collection ─┐                                                  │
│              ├─→ DB Trigger ─→ matches.needs_recompute = true   │
│  Wishlist ───┤                                                  │
│              │                                                  │
│  Location ───┘                                                  │
│                                                                 │
│                         │                                       │
│                         ▼                                       │
│              ┌─────────────────────┐                            │
│              │  Usuario ve banner  │                            │
│              │  "Matches changed"  │                            │
│              └─────────────────────┘                            │
│                         │                                       │
│            ┌────────────┼────────────┐                          │
│            ▼            ▼            ▼                          │
│      [Entra a      [Sale de     [Presiona                       │
│       matches]     collection]   "Actualizar"]                  │
│            │            │            │                          │
│            └────────────┼────────────┘                          │
│                         ▼                                       │
│              POST /api/matches/compute                          │
│                         │                                       │
│                         ▼                                       │
│              matches.needs_recompute = false                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Consideraciones de Escalabilidad

| Usuarios | Estrategia |
|----------|------------|
| < 500 | Stale + Smart Triggers (este diseño) |
| 500-2000 | Agregar cache de matches con TTL |
| 2000+ | Background job queue (Bull/BullMQ) para recálculos async |

### Tareas de Implementación

- [ ] Agregar columnas a tabla `matches` (needs_recompute, stale_reason, stale_since)
- [ ] Crear función `mark_user_matches_stale()` en Supabase
- [ ] Crear triggers para collections, wishlist, locations
- [ ] Modificar `GET /api/matches` para retornar `has_stale_matches`
- [ ] Modificar `POST /api/matches/compute` para limpiar flags
- [ ] Agregar banner de "matches stale" en dashboard
- [ ] Agregar lógica de recálculo al salir de collection/wishlist
- [ ] Agregar indicador visual en matches cuando otro usuario cambió location
- [ ] Tests E2E para el flujo de stale → recompute

---

## 2. Push Notifications (Backend)

VAPID keys ya configuradas. Falta:
- [ ] Endpoint para enviar notificaciones
- [ ] Triggers para notificar: nuevo match, trade request, trade confirmed
- [ ] Edge Function o API route para dispatch

---

## 3. Landing Page

- [ ] Página pública para usuarios no autenticados
- [ ] Explicación del producto
- [ ] Call to action para registro

---

## 4. Error Monitoring

- [ ] Integrar Sentry (free tier)
- [ ] Configurar source maps para Next.js
- [ ] Alertas para errores críticos

---

## 5. Futuras Mejoras (Backlog)

- Email verification enforcement
- Internationalization (English)
- Vacation mode
- Camera-based card scanning
- Rating/reputation system
- Price drop alerts

# Natural Order - Task Tracker
<!-- Este archivo es actualizado por el agente para trackear progreso -->

## Estado General
- **Última actualización:** 2026-01-23
- **Iteración actual:** 1
- **Tareas completadas:** 1/15

---

## 🔴 Pendientes

### Feature: FAQs Section (HIGH)
- [ ] Crear página `/app/dashboard/faqs/page.tsx`
- [ ] Componente accordion para FAQs expandibles
- [ ] Agregar link en navbar o perfil
- [ ] Contenido de 5 FAQs según MVP_ARCHITECTURE.md

### Feature: PWA Install Prompt (MEDIUM)
- [ ] Hook `useInstallPrompt` para detectar plataforma
- [ ] Modal/Banner component con instrucciones iOS/Android
- [ ] localStorage para tracking de dismissal (10 días)
- [ ] Solo mostrar en mobile después de login

### Feature: Landing Page (MEDIUM)
- [ ] Crear página `/app/page.tsx` para usuarios no logueados
- [ ] Hero section con propuesta de valor
- [ ] Sección "Cómo funciona" (3 pasos)
- [ ] FAQs embebidas
- [ ] CTA "Empezá gratis" → registro

### Validación: Database Schema
- [ ] Verificar que todas las migraciones están aplicadas
- [ ] Verificar índices en tablas críticas (matches, match_cards, collections)
- [ ] Verificar RLS policies están activas
- [ ] Documentar cualquier inconsistencia

### Validación: API Endpoints
- [ ] Listar todos los endpoints en `/api/`
- [ ] Verificar que todos tienen `dynamic = 'force-dynamic'` si usan auth
- [ ] Verificar manejo de errores consistente
- [ ] Verificar rate limiting (o documentar su ausencia)

### Validación: TypeScript Types
- [ ] Verificar que `types/database.ts` está sincronizado con DB
- [x] Correr `npx tsc --noEmit` sin errores
- [ ] Verificar tipos en componentes principales

### Testing: Build & Lint
- [x] `npm run build` pasa sin errores
- [ ] `npm run lint` pasa (o documentar warnings)
- [ ] Verificar que no hay console.log innecesarios

### Testing: Flujo Crítico - Auth
- [ ] Verificar endpoint `/api/user` responde correctamente
- [ ] Verificar middleware de auth funciona
- [ ] Verificar redirect a login para rutas protegidas

### Testing: Flujo Crítico - Matches
- [ ] Verificar `/api/matches` retorna datos correctos
- [ ] Verificar `/api/matches/[id]` con match real
- [ ] Verificar `/api/matches/[id]/counterpart-collection` funciona

### Optimización: Performance
- [ ] Verificar que queries tienen límites apropiados
- [ ] Verificar uso de índices en queries frecuentes
- [ ] Identificar N+1 queries si existen

### Documentación: API
- [ ] Documentar endpoints principales en README o archivo separado
- [ ] Documentar estructura de respuestas

### Cleanup: Technical Debt
- [ ] Revisar TODOs en el código
- [ ] Identificar código duplicado
- [ ] Limpiar imports no usados

---

## 🟡 En Progreso
<!-- Mover tareas aquí cuando se empiecen -->

---

## 🟢 Completadas
<!-- Mover tareas aquí cuando se terminen, con fecha -->

### Feature: Match Sorting Options (HIGH) - 2026-01-23
- [x] Agregar parámetro `sort_by` a `/api/matches`
- [x] Calcular `avg_discount_percent` para cada match
- [x] UI: Dropdown de sorting en dashboard (precio/distancia/cartas/valor)
- [x] Verificar que sorting funciona correctamente (build + tsc pass)

---

## 📝 Notas del Agente

### 2026-01-23 - Match Sorting Options
- Implementado sorting con 5 opciones: discount, distance, cards, value, score
- `avgDiscountPercent` se calcula comparando `asking_price` con `prices_usd` de la tabla `cards`
- El sorting aplica lógica especial: activos (contacted/requested) siempre primero, historial ordena por `updated_at`
- El dropdown solo aparece en vista "Pendientes" ya que historial tiene orden fijo
- Agregado campo `avgDiscountPercent` al tipo `Match` en `types/database.ts`


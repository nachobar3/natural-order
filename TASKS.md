# Natural Order - Task Tracker
<!-- Este archivo es actualizado por el agente para trackear progreso -->

## Estado General
- **Última actualización:** 2026-01-23
- **Iteración actual:** 2
- **Tareas completadas:** 7/15

---

## 🔴 Pendientes

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

### Validación: TypeScript Types ✅
- [x] Verificar que `types/database.ts` está sincronizado con DB (ver notas)
- [x] Correr `npx tsc --noEmit` sin errores
- [x] Verificar tipos en componentes principales

### Testing: Build & Lint ✅
- [x] `npm run build` pasa sin errores
- [x] `npm run lint` - ESLint no configurado (ver notas)
- [x] Verificar que no hay console.log innecesarios - hay 5 de debug (ver notas)

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

### Feature: FAQs Section (HIGH) - 2026-01-23
- [x] Crear página `/app/dashboard/faqs/page.tsx`
- [x] Componente accordion para FAQs expandibles
- [x] Agregar link en navbar (HelpCircle icon, desktop only)
- [x] Contenido de 5 FAQs (matching, precios, privacidad, flujo trade, usuarios inactivos)

### Validación: Database Schema - 2026-01-23
- [x] Verificar que todas las migraciones están aplicadas
- [x] Verificar índices en tablas críticas (matches, match_cards, collections)
- [x] Verificar RLS policies están activas
- [x] Documentar cualquier inconsistencia (ninguna encontrada)

### Validación: API Endpoints - 2026-01-23
- [x] Listar todos los endpoints en `/api/` (22 endpoints)
- [x] Verificar que todos tienen `dynamic = 'force-dynamic'` si usan auth
- [x] Verificar manejo de errores consistente
- [x] Verificar rate limiting (o documentar su ausencia) - NO HAY, ver notas

---

## 📝 Notas del Agente

### 2026-01-23 - Database Schema Validation
- 48 índices verificados en todas las tablas
- RLS habilitado en todas las tablas (excepto spatial_ref_sys que es de PostGIS)
- 39 políticas RLS activas cubriendo SELECT/INSERT/UPDATE/DELETE
- Índices críticos: matches(user_a_id, user_b_id, status), match_cards(match_id), collections(user_id, card_id)
- Foreign keys correctas entre todas las tablas

### 2026-01-23 - API Endpoints Validation
- 22 endpoints totales en `/api/`
- Todos tienen `export const dynamic = 'force-dynamic'` (excepto búsqueda pública)
- Manejo de errores CONSISTENTE: try/catch en todos, formato `{ error: string }` con status codes estándar
- Autenticación consistente usando `supabase.auth.getUser()` en todos excepto `/api/cards/search` (público)
- **Rate limiting NO implementado** - solo hay límites de negocio (ej: 10 comentarios/mes)
- Recomendación: considerar rate limiting a nivel de Vercel o middleware

### 2026-01-23 - Build & Lint Validation
- `npm run build` pasa sin errores
- **ESLint configurado** (`next/core-web-vitals` + `next/typescript`)
- Lint reporta:
  - 12 errores (principalmente unused imports/variables)
  - 6 warnings (useEffect dependencies, img vs Image)
  - No bloquean el build, son cleanup items
- **console.log encontrados (5 ocurrencias de debug):**
  - `app/api/matches/compute/route.ts`: 4 console.logs de debug para matching
  - `app/api/matches/[id]/complete/route.ts`: 1 console.log de éxito
  - Estos deberían removerse o convertirse en logging condicional para producción
- console.error (99 ocurrencias) - aceptables para error logging

### 2026-01-23 - TypeScript Types Validation
- `types/database.ts` usa enfoque híbrido válido:
  - Interface `Database.Tables` para tablas simples (users, cards, collections, wishlist, etc.)
  - `[key: string]` para flexibilidad durante desarrollo
  - Interfaces custom (`Match`, `MatchCard`, `MatchDetail`) para tipos de API transformados
- TypeScript compila sin errores (`npx tsc --noEmit` pass)
- No se requiere actualización ya que los tipos están sincronizados funcionalmente

### 2026-01-23 - Match Sorting Options
- Implementado sorting con 5 opciones: discount, distance, cards, value, score
- `avgDiscountPercent` se calcula comparando `asking_price` con `prices_usd` de la tabla `cards`
- El sorting aplica lógica especial: activos (contacted/requested) siempre primero, historial ordena por `updated_at`
- El dropdown solo aparece en vista "Pendientes" ya que historial tiene orden fijo
- Agregado campo `avgDiscountPercent` al tipo `Match` en `types/database.ts`


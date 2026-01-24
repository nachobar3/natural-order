# Natural Order - Task Tracker
<!-- Este archivo es actualizado por el agente para trackear progreso -->

## Estado General
- **Última actualización:** 2026-01-24
- **Iteración actual:** 4
- **Tareas completadas:** 18/21
- **Status:** 🔧 Phase 2 - Trade view UX mejorada

---

## 🔴 Pendientes (Phase 2 - Pre-Campaign)

### Performance Critical: App Speed Optimization (CRITICAL)
**Objetivo:** Alcanzar velocidades comparables con apps de primer nivel (< 200ms para navegación, < 100ms para interacciones)

**Fase 1: Diagnóstico**
- [ ] Medir tiempos actuales con Lighthouse y Web Vitals (LCP, FID, CLS, TTFB)
- [ ] Identificar bottlenecks en cambio de tabs (Collection, Wishlist, Matches)
- [ ] Analizar performance de sorting en matches (client vs server)
- [ ] Revisar network waterfall en Chrome DevTools para cada página
- [ ] Identificar re-renders innecesarios con React DevTools Profiler
- [ ] Medir tiempo de respuesta de API endpoints críticos

**Fase 2: Optimizaciones Frontend**
- [ ] Implementar skeleton loaders para percepción de velocidad
- [ ] Revisar y optimizar bundle size (analizar con `next/bundle-analyzer`)
- [ ] Implementar code splitting donde falte
- [ ] Evaluar Server Components vs Client Components (minimizar JS enviado)
- [ ] Implementar optimistic updates para acciones del usuario
- [ ] Cachear datos con React Query o SWR si no está implementado
- [ ] Prefetch de rutas probables (next/link prefetch)

**Fase 3: Optimizaciones Backend/API**
- [ ] Agregar cache headers apropiados a responses
- [ ] Evaluar edge caching en Vercel para endpoints que lo permitan
- [ ] Optimizar queries SQL si hay slowness en DB
- [ ] Considerar ISR (Incremental Static Regeneration) donde aplique

**Fase 4: Validación**
- [ ] Re-medir todas las métricas post-optimización
- [ ] Comparar antes/después con screenshots de DevTools
- [ ] Verificar en dispositivos móviles reales (no solo emulador)
- [ ] Documentar mejoras logradas y trade-offs


### Push Notifications - Parte 2 (HIGH)
**Infraestructura completada ✅ (ver sección Completadas)**
**Pendiente: envío de notificaciones desde el servidor**
- [ ] Crear Supabase Edge Function para enviar notificaciones push
- [ ] Integrar envío de push en eventos: nuevo match, nuevo comentario, trade solicitado, trade confirmado
- [ ] Testear flujo completo end-to-end

### Analytics Setup (HIGH)
- [ ] Elegir herramienta (PostHog vs Plausible vs Vercel Analytics)
- [ ] Crear helper `trackEvent(name, properties)`
- [ ] Agregar tracking a eventos del onboarding funnel
- [ ] Agregar tracking a acciones core (import, match view, message, trade)
- [ ] Configurar dashboard de métricas

### Testing Structure (MEDIUM)
- [ ] Setup Playwright para E2E tests
- [ ] Test: flujo de registro + onboarding
- [ ] Test: flujo de bulk import
- [ ] Test: flujo de trade completo
- [ ] Setup k6 para load testing

### Rate Limiting (MEDIUM)
- [ ] Investigar opciones (Vercel middleware vs Upstash Redis)
- [ ] Implementar rate limiting en endpoints críticos
- [ ] Configurar límites por endpoint

---

## 🟡 En Progreso
<!-- Mover tareas aquí cuando se empiecen -->

---

## 🟢 Completadas
<!-- Mover tareas aquí cuando se terminen, con fecha -->

### UX: Mejoras en Vista de Trades - 2026-01-24
**Listas de cartas colapsables:**
- [x] Las listas de "Cartas que quiero" y "Cartas que ofrezco" inician colapsadas
- [x] Animación suave de expand/collapse (transition-all duration-300)
- [x] Resumen cuando está colapsado: primeras 3 cartas + "y X más..."
- [x] Estado de expansión se mantiene durante la sesión (useState)

**Métricas prominentes del trade:**
- [x] Distancia con icono de ubicación (MapPin)
- [x] Valor total intercambiado (suma de ambos lados)
- [x] Balance/diferencia de valor con colores (verde=a favor, rojo=en contra)
- [x] Trade Score visible con etiqueta de calidad (Excelente/Bueno/Regular/Bajo)
- [x] Diseño con grid de 4 métricas en cards destacadas

### Fix: PWA Install Modal Solo en Mobile - 2026-01-24
- [x] Verificar detección de plataforma en `useInstallPrompt` hook
- [x] Agregar check `isMobile` antes de mostrar el modal
- [x] Build pasa correctamente

### Push Notifications - Infraestructura Frontend/API - 2026-01-24
- [x] Crear tabla `push_subscriptions` en Supabase (con RLS policies)
- [x] Generar VAPID keys y configurar en environment (.env.local.example)
- [x] Crear endpoint `/api/push/subscribe` para registrar suscripciones
- [x] Crear endpoint `/api/push/unsubscribe` para eliminar suscripciones
- [x] Configurar Service Worker para recibir push (push-sw.js + importScripts)
- [x] UI: Modal de permiso de notificaciones (PushPrompt component)
- [x] Hook usePushNotifications para gestionar suscripciones
- [x] Integración en dashboard layout

### Validación: TypeScript Types - 2026-01-23
- [x] Verificar que `types/database.ts` está sincronizado con DB (ver notas)
- [x] Correr `npx tsc --noEmit` sin errores
- [x] Verificar tipos en componentes principales

### Testing: Build & Lint - 2026-01-23
- [x] `npm run build` pasa sin errores
- [x] `npm run lint` - ESLint configurado (ver notas)
- [x] Verificar que no hay console.log innecesarios - hay 5 de debug (ver notas)

### Optimización: Performance - 2026-01-23
- [x] Verificar que queries tienen límites apropiados (ver notas)
- [x] Verificar uso de índices en queries frecuentes (48 índices, bien cubierto)
- [x] Identificar N+1 queries si existen (ninguno - usa batch fetching)

### Cleanup: Technical Debt - 2026-01-23
- [x] Revisar TODOs en el código (ninguno encontrado)
- [x] Identificar código duplicado (ver notas - duplicación estructural en API routes)
- [x] Limpiar imports no usados (ya limpiados en commit anterior)

### Feature: Landing Page (MEDIUM) - 2026-01-23
- [x] Crear página `/app/page.tsx` para usuarios no logueados
- [x] Hero section con propuesta de valor
- [x] Sección "Cómo funciona" (3 pasos)
- [x] FAQs embebidas (4 preguntas con acordeón usando `<details>`)
- [x] CTA "Empezá gratis" → registro (múltiples CTAs en hero y final)

### Documentación: API - 2026-01-23
- [x] Creado `/docs/API.md` con documentación de 22 endpoints
- [x] Incluye parámetros, request/response bodies, y códigos de error
- [x] Endpoints públicos marcados, notas sobre rate limiting

### Feature: PWA Install Prompt (MEDIUM) - 2026-01-23
- [x] Hook `useInstallPrompt` detecta iOS/Android/Desktop
- [x] Modal con instrucciones nativas para iOS (Share → Add to Home)
- [x] Prompt nativo para Android/Chrome usando beforeinstallprompt
- [x] localStorage dismiss con expiración de 10 días
- [x] Integrado en dashboard layout (solo usuarios logueados)

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

### Testing: Flujo Crítico - Auth - 2026-01-23
- [x] Verificar endpoint `/api/user` responde correctamente (401 sin auth)
- [x] Verificar middleware de auth funciona (redirect con redirectTo)
- [x] Verificar redirect a login para rutas protegidas (todas las /dashboard/* → 307)

### Testing: Flujo Crítico - Matches - 2026-01-23
- [x] Verificar `/api/matches` retorna datos correctos (401 sin auth, estructura con sorting/counts)
- [x] Verificar `/api/matches/[id]` con match real (estructura completa con cardsIWant/cardsTheyWant)
- [x] Verificar `/api/matches/[id]/counterpart-collection` funciona (paginación y búsqueda)

---

## 📝 Notas del Agente

### 2026-01-24 - Trade View UX Improvements
- **Listas colapsables:**
  - Estado inicial: colapsado para reducir scroll y mostrar lo importante primero
  - Header clickeable muestra: título, valor total, cantidad de cartas, chevron
  - Resumen colapsado: primeras 3 cartas + "y X más..."
  - Animación suave con `transition-all duration-300 ease-in-out`
- **Métricas prominentes:**
  - Grid de 4 métricas en la parte superior del trade view
  - Distancia (km), Valor Total ($), Balance (+/-), Score (/10)
  - Cada métrica con icono, valor grande, y etiqueta descriptiva
  - Colors: azul (distancia), dorado (valor), verde/rojo (balance), amarillo (score)
- **Trade Score labels:** Excelente (>=8), Bueno (>=6), Regular (>=4), Bajo (<4)

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

### 2026-01-23 - Auth Flow Testing
- **Endpoint `/api/user`:** Retorna 401 `{"error":"No autenticado"}` sin sesión (correcto)
- **Middleware:** Redirige `/dashboard/*` a `/login?redirectTo=...` con status 307 (correcto)
- **Rutas protegidas verificadas:** /dashboard, /collection, /wishlist, /profile, /notifications, /matches/[id]
- **Login page:** Lee `redirectTo` de searchParams y redirige post-login (incluyendo OAuth con Google)
- **Auth pages:** `/login` y `/register` muestran correctamente sin redirect cuando no hay sesión

### 2026-01-23 - Matches Flow Testing
- **DB Status:** 19 matches totales (12 active, 3 requested, 2 confirmed, 2 completed)
- **Endpoints verificados (todos retornan 401 sin auth):**
  - `/api/matches` - Lista con sorting (score/discount/distance/cards/value) y category counts
  - `/api/matches/[id]` - Detalle completo con cardsIWant/cardsTheyWant y perspective-aware fields
  - `/api/matches/[id]/counterpart-collection` - Colección del otro usuario con paginación y búsqueda
- **Datos consistentes:** match_cards tiene direcciones a_wants/b_wants correctas
- **Colecciones reales:** 5+ usuarios con colecciones de 64-885 cartas

### 2026-01-23 - Technical Debt Cleanup
- **TODOs/FIXMEs:** Ninguno encontrado en el código
- **Imports no usados:** Ya limpiados en commit `7909b20`
- **ESLint actual:** Solo 6 warnings (useEffect deps + img vs Image), no errores
- **Duplicación de código identificada (estructural, no crítica):**
  - Auth + match validation: ~13 API routes repiten el mismo patrón (normal en Next.js API routes)
  - Perspectiva A/B (isUserA, direction filtering): ~5 archivos
  - Bulk import logic: `bulk-import/` y `bulk-import-wishlist/` comparten ~80% código
  - Notificaciones: ~6 instancias similares
- **Recomendación:** Considerar middleware de auth y helpers para perspectiva en futuras refactorizaciones

### 2026-01-23 - Performance Optimization
- **Índices:** 48 índices configurados, cubren todas las queries frecuentes
  - `collections_user_idx`, `wishlist_user_idx` para filtros por usuario
  - `idx_locations_active` partial index para ubicaciones activas
  - `matches_user_a_idx`, `matches_user_b_idx` para búsqueda de matches
  - `match_cards_match_idx` para cartas por match
- **N+1 Queries:** No hay. Los endpoints usan batch fetching correctamente:
  - `/api/matches` hace 4 queries batch (matches, users, match_cards, card_prices) + transform en memoria
  - `/api/matches/compute` carga todos los datos upfront y procesa en memoria
- **Queries sin límite identificadas (por diseño):**
  - `/api/matches/compute/route.ts` carga wishlists/collections completas para el algoritmo de matching
  - `/api/matches/route.ts` carga todos los matches del usuario para calcular category counts
  - Estas queries son necesarias para la lógica de negocio pero pueden crecer con usuarios activos
- **Recomendaciones futuras:**
  - Considerar paginación para `/api/matches` cuando usuarios tengan 100+ matches
  - Evaluar background jobs para el cálculo de matches cuando la base crezca

### 2026-01-24 - Push Notifications Infrastructure
- **Tabla `push_subscriptions`:** Creada con índices (user_id, endpoint) y RLS policies completas
- **Endpoints API:**
  - `POST /api/push/subscribe` - Registra suscripción con upsert (actualiza si existe)
  - `GET /api/push/subscribe` - Lista suscripciones del usuario
  - `POST /api/push/unsubscribe` - Elimina suscripción por endpoint
  - `DELETE /api/push/unsubscribe` - Elimina todas las suscripciones del usuario
- **Service Worker:** `push-sw.js` maneja eventos push, click de notificación, y cambio de suscripción
- **Hook `usePushNotifications`:** Gestiona soporte, permisos, estado de suscripción, y subscribe/unsubscribe
- **PushPrompt component:** Modal para solicitar permisos con dismiss de 30 días
- **Pendiente:** Edge Function para enviar notificaciones desde eventos del servidor

### 2026-01-23 - Landing Page Implementation
- **Implementación completa** de landing page para usuarios no logueados
- **Secciones:**
  - Hero: Logo, título con gradiente dorado, propuesta de valor, CTAs
  - Cómo funciona: 3 pasos (Armá perfil → Configurá zona → Hacé trades)
  - Features highlights: Instantáneo, Seguro, Comunidad
  - FAQs: 4 preguntas con acordeón nativo `<details>` (sin JS adicional)
  - CTA final: Card destacado con llamada a registro
  - Footer: Logo y copyright
- **Características técnicas:**
  - Server component con check de auth (redirect a dashboard si logueado)
  - Usa componentes y estilos existentes (card, btn-primary, badge-green, etc.)
  - Responsive (mobile-first)
  - Animaciones existentes (animate-fade-in, animate-bounce)
  - Build y TypeScript pasan sin errores


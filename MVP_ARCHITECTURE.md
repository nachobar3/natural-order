# Natural Order - MVP Architecture & Roadmap

**Version:** 2.0
**Last Updated:** January 2026
**Status:** Pre-Launch (90% complete)

---

## 1. Product Overview

### 1.1 Vision
A proximity-based marketplace for MTG card trading that matches users based on their collections, wishlists, and location.

### 1.2 Core Value Proposition
- **For traders:** Find people nearby who have the cards you want
- **For sellers:** Reach local buyers without shipping hassles
- **Differentiator:** Automatic matching + proximity awareness + reference pricing

### 1.3 Current MVP Scope

| Completed | Pending for Launch | Post-Launch |
|-----------|-------------------|-------------|
| User registration (email + Google) | Push notifications | Camera card scanning |
| Collection & wishlist management | Match sorting options | Multiple card games |
| Bulk import (Moxfield, ManaBox, Deckbox, CubeCobra) | FAQs section | Store/LGS integration (API) |
| Proximity-based matching | PWA install prompt | Reputation system |
| Trade flow (request → confirm → complete) | Landing page (non-logged) | Price drop alerts |
| In-app notifications | i18n (EN, PT) | |
| PWA config (black status bar, bottom nav) | Vacation mode | |
| Match filters (pendientes/historial) | Testing structure | |
| Password reset | | |
| Global collection discount | | |
| Optimized bulk import (batch processing) | | |

---

## 2. Current Technical Stack

### 2.1 Architecture (Implemented)

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                   Next.js 14 + Tailwind                      │
│                      PWA-enabled                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services                          │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │    Supabase     │    │     Next.js API Routes          │ │
│  │  - Auth         │    │  - Matching algorithm           │ │
│  │  - Database     │    │  - Card search (Scryfall)       │ │
│  │  - Storage      │    │  - Bulk import processing       │ │
│  └─────────────────┘    │  - Trade management             │ │
│                         │  - Notifications                 │ │
│                         └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  - Scryfall API (card data, prices)                         │
│  - Google Maps API (geocoding)                              │
│  - Vercel (hosting)                                         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Choices (Final)

| Layer | Technology | Status |
|-------|------------|--------|
| **Frontend** | Next.js 14 + Tailwind CSS | ✅ Implemented |
| **Auth** | Supabase Auth (Email + Google) | ✅ Implemented |
| **Database** | Supabase PostgreSQL | ✅ Implemented |
| **API** | Next.js API Routes | ✅ Implemented |
| **Hosting** | Vercel | ✅ Deployed |
| **Card Data** | Scryfall API | ✅ Integrated |
| **PWA** | next-pwa | ✅ Configured |
| **i18n** | next-intl | ✅ Setup (ES only) |

**Note:** Python FastAPI backend was originally planned but deemed unnecessary. All logic runs efficiently in Next.js API routes.

---

## 3. Features Pending for Launch

### 3.1 Push Notifications (Priority: HIGH)

**Objetivo:** Mantener usuarios engaged notificándoles eventos importantes en tiempo real.

**Eventos que disparan notificaciones:**
| Evento | Mensaje ejemplo |
|--------|-----------------|
| Nuevo match disponible | "Nuevo match! Juan tiene 4 cartas que buscás" |
| Nuevo comentario en trade | "Juan comentó en tu trade" |
| Trade solicitado | "Juan quiere concretar el trade" |
| Trade confirmado | "Juan confirmó el trade - ¡a coordinar!" |

**Implementación técnica:**
- Web Push API + Service Worker (ya configurado con next-pwa)
- Supabase Edge Functions para enviar pushes
- Tabla `push_subscriptions` para guardar tokens
- Configuración en Perfil > Preferencias (checkboxes existentes)

**Requisitos:**
- VAPID keys (público/privado)
- Endpoint para suscribir/desuscribir
- Lógica en cada evento para enviar push

---

### 3.2 Match Sorting Options (Priority: HIGH)

**Objetivo:** Permitir al usuario ordenar matches según su criterio preferido, sin calcular un "score" arbitrario.

**Opciones de sorting:**
| Opción | Descripción | Default |
|--------|-------------|---------|
| Menor precio | Promedio de % descuento vs Card Kingdom | ✅ |
| Mayor cercanía | Distancia en km ascendente | |
| Más cartas | Cantidad total de cartas en match | |
| Mayor valor | Valor total USD de cartas | |

**Comportamiento por vista:**
- **Pendientes:**
  - Activos siempre primero (tienen actividad)
  - Disponibles ordenados según criterio seleccionado
- **Historial:**
  - Ordenados por `updated_at` descendente (más reciente arriba)

**UI recomendada:**
- Dropdown compacto al lado del título "Tus Trades"
- Icono de sorting (ArrowUpDown) + texto del criterio actual
- Opciones desplegables al hacer click

**Cambios en API:**
- Agregar parámetro `sort_by` a `/api/matches`
- Calcular `avg_discount_percent` para cada match

---

### 3.3 Global Collection Discount ✅ COMPLETADO

**Estado:** Implementado en enero 2026

**Implementación final:**
- API endpoint: `/api/preferences/global-discount`
- Componente: `GlobalDiscount` en página de colección
- Permite definir % global (default: 80%)
- Botón "Aplicar a todas" actualiza cartas sin override
- Nuevas cartas heredan automáticamente el % global

**Cambios en DB aplicados:**
```sql
ALTER TABLE preferences ADD COLUMN default_price_percentage INTEGER DEFAULT 80;
ALTER TABLE collections ADD COLUMN price_override BOOLEAN DEFAULT false;
```

---

### 3.4 FAQs Section (Priority: HIGH)

**Objetivo:** Educar usuarios sobre el funcionamiento de la plataforma.

**Ubicación:**
- **Logueados:** Link en navbar superior → página `/dashboard/faqs`
- **No logueados:** Sección al final del landing page

**Contenido inicial:**

#### ¿Cómo funciona el algoritmo de matching?
> Natural Order compara tu wishlist con las colecciones de otros usuarios cercanos, y viceversa. Cuando hay coincidencias, se crea un "match". Los matches pueden ser:
> - **Intercambio:** Ambos tienen cartas que el otro busca
> - **Compra:** El otro usuario tiene cartas que vos buscás
> - **Venta:** Vos tenés cartas que el otro busca

#### ¿Cómo se calculan los precios?
> Usamos Card Kingdom como referencia de mercado. Cuando listás una carta, elegís un porcentaje sobre ese precio (por ejemplo, 80% = 20% de descuento). Esto permite comparar ofertas de forma justa.

#### ¿Mis datos de ubicación son privados?
> Sí. Nunca mostramos tu ubicación exacta a otros usuarios. Solo mostramos la distancia aproximada (ej: "~2 km") para que sepan qué tan cerca están.

#### ¿Cómo funciona el flujo de un trade?
> 1. Encontrás un match y dejás un comentario para coordinar
> 2. Cuando están de acuerdo, cualquiera puede "Solicitar trade"
> 3. Ambos deben confirmar el trade
> 4. Se juntan, intercambian, y marcan como "Completado"

#### ¿Qué pasa si el otro usuario no responde?
> Podés descartar el match (no lo verás más) o simplemente esperar. Si cambiás de opinión, podés restaurar matches descartados desde el Historial.

---

### 3.5 PWA Install Prompt (Priority: MEDIUM)

**Objetivo:** Guiar usuarios mobile a instalar la app para mejor experiencia.

**Comportamiento:**
- Solo aparece en mobile (detectar user agent)
- Primera vez: aparece después de login exitoso
- Si se cierra: no reaparece por 10 días (guardar en localStorage)
- Instrucciones diferenciadas iOS vs Android

**Contenido iOS (Safari requerido):**
```
📱 Instalá Natural Order

Para mejor experiencia, agregá la app a tu pantalla de inicio:

1. Tocá el ícono de compartir (□↑)
2. Seleccioná "Agregar a pantalla de inicio"
3. Confirmá tocando "Agregar"

[Entendido] [Recordarme después]
```

**Contenido Android (Chrome):**
```
📱 Instalá Natural Order

[Instalar App]  ← Usa beforeinstallprompt event

O manualmente:
1. Tocá el menú (⋮)
2. Seleccioná "Instalar aplicación"

[Cerrar]
```

**Implementación:**
- Hook `useInstallPrompt` que detecta plataforma
- Modal/Banner component
- localStorage para tracking de dismissal

---

### 3.6 Landing Page (Non-Logged Users) (Priority: MEDIUM)

**Objetivo:** Página de bienvenida que explique el producto y lleve al registro.

**Contenido:**
1. Hero section actual de `index.html`
2. Sección "Cómo funciona" (3 pasos visuales)
3. Beneficios clave
4. FAQs (mismas que para logueados)
5. CTA final: "Empezá gratis"

**Ruta:** `/` (actualmente redirige a `/dashboard` si logueado)

**Botón "Ingresar":** En navbar, lleva a `/login`

---

### 3.7 i18n - English & Portuguese (Priority: MEDIUM)

**Objetivo:** Expandir a mercados de habla inglesa y Brasil.

**Idiomas:**
- `es` - Español (completado)
- `en` - English (pendiente)
- `pt-BR` - Português Brasil (pendiente)

**Archivos a traducir:**
- `messages/es.json` → `messages/en.json`, `messages/pt-BR.json`
- Emails transaccionales (Supabase templates)
- Push notification texts

**Selector de idioma:**
- En Perfil > Preferencias
- Detectar idioma del browser como default

---

### 3.8 Vacation Mode (Priority: LOW)

**Objetivo:** Permitir al usuario ocultarse temporalmente del matching.

**Implementación:**
- Toggle en Perfil: "Modo vacaciones"
- Cuando activo: usuario no aparece en matches de otros
- Sus matches existentes siguen visibles pero con badge "En pausa"

**Cambio en DB:**
```sql
ALTER TABLE users ADD COLUMN vacation_mode BOOLEAN DEFAULT false;
```

---

### 3.9 Testing Structure (Priority: MEDIUM)

**Objetivo:** Automatizar tests antes de campaña publicitaria.

**Flujos críticos a testear:**

| Flujo | Tipo de test |
|-------|--------------|
| Registro + onboarding | E2E (Playwright) |
| Bulk import 1000+ cartas | Integration + Performance |
| Matching con muchos usuarios | Load test |
| Flujo completo de trade | E2E |
| Auth flows (login, reset password) | E2E |

**Stress test:**
- Tool: k6 o Artillery
- Target: 1000 usuarios concurrentes
- Endpoints críticos: `/api/matches`, `/api/matches/compute`
- Métricas: response time p95, error rate

**Estructura propuesta:**
```
/tests
  /e2e
    auth.spec.ts
    onboarding.spec.ts
    trade-flow.spec.ts
  /integration
    bulk-import.test.ts
    matching.test.ts
  /load
    stress-test.js (k6 script)
```

---

### 3.10 Analytics & Product Metrics (Priority: HIGH)

**Objetivo:** Medir el uso del producto para tomar decisiones basadas en datos y mejorar la experiencia de usuario.

**Herramientas recomendadas:**
| Opción | Tipo | Pros | Contras |
|--------|------|------|---------|
| PostHog | Self-hosted/Cloud | Feature flags, session replay, funnels | Setup más complejo |
| Mixpanel | Cloud | Funnels poderosos, retención | Límite gratuito |
| Plausible | Privacy-first | Simple, liviano, GDPR-friendly | Sin eventos custom avanzados |
| Vercel Analytics | Integrado | Zero-config, Web Vitals | Solo pageviews básicos |

**Métricas clave a trackear:**

#### User Engagement
| Métrica | Descripción | Cómo medir |
|---------|-------------|------------|
| DAU/WAU/MAU | Usuarios activos diarios/semanales/mensuales | Login events |
| Session duration | Tiempo promedio por sesión | Timestamp diff |
| Pages per session | Páginas visitadas por sesión | Page views |
| Retention D1/D7/D30 | Usuarios que vuelven | Cohorte analysis |

#### Funnel Metrics
| Paso | Evento | Target |
|------|--------|--------|
| 1. Signup started | `signup_started` | 100% |
| 2. Signup completed | `signup_completed` | >80% |
| 3. Location set | `location_set` | >90% |
| 4. First card added | `card_added` (first) | >70% |
| 5. First match viewed | `match_viewed` (first) | >60% |
| 6. First message sent | `message_sent` (first) | >30% |
| 7. Trade requested | `trade_requested` | >20% |
| 8. Trade completed | `trade_completed` | >50% de requested |

#### Feature Usage
| Feature | Evento | Para entender |
|---------|--------|---------------|
| Bulk import | `import_started`, `import_completed` | Adopción de import |
| CSV format used | `import_format` (moxfield/manabox/etc) | Qué formatos priorizar |
| Global discount | `global_discount_set`, `global_discount_applied` | Uso de la feature |
| Filtros de match | `filter_applied` (type, distance) | Preferencias de búsqueda |
| Sorting | `sort_changed` (price/distance/cards/value) | Criterios preferidos |

#### Trade Metrics
| Métrica | Descripción |
|---------|-------------|
| Match-to-contact rate | % de matches que inician conversación |
| Contact-to-trade rate | % de conversaciones que solicitan trade |
| Trade completion rate | % de trades solicitados que se completan |
| Avg time to complete | Tiempo desde match hasta completado |
| Cards per trade | Promedio de cartas por trade completado |
| Trade value | Valor USD promedio por trade |

#### Technical Metrics
| Métrica | Target | Alerta si |
|---------|--------|-----------|
| API response time (p95) | <500ms | >1000ms |
| Error rate | <1% | >2% |
| Bulk import time | <30s/1000 cards | >60s |
| PWA install rate | >20% mobile | <10% |

**Implementación recomendada:**
1. Usar PostHog (tier gratuito amplio) o Plausible (si priorizamos simplicidad)
2. Crear helper `trackEvent(name, properties)` para consistencia
3. Agregar tracking a eventos clave gradualmente
4. Dashboard con métricas principales visible para el equipo

**Eventos prioritarios para implementar primero:**
```typescript
// Onboarding funnel
trackEvent('signup_started')
trackEvent('signup_completed', { method: 'email' | 'google' })
trackEvent('location_set', { city: string })
trackEvent('first_card_added', { source: 'manual' | 'import' })

// Core actions
trackEvent('import_completed', { format: string, card_count: number })
trackEvent('match_viewed', { match_id: string, type: 'exchange' | 'buy' | 'sell' })
trackEvent('message_sent', { match_id: string })
trackEvent('trade_requested', { match_id: string, card_count: number })
trackEvent('trade_completed', { match_id: string, value_usd: number })
```

---

### 3.11 Store Integration (Priority: POST-LAUNCH)

**Objetivo:** Integrar stock de tiendas locales (LGS) para que usuarios encuentren cartas en tiendas cercanas.

**Enfoque:**
- **NO scraping** - Solo integraciones via API
- Negociar acceso con tiendas que usen plataformas con API abierta
- Tiendas aparecen como entidades diferenciadas en matches

**Plataformas identificadas:**
| Plataforma | Tiendas ejemplo | API disponible |
|------------|-----------------|----------------|
| TiendaNube | Tienda MTG | Sí (REST API) |
| Shopify | Magic Lair | Sí (GraphQL/REST) |
| BigCommerce | MTG Pirulo | Sí (REST API) |

**Modelo de datos:**
```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  platform TEXT NOT NULL, -- 'tiendanube', 'shopify', 'bigcommerce'
  api_credentials JSONB, -- encrypted
  location_id UUID REFERENCES locations(id),
  logo_url TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 60,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE store_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  scryfall_id TEXT NOT NULL,
  card_name TEXT NOT NULL,
  set_code TEXT,
  condition TEXT,
  quantity INTEGER DEFAULT 1,
  price_usd DECIMAL(10,2),
  external_product_id TEXT,
  external_url TEXT,
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, scryfall_id, condition)
);
```

**Diferenciación en UI:**
- Badge "Tienda" en match cards (vs usuario normal)
- Sin botón "Solicitar trade" - reemplazado por:
  - "Ver en tienda" → link externo al producto
  - O, si tienda opera en plataforma: flujo simplificado
- Mostrar logo de tienda, horarios, dirección
- Filtro para mostrar/ocultar tiendas en matches

**Flujo diferenciado:**
1. Usuario ve match con tienda
2. Click "Ver en tienda" → abre web de la tienda
3. Usuario compra directamente en la tienda
4. (Opcional futuro) Tienda marca como vendido via webhook

**Sync de inventario:**
- Cron job cada X minutos por tienda (configurable)
- Edge Function para sync manual
- Webhook opcional para actualizaciones real-time

---

## 4. Implementation Priority

### Phase 1: Launch-Critical ✅ COMPLETADO
1. ✅ Global Collection Discount
2. ✅ PWA Improvements (black status bar, bottom navbar)
3. ✅ CubeCobra import format
4. ✅ Bulk import optimization (batch processing)

### Phase 2: Pre-Campaign (En progreso)
5. Push Notifications
6. Match Sorting Options
7. FAQs Section
8. PWA Install Prompt
9. Landing Page (non-logged)
10. **Analytics Setup** ← NUEVO

### Phase 3: Testing & Polish
11. Testing Structure
12. Rate limiting API routes

### Phase 4: Expansion (Post-Launch)
13. i18n (English, Portuguese)
14. Vacation Mode
15. Store Integration (LGS)
16. Advanced analytics dashboards

---

## 5. Database Migrations Needed

```sql
-- Migration: Add global discount and vacation mode
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS default_price_percentage INTEGER DEFAULT 80;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS price_override BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vacation_mode BOOLEAN DEFAULT false;

-- Migration: Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Migration: Store integration (Post-Launch)
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  platform TEXT NOT NULL,
  api_credentials JSONB,
  location_id UUID REFERENCES locations(id),
  logo_url TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 60,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  scryfall_id TEXT NOT NULL,
  card_name TEXT NOT NULL,
  set_code TEXT,
  condition TEXT,
  quantity INTEGER DEFAULT 1,
  price_usd DECIMAL(10,2),
  external_product_id TEXT,
  external_url TEXT,
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, scryfall_id, condition)
);
```

---

## 6. Success Metrics

### Launch Goals (First Month)
| Metric | Target |
|--------|--------|
| Registered users | 100 |
| Active users (weekly) | 50 |
| Push notification opt-in rate | 60% |
| Match-to-contact rate | 30% |
| Completed trades | 10 |

### Key Health Indicators
- Average response time `/api/matches` < 500ms
- Error rate < 1%
- PWA install rate (mobile) > 20%

---

## 7. Known Technical Debt

| Item | Impact | Priority |
|------|--------|----------|
| ESLint warnings en useEffect dependencies | Low | Low |
| next-pwa deprecated dependencies | Medium | Medium |
| Card prices not synced (using Scryfall only) | Medium | Post-launch |
| No rate limiting on API routes | High | Pre-campaign |

---

## 8. Recent Changes Log

| Fecha | Cambio | Detalles |
|-------|--------|----------|
| Ene 2026 | Bulk import optimizado | Batch processing con Scryfall collection endpoint (75 cards/request) y batch DB operations |
| Ene 2026 | CubeCobra import | Agregado soporte para formato CubeCobra CSV |
| Ene 2026 | PWA status bar negro | Cambiado theme-color a #000000, statusBarStyle a 'black' |
| Ene 2026 | Bottom navigation | Nueva navbar inferior para mobile con 5 opciones (Colección, Wishlist, Trades, Alertas, Perfil) |
| Ene 2026 | Global discount | API y UI para definir % descuento global que aplica a nuevas cartas |
| Ene 2026 | PWA icons | Íconos actualizados con fondo negro |

---

*Document updated: January 22, 2026*
*Next review: After Analytics implementation*

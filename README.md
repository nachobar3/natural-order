# Natural Order 🌿

Plataforma de trading de cartas Magic: The Gathering con matching basado en ubicación.

## Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **APIs**: Scryfall (cartas), Google Maps (ubicación)
- **Hosting**: Vercel

## Setup local

### 1. Clonar y instalar dependencias

```bash
git clone https://github.com/[user]/NaturalOrder.git
cd NaturalOrder
npm install
```

### 2. Configurar variables de entorno

Crear `.env.local` con:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-key

# Push Notifications (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
```

### 3. Ejecutar migraciones

En Supabase SQL Editor, ejecutar los archivos en `/supabase/migrations/` en orden.

### 4. Iniciar servidor de desarrollo

```bash
npm run dev
```

## Comandos

```bash
npm run dev      # Desarrollo (http://localhost:3000)
npm run build    # Build de producción
npm run start    # Servidor de producción
npm run lint     # Linting
npm run test:e2e # Tests E2E con Playwright
```

## Estructura del proyecto

```
NaturalOrder/
├── app/                    # Páginas Next.js (App Router)
│   ├── (auth)/            # Páginas de autenticación
│   ├── api/               # API routes
│   └── dashboard/         # Dashboard autenticado
├── components/            # Componentes React
│   ├── cards/            # Componentes de cartas
│   ├── matches/          # Componentes de trades
│   ├── pwa/              # Componentes PWA
│   └── ui/               # Componentes UI generales
├── lib/                   # Utilidades y servicios
│   ├── hooks/            # React hooks
│   └── supabase/         # Clientes Supabase
├── public/               # Assets estáticos
├── supabase/             # Migraciones y config
├── tests/                # Tests E2E
└── types/                # Tipos TypeScript
```

## Documentación

- `MVP_STATUS.md` - Estado actual del MVP
- `TASKS.md` - Tareas pendientes
- `CLAUDE.md` - Instrucciones para Claude Code

## Deploy

El proyecto está configurado para deploy automático en Vercel desde la rama `master`.

### Variables de entorno en Vercel

Configurar las mismas variables de `.env.local` en el dashboard de Vercel.

## Licencia

Privado - Todos los derechos reservados.

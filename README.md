# Natural Order 🌿

Landing page y waitlist para plataforma de trading de Magic: The Gathering con matching basado en ubicación.

## Stack

- HTML5 + CSS3 + JavaScript vanilla
- Tailwind CSS (via CDN)
- Supabase (PostgreSQL)

## Setup local

1. Clonar el repositorio
2. Abrir `index.html` en el navegador (o usar Live Server en VS Code)

## Setup Supabase

### 1. Crear proyecto

1. Ir a [supabase.com](https://supabase.com) y crear cuenta
2. Click en "New Project"
3. Elegir nombre (ej: `natural-order`) y password
4. Seleccionar región más cercana (ej: South America - São Paulo)

### 2. Crear tabla

En el SQL Editor de Supabase, ejecutar:

```sql
CREATE TABLE waitlist_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    trades_frequency TEXT NOT NULL,
    search_method TEXT NOT NULL,
    coordination_pain INTEGER NOT NULL CHECK (coordination_pain BETWEEN 1 AND 5),
    abandoned_trade BOOLEAN NOT NULL,
    would_use_app TEXT NOT NULL,
    most_valuable_benefit TEXT NOT NULL,
    monetization_preference TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas por email
CREATE INDEX idx_waitlist_email ON waitlist_responses(email);

-- Habilitar RLS (Row Level Security)
ALTER TABLE waitlist_responses ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserts desde el frontend
CREATE POLICY "Allow public inserts" ON waitlist_responses
    FOR INSERT
    WITH CHECK (true);
```

### 3. Obtener credenciales

1. Ir a Settings → API
2. Copiar:
   - **Project URL** (ej: `https://xxxxx.supabase.co`)
   - **anon public** key

### 4. Configurar app.js

Abrir `app.js` y reemplazar:

```javascript
const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = 'tu-anon-key-aqui';
```

## Deploy en Vercel

### Opción 1: Desde GitHub

1. Subir código a GitHub
2. Ir a [vercel.com](https://vercel.com)
3. "Import Project" → seleccionar repo
4. Click en "Deploy"

### Opción 2: Vercel CLI

```bash
npm i -g vercel
vercel
```

## Deploy en Netlify

### Opción 1: Drag & drop

1. Ir a [netlify.com](https://netlify.com)
2. Arrastrar la carpeta del proyecto al área de deploy

### Opción 2: Netlify CLI

```bash
npm i -g netlify-cli
netlify deploy --prod
```

## Estructura

```
NaturalOrder/
├── index.html      # Landing page con formulario
├── styles.css      # Estilos custom
├── app.js          # Lógica del formulario + Supabase
├── README.md       # Este archivo
└── CLAUDE.md       # Guía para Claude Code
```

## Ver respuestas

En Supabase:
1. Ir a Table Editor → waitlist_responses
2. O ejecutar: `SELECT * FROM waitlist_responses ORDER BY created_at DESC;`

## Exportar datos

```sql
-- CSV desde SQL Editor
COPY (SELECT * FROM waitlist_responses) TO STDOUT WITH CSV HEADER;
```

O usar el botón "Export" en Table Editor.

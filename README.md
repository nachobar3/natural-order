# Natural Order

Proximity-based marketplace for Magic: The Gathering card trading.

## Quick Start

```bash
npm install
cp .env.example .env.local  # Fill in credentials
npm run dev
```

## Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth)
- **APIs:** Scryfall (cards), Google Maps (location)
- **Hosting:** Vercel

## Documentation

- **[RELEASE.html](./RELEASE.html)** - Complete MVP documentation (matching algorithm, database schema, API endpoints, deployment)
- **[POST_MVP.md](./POST_MVP.md)** - Post-MVP technical improvements and roadmap
- **[CLAUDE.md](./CLAUDE.md)** - Instructions for Claude Code
- **[BUSINESS_EVALUATION.html](./BUSINESS_EVALUATION.html)** - Market research and survey data

## Commands

```bash
npm run dev       # Development server
npm run build     # Production build
npm run test:e2e  # E2E tests (Playwright)
```

## Project Structure

```
app/              # Next.js pages (App Router)
├── api/          # API routes
└── dashboard/    # Authenticated pages
components/       # React components
lib/              # Utilities, hooks, services
supabase/         # Database migrations
tests/            # E2E and load tests
```

## License

Private - All rights reserved.

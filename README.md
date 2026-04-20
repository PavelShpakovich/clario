# Clario — AI Astrology Workspace

Clario is a web-first astrology application built with **Next.js**, **Supabase**, and a structured **Qwen** generation pipeline. Users can create natal charts, generate readings, compare chart compatibility, get daily forecasts, and ask follow-up questions in a reading-specific chat.

The most accurate engineering overview currently lives in [docs/system-context.md](docs/system-context.md). Product-direction notes remain in [docs/pivots/ai-astrology-pivot.md](docs/pivots/ai-astrology-pivot.md).

---

## Tech Stack

| Layer           | Tech                                                   |
| --------------- | ------------------------------------------------------ |
| Framework       | Next.js 16, App Router, TypeScript strict              |
| Database + Auth | Supabase (PostgreSQL, RLS, Auth)                       |
| Session         | NextAuth.js (JWT cookie)                               |
| LLM             | Qwen API, mock mode                                    |
| Validation      | Zod                                                    |
| Ingestion       | Birth data intake, chart snapshots, structured prompts |
| i18n            | next-intl (Russian-first)                              |
| Logging         | pino                                                   |
| Tests           | Jest + Testing Library                                 |
| Deploy          | Vercel                                                 |

---

## Quick Start

### 1. Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A Qwen API key

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create `.env.local` and fill in:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# NextAuth
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-strong-random-secret

# LLM
LLM_PROVIDER=qwen
QWEN_API_KEY=your-qwen-key
QWEN_MODEL=qwen-plus

# Optional if using a custom compatible endpoint
# QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1

# Support / email
SUPPORT_EMAIL=support@example.com
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL=no-reply@example.com

# Admin / jobs
ADMIN_EMAILS=admin@example.com
CRON_SECRET=replace-with-random-secret

# Maps
NEXT_PUBLIC_YANDEX_MAPS_KEY=your-yandex-maps-key
```

`mock` remains available for deterministic local development and tests.

### 4. Apply database migrations

```bash
# Install Supabase CLI if needed
brew install supabase/tap/supabase

# Reset a local database from the current astrology baseline
supabase db reset

# Or push the current baseline to a clean remote project
supabase db push --db-url "postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"
```

The repository now keeps a single destructive baseline migration for the astrology product in `supabase/migrations/`. It is intended for a reset local database or a clean remote project.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Documentation

- [docs/system-context.md](docs/system-context.md) — current engineering reference for implementation details and feature behavior
- [docs/pivots/ai-astrology-pivot.md](docs/pivots/ai-astrology-pivot.md) — product-direction and rewrite-planning document

---

## How It Works

### Authentication

- Users sign in on the web with email + password
- Sessions are handled through NextAuth JWT cookies
- Email verification and password-reset flows are supported
- Protected routes are enforced in middleware and server/API guards

### Core Flow

1. Create an account and sign in.
2. Enter birth data and create a natal chart.
3. The server calculates chart snapshots, positions, and aspects.
4. Generate a structured reading, compatibility report, or daily forecast.
5. Ask follow-up questions in a chat tied to a specific reading.
6. Return to saved charts and generated content from the dashboard.

---

## Available Scripts

```bash
npm run dev           # Start development server
npm run build         # Production build
npm run start         # Start production server

npm run type-check    # TypeScript type check
npm run lint          # ESLint (zero warnings enforced)
npm run lint:fix      # ESLint with auto-fix
npm run format        # Prettier write
npm run format:check  # Prettier check

npm test              # Run Jest test suite
npm run test:watch    # Jest in watch mode
npm run test:coverage # Jest with coverage report
```

---

## LLM Runtime

Set `LLM_PROVIDER` in `.env.local`.

| `LLM_PROVIDER` | Required env var | Notes                                         |
| -------------- | ---------------- | --------------------------------------------- |
| `qwen`         | `QWEN_API_KEY`   | Production provider via OpenAI-compatible API |
| `mock`         | _(none)_         | Deterministic fake outputs for tests and dev  |

---

## Main Features

- natal chart creation and recalculation
- structured readings for multiple reading types
- compatibility reports (synastry)
- daily personal forecasts
- follow-up chat tied to a reading
- calendar and dashboard views
- admin user and analytics surfaces

---

## Deployment (Vercel)

```bash
npm i -g vercel
vercel --prod
```

Set all environment variables in the Vercel dashboard under **Settings > Environment Variables**.

`vercel.json` configures runtime limits for active API surfaces and scheduled cleanup jobs.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── admin/            # Admin user management
│   │   ├── auth/             # NextAuth and account flows
│   │   ├── compatibility/    # Compatibility creation and generation
│   │   ├── cron/             # Scheduled jobs
│   │   ├── charts/           # Chart creation and retrieval
│   │   ├── chat/             # Follow-up chat
│   │   ├── forecasts/        # Daily forecasts
│   │   ├── profile/          # Profile updates
│   │   ├── readings/         # Structured reading generation
│   │   └── timezone/         # Timezone-related helpers
│   ├── admin/                # Admin panel
│   ├── calendar/             # Planetary calendar
│   ├── chat/                 # Reading follow-up chat
│   ├── charts/               # Chart library and detail views
│   ├── compatibility/        # Compatibility report views
│   ├── dashboard/            # Main astrology workspace
│   ├── horoscope/            # Daily forecast view
│   ├── onboarding/           # Preference setup
│   ├── readings/             # Reading library
│   ├── settings/             # User settings
│   └── page.tsx              # Landing page
├── components/
├── hooks/
├── i18n/                     # next-intl config and messages
├── lib/
│   ├── supabase/             # Supabase clients + generated types
│   ├── astrology/            # Chart domain logic
│   ├── compatibility/        # Compatibility generation
│   ├── forecasts/            # Forecast generation
│   ├── llm/                  # Structured generation and parsing
│   ├── readings/             # Reading prompts and schemas
│   └── env.ts                # Zod environment validation
└── services/                 # Client-side API wrappers

supabase/migrations/          # SQL baseline for the astrology product
```

## Notes

- The source of truth is the current codebase, not older product notes.
- If README and implementation ever disagree, prefer the code and update the README.

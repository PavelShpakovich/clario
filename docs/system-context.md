# Clario System Context

Generated from a code audit on 2026-04-20.

This document is a practical engineering reference for how the current system is implemented. It is not product marketing or roadmap copy.

## 1. High-Level System

Clario is a Next.js 16 App Router application for AI-assisted astrology workflows.

The core user flow is:

- authenticate
- create natal charts from birth data
- calculate chart snapshots, positions, aspects, and derived astrology metadata
- generate structured readings, compatibility reports, and daily forecasts with Qwen
- ask follow-up questions in a streamed chat tied to a reading
- manage usage and admin workflows through Supabase-backed APIs

Primary stack:

- frontend/server framework: Next.js 16 App Router, React 19, TypeScript
- UI: Tailwind CSS 4, shadcn/ui, Radix UI, lucide-react
- auth/session: NextAuth JWT sessions + Supabase-backed account/profile data
- database/storage: Supabase Postgres
- LLM provider: Qwen via OpenAI-compatible API, plus mock mode for deterministic development/tests
- validation: Zod
- logging: pino
- testing: Jest + Testing Library
- deployment target: Vercel

## 2. Top-Level Architecture

Repository shape:

- `src/app`: pages, layouts, and API routes
- `src/components`: UI and feature components
- `src/lib`: business logic, domain logic, APIs, auth, errors, env, Supabase, LLM
- `src/services`: client-side wrappers for some APIs
- `src/i18n`: next-intl configuration and locale messages
- `src/hooks`: client hooks such as status polling and auth helpers
- `supabase/migrations`: SQL schema history
- `docs`: product and system notes

Main shell:

- root layout: `src/app/layout.tsx`
- persistent header: `src/components/layout/header.tsx`
- authenticated app content sits under a flex column below the header

## 3. Route Surfaces

Key user-facing pages in `src/app`:

- `page.tsx`: landing page
- `dashboard/page.tsx`: authenticated dashboard
- `charts/page.tsx`: chart library
- `charts/new/page.tsx`: chart creation flow
- `charts/[chartId]/page.tsx`: chart detail
- `readings/page.tsx`: readings list
- `readings/[readingId]/page.tsx`: reading detail
- `compatibility/page.tsx`: compatibility reports list
- `compatibility/new/page.tsx`: compatibility creation flow
- `compatibility/[reportId]/page.tsx`: compatibility detail
- `horoscope/page.tsx`: daily horoscope view
- `calendar/page.tsx`: planetary calendar
- `chat/[readingId]/page.tsx`: follow-up chat tied to a reading
- `settings/page.tsx`: account/profile settings
- `admin/page.tsx`: admin panel
- `login/register/forgot-password/set-password`: authentication flows
- `privacy/page.tsx` and `terms/page.tsx`: legal pages

API route groups in `src/app/api`:

- `auth`: NextAuth and account-related auth flows
- `charts`: create, read, update, delete charts and recalculate chart data
- `readings`: create, generate, retry, export PDF
- `compatibility`: create, generate, retry
- `forecasts`: fetch, generate, regenerate daily forecasts
- `chat`: follow-up thread/message streaming endpoint
- `profile`: user profile and password update endpoints
- `admin`: users and analytics endpoints
- `cron`: scheduled cleanup jobs

## 4. Authentication And Access Model

Implementation points:

- `auth.ts`
- `src/lib/auth/options.ts`
- `src/lib/api/auth.ts`
- `middleware.ts`

Behavior:

- auth uses NextAuth with JWT sessions
- server components and API routes call `auth()` or `requireAuth()`
- admin routes additionally require admin privileges via `requireAdmin()`
- public/private access is enforced in middleware and again in server/API boundaries
- profile data and admin flags are stored in Supabase-backed tables, not only in session state

Important implementation detail:

- the repo currently implements web-first auth around NextAuth + Supabase account/profile state
- current code paths audited during this session are centered on email/password and session cookies
- any README references to other auth surfaces should be treated as documentation drift unless verified against current routes

## 5. I18n And Locale Model

Implementation points:

- `src/i18n/config.ts`
- `src/i18n/request.ts`
- `src/i18n/messages/ru.json`

Behavior:

- runtime locale support in code is Russian-first
- current message catalog and page copy are centered on `ru`
- `next-intl` is used on both server and client
- translation keys are feature-scoped, for example `horoscope`, `compatibility`, `readingGenerating`, and `chat`

## 6. Environment And Runtime Config

Implementation point:

- `src/lib/env.ts`

Current effective env model from code:

- Supabase URL, anon key, service key
- app URL and NextAuth secret
- Qwen API key, model, base URL
- LLM provider enum includes `qwen` and `mock`
- Resend email settings
- cron secret
- optional maps-related envs

Important note:

- the current structured generation code in `src/lib/llm/structured-generation.ts` supports `qwen` and `mock`
- if other providers are mentioned in docs, verify before relying on them

## 7. Data Model And Storage

Key tables inferred from route/service usage and migrations:

- `profiles`: user profile and preferences-style data
- `charts`: top-level natal chart entities
- `chart_snapshots`: immutable or versioned chart calculation snapshots
- `chart_positions`: per-body positions for a snapshot
- `chart_aspects`: stored aspects for a snapshot
- `readings`: AI-generated reading records with status and content metadata
- `forecasts`: daily horoscope records
- `compatibility_reports`: compatibility records
- `follow_up_threads`: per-reading chat thread container
- `follow_up_messages`: persisted chat messages
- `generation_logs`: audit records for LLM generations, payloads, latency, usage tokens
- usage-related and account-related tables introduced in migrations for product usage and purchase foundations
- email verification and account support tables depending on auth workflow

Migration files present:

- `0034_astrology_baseline_reset.sql`
- `0035_remove_billing_tables.sql`
- `0036_add_report_purchase_foundation.sql`
- `0037_add_generation_log_usage_tokens.sql`
- `0038_add_performance_indexes.sql`
- `0039_drop_unused_tables.sql`
- `0040_expand_house_system_options.sql`

## 8. Astrology Domain Implementation

Implementation points:

- `src/lib/astrology/engine.ts`
- `src/lib/astrology/constants.ts`
- `src/lib/astrology/chart-schema.ts`
- `src/lib/astrology/types.ts`

Behavior:

- chart calculations are performed through the astrology engine wrapper around Celestine
- supported house systems are defined in constants and expanded by migration `0040`
- snapshots, positions, and aspects form the persistent representation used by readings, compatibility, and forecasts
- chart creation and recalculation routes rely on this layer, not on direct page logic

## 9. Chart Feature

User goal:

- create and manage natal charts from birth data

Implementation points:

- page/list/detail: `src/app/charts/**`
- API routes: `src/app/api/charts/**`
- service wrapper: `src/services/charts-api.ts`
- astrology engine/domain: `src/lib/astrology/**`

Behavior:

- chart creation validates birth details and stores a chart record
- the server computes chart data and persists snapshot, positions, and aspects
- chart detail pages render derived chart information from stored data rather than recalculating in the client
- recalculation is exposed through a dedicated route for updating chart-derived data

## 10. Readings Feature

User goal:

- generate structured astrology readings from a chart and a selected reading type

Implementation points:

- pages: `src/app/readings/page.tsx`, `src/app/readings/[readingId]/page.tsx`
- create/generate/retry/PDF routes: `src/app/api/readings/**`
- orchestration service: `src/lib/readings/service.ts`
- schemas: `src/lib/readings/plan-schema.ts`, `src/lib/readings/report-schema.ts`, `src/lib/readings/reading-request-schema.ts`
- generating UI: `src/components/astrology/reading-generating.tsx`
- retry UI: `src/components/astrology/retry-reading-button.tsx`
- PDF rendering: `src/components/pdf/**` and `api/readings/[readingId]/pdf`

Behavior:

- a pending reading is created first
- generation is triggered through a dedicated endpoint
- service orchestrates a structured LLM pipeline rather than one raw text prompt
- outputs are validated with Zod schemas and persisted to readings-related tables
- generation logs are written with payloads, latency, and usage tokens
- failed readings can be retried
- the detail page shows status-specific UI: generating, error, or ready content

Implementation detail from current codebase conventions:

- reading generation status is persisted in the main readings table so UI polling can transition cleanly
- retry behavior for readings is supported both at page level and during generating/error state

## 11. Daily Forecast Feature

User goal:

- get a daily horoscope for the user’s chart

Implementation points:

- page: `src/app/horoscope/page.tsx`
- API routes: `src/app/api/forecasts/daily/route.ts` and `src/app/api/forecasts/[forecastId]/**`
- service: `src/lib/forecasts/service.ts`
- generating UI: `src/components/astrology/horoscope-generating.tsx`
- regenerate UI: `src/components/astrology/horoscope-regenerate.tsx`

Behavior:

- a daily forecast row is fetched or created for the current day
- stale forecast rows are cleaned up in service logic
- forecast generation combines deterministic astrology context with LLM text generation
- LLM output is expected as structured JSON with `interpretation`, `keyTheme`, `advice`, and optionally `moonPhase`
- generated result is stored on the forecast row along with transit snapshot data
- failure state is persisted on the forecast row so the poller can show an error state instead of hanging in generating forever
- regenerate clears content and status and re-enters the normal generation state

Implementation detail from recent fixes:

- retry from an error state intentionally performs a hard page reload after reset so client state is fully reset and the generating component remounts cleanly

## 12. Compatibility Feature

User goal:

- compare two charts and generate a compatibility report

Implementation points:

- pages: `src/app/compatibility/**`
- routes: `src/app/api/compatibility/**`
- service: `src/lib/compatibility/service.ts`
- generating UI: `src/components/astrology/compatibility-generating.tsx`
- retry UI: `src/components/astrology/retry-compatibility-button.tsx`

Behavior:

- the user selects two charts
- a pending `compatibility_report` row is created
- generation route triggers service orchestration
- the service loads both charts and their snapshot data, computes relationship-relevant context, prompts the LLM, validates structured output, and stores the finished report
- report status transitions through `pending`, `generating`, `ready`, and `error` in the main `compatibility_reports` table
- retry support resets a failed report back to pending so the normal generating state can run again

## 13. Follow-Up Chat Feature

User goal:

- ask additional questions about a completed reading

Implementation points:

- page: `src/app/chat/[readingId]/page.tsx`
- component: `src/components/astrology/follow-up-chat.tsx`
- API route: `src/app/api/chat/[readingId]/route.ts`
- LLM runtime: `src/lib/llm/structured-generation.ts`

Behavior:

- the page loads the reading, resolves or creates a `follow_up_thread`, then loads `follow_up_messages`
- the `FollowUpChat` client component manages optimistic UI, streaming state, abort behavior, starter prompts, question-limit indicator, and message rendering
- the client posts to `/api/chat/[readingId]`
- assistant responses stream back incrementally and are rendered live
- messages are persisted on the backend, not just in client state
- there is a hard follow-up usage limit via `FOLLOW_UP_LIMIT`

Implementation details in the component:

- optimistic user message is appended immediately
- assistant streaming placeholder is appended with a temporary `stream-*` id
- abort uses `AbortController` stored in a ref
- markdown rendering uses `react-markdown` and `remark-gfm`
- the inner messages pane is the intended scroll container; header and input are fixed-height siblings inside a bounded flex layout

## 14. Calendar Feature

User goal:

- view planetary calendar and daily sky context

Implementation points:

- page: `src/app/calendar/page.tsx`
- supporting astrology data under `src/lib/astrology`
- related UI under `src/components/astrology`

Behavior:

- this feature uses astrology-domain data to present upcoming sky information in a calendar-oriented view
- it is adjacent to forecasts but not the same generation pipeline

## 15. Dashboard, Settings, Profile, Admin

Dashboard:

- `src/app/dashboard/page.tsx` acts as the authenticated hub to reach charts, readings, compatibility, horoscope, and calendar

Settings and profile:

- settings UI under `src/app/settings`
- profile APIs under `src/app/api/profile`
- client wrapper in `src/services/profile-api.ts`
- password update through profile/password endpoints

Admin:

- admin page under `src/app/admin/page.tsx`
- admin routes under `src/app/api/admin/**`
- `admin-api.ts` wraps some admin requests client-side
- features include user listing, admin flag changes, usage resets, and analytics surfaces

## 16. LLM Implementation Details

Implementation points:

- `src/lib/llm/structured-generation.ts`
- `src/lib/llm/structured-output.ts`

Structured generation behavior:

- Qwen is called through the OpenAI-compatible chat completions API
- structured generation uses `response_format: json_object` for syntactic JSON reliability
- completion token limit is configurable per request via `maxTokens`
- `finish_reason === 'length'` is treated as a truncation failure
- raw model output is parsed and validated against Zod schemas
- the parser includes a repair step for common key-name abbreviation mistakes such as `interpret -> interpretation`

Chat behavior:

- plain chat response and streaming chat response are separate paths from structured generation
- follow-up chat uses streaming and can report usage tokens where supported

Important note:

- this shared LLM layer is central to readings, compatibility, forecasts, and follow-up chat, so parser and runtime changes can affect multiple product features at once

## 17. Error Handling Model

Implementation points:

- `src/lib/errors.ts`
- `src/lib/api/handler.ts`
- `src/lib/logger.ts`

Behavior:

- route handlers are wrapped by `withApiHandler()`
- app errors are mapped to structured HTTP responses
- request ID, route, latency, and error metadata are logged through pino
- feature services generally persist `error` status on the main entity row when generation fails so status pollers and pages can react correctly

## 18. Status Polling Model

Implementation point:

- `src/hooks/use-status-poller.ts`

Behavior:

- generating pages poll a status endpoint until entity status becomes `ready` or `error`
- on ready, the hook refreshes or navigates so the page can re-render with content
- on error, client UI shows feature-specific retry and error state
- this hook is used by reading, compatibility, and forecast generation UIs

## 19. Rate Limiting, Access, And Usage

Implementation points:

- `src/lib/rate-limit.ts`
- `src/lib/access-utils.ts`

Behavior:

- login attempts and generation/chat actions are limited in-memory per app instance
- readings use hourly limits
- follow-up chat uses a fixed question cap per reading thread/page flow
- `access-utils` centralizes policy checks and user entitlements or usage decisions where applicable

Important limitation:

- the rate limiter is in-memory, so it is instance-local rather than a globally coordinated distributed limiter

## 20. Email, Cron, And Operations

Email:

- email-related logic lives under `src/lib/email` and auth-related email support modules
- Resend is the current email provider in the env schema

Cron:

- cleanup-unverified route under `src/app/api/cron/cleanup-unverified`
- protected by `CRON_SECRET`
- used for operational cleanup of stale unverified users

Build and validation commands from `package.json`:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run lint:fix`
- `npm run format`
- `npm run format:check`
- `npm run type-check`
- `npm test`
- `npm run test:watch`
- `npm run test:coverage`

## 21. Testing Model

Implementation points:

- `jest.config.ts`
- `src/test-setup.ts`
- `src/__tests__/**`

What is covered:

- astrology engine and schema logic
- cities lookup utilities
- access and rate limiting helpers
- error classification and mapping
- structured-output parsing logic
- utility helpers
- status-poller hook

What this means in practice:

- core utility and parser behavior has targeted coverage
- not every large orchestration service is exhaustively unit tested, so changes in readings, forecast, and compatibility services should still be validated end-to-end where possible

## 22. UI Component Model

Feature components of note:

- `astrology`: chart, reading, compatibility, forecast, and chat-specific UI
- `auth`: forms and auth UX
- `common`: reusable building blocks
- `layout`: header and footer shells
- `ui`: shadcn primitives
- `pdf`: reading export rendering

Patterns used repeatedly:

- server components load data and pass serializable props into client components
- generating client components own retry, loading, and polling behavior
- page components switch on entity status and render generating, error, or ready states

## 23. Current Chat Layout Notes

Implementation points:

- `src/app/chat/[readingId]/page.tsx`
- `src/components/astrology/follow-up-chat.tsx`

Current intended layout behavior:

- page route provides a bounded vertical frame using `calc(100dvh - header height)`
- `FollowUpChat` is a flex column with three vertical sections: header, messages, composer
- only the middle messages pane should scroll
- header and composer are non-scrolling siblings in the same flex frame

## 24. Known Implementation Caveats And Drift Notes

- README may contain some architecture and runtime statements that do not fully match the audited implementation; treat code as source of truth
- some historical docs may mention alternate providers or locale combinations not present in the currently active runtime path
- mobile viewport behavior can still require careful handling around `dvh`, `svh`, and header-height assumptions, especially for the chat route
- because shared LLM parsing is centralized, a fix for one feature can affect all structured generations

## 25. Primary Source Files For Future Orientation

Start here when reloading context quickly:

- `src/app/layout.tsx`
- `middleware.ts`
- `auth.ts`
- `src/lib/env.ts`
- `src/lib/errors.ts`
- `src/lib/api/handler.ts`
- `src/lib/supabase/admin.ts`
- `src/lib/astrology/engine.ts`
- `src/lib/readings/service.ts`
- `src/lib/forecasts/service.ts`
- `src/lib/compatibility/service.ts`
- `src/lib/llm/structured-generation.ts`
- `src/lib/llm/structured-output.ts`
- `src/hooks/use-status-poller.ts`
- `src/app/readings/[readingId]/page.tsx`
- `src/app/compatibility/[reportId]/page.tsx`
- `src/app/horoscope/page.tsx`
- `src/app/chat/[readingId]/page.tsx`
- `src/components/astrology/follow-up-chat.tsx`

End of system context.

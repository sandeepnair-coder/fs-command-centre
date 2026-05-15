# Fynd Studio — Architecture Overview

## Stack
- **Framework**: Next.js 16 (App Router, Turbopack, Cache Components)
- **Auth + DB + Storage**: Supabase (`@supabase/ssr`)
- **UI**: shadcn/ui (new-york style) + Tailwind CSS v4
- **Theming**: `next-themes` (dark/light/system via `class` attribute) + custom color themes (via `data-theme` CSS attribute)
- **DnD**: `@dnd-kit/core` + `@dnd-kit/sortable`
- **Toasts**: `sonner`
- **Fonts**: Geist Sans (Google Fonts)

## Project structure
```
app/
  (app)/          ← authenticated app routes (layout with sidebar + topbar)
    tasks/        ← Phase 1: Task Management
    finance/      ← Phase 2: Finance
    mail/         ← Phase 3: Mail
  auth/           ← login, sign-up, forgot-password, etc.
  layout.tsx      ← root layout (theme providers, font)
  globals.css     ← CSS variables, color theme definitions

components/
  layout/         ← app-topbar, sidebar, theme switchers
  modules/
    tasks/        ← Phase 1 components
    finance/      ← Phase 2 components
    mail/         ← Phase 3 components
  ui/             ← shadcn primitives (DO NOT edit by hand)

lib/
  supabase/       ← client.ts, server.ts, proxy.ts
  tasks/          ← task-specific utils (position.ts)
  types/          ← shared type definitions
  utils.ts        ← cn() and other shared utils

supabase/
  schema.sql      ← reference schema
  migrations/     ← (managed via Supabase dashboard/MCP)

docs/
  PHASE_CURRENT.md    ← active phase + scope
  ARCHITECTURE.md     ← this file
  phase-1-tasks.md    ← Phase 1 manifest
```

## Conventions
- **Server Actions**: all data mutations in `app/(app)/<module>/actions.ts` — marked `"use server"`
- **Optimistic UI**: update local state immediately, call server action, rollback on error + toast
- **Fractional positioning**: items use float positions with 1000-gap increments; midpoint insertion via `getInsertPosition()`
- **Components**: `"use client"` only when needed; prefer server components where possible
- **Styling**: Tailwind utility classes only; no CSS modules; shadcn components for all UI primitives
- **State**: React `useState` + `useCallback`; no global state library
- **Error handling**: try/catch with `toast.error()` for user feedback
- **File naming**: kebab-case for files, PascalCase for components

## Supabase project
- **Project ID**: `bjudnbrcmayvppbtcjio`
- **Auth**: email/password via Supabase Auth
- **Storage**: `task-attachments` bucket for file uploads
- **RPC**: `move_task`, `swap_column_positions` for atomic operations

## Phase plan
| Phase | Module | Status |
|-------|--------|--------|
| 1 | Task Management (Kanban) | Active |
| 2 | Finance | Planned |
| 3 | Mail | Planned |

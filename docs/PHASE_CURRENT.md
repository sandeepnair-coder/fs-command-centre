# Current Phase: Phase 1 — Task Management Kanban

## Scope folders (Claude may read/modify)
- `app/(app)/tasks/**`
- `components/modules/tasks/**`
- `lib/tasks/**`
- `lib/types/tasks.ts`
- `supabase/**` (only if a DB migration is required)
- `docs/phase-1-tasks.md` (reference, read-only)

## Do NOT touch
- `app/(app)/mail/**`
- `app/(app)/finance/**`
- `components/modules/mail/**`
- `components/modules/finance/**`
- `components/layout/**` — unless explicitly requested
- `components/ui/**` — these are shadcn primitives; install new ones via CLI only
- `app/layout.tsx` — global layout, off-limits
- `app/globals.css` — only if adding theme variables explicitly requested
- `lib/supabase/**` — stable infra, do not modify

## Read-only dependencies (used but never modified)
- `@/components/ui/*` — shadcn components (avatar, badge, button, card, dialog, dropdown-menu, input, label, popover, scroll-area, select, separator, sheet, textarea, tooltip, alert-dialog)
- `@/lib/supabase/server` — `createClient()` for server actions
- `@/lib/utils` — `cn()` utility
- `next-themes`, `sonner`, `@dnd-kit/*` — third-party packages

## Current goals
- Kanban board works reliably (drag/drop + persistence)
- Task drawer (details + attachments + links + comments)
- Column rename + move left/right
- Board create/delete (cascade)
- Client created inline on card creation
- Client filter at board level
- Timestamps shown in UI touchpoints (sheet header, attachments, card tooltip)
- All UI says "Board" not "Project"

## Definition of done
- `npm run build` passes with zero errors
- `/tasks` route loads, board selector works
- Create board → 7 default columns appear
- Delete board → cascades, resets to empty state
- Create task with client + assignee + priority + due date
- Drag task between columns → persists after reload
- Open task sheet → title, fields, description, attachments, links, comments all functional
- Move column left/right → position persists
- Client filter filters visible cards

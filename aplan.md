# Fynd Studio – Command Centre (Internal)

Single internal web app for Fynd Studio with **three modules**:
1) **Mail** (Gmail-like shared inbox view)
2) **Task Management** (Asana-like Kanban for projects + tasks)
3) **Finance** (simple invoices + expenses + monthly summary)

There is **NO client portal** or client-specific interface.
Clients + projects exist as **data entities** used for filtering inside each module.

---

## Tech Stack
- Next.js (App Router) + TypeScript
- Supabase (Auth, Postgres, Storage, Realtime)
- Tailwind CSS
- shadcn/ui + shadcn Blocks (design system)
- Vercel (deployment)

---

## Navigation (Left Sidebar)

Routes (must exist):
- `/mail`
- `/tasks`
- `/finance`

---

## Build Order (Agile)

**Phase 0 (Foundation)**
- Auth working (Supabase SSR cookies)
- App shell layout (sidebar + topbar)
- Theme toggle (light/dark/system)
- Clients + Projects basic CRUD (minimal)

**Phase 1 (Task Management) — build first**
- Projects list
- Project detail page with Kanban board
- Tasks/cards CRUD
- Drag & drop + ordering persisted
- Task drawer: details, comments, attachments
- Realtime updates for tasks and comments

**Phase 2 (Finance)**
- Expenses (tools/team/infra) + categories
- Invoices + status (draft/sent/paid/overdue)
- Monthly dashboard totals with client/project filters

**Phase 3 (Mail)**
- Gmail-like UI: thread list + conversation view + reply box
- Thread status + assignment + internal notes
- Link threads to client and optionally project
- Later: Gmail OAuth sync + send replies

---

## Shared Core Entities (connect modules)
- **clients**
- **projects** (belongs to a client)

Later:
- tasks (belongs to project; project belongs to client)
- mail threads (belongs to client; may link to project)
- invoices/expenses (belongs to client; may link to project)

---

## Minimum Database Tables (Phase 0/1)
- profiles (id uuid = auth.users.id, full_name, avatar_url, created_at)
- clients (id uuid, name, notes, created_at)
- projects (id uuid, client_id uuid fk, name, status, due_date, created_at)

Phase 1 additions:
- project_columns (id, project_id, name, position)
- tasks (id, project_id, column_id, title, description, priority, due_date, position, created_by, created_at, updated_at)
- task_assignees (task_id, user_id)
- task_comments (id, task_id, author_id, body, created_at)
- attachments (id, entity_type, entity_id, storage_path, file_name, created_at)

---

## Codebase Conventions
- `components/layout/*` (sidebar, topbar, app shell)
- `components/modules/tasks/*`
- `components/modules/finance/*`
- `components/modules/mail/*`
- `lib/supabase/*` (server/client helpers)
- `lib/validators/*` (zod schemas)
- Avoid massive files. Prefer small components.

---

## Security Rules
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
- Enable RLS on tables.
- MVP policy: authenticated users can read/write.
- Later: role-based permissions.

---

## Definition of Done (Phase 1)
- Create client → project → tasks
- Kanban drag/drop persists order + column changes
- Task drawer: edit + comments + attachments
- Two users can view same board and see updates without refresh
- Deployed to Vercel successfully

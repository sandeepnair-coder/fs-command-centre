# Fynd Studio Command Centre — Project Overview

## What is this?

Fynd Studio Command Centre is a **client work operating system** for a creative/design studio. It combines task management (Kanban boards), client relationship management, communication tracking, and AI-powered intelligence — all in one product.

**Live URL:** https://studio.fynd.design
**GitHub:** https://github.com/sandeepnair-coder/fs-command-centre

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database | Supabase (PostgreSQL) |
| Auth | Clerk (session-based for UI, Bearer token for API) |
| Styling | Tailwind CSS + shadcn/ui + Radix primitives |
| Theme | Supabase theme (oklch mint green `#72e3ad`) |
| Deployment | Vercel (production at studio.fynd.design) |
| AI Agent | OpenClaw (WebSocket gateway on external server) |
| Validation | Zod |

---

## Product Architecture

```
┌─────────────────────────────────────────────────────┐
│                    USERS (Browser)                   │
│         https://studio.fynd.design                   │
│    Clerk Auth → Next.js App Router → React UI        │
└──────────────────────┬──────────────────────────────┘
                       │
              Server Actions / RSC
                       │
┌──────────────────────▼──────────────────────────────┐
│              SUPABASE (PostgreSQL)                    │
│   clients, projects, tasks, columns, comments,       │
│   tags, assignees, attachments, links, dependencies, │
│   client_contacts, client_facts, brand_assets,       │
│   conversations, comms_messages, work_streams,       │
│   card_relations, connector_configs,                 │
│   audit_log_events, idempotency_keys,                │
│   agent_action_queue                                 │
└──────────────────────▲──────────────────────────────┘
                       │
              Service Layer (lib/services/)
                       │
┌──────────────────────▼──────────────────────────────┐
│              API Layer (/api/v1/*)                    │
│   22 endpoints — Bearer token auth, Zod validation   │
│   Idempotent, audit-logged, agent-aware              │
└──────────────────────▲──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              OPENCLAW (AI Agent)                      │
│   WhatsApp → OpenClaw Gateway → HTTP tools           │
│   ws://64.23.177.147:18789                           │
│   Listens to client conversations on WhatsApp        │
│   Calls API to create/update projects, tasks,        │
│   clients from conversation context                  │
└─────────────────────────────────────────────────────┘
```

---

## Modules

### 1. Task Management (Kanban)
The core execution layer. Boards with drag-and-drop columns and task cards.

**Features:**
- Multiple boards (projects), each with customizable columns
- Default columns: Intake/Backlog → Ready → In Progress → Internal Review → Client Review → Revisions → Approved/Done
- Task cards with: title, description, priority (low/medium/high/urgent), due date, cost (₹), client, assignees, tags, subtasks, comments, attachments, links, dependencies
- Views: Kanban (default), List, Calendar, Client View (grouped by client), Stream View (grouped by work stream)
- Filters: search, priority, assignee, due date, client
- Analytics panel with board metrics
- Deadline indicators: overdue (red border), due soon (amber), due this week (yellow dot)
- Time-in-column aging indicator
- Completion toggle with subtask progress bar

**Key files:**
- `app/(app)/tasks/page.tsx` — tasks page
- `app/(app)/tasks/actions.ts` — server actions for all task operations
- `components/modules/tasks/kanban/` — KanbanShell, KanbanBoard, KanbanCard, KanbanColumn, TaskSheet, FilterBar, ListView, CalendarView, ClientView, StreamView, AnalyticsPanel, SubtaskPanel, TagPicker, DependencyPicker

### 2. Clients
Client relationship management. Every client has a data card with structured information.

**Features:**
- Client list page with search, create dialog
- Client Data Card with 6 tabs:
  - **Overview:** company, website, email, phone, timezone, industry, work streams
  - **Contacts:** SPOC, design lead, marketing contact, etc. with verification status
  - **Brand & Web:** social handles, target audience, tone/voice, positioning
  - **Assets:** brand kits, logos, fonts, guidelines, decks
  - **Intelligence:** client facts with status (verified/inferred/stale/conflicting), confidence scores, accept/reject
  - **Activity Log:** audit trail of all changes
- Field verification states: verified, inferred, stale, conflicting
- Client auto-creation when referenced in tasks

**Key files:**
- `app/(app)/clients/page.tsx` — client list
- `app/(app)/clients/[id]/page.tsx` — client profile
- `app/(app)/clients/actions.ts` — client CRUD server actions
- `components/modules/clients/ClientsShell.tsx` — list component
- `components/modules/clients/ClientProfile.tsx` — profile component

### 3. Comms
Unified communication visibility across Email, Slack, and WhatsApp.

**Features:**
- Three-pane layout: thread list (left), message timeline (center), insight panel (right)
- Channel tabs: All, Email, Slack, WhatsApp
- Thread list with: channel icon, client name, subject, timestamp, unread count, resolved status
- Message timeline with sender, channel badge, classification badges, timestamps
- Insight panel with: AI summary, open asks, decisions, action buttons
- Actions: Create Task, Save Fact to Client, Mark as Approval, Mark Resolved, Copy Source Link
- Currently uses demo/placeholder data — real channel ingestion is Phase 3

**Key files:**
- `app/(app)/comms/page.tsx` — comms page
- `app/(app)/comms/actions.ts` — conversation/message server actions
- `components/modules/comms/CommsShell.tsx` — three-pane component

### 4. Finance
Basic financial tracking (invoices, expenses, purchase orders, projects).

**Note:** Finance is NOT exposed to OpenClaw. No API endpoints exist for finance operations.

**Key files:**
- `app/(app)/finance/` — finance pages (invoices, expenses, purchase-orders, projects)

### 5. Settings
Workspace configuration.

**Features:**
- Profile management
- Admin panel (members, roles)
- Connectors page (OpenClaw connector with mode/scope controls, connection test, audit log)

**Key files:**
- `app/(app)/settings/page.tsx` — settings hub
- `app/(app)/settings/connectors/page.tsx` — connectors page
- `components/modules/settings/ConnectorsShell.tsx` — connector config UI

---

## Database Schema

### Core Tables
| Table | Purpose |
|-------|---------|
| `members` | Team members (Clerk-synced) |
| `clients` | Client/brand entities |
| `projects` | Boards/projects linked to clients |
| `project_columns` | Kanban columns per project |
| `tasks` | Task cards with all fields |
| `task_assignees` | Many-to-many task↔member |
| `task_comments` | Comments on tasks |
| `task_attachments` | File attachments on tasks |
| `task_links` | URL links on tasks |
| `task_tags` | Many-to-many task↔tag |
| `tags` | Workspace-level tag definitions |
| `task_dependencies` | Blocking/blocked-by relationships |
| `task_activity_log` | Activity audit trail for tasks |

### Client Intelligence Tables
| Table | Purpose |
|-------|---------|
| `client_contacts` | Contact persons per client (SPOC, etc.) |
| `client_facts` | Key-value knowledge store with verification status |
| `brand_assets` | Brand kit, logos, fonts, guidelines |

### Comms Tables
| Table | Purpose |
|-------|---------|
| `conversations` | Normalized threads from Email/Slack/WhatsApp |
| `comms_messages` | Individual messages in threads |

### Work Organization Tables
| Table | Purpose |
|-------|---------|
| `work_streams` | Group related cards over time |
| `card_relations` | Relationships between task cards |

### Integration Tables
| Table | Purpose |
|-------|---------|
| `connector_configs` | OpenClaw and future connector settings |
| `source_references` | Link inferred facts back to source messages |
| `audit_log_events` | All system/agent/user actions logged |
| `idempotency_keys` | Dedup for API calls (24h TTL) |
| `agent_action_queue` | Queue for human-approval mode (future) |

### Agent-Awareness Fields on Tasks/Projects
| Field | Purpose |
|-------|---------|
| `created_by_agent` | Boolean flag for agent-created records |
| `agent_run_id` | Trace back to specific agent execution |
| `source_channel` | whatsapp / email / slack / manual / api |
| `source_message_id` | Unique dedup key from source message |
| `conversation_summary` | AI-generated summary of the conversation |

---

## API Layer (22 endpoints)

All endpoints: `POST https://studio.fynd.design/api/v1/{tool}`
Auth: `Authorization: Bearer <OPENCLAW_API_TOKEN>`
Validation: Zod schemas
All writes: audit-logged, idempotent, agent-flagged

### Task Card Operations
| Endpoint | Purpose |
|----------|---------|
| `/api/v1/create-project` | Create board + columns + tasks + client |
| `/api/v1/create-tasks` | Add tasks to existing board |
| `/api/v1/update-task` | Update any task field |
| `/api/v1/move-task` | Move card between columns |
| `/api/v1/delete-task` | Remove a card |
| `/api/v1/add-comment` | Add comment to card |
| `/api/v1/manage-tags` | Add/remove tags |
| `/api/v1/manage-assignees` | Assign/unassign members |
| `/api/v1/add-link` | Attach URLs |
| `/api/v1/manage-dependencies` | Set blocking relationships |
| `/api/v1/manage-columns` | Add/rename board columns |

### Client Operations
| Endpoint | Purpose |
|----------|---------|
| `/api/v1/upsert-client` | Create or update client |
| `/api/v1/update-client` | Update client fields |
| `/api/v1/add-client-contact` | Add contact person |
| `/api/v1/add-client-facts` | Store brand knowledge |
| `/api/v1/get-client-profile` | Read full profile |
| `/api/v1/search-clients` | Find clients |

### Board/Project Operations
| Endpoint | Purpose |
|----------|---------|
| `/api/v1/search-projects` | Find projects |
| `/api/v1/get-board-context` | Read board state |
| `/api/v1/update-project` | Update project status |

### Other
| Endpoint | Purpose |
|----------|---------|
| `/api/v1/create-work-stream` | Create work stream |
| `/api/v1/list-members` | List team members |

---

## Code Structure

```
fs-command-centre/
├── app/
│   ├── (app)/                    # Authenticated app routes
│   │   ├── tasks/                # Kanban board
│   │   ├── clients/              # Client management
│   │   │   ├── [id]/             # Client profile page
│   │   │   ├── actions.ts        # Client server actions
│   │   │   └── page.tsx          # Client list
│   │   ├── comms/                # Communications
│   │   ├── finance/              # Finance (no API access)
│   │   ├── settings/             # Settings + Connectors
│   │   └── layout.tsx            # App shell (sidebar + topbar)
│   ├── api/
│   │   ├── v1/                   # OpenClaw API (22 endpoints)
│   │   │   ├── create-project/
│   │   │   ├── create-tasks/
│   │   │   ├── update-task/
│   │   │   ├── move-task/
│   │   │   ├── delete-task/
│   │   │   ├── add-comment/
│   │   │   ├── manage-tags/
│   │   │   ├── manage-assignees/
│   │   │   ├── add-link/
│   │   │   ├── manage-dependencies/
│   │   │   ├── manage-columns/
│   │   │   ├── upsert-client/
│   │   │   ├── update-client/
│   │   │   ├── add-client-contact/
│   │   │   ├── add-client-facts/
│   │   │   ├── get-client-profile/
│   │   │   ├── search-clients/
│   │   │   ├── search-projects/
│   │   │   ├── get-board-context/
│   │   │   ├── update-project/
│   │   │   ├── create-work-stream/
│   │   │   └── list-members/
│   │   └── openclaw/             # OpenClaw health + legacy endpoints
│   ├── layout.tsx                # Root layout (Clerk, theme)
│   └── globals.css               # Supabase theme (oklch)
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── layout/                   # Sidebar, topbar
│   └── modules/
│       ├── tasks/kanban/         # All kanban components
│       ├── clients/              # Client list + profile
│       ├── comms/                # Comms shell
│       └── settings/             # Connectors shell
├── lib/
│   ├── api/
│   │   ├── auth.ts               # Bearer token verification
│   │   └── schemas.ts            # Zod schemas for all 22 tools
│   ├── services/
│   │   ├── project-service.ts    # Project/board business logic
│   │   ├── task-service.ts       # Task CRUD + tags/assignees/deps
│   │   └── client-service.ts     # Client CRUD + contacts/facts
│   ├── openclaw/
│   │   └── client.ts             # OpenClaw WebSocket client (protocol v3)
│   ├── supabase/
│   │   └── server.ts             # Supabase service-role client
│   ├── auth/
│   │   └── getCurrentMember.ts   # Clerk→member resolution
│   ├── types/
│   │   ├── tasks.ts              # Task, Column, Tag, Profile types
│   │   ├── comms.ts              # Client, Conversation, Connector types
│   │   ├── members.ts            # Member roles
│   │   └── finance.ts            # Finance types
│   ├── tasks/                    # Filter, subtask, position utilities
│   ├── copy.ts                   # All UI copy/text (quirky tone)
│   └── utils.ts                  # cn() utility
├── supabase/
│   ├── schema.sql                # Base schema
│   └── migrations/               # 003-007 migration files
├── proxy.ts                      # Clerk middleware (public routes for /api/v1)
├── docs/
│   ├── openclaw-tool-contract.md # Full API contract for OpenClaw
│   └── project-overview.md       # This file
└── .agents/skills/               # UI skills (baseline, accessibility, etc.)
```

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server-side) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth |
| `CLERK_SECRET_KEY` | Clerk server key |
| `OPENCLAW_API_URL` | OpenClaw WebSocket gateway URL |
| `OPENCLAW_API_TOKEN` | Bearer token for API auth |

---

## Design Principles

1. **Human in Control** — AI can suggest, prefill, extract — but task creation requires explicit action (via API or UI)
2. **Client First** — everything rolls up to the client relationship
3. **Source Traceability** — every fact, task, or suggestion links back to a source message
4. **Suggest, Don't Overwrite** — inferred facts are marked "inferred" until human accepts
5. **Idempotent API** — same request = same response, no duplicates
6. **Audit Everything** — every write action by user, system, or agent is logged

---

## Product Spec

The full evolution spec is at:
`/Users/sandeepnair/Downloads/fynd-studio-command-centre-evolution-spec.md`

Key positioning: **"We don't just track tasks; we track the evolving work relationship with each client."**

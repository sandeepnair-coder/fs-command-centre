# Fynd Studio Command Centre

Internal operations platform for [Fynd Studio](https://fynd.com) — a design and AI-generated media agency. Replaces scattered tools (Trello, Slack threads, spreadsheets, WhatsApp groups) with a single unified web application.

**Live:** [studio.fynd.design](https://studio.fynd.design)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Runtime | React 19 |
| Language | TypeScript 5 |
| Auth | Clerk |
| Database | Supabase (PostgreSQL) |
| AI Backend | OpenClaw + GPT-5.2 via LiteLLM |
| Styling | Tailwind CSS + shadcn/ui |
| Drag & Drop | @dnd-kit |
| Charts | Recharts |
| Deployment | Vercel |

---

## Modules

### Task Management (`/tasks`)
Full Kanban board for managing creative agency work. Drag-and-drop columns, rich task cards (priority, due dates, cost, assignees, tags, subtasks, comments, attachments, dependencies), 5 view modes (Kanban, List, Calendar, Client View, Stream View), analytics panel, and filter bar.

### Client Management (`/clients`)
CRM-style client profiles with 40+ fields across 7 tabs: Overview, Contacts, Brand & Web, Assets, Intelligence (AI-extracted facts with verification), Activity Log, and Billing & Tax. Bulk operations, quick create, and advanced intake sheet.

### Comms (`/comms`)
Unified inbox for Email, Slack, and WhatsApp conversations. 3-pane layout with thread list, message timeline, and CRM insight panel. AI-powered summaries, sentiment analysis, and inline actions (create task, save fact, set follow-up). *Manager-only.*

### Finance (`/finance`)
Financial tracking with overview KPIs, invoice management (auto-numbered), expense tracking with categories, purchase order management with line items, and project budget vs. spend analysis.

### Command Centre (`/command-centre`)
Manager dashboard with critical items feed, overdue/urgent task alerts, conversations needing reply, potential clients from unlinked conversations, AI opportunities from meeting note analysis, and Ask Astra AI chat panel. *Manager-only.*

### Settings (`/settings`)
Profile management, team members with roles (Owner/Admin/Member/Viewer) and manager flag, OpenClaw connector configuration, and channel integration setup.

---

## Astra — AI Operations Assistant

Astra is a unified AI assistant that operates across Slack, WhatsApp, in-app chat, and email through [OpenClaw](https://openclaw.com).

**What Astra can do:**
- Look up clients, projects, tasks, and team members from any channel
- Query tasks by assignee, manager, priority, status, client, and due date
- Summarize meeting notes from Granola links (JavaScript-rendered pages)
- Understand images shared in Slack
- Take actions on the platform (create tasks, update clients) with human approval

**Architecture:**
```
Slack ──┐
WhatsApp ──┤──→ OpenClaw (AI + channel router) ──→ App API (25 endpoints)
In-app chat ──┤                                          ↕
Email ──┘                                          Supabase (data)
```

25 REST endpoints at `/api/v1/*` are registered as OpenClaw tools: task CRUD, client management, project operations, team lookups, and intelligence queries. All endpoints use Bearer token auth, Zod validation, idempotency keys, and audit logging.

---

## Core Principles

- **Client-first** — Everything rolls up to a client. Tasks require a client.
- **Human in control** — AI suggests, humans approve. All actions require explicit approval.
- **Source traceability** — Every fact, task, or suggestion links back to its source.
- **Manager-only surfaces** — Comms and Command Centre are restricted to managers.

---

## Getting Started

### Prerequisites
- Node.js 22+
- npm
- Supabase project
- Clerk account

### Setup
```bash
npm install
cp .env.example .env.local
# Fill in Supabase + Clerk keys in .env.local
npm run dev
```

### Build
```bash
npm run build
npm run lint
```

---

## Project Structure

```
app/
├── (app)/                    # Authenticated routes (sidebar + topbar)
│   ├── command-centre/       # Manager dashboard
│   ├── tasks/                # Kanban board
│   ├── clients/              # Client CRM
│   ├── comms/                # Unified inbox
│   ├── finance/              # Financial tracking
│   └── settings/             # Profile, members, connectors
├── api/v1/                   # 25 REST endpoints for OpenClaw tools
├── sign-in/, sign-up/        # Clerk auth
└── layout.tsx                # Root layout

components/
├── ui/                       # shadcn/ui primitives
├── layout/                   # Sidebar, topbar
└── modules/                  # Feature components

lib/
├── services/                 # Business logic (task, client, project)
├── api/                      # Auth + Zod schemas
├── supabase/                 # Database client
├── types/                    # TypeScript types
└── utils/                    # Helpers
```

---

## Deployment

- **Production:** Push to `main` auto-deploys to [studio.fynd.design](https://studio.fynd.design) via Vercel
- **Preview:** Push to any branch creates a Vercel preview URL

---

## License

Internal use only. Proprietary to Fynd.com.

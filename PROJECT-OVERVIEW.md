# Fynd Studio Command Centre

**Live URL:** https://studio.fynd.design
**Stack:** Next.js 16 (App Router), Supabase (Postgres + Storage + RLS), Clerk Auth, Tailwind CSS, shadcn/ui, Radix, Recharts
**Supabase Project ID:** `bjudnbrcmayvppbtcjio`
**Deployment:** Vercel (production)

---

## What It Is

A unified command centre for a design studio (Fynd Studio) that brings together task management, client management, team communications, finance tracking, and AI-powered automation into a single web application. It replaces scattered tools (Trello, Slack threads, spreadsheets) with one integrated platform.

---

## Core Modules

### 1. Task Management (`/tasks`)

Full Kanban board system with multiple view modes.

**Features:**
- **Kanban Board** with drag-and-drop columns (Intake/Backlog, Ready, In Progress, Internal Review, Client Review, Revisions, Approved/Done)
- **Multiple Views:** Kanban, List, Calendar, Client View (tasks grouped by client), Stream View (by work stream)
- **Task Cards** with: title, priority (low/medium/high/urgent), due date, assignee(s), client, manager, cost, subtasks, comments, attachments, outputs, links, tags, dependencies
- **Subtasks** stored in Supabase (visible to all team members, not localStorage)
- **Outputs Section** in each task card for uploading deliverables (images, PDFs, design files) - separate from attachments
- **Board Analytics Panel** with:
  - Summary stat cards (Total Tasks, Overdue, In Progress, Completion %, Total Budget, Unassigned, Clients)
  - Tasks by Status (bar chart)
  - Tasks by Priority (donut chart)
  - Deadline Health (donut chart)
  - Budget by Status (bar chart)
  - Average Time in Column (bar chart)
  - Workload by Member (stacked bar: active vs done)
  - Tasks by Client (bar chart)
  - Team Breakdown table (per-member: total, done, active, overdue, completion %)
- **Filter Bar** with search, priority, assignee, due date, client filters - filters apply to both board and analytics
- **Multiple Boards** support with create, rename, delete
- **Mandatory fields** on task creation: Title, Client, Manager
- **Manager field** only shows users marked as managers in Settings

**Key Tables:** `projects`, `project_columns`, `tasks`, `task_assignees`, `task_comments`, `task_attachments`, `task_outputs`, `task_links`, `task_tags`, `subtasks`, `card_relations`

---

### 2. Client Management (`/clients`)

CRM-style client profiles with deep data capture.

**Features:**
- **Client Cards Grid** with circular thumbnail (from latest output or logo), name, industry, email, website, task count, thread count
- **Bulk Selection** with select all/deselect all, bulk delete
- **Quick Create** dialog (name, email, website, industry)
- **Advanced Intake Sheet** with 6 sections: Basic Details (12+ fields), Contacts (repeatable), Brand & Web (social/audience/tone), Assets (file uploads), Intelligence (internal notes), Billing & Tax (GST/PAN/CIN/address)
- **Client Detail Page** with tabbed profile:
  - Overview - company info, work streams
  - Contacts - team members at the client org with roles
  - Brand & Web - social handles, audience, tone, positioning
  - Assets - brand kit, logos, guidelines
  - Outputs - all deliverables uploaded from tasks linked to this client (thumbnail grid)
  - Intelligence - all client facts with verification status
  - Activity Log - audit trail
  - Billing & Tax - financial/tax details
- **Client-first enforcement** - tasks require a client

**Key Tables:** `clients`, `client_contacts`, `client_facts`, `brand_assets`, `work_streams`

---

### 3. Comms (`/comms`) - Manager Only

Unified inbox for Email, Slack, and WhatsApp conversations.

**Features:**
- **3-pane layout:** Thread list (left), Message timeline (center), CRM Insight panel (right)
- **Channel tabs:** All, Email, Slack, WhatsApp
- **Quick filters:** Needs Reply, Approvals, Client Waiting, Follow-up, High Priority, Unlinked
- **Chat-style message bubbles** with color differentiation:
  - Client messages: blue tint, left-aligned
  - Team messages: green tint, right-aligned
- **CRM Insight Panel** showing: Client Snapshot (with health, sentiment, project/task/contact counts), AI Summary, Open Asks, Decisions, Deadlines, Risks, Recommended Actions, Active Projects, Open Tasks, Client Intelligence
- **Inline actions** on messages: Create Task, Save Fact, Add Contact, Mark Approval, Set Follow-up
- **Link/Create Client** from unlinked conversations
- **Visibility:** Only users marked as "Manager" can see Comms in the sidebar

**Channel Integrations:**
- Gmail OAuth with backfill
- Slack OAuth with channel selection
- WhatsApp via Meta Cloud API webhooks
- Sync engine with incremental sync, cursor-based pagination, idempotent persistence
- Auto-linker resolving email/phone/Slack ID to clients

**Key Tables:** `conversations`, `comms_messages`, `channel_connections`, `channel_sources`, `webhook_events`, `sync_jobs`, `sync_cursors`, `conversation_insights`

---

### 4. Finance (`/finance`)

Financial tracking module with sub-pages.

**Sub-pages:** Overview, Invoices, Expenses, Purchase Orders, Projects (financial view)

**Note:** This module has basic UI scaffolding; detailed finance features are in progress.

---

### 5. Settings (`/settings`)

**Sub-pages:**

- **Profile** (`/settings/profile`) - User profile management
- **Members** (`/settings/members`) - Full team management:
  - Invite members by email with role selection
  - Roles: Owner, Admin, Member, Viewer
  - **Manager toggle** - mark any member as a manager (controls Comms visibility and manager dropdown in tasks)
  - Status: Active, Invited, Disabled
  - Role change, status toggle, remove member
  - Owner is always a manager
- **Connectors** (`/settings/connectors`) - OpenClaw AI agent connector with gateway URL display
- **Integrations** (`/settings/integrations`) - Gmail, Slack, WhatsApp channel connections with sync status, backfill config, auto-link toggle
- **Admin** (`/settings/admin`) - Redirects to Members

---

## Authentication & Authorization

- **Auth Provider:** Clerk (OAuth, email/password)
- **Auto-registration:** First Clerk user becomes Owner; subsequent users become Members
- **Member sync:** `lib/auth/getCurrentMember.ts` - checks Clerk ID against `members` table, auto-creates record on first visit
- **Role-based sidebar:** Viewers see only Tasks; Members see Tasks, Finance, Clients; Managers additionally see Comms
- **RLS:** Row Level Security enabled on all tables; policies allow authenticated users full CRUD

---

## AI Integration (OpenClaw)

An AI agent (OpenClaw) connects via WebSocket and can:

- Create tasks from WhatsApp messages
- Search clients and projects
- Manage assignees, tags, dependencies
- Ingest messages into the Comms system
- Extract client facts and contacts

**API Endpoints for OpenClaw:**
- `POST /api/openclaw` - WebSocket upgrade for agent communication
- `POST /api/openclaw/tasks` - Task creation
- `GET /api/openclaw/boards` - Board context
- `POST /api/v1/ingest-message` - Message ingestion
- `POST /api/v1/create-tasks`, `POST /api/v1/upsert-client`, `POST /api/v1/manage-assignees`, etc.

**Gateway URL:** `wss://openclaw.tail030cbd.ts.net`

---

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `members` | Team members with role, status, is_manager, Clerk ID |
| `clients` | Client companies with 40+ fields |
| `client_contacts` | People at client orgs |
| `client_facts` | Key-value intelligence about clients |
| `brand_assets` | Logos, brand kits, guidelines |
| `projects` | Boards / project containers |
| `project_columns` | Kanban columns with position, WIP limits |
| `tasks` | Task cards with priority, due date, cost, client_id, manager_id |
| `task_assignees` | Many-to-many task-member assignments |
| `task_comments` | Comments/activity on tasks |
| `task_attachments` | File uploads on tasks (Supabase Storage) |
| `task_outputs` | Deliverable uploads (separate from attachments) |
| `task_links` | URL links on tasks |
| `task_tags` / `tags` | Tagging system with colors |
| `subtasks` | Checklist items within tasks |
| `card_relations` | Task dependencies |
| `work_streams` | Grouping mechanism for tasks |
| `conversations` | Email/Slack/WhatsApp threads |
| `comms_messages` | Individual messages within conversations |
| `channel_connections` | OAuth connections to Gmail/Slack/WhatsApp |
| `channel_sources` | Specific channels/labels/numbers to sync |
| `webhook_events` | Incoming webhook event log |
| `sync_jobs` | Sync job tracking |
| `connector_configs` | AI connector configuration |
| `audit_log_events` | System-wide audit trail |

---

## Project Structure

```
app/
  (app)/                    # Authenticated app routes
    tasks/                  # Task management page + actions
    clients/                # Client list + detail pages + actions
    clients/[id]/           # Client detail page
    comms/                  # Comms inbox + actions
    finance/                # Finance module
    settings/               # Settings pages (profile, members, connectors, integrations)
  api/
    openclaw/               # AI agent endpoints
    channels/               # OAuth callbacks + webhooks (Gmail, Slack, WhatsApp)
    v1/                     # REST API for external integrations

components/
  layout/                   # AppSidebar, AppTopbar
  modules/
    tasks/kanban/           # KanbanShell, KanbanBoard, KanbanCard, KanbanColumn,
                            # TaskSheet, SubtaskPanel, FilterBar, AnalyticsPanel,
                            # ListView, CalendarView, ClientView, StreamView
    clients/                # ClientsShell, ClientProfile
    comms/                  # CommsShell
    settings/               # ConnectorsShell, IntegrationsShell
  ui/                       # shadcn/ui primitives

lib/
  auth/                     # getCurrentMember.ts
  channels/                 # Gmail, Slack, WhatsApp adapters + sync engine
  tasks/                    # Filter logic, subtask helpers
  types/                    # TypeScript types (tasks.ts, comms.ts, members.ts, channels.ts)
  supabase/                 # Supabase client (server + browser)
  copy.ts                   # UI copy/text with quirky tone
```

---

## Key Technical Decisions

1. **Server Actions** for all data mutations (Next.js `"use server"` functions colocated in `actions.ts` files)
2. **Partial Prerender** on all pages - static shell renders instantly, data streams in
3. **Dynamic imports** for heavy components (ListView, CalendarView, AnalyticsPanel, TaskSheet) to reduce initial bundle
4. **Optimistic UI** on task creation, subtask CRUD, comments
5. **Supabase Storage** for file uploads (task-attachments bucket) with signed URLs (1hr expiry)
6. **Supabase RLS** on all tables with authenticated-user policies
7. **Clerk middleware** protects all routes except API webhooks
8. **All tasks hardcoded to board "Fynd Design Tasks"** (ID: `e36336eb-b641-455f-a942-54770d3fa8be`) when created via API

---

## Environment Variables Required

```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY

# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# OpenClaw
OPENCLAW_API_URL=wss://openclaw.tail030cbd.ts.net
OPENCLAW_API_TOKEN

# Channel Integrations
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
SLACK_CLIENT_ID
SLACK_CLIENT_SECRET
SLACK_SIGNING_SECRET
WHATSAPP_BUSINESS_NUMBER
WHATSAPP_VERIFY_TOKEN

# App
NEXT_PUBLIC_APP_URL
```

---

## Recent Changes (April 2026)

- Subtasks moved from localStorage to Supabase (shared across all users)
- Manager role system (is_manager flag on members, controls Comms visibility + manager dropdown)
- Task Outputs section (separate from attachments, feeds client thumbnails)
- Client card thumbnails from latest output
- Analytics: team workload, client distribution, member breakdown table
- Chat-style message bubbles in Comms with sender color differentiation
- Filter bar moved above analytics, filters apply to analytics data
- Mandatory Manager field on task creation (only shows users with manager role)
- Dark mode card shadow improvements

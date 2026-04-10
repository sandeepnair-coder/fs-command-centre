# Fynd Studio Command Centre - Product Specification

> **Single source of truth.** This document defines the complete product scope, functionality, architecture, and change history. It must be updated with every change pushed to production.

**Last updated:** 2026-04-10
**Latest commit:** a938ceb

---

## 1. Product Overview

Fynd Studio Command Centre is an internal operations platform for **Fynd Studio**, a design and AI-generated media agency. It unifies project management, client relationships, multi-channel communications, financial tracking, and AI-powered intelligence into a single web application.

**Live URL:** https://studio.fynd.design
**Repository:** https://github.com/sandeepnair-coder/fs-command-centre

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15.3+ (App Router, Partial Prerender) |
| Runtime | React 19 |
| Auth | Clerk |
| Database | Supabase (PostgreSQL, service-role, no RLS) |
| AI | OpenClaw gateway (GPT-5.2 via WebSocket + REST) |
| Styling | Tailwind CSS 4 + shadcn/ui + Radix |
| Hosting | Vercel (production) |
| Drag & Drop | @dnd-kit |
| Charts | Recharts |
| Toasts | Sonner |

### Design Principles

- **Client-first architecture** — Client is the master entity. Tasks require a client. No silent client creation.
- **Manager-only surfaces** — Comms and Command Centre require `is_manager` flag.
- **Server pre-fetch** — All pages fetch data server-side with `Promise.all()` + `.catch()` fallbacks.
- **Partial Prerendering** — Static shell renders instantly, data streams in.
- **Quirky tone** — All UI copy is self-aware and funny (see `lib/copy.ts`).
- **No animation unless requested** — UI skills enforce no gratuitous motion.

---

## 2. Authentication & Roles

### Auth Flow
1. Clerk handles sign-in/sign-up at `/sign-in` and `/sign-up`.
2. `getCurrentMember()` in `lib/auth/getCurrentMember.ts` auto-creates a `members` record linked to the Clerk user.
3. First user becomes **Owner** (always a manager). Subsequent users become **Members**.
4. All Supabase queries use the **service role** key (bypasses RLS).

### Roles

| Role | Access |
|------|--------|
| Owner | Everything. First user. Always a manager. |
| Admin | Everything except deleting other admins/owners. |
| Member | Tasks, Finance, Clients. No Comms unless `is_manager`. |
| Viewer | Read-only across all modules. |

### Manager Flag
Separate from role. Any user can be marked as manager. Controls:
- Visibility of **Comms** module
- Visibility of **Command Centre** dashboard
- Appearance in the **Manager** dropdown on task creation

---

## 3. Navigation & Layout

### Sidebar (`components/layout/app-sidebar.tsx`)
- **F logo** — Green (`bg-primary`) brand mark linking to `/tasks`
- **Active link** — Green left border + tinted background + green icon
- **Sidebar border** — Subtle green tint (`border-r-primary/15`)

| Route | Label | Icon | Visibility |
|-------|-------|------|-----------|
| `/command-centre` | Command Centre | LayoutDashboard | Manager only |
| `/tasks` | Task Management | ListChecks | Everyone |
| `/finance` | Finance | DollarSign | Owner, Admin, Member |
| `/comms` | Comms | MessageSquareText | Manager only |
| `/clients` | Clients | Users | Owner, Admin, Member |
| `/settings` | Settings | Settings | Everyone (bottom) |

### Top Bar (`components/layout/app-topbar.tsx`)
- Global search
- Theme switcher (Fynd Green / Purple / Light / Dark)
- Clerk auth button with avatar

### Themes
- **Fynd Green (default)** — Mint/seafoam green primary (`oklch(0.8348 0.1302 160.9080)`)
- **Purple variant** — `data-theme="purple"` on root
- Light and Dark mode supported for both themes

---

## 4. Modules

### 4.1 Command Centre (`/command-centre`)

Manager-only dashboard providing a high-level overview of operations.

**Page:** `app/(app)/command-centre/page.tsx`
**Shell:** `components/modules/command-centre/CommandCentreShell.tsx`
**Actions:** `app/(app)/command-centre/actions.ts`

#### Sections
1. **Metrics Row** — 5 cards linking to source pages: Active Tasks, Overdue (red if >0), Clients (green if >0), Needs Reply (red if >0), Opportunities (green if >0)
2. **Critical Items Feed** — Overdue tasks, urgent tasks, conversations waiting on reply. Sorted by priority then age. Links to `/tasks` or `/comms`.
3. **Potential Clients** — Unlinked conversations (no `client_id`). Links to `/comms`.
4. **AI Opportunities** — From `opportunity_insights` table (Slack meeting note analysis). Links to `/settings/integrations/slack-insights`.
5. **Recent Comms** — Latest conversations with sentiment badges and status tags.
6. **Ask Tessa** — Right sidebar chat panel. Queries Supabase for live data (overdue tasks, urgent tasks, clients, waiting conversations), injects as context, sends to OpenClaw REST endpoint (`POST /tessa/chat`). Session persists per member ID.

#### Server Actions
- `getSnapshotMetrics()` — 8 parallel count queries
- `getCriticalItems()` — Overdue tasks + urgent tasks + waiting conversations, sorted
- `getPotentialClients()` — Conversations where `client_id IS NULL`
- `getOpportunities()` — From `opportunity_insights` where upsell = true
- `getRecentComms()` — Latest 10 non-archived conversations
- `askOpenClaw(question)` — Builds live context snapshot, sends to Tessa REST API

---

### 4.2 Task Management (`/tasks`)

Kanban board with 6 view modes and comprehensive task management.

**Page:** `app/(app)/tasks/page.tsx`
**Shell:** `components/modules/tasks/kanban/KanbanShell.tsx`
**Actions:** `app/(app)/tasks/actions.ts`

#### Views
| View | Component | Loaded |
|------|-----------|--------|
| Kanban | `KanbanBoard.tsx` | Default |
| List | `ListView.tsx` | Dynamic import |
| Calendar | `CalendarView.tsx` | Dynamic import |
| Client | `ClientView.tsx` | Dynamic import |
| Stream | `StreamView.tsx` | Dynamic import |

#### Board Structure
- **Projects** (boards) — Named boards with columns. Default: "Fynd Design Tasks"
- **Columns** — Default: Intake/Backlog, Ready, In Progress, Internal Review, Client Review, Revisions, Approved/Done
- **Tasks** — Cards within columns with drag-and-drop reordering

#### Task Card Features
- Title, description, priority badge (low/medium/high/urgent)
- Client name with thumbnail
- Due date with overdue/due-soon indicators
- Assignee avatars
- Manager name
- Comment count
- Subtask progress bar (emerald >75%, amber 25-75%, red <25%)
- Completion checkbox (emerald when checked)
- Tags with color dots
- Cost field
- Work stream assignment
- Relation count badge

#### Task Detail Sheet (`TaskSheet.tsx`)
Opens as a slide-over panel with:
- Editable title, description (textarea)
- Priority selector
- Due date picker
- Client selector
- Manager selector
- Cost input (INR)
- Assignee management (add/remove)
- Tag management (create/assign)
- Link management (URL + label)
- Dependency management (blocking/blocked by)
- Subtask panel (add/toggle/delete)
- Attachments (upload/delete)
- Outputs (upload/delete with client thumbnail)
- Comments (add/delete, chat-style)
- Activity log (auto-tracked changes)

#### Filter Bar (`FilterBar.tsx`)
- Search by title
- Priority filter (multi-select)
- Assignee filter
- Manager filter
- Due date filter (overdue, today, this week, this month)
- Client filter

#### Analytics Panel (`AnalyticsPanel.tsx`)
- Task distribution by column (bar chart)
- Priority breakdown
- Team workload
- Client distribution
- Completion stats
- Member breakdown table

#### Hardcoded Board Rule
All tasks always go to board **"Fynd Design Tasks"** (ID: `e36336eb-b641-455f-a942-54770d3fa8be`). Enforced at:
1. `lib/services/task-service.ts` — `projectId` hardcoded
2. `app/api/openclaw/tasks/route.ts` — Same hardcoded ID
3. DB trigger `prevent_new_projects` — Blocks INSERT on projects table

---

### 4.3 Finance (`/finance`)

Full financial management with invoices, expenses, purchase orders, and project financials.

**Pages:**
- `/finance` — Overview with KPIs (server pre-fetched)
- `/finance/invoices` — Invoice CRUD
- `/finance/expenses` — Expense CRUD
- `/finance/purchase-orders` — PO CRUD with line items
- `/finance/projects` — Project budget vs. spend analysis

**Actions:** `app/(app)/finance/actions.ts`

#### Overview KPIs
- Total Project Value (from task costs)
- Active Projects count
- Total Spent (expenses)
- Remaining Budget
- Revenue (paid invoices)
- Expenses total
- Net Profit
- Outstanding Receivables
- Outstanding Payables

#### Features
- Vendor management (name, GST, contact, payment terms)
- Purchase orders with auto-numbered PO (PO-YYYYMM-###), line items, auto-approval under 10K
- Expense tracking with categories, payment methods, recurring support
- Invoice management (receivable/payable) with auto-numbered INV
- Project financials: budget vs. spent, margin %, variance analysis
- Recent activity feed (latest POs, expenses, invoices)
- Monthly expense summary by category
- Loading skeletons on all sub-tabs

---

### 4.4 Comms (`/comms`)

CRM-grade client communications hub. Manager-only.

**Page:** `app/(app)/comms/page.tsx`
**Shell:** `components/modules/comms/CommsShell.tsx`
**Actions:** `app/(app)/comms/actions.ts`

#### Layout
3-pane layout:
1. **Left (280px)** — Thread list with channel tabs (All/Email/Slack/WhatsApp), quick filters, search
2. **Center** — Message timeline with chat-style bubbles (outbound = emerald, inbound = default)
3. **Right (280px)** — CRM insight panel

#### Channel Tabs
- All, Email, Slack, WhatsApp

#### Quick Filters
- All, Needs Reply, Approvals, Follow-ups, Unlinked, At Risk

#### Conversation Features
- Status management (open, waiting_on_client, waiting_on_us, approval_pending, resolved, archived)
- Priority levels (low, normal, high, urgent)
- Relationship health tracking (active, at_risk, stale, awaiting_approval, overloaded)
- Sentiment analysis (positive, neutral, concerned, urgent, frustrated)
- AI summary
- Extracted asks, decisions, deadlines (with resolved/unresolved tracking)
- Follow-up reminders
- Client linking / unlinking
- Project linking
- Task creation from conversation
- Message classification (general, task_candidate, decision, approval, blocker, follow_up)

#### CRM Insight Panel
- Client info with industry
- Relationship health indicator
- Conversation insights (asks, deadlines, blockers)
- Linked tasks
- Quick actions (create task, set follow-up, update status)

---

### 4.5 Clients (`/clients`)

Client management with detailed profiles.

**Page:** `app/(app)/clients/page.tsx`
**Shell:** `components/modules/clients/ClientsShell.tsx`
**Actions:** `app/(app)/clients/actions.ts`

#### Client List
- Grid of client cards with name, industry, task count, conversation count
- Per-card checkbox (visible on hover, stays when selected)
- Select all / deselect all toolbar
- Bulk delete with count
- Selected cards get primary border + tinted background
- Add client dialog with Quick + Advanced intake tabs + Billing tab

#### Client Profile (`/clients/[id]`)
Tabbed profile via `ClientProfile.tsx`:

| Tab | Content |
|-----|---------|
| Overview | Company info, contact details, notes |
| Contacts | Client contacts with name, role, email, phone, channel preference |
| Brand & Web | Website, social links, brand guidelines |
| Assets | Brand assets (logos, fonts, decks, briefs) with upload |
| Intelligence | AI-extracted facts with verification (accept/reject) |
| Activity Log | Audit trail of all changes |

#### Client Fields (40+)
Core: name, company_name, display_name, primary_email, website, phone, timezone, industry, business_type, country, state, city, logo_url, notes

Billing: billing_legal_name, billing_name, gst_number, pan, cin, billing_email, billing_phone, billing_address (line1, line2, city, state, postal_code, country), finance_contact (name, email, phone), payment_terms, currency, po_invoice_notes, tax_notes

---

### 4.6 Settings (`/settings`)

#### Profile (`/settings/profile`)
- Edit full name
- Upload/change avatar
- Change avatar color
- Remove avatar

#### Members (`/settings/members`)
Owner/admin only.
- List all members with role, status, manager flag
- Invite member by email
- Change member role
- Toggle active/disabled status
- Toggle manager flag
- Remove member

#### Connectors (`/settings/connectors`)
OpenClaw connector configuration.
- Mode selector (disabled → limited_auto_actions)
- Scope toggles
- Gateway URL display
- Health check status
- Full API registry with all available endpoints

#### Integrations (`/settings/integrations`)
Channel integration setup for Gmail, Slack, WhatsApp.
- Provider config (API credentials)
- OAuth flows (Gmail, Slack)
- Connection management (connect/disconnect/reconnect)
- Source picker (inboxes, channels, groups)
- Sync controls (backfill, incremental)
- Auto-link toggle
- Sync job history
- Webhook event log

#### Slack Insights (`/settings/integrations/slack-insights`)
Admin page for viewing AI-analyzed meeting notes from Slack.
- Table of `opportunity_insights` records
- Status, confidence score, recommended service
- Client relevance and upsell detection

---

## 5. AI Integration (OpenClaw / Tessa)

### OpenClaw Server
- **IP:** 146.190.151.113 (DigitalOcean)
- **Gateway:** `wss://openclaw.tail030cbd.ts.net` (Tailscale funnel)
- **Model:** openai/gpt-5.2
- **Auth:** Token-based (shared between Fynd Studio and OpenClaw)

### WebSocket Client (`lib/openclaw/client.ts`)
Protocol v3 with challenge-response handshake:
1. Connect to WSS URL
2. Receive `connect.challenge` event
3. Send connect request with auth token and role `"admin"`
4. Receive hello-ok response
5. Send method requests, receive responses

Available intelligence methods:
- `summarizeThread()` — Summarize conversation messages
- `extractFacts()` — Extract facts from text
- `classifyMessage()` — Classify message type
- `suggestRelatedCards()` — Suggest task relations
- `generateClientSummary()` — Generate client overview
- `prefillTask()` — Pre-fill task from conversation
- `enrichClient()` — Enrich client data from web

### Tessa (AI Assistant)
- **Slack bot** — Monitors channels for Granola meeting notes, analyzes for opportunities, responds to @Tessa mentions
- **Command Centre chat** — Ask Tessa panel with live data context injection
- **REST endpoint:** `POST /tessa/chat` with `{ message, sessionId }`

### Slack Bot Pipeline (`app/api/slack/events/route.ts`)
1. Receive Slack event via webhook
2. Verify signature (HMAC-SHA256)
3. **Flow 1: @Tessa mention** — Send to OpenClaw `/tessa/chat`, post reply in thread
4. **Flow 2: Granola note detection** — Detect meeting notes via heuristics, persist to `opportunity_insights`, analyze via OpenClaw, post summary in thread

### Meeting Note Detection (`lib/slack/detect-granola.ts`)
Multi-signal approach:
- Known bot IDs (instant match)
- Keyword matching (meeting notes, attendees, next steps, etc.)
- Structural patterns (numbered lists, bullet lists, headers)
- Length filter (skip <150 chars)

---

## 6. Channel Integrations

### Architecture
- **Provider adapters** in `lib/channels/` (Gmail, Slack, WhatsApp)
- **Sync engine** in `lib/channels/sync.ts` (backfill, incremental, webhook)
- **Auto-linker** in `lib/channels/linker.ts` (resolve identities to clients)
- **Credentials** in `lib/channels/credentials.ts`

### Gmail
- OAuth 2.0 flow via Google Cloud Console
- Callback: `/api/channels/google/callback`
- Webhook: `/api/channels/webhooks/gmail` (Pub/Sub push)
- Syncs emails as conversations

### Slack
- OAuth 2.0 flow via Slack API
- Callback: `/api/channels/slack/callback`
- Webhook: `/api/channels/webhooks/slack`
- Syncs channel messages as conversations

### WhatsApp
- Manual configuration (business number)
- Webhook: `/api/channels/webhooks/whatsapp`
- Also receives messages via OpenClaw bridge (`/api/v1/ingest-message`)

---

## 7. API (V1)

All endpoints at `/api/v1/*` require `Authorization: Bearer <OPENCLAW_API_TOKEN>`.

### Task Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/create-tasks` | Batch create tasks with idempotency |
| POST | `/api/v1/update-task` | Update any task field |
| POST | `/api/v1/move-task` | Move task to column |
| POST | `/api/v1/delete-task` | Delete task |
| POST | `/api/v1/add-comment` | Add comment |
| POST | `/api/v1/add-link` | Add URL link |
| POST | `/api/v1/manage-tags` | Add/remove tags |
| POST | `/api/v1/manage-assignees` | Add/remove assignees |
| POST | `/api/v1/manage-dependencies` | Manage blocking relations |
| POST | `/api/v1/manage-columns` | Column CRUD |

### Client Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/upsert-client` | Create or update client |
| POST | `/api/v1/update-client` | Update client fields |
| POST | `/api/v1/add-client-contact` | Add contact |
| POST | `/api/v1/add-client-facts` | Add facts |
| POST | `/api/v1/create-work-stream` | Create work stream |
| GET | `/api/v1/search-clients?q=` | Search by name |
| GET | `/api/v1/get-client-profile?client_id=` | Full CRM bundle |

### Project Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/create-project` | Create board |
| POST | `/api/v1/update-project` | Update board |
| GET | `/api/v1/search-projects?q=` | Search boards |
| GET | `/api/v1/get-board-context?board=` | Full board data |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/ingest-message` | Ingest comms message |
| GET | `/api/v1/list-members` | List active members |

---

## 8. Database Schema

### Core Tables

**members** — id, email, role, status, clerk_id, full_name, avatar_url, is_manager, created_at, updated_at

**clients** — id, name, company_name, display_name, primary_email, website, phone, timezone, industry, business_type, country, state, city, logo_url, notes, + 20 billing/tax fields, created_at, updated_at

**client_contacts** — id, client_id, name, role, email, phone, preferred_channel, notes, verification_status, confidence, created_at, updated_at

**client_facts** — id, client_id, key, value, verification_status, confidence, source_count, last_observed_at, accepted_at, accepted_by_user_id, created_at, updated_at (UNIQUE: client_id + key)

**brand_assets** — id, client_id, type, file_name, storage_url, source_message_id, verification_status, created_at, updated_at

**projects** — id, client_id (nullable), name, status, current_status, due_date, description, created_at

**project_columns** — id, project_id, name, position, wip_limit, description, created_at

**tasks** — id, project_id, column_id, client_id, work_stream_id, title, description, priority, due_date, cost, position, created_by, manager_id, is_completed, completed_at, completed_by, is_milestone, created_from_message_id, created_from_conversation_id, created_at, updated_at

**task_assignees** — id, task_id, user_id, created_at

**task_comments** — id, task_id, author_id, body, created_at

**task_attachments** — id, task_id, storage_path, file_name, created_at

**task_outputs** — id, task_id, storage_path, file_name, created_at

**task_links** — id, task_id, url, label, created_at

**tags** — id, name, color, created_at

**task_tags** — id, task_id, tag_id, created_at

**task_dependencies** — id, blocking_task_id, blocked_task_id, created_by, created_at

**subtasks** — id, task_id, title, completed, position, created_at

**task_activity_log** — id, task_id, actor_id, actor_name, action, old_value, new_value, created_at

### Finance Tables

**vendors** — id, name, gst_number, contact_person, email, phone, address, bank_details (jsonb), payment_terms, notes, created_at, updated_at

**purchase_orders** — id, po_number, vendor_id, project_id, created_by, approved_by, status, subtotal, tax_amount, discount_amount, total_amount, currency, payment_terms, delivery_date, shipping_address, notes, sent_at, approved_at, created_at, updated_at

**po_line_items** — id, po_id, description, quantity, unit_price, tax_percent, discount_percent, line_total, project_id, created_at

**expenses** — id, date, amount, category, sub_category, vendor_payee, payment_method, project_id, description, receipt_url, is_recurring, recurrence_rule, status, approved_by, created_by, created_at, updated_at

**invoices** — id, invoice_number, type, client_vendor_name, project_id, line_items (jsonb), subtotal, tax_amount, total_amount, status, due_date, paid_date, payment_reference, notes, created_at, updated_at

**financial_transactions** — id, date, type, amount, category, reference_type, reference_id, project_id, description, created_at

### Comms Tables

**conversations** — id, channel, external_thread_id, client_id, project_id, subject, preview_text, last_message_at, participants, is_resolved, status, priority, follow_up_at, follow_up_owner, relationship_health, waiting_on, extracted_asks (jsonb), extracted_decisions (jsonb), extracted_deadlines (jsonb), ai_summary, sentiment, channel_connection_id, channel_source_id, message_count, unread_count, created_at, updated_at

**comms_messages** — id, conversation_id, channel, client_id, project_id, sender_display_name, sender_identifier, body_text, body_html, classification, has_attachments, is_from_client, direction, source_url, extracted_entities (jsonb), linked_task_ids, linked_fact_ids, external_message_id, in_reply_to, raw_payload (jsonb), sent_at, received_at, created_at

**follow_up_reminders** — id, conversation_id, client_id, task_id, reminder_at, note, status, owner_id, created_at

**conversation_task_links** — id, conversation_id, task_id, message_id, created_at

**conversation_insights** — id, conversation_id, insight_type, content, due_date, is_resolved, confidence, source_message_id, linked_task_id, linked_client_id, metadata (jsonb), created_at, updated_at

### Intelligence Tables

**work_streams** — id, client_id, name, project_id, summary, created_at, updated_at

**card_relations** — id, from_card_id, to_card_id, relation_type, origin, confidence, confirmed_by_user_id, created_at

**connector_configs** — id, connector_key, mode, enabled, allowed_board_ids, allowed_client_ids, scopes, created_at, updated_at

**source_references** — id, entity_type, entity_id, message_id, conversation_id, file_id, excerpt, created_at

**audit_log_events** — id, actor_type, actor_id, event_type, entity_type, entity_id, metadata_json, created_at

**opportunity_insights** — id, source_type, source_message_id, channel_id, channel_name, note_text, summary, is_client_related, upsell_opportunity, recommended_service, confidence_score, rationale, raw_analysis (jsonb), status, created_at

### Channel Integration Tables

**channel_provider_configs** — id, provider, config_encrypted (jsonb), is_configured, configured_by, created_at, updated_at

**channel_connections** — id, provider, display_name, status, credentials_encrypted (jsonb), token_expires_at, refresh_token_encrypted, provider_account_id, provider_metadata (jsonb), backfill_days, auto_link_enabled, last_sync_at, last_sync_status, last_error, sync_health, messages_synced_count, conversations_synced_count, connected_by, created_at, updated_at

**channel_sources** — id, channel_connection_id, source_type, external_id, name, is_enabled, client_id, metadata (jsonb), created_at, updated_at

**external_identities** — id, provider, identifier, identifier_type, display_name, avatar_url, client_id, client_contact_id, is_team_member, member_id, confidence, resolved_at, resolved_by, metadata (jsonb), created_at, updated_at

**sync_jobs** — id, channel_connection_id, job_type, status, started_at, completed_at, messages_processed, conversations_processed, errors_count, last_error, metadata (jsonb), created_at

**sync_cursors** — id, channel_connection_id, cursor_type, cursor_value, updated_at

**webhook_events** — id, provider, event_type, payload (jsonb), channel_connection_id, processing_status, error, external_event_id, processed_at, created_at

### Database Functions
- `generate_po_number()` — Auto PO number (PO-YYYYMM-###)
- `generate_invoice_number()` — Auto invoice number (INV-YYYYMM-###)
- `move_task(task_id, new_column_id, new_position)` — Atomic task move
- `swap_column_positions(col_a, pos_a, col_b, pos_b)` — Swap columns
- `handle_new_user()` — Trigger: auto-create profile on signup
- `prevent_new_projects` — Trigger: blocks new board creation (only "Fynd Design Tasks" allowed)

---

## 9. File Structure

```
app/
  (app)/
    command-centre/    page.tsx, actions.ts
    tasks/             page.tsx, actions.ts
    finance/           page.tsx, actions.ts, _overview-client.tsx
      invoices/        page.tsx, _client.tsx
      expenses/        page.tsx, _client.tsx
      purchase-orders/ page.tsx, _client.tsx
      projects/        page.tsx, _client.tsx
    comms/             page.tsx, actions.ts
    clients/           page.tsx, actions.ts
      [id]/            page.tsx
    settings/
      page.tsx
      profile/         page.tsx, actions.ts
      members/         page.tsx, actions.ts
      connectors/      page.tsx
      integrations/    page.tsx, actions.ts
        slack-insights/ page.tsx, actions.ts
    layout.tsx, loading.tsx
  api/
    v1/               22 endpoint route files
    openclaw/          tasks/route.ts, boards/route.ts
    slack/events/      route.ts
    channels/
      google/callback/ route.ts
      slack/callback/  route.ts
      sync/            route.ts
      webhooks/        gmail/, slack/, whatsapp/
    clients/enrich/    route.ts

components/
  layout/             app-sidebar.tsx, app-topbar.tsx
  modules/
    command-centre/   CommandCentreShell.tsx
    tasks/kanban/     KanbanShell, Board, Column, Card, TaskSheet,
                      ListView, CalendarView, ClientView, StreamView,
                      AnalyticsPanel, FilterBar, SubtaskPanel, TagPicker,
                      DependencyPicker, BoardQuote, new-project-dialog
    comms/            CommsShell.tsx
    clients/          ClientsShell.tsx, ClientProfile.tsx
    settings/         ConnectorsShell.tsx, IntegrationsShell.tsx
  ui/                 24 shadcn primitives (badge with "success" variant)

lib/
  auth/               getCurrentMember.ts
  supabase/           server.ts
  openclaw/           client.ts, analyze-slack-note.ts
  channels/           index.ts, types.ts, gmail.ts, slack.ts, whatsapp.ts,
                      sync.ts, linker.ts, credentials.ts
  slack/              detect-granola.ts
  services/           task-service.ts, client-service.ts, project-service.ts
  api/                auth.ts, schemas.ts
  types/              tasks.ts, comms.ts, members.ts, finance.ts
  tasks/              filters.ts, subtasks.ts, position.ts
  utils/              avatar.ts, format.ts
  copy.ts, utils.ts

supabase/
  migrations/         002-009 (7 migration files)
  schema.sql          Base schema
```

---

## 10. Environment Variables

### Required
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/tasks
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/tasks
OPENCLAW_API_URL=wss://openclaw.tail030cbd.ts.net
OPENCLAW_API_TOKEN
```

### Optional (Channel Integrations)
```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
SLACK_CLIENT_ID
SLACK_CLIENT_SECRET
SLACK_SIGNING_SECRET
SLACK_BOT_TOKEN
SLACK_ALLOWED_CHANNEL_IDS
WHATSAPP_BUSINESS_NUMBER
WHATSAPP_VERIFY_TOKEN
NEXT_PUBLIC_APP_URL
```

---

## 11. Deployment

- **Platform:** Vercel
- **Domain:** studio.fynd.design
- **Deploy command:** `cd fs-command-centre && vercel --prod --yes`
- **Git remote:** https://github.com/sandeepnair-coder/fs-command-centre
- **Branch:** main
- All env vars set in Vercel project settings

---

## 12. Change Log

| Date | Commit | Change |
|------|--------|--------|
| 2026-04-10 | a938ceb | Ask Tessa injects live Fynd Studio data (overdue tasks, clients, etc.) as context |
| 2026-04-10 | 9006849 | Tessa uses REST `/tessa/chat` endpoint; OpenClaw role changed to admin |
| 2026-04-10 | 56e29e0 | Green primary color across product: F logo, active nav, page icons, Done column, Badge success variant |
| 2026-04-10 | d881e77 | Command Centre manager dashboard: metrics, critical items, potential clients, AI opportunities, comms, Ask Tessa |
| 2026-04-10 | 26cb537 | Debug: temporarily bypass Slack signature check |
| 2026-04-09 | d4ccc5c | Tessa responds to @mentions conversationally in Slack via OpenClaw |
| 2026-04-09 | 121b04e | Tessa replies in Slack threads with analysis summary blocks |
| 2026-04-09 | 1cff3aa | Allow Granola bot messages, extract text from attachments/blocks |
| 2026-04-09 | 0e06c78 | Debug logging for Slack events endpoint |
| 2026-04-09 | 7ce3f59 | Handle Slack URL verification challenge before signature check |
| 2026-04-08 | ac82702 | Purple theme variant alongside Light/Dark modes |
| 2026-04-08 | 45c4147 | Slack -> OpenClaw meeting note analysis pipeline |
| 2026-04-08 | 17f64bd | Stronger card shadow in dark mode |
| 2026-04-08 | 5960c1e | Lighter client initial circle with border |
| 2026-04-07 | 926973a | Manager dropdown only shows manager-flagged users |
| 2026-04-07 | 78d6b2f | Mandatory Manager field on task creation |
| 2026-04-07 | bef42e4 | Refresh profiles on Add Task dialog open |
| 2026-04-07 | dc94f75 | Outputs section on task cards and client thumbnails |
| 2026-04-07 | 1b1a0da | Chat-style message bubbles in Comms |
| 2026-04-07 | 798c7a1 | Manager flag — Comms visible only to managers |
| 2026-04-06 | dea8927 | Analytics: team workload, client distribution, member breakdown |
| 2026-04-06 | 9b85298 | Persist subtasks in Supabase |
| 2026-04-05 | 780e395 | Rebuild channel integrations for clean message sync |
| 2026-04-05 | 59175db | Channel integrations: Gmail, Slack, WhatsApp setup flow |
| 2026-04-04 | 22b1c27 | Redesigned Add Client with Quick + Advanced intake |
| 2026-04-04 | a50aa69 | Wire up all Comms action buttons |
| 2026-04-03 | d3a2e25 | Upgrade Comms to CRM-grade client relationship hub |
| 2026-04-03 | 3e535da | Enforce strict client-first logic end-to-end |
| 2026-04-02 | 54cc7f6 | Full OpenClaw API — every task card field + client data access |
| 2026-04-02 | 550cdb9 | Production-grade OpenClaw agent integration architecture |

---

*This spec must be updated after every production push. See CLAUDE.md for the standing rule.*

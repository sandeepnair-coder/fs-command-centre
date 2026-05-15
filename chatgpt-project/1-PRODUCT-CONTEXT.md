# Fynd Studio Command Centre - Product Context

## What Is This Product?

Fynd Studio Command Centre is an **internal operations platform** for **Fynd Studio**, a design and AI-generated media agency based in India. It replaces scattered tools (Trello, Slack threads, spreadsheets, WhatsApp groups) with a single unified web application.

**Live URL:** https://studio.fynd.design
**Repository:** https://github.com/sandeepnair-coder/fs-command-centre

The product is built for use within **Fynd.com** (a large company with ~1000 employees on Slack). Fynd Studio is one of Fynd's products — an **automated full-stack content engine** (generate, publish, run ads end-to-end on all platforms). The Command Centre manages the full lifecycle of client work and uses AI to identify upsell opportunities for Fynd Studio across the company's Slack channels, WhatsApp conversations, and email.

---

## Core Philosophy

1. **Client-first architecture** - The client is the master entity. Everything (tasks, conversations, facts, finances) rolls up to a client. Tasks require a client.
2. **Human in control** - AI can suggest, prefill, extract, and summarize. But all actions require explicit human approval.
3. **Source traceability** - Every fact, task, or suggestion links back to its source (message, conversation, manual entry).
4. **Manager-only surfaces** - Sensitive modules (Comms, Command Centre) are only visible to users flagged as managers.
5. **Quirky, human tone** - All UI copy is self-aware, warm, and concise. Never corporate. (See UX Writing Guide for details.)

---

## Modules

### 1. Task Management (`/tasks`)

The core execution layer. A full Kanban board system for managing design agency work.

**What it does:**
- Multiple boards (projects), each with customizable columns
- Default columns follow a creative agency workflow: Intake/Backlog > Ready > In Progress > Internal Review > Client Review > Revisions > Approved/Done
- Rich task cards with: title, description, priority (low/medium/high/urgent), due date, cost (INR), client, manager, assignees, tags, subtasks, comments, attachments, outputs, links, dependencies
- 5 view modes: Kanban (default), List, Calendar, Client View (grouped by client), Stream View (grouped by work stream)
- Filter bar: search, priority, assignee, manager, due date, client
- Analytics panel with charts: tasks by status, priority breakdown, team workload, client distribution, completion stats, member breakdown table
- Drag-and-drop between columns with fractional positioning
- Task detail slide-over panel with all fields, subtask management, file uploads, comments, activity log
- Deadline indicators: overdue (red), due soon (amber), due this week (yellow)
- Completion toggle with subtask progress bar
- Mandatory fields on task creation: Title, Client, Manager

**Current constraint:** All tasks go to a single hardcoded board "Fynd Design Tasks". Multiple boards exist in the UI but are functionally restricted by a database trigger.

---

### 2. Client Management (`/clients`)

CRM-style client profiles with deep data capture.

**What it does:**
- Client list page with grid cards showing: name, industry, email, website, task count, thread count
- Bulk selection with select all/deselect, bulk delete
- Quick create dialog + Advanced intake sheet with 6 sections
- Client detail page with tabbed profile:
  - **Overview** - Company info, work streams, contact details
  - **Contacts** - Team members at the client org with roles, verification status
  - **Brand & Web** - Social handles, audience, tone, positioning
  - **Assets** - Brand kit, logos, guidelines (file uploads)
  - **Intelligence** - AI-extracted facts with verification (accept/reject), confidence scores
  - **Activity Log** - Audit trail
  - **Billing & Tax** - GST, PAN, CIN, billing address, payment terms
- 40+ client fields covering: core info, contacts, brand, assets, intelligence, billing

---

### 3. Comms (`/comms`) - Manager Only

Unified inbox for Email, Slack, and WhatsApp conversations.

**What it does:**
- 3-pane layout: Thread list (left), Message timeline (center), CRM Insight panel (right)
- Channel tabs: All, Email, Slack, WhatsApp
- Quick filters: Needs Reply, Approvals, Follow-ups, Unlinked, At Risk
- Chat-style message bubbles (client = blue/left, team = green/right)
- CRM Insight Panel: client snapshot, AI summary, open asks, decisions, deadlines, risks, recommended actions, active projects, open tasks
- Inline actions on messages: Create Task, Save Fact, Add Contact, Mark Approval, Set Follow-up
- Client linking/unlinking for conversations
- Conversation status management (open, waiting on client, waiting on us, resolved, archived)
- Relationship health tracking (active, at risk, stale)
- Sentiment analysis (positive, neutral, concerned, urgent, frustrated)

**Current state:** UI is built but the backend channel integrations (Gmail, Slack, WhatsApp sync) are broken and being reworked. Currently uses placeholder/demo data.

---

### 4. Finance (`/finance`)

Financial tracking for the design agency.

**What it does:**
- Overview page with KPIs: Total Project Value, Active Projects, Total Spent, Remaining Budget, Revenue, Expenses, Net Profit, Outstanding Receivables/Payables
- Sub-pages:
  - **Invoices** - Receivable/payable invoice management, auto-numbered (INV-YYYYMM-###)
  - **Expenses** - Expense tracking with categories, payment methods, recurring support
  - **Purchase Orders** - PO management with line items, auto-numbered (PO-YYYYMM-###), auto-approval under 10K
  - **Projects** - Budget vs. spent analysis, margin %, variance
- Vendor management (name, GST, contact, payment terms)
- Recent activity feed
- Monthly expense summary by category

---

### 5. Command Centre (`/command-centre`) - Manager Only

High-level operations dashboard.

**What it does:**
- Metrics row: Active Tasks, Overdue, Clients, Needs Reply, Opportunities
- Critical items feed: overdue tasks, urgent tasks, conversations needing reply
- Potential clients: unlinked conversations
- AI opportunities: from Slack meeting note analysis
- Recent comms: latest conversations with sentiment
- Ask Astra: AI chat panel with live data context injection (was previously called "Ask Tessa" in old code)

---

### 6. Settings (`/settings`)

**Sub-pages:**
- **Profile** - Edit name, avatar, avatar color
- **Members** - Invite, roles (Owner/Admin/Member/Viewer), manager flag toggle, active/disabled status
- **Connectors** - OpenClaw connector configuration (mode, scope, health check)
- **Integrations** - Channel setup for Gmail, Slack, WhatsApp (OAuth flows, credentials, sync controls)
- **Slack Insights** - AI-analyzed meeting notes from Slack

---

## AI Layer — Astra (Unified AI Assistant)

> **Name change:** The AI assistant was previously called "Tessa" in the codebase. It has been rebranded to **Astra**. Old code references to Tessa are legacy and will be cleaned up.

Astra is a **unified AI assistant** that lives across all communication channels and acts as an intelligent Jarvis-type system for the team.

### What Astra Is
- A single AI personality that operates across **Slack, WhatsApp, in-app chat, and eventually email**
- Has **full context** of the platform (tasks, clients, projects, boards, conversations)
- Can **take actions** — create tasks/tickets, update projects, search clients, add comments — from any channel
- **Shares context across channels** — ask on WhatsApp, it knows what happened on Slack
- Monitors conversations for **potential leads and upsell opportunities** for Fynd Studio
- Detects **Granola meeting notes** in Slack channels, analyzes them for client relevance and upsell opportunities, and surfaces them in the Command Centre

### Identity
- **Slack app name:** Fynd Studio Astra
- **Bot display name:** Astra
- **Default username:** astra
- Astra is the current assistant name. Tessa is legacy only (old code references being cleaned up).

### Architecture

```
Slack ──┐
WhatsApp ──┤──→ OpenClaw (AI brain + channel router) ──→ App API (25 endpoints)
In-app chat ──┤                                              ↕
Email ──┘                                              Supabase (data)
                                                           ↕
                                                    Comms UI (read view)
```

- **OpenClaw** = connects to all channels natively, processes messages with AI, calls the app's API as tools
- **25 API endpoints** (`/api/v1/*`) = the actions OpenClaw can take (create tasks, update clients, search projects, etc.)
- **Comms** = the dashboard showing all conversations flowing through OpenClaw across all channels
- **In-app chat** = just another OpenClaw channel (WebChat)

### Why OpenClaw Handles Everything
OpenClaw has **built-in native support** for Slack (Bolt SDK), WhatsApp (Baileys), WebChat, and many other channels. It handles session management, context sharing, threading, and tool execution. Building this ourselves would be reinventing what OpenClaw already does.

### AI Capabilities
- Thread summarization
- Fact extraction from messages
- Message classification (general, task candidate, decision, approval, blocker, follow-up)
- Task relation suggestions
- Client summary generation
- Task pre-filling from conversation context
- Client data enrichment
- Lead detection and upsell opportunity scoring
- Meeting note analysis (Granola detection)

### Current AI Model
GPT-5.2 via LiteLLM proxy (`llm-gateway.tools.fynd.engineering`)

---

## API Layer

25 REST endpoints at `/api/v1/*` that OpenClaw calls as tools to manage the platform:
- Task operations: create, update, move, delete, add comment, manage tags/assignees/dependencies/links/columns
- Client operations: upsert, update, add contacts, add facts, get profile, search
- Project operations: create, update, search, get board context
- Other: ingest message, list members, create work stream

All endpoints use Bearer token auth, Zod validation, idempotency keys, and audit logging.

---

## Authentication & Roles

- **Clerk** handles sign-in/sign-up
- Auto-creates a `members` record linked to Clerk user
- First user becomes Owner (always a manager)

| Role | Access |
|------|--------|
| Owner | Everything. First user. Always a manager. |
| Admin | Everything except deleting other admins/owners. |
| Member | Tasks, Finance, Clients. No Comms unless is_manager. |
| Viewer | Read-only across all modules. |

**Manager flag** is separate from role. Controls visibility of Comms and Command Centre.

---

## Target Users

- Internal team within Fynd.com (~1000 employees on Slack)
- Fynd Studio team: designers, project managers, account managers
- Primary workflow: receive client brief > break into tasks > execute > review > deliver
- Communication happens across WhatsApp (Indian market), Slack (internal), and Email (formal/clients)
- Astra bot is added to specific Slack channels across the company to monitor for Fynd Studio upsell opportunities

---

## Key Positioning

"We don't just track tasks; we track the evolving work relationship with each client."

---

## Decisions Log

| Date | Decision | Why |
|------|----------|-----|
| 2026-05-12 | AI assistant rebranded from Tessa to Astra | Fresh start with new Slack app (Fynd Studio Astra), old Tessa app abandoned |
| 2026-05-11 | Rework Comms integrations from scratch on `comms-rework` branch | Previous integration code was vibe-coded, unreliable, and Comms is broken in production |
| 2026-05-11 | OpenClaw handles ALL channels natively (Slack, WhatsApp, WebChat, Email) | OpenClaw has built-in support for all these channels + session management + tool execution. Building custom handlers would be reinventing OpenClaw. |
| 2026-05-11 | Astra is a unified cross-platform AI assistant, not just a Slack bot | Astra needs shared context across Slack, WhatsApp, in-app chat, and email. OpenClaw's session system handles this natively. |
| 2026-05-11 | OpenClaw moved from DigitalOcean to GCP VM (FyndClaw) | New setup with SSH tunnel access, managed by team |
| 2026-04-03 | Client-first enforcement end-to-end | Every entity must link to a client - prevents orphaned work |
| 2026-04-02 | Single hardcoded board "Fynd Design Tasks" | Simplify initial launch - multiple boards caused confusion |

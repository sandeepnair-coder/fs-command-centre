# Fynd Studio Command Centre - Technical Setup & Engineering Reference

> **Engineering reference document.** Contains everything a developer needs to understand the full technical setup, architecture, and conventions. Update when adding new integrations, changing the tech stack, or modifying infrastructure.

**Last updated:** 2026-05-15

---

## Tech Stack

| Layer | Technology | Version/Details |
|-------|-----------|----------------|
| Framework | Next.js | 16+ (App Router, Partial Prerender, Turbopack) |
| Runtime | React | 19 |
| Language | TypeScript | 5 |
| Auth | Clerk | @clerk/nextjs ^7.0.7 |
| Database | Supabase | PostgreSQL, service-role key (no RLS), @supabase/ssr |
| AI Backend | OpenClaw/FyndClaw | WebSocket gateway, protocol v3, GPT-5.2 via LiteLLM |
| Styling | Tailwind CSS | 3.4 + tailwindcss-animate |
| UI Components | shadcn/ui | new-york style + Radix primitives |
| Theming | next-themes | Dark/light/system via class attribute + custom color themes via data-theme |
| Drag & Drop | @dnd-kit | core + sortable + utilities |
| Charts | Recharts | 3.8 |
| Toasts | Sonner | 2.0 |
| Validation | Zod | 4.3 |
| Form UI | cmdk | 1.1 (command palette) |
| Fonts | Geist Sans | Via Google Fonts |
| Deployment | Vercel | Production at studio.fynd.design |
| Package Manager | npm | lockfile: package-lock.json |

---

## Project Structure

```
fs-command-centre/
├── app/
│   ├── (app)/                      # Authenticated routes (layout with sidebar + topbar)
│   │   ├── command-centre/         # Manager dashboard
│   │   ├── tasks/                  # Kanban board + task management
│   │   ├── clients/                # Client list + profiles
│   │   │   └── [id]/              # Client detail page
│   │   ├── comms/                  # Communications hub (manager only)
│   │   ├── finance/                # Financial tracking
│   │   │   ├── invoices/
│   │   │   ├── expenses/
│   │   │   ├── purchase-orders/
│   │   │   └── projects/
│   │   ├── settings/
│   │   │   ├── profile/
│   │   │   ├── members/
│   │   │   ├── connectors/
│   │   │   ├── integrations/
│   │   │   │   └── slack-insights/
│   │   │   └── admin/
│   │   ├── mail/                   # Placeholder (unused)
│   │   └── layout.tsx              # App shell (sidebar + topbar)
│   ├── api/
│   │   ├── v1/                     # 25 REST endpoints for OpenClaw tools
│   │   ├── openclaw/               # OpenClaw health + legacy
│   │   ├── slack/events/           # Slack Events API handler
│   │   ├── channels/               # OAuth callbacks + webhooks
│   │   │   ├── google/callback/
│   │   │   ├── slack/callback/
│   │   │   ├── sync/
│   │   │   └── webhooks/          # gmail, slack, whatsapp
│   │   ├── clients/enrich/
│   │   └── comms/whatsapp/reply/
│   ├── sign-in/                    # Clerk sign-in
│   ├── sign-up/                    # Clerk sign-up
│   ├── layout.tsx                  # Root layout (Clerk provider, theme)
│   ├── page.tsx                    # Landing/redirect
│   └── globals.css                 # CSS variables, theme definitions
├── components/
│   ├── ui/                         # shadcn/ui primitives (NEVER edit manually)
│   ├── layout/                     # app-sidebar.tsx, app-topbar.tsx
│   └── modules/
│       ├── tasks/kanban/           # All Kanban components
│       ├── clients/                # ClientsShell, ClientProfile
│       ├── comms/                  # CommsShell
│       ├── command-centre/         # CommandCentreShell
│       └── settings/              # ConnectorsShell, IntegrationsShell
├── lib/
│   ├── auth/                       # getCurrentMember.ts
│   ├── supabase/                   # server.ts (service-role client)
│   ├── openclaw/                   # client.ts (WebSocket), analyze-slack-note.ts
│   ├── channels/                   # gmail.ts, slack.ts, whatsapp.ts, sync.ts, credentials.ts, types.ts
│   ├── slack/                      # detect-granola.ts
│   ├── services/                   # task-service.ts, client-service.ts, project-service.ts
│   ├── api/                        # auth.ts (Bearer token), schemas.ts (Zod)
│   ├── types/                      # tasks.ts, comms.ts, members.ts, finance.ts
│   ├── tasks/                      # filters.ts, subtasks.ts, position.ts
│   ├── utils/                      # avatar.ts, format.ts
│   ├── copy.ts                     # All UI copy (quirky tone)
│   └── utils.ts                    # cn() utility
├── supabase/
│   ├── schema.sql                  # Base schema
│   ├── migrations/                 # 002-009 migration files
│   └── SETUP.md
├── proxy.ts                        # Clerk middleware (public routes for /api/v1)
├── docs/                           # Architecture, phase docs, contracts
├── chatgpt-project/                # ChatGPT project resource docs
└── Configuration files
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── eslint.config.mjs
    ├── postcss.config.mjs
    ├── components.json             # shadcn/ui config
    └── vercel.json
```

---

## Environment Variables

### Currently in .env.local (working)

```
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<clerk-key>
CLERK_SECRET_KEY=<clerk-secret>
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/tasks
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/tasks
```

### Needed (not yet configured)

```
# OpenClaw / FyndClaw
OPENCLAW_API_URL=http://localhost:8080          # Local dev (via SSH tunnel)
OPENCLAW_API_TOKEN=<gateway-token>              # From fyndclaw-ssh.sh output

# App URL (for OAuth callbacks if needed)
NEXT_PUBLIC_APP_URL=https://studio.fynd.design
```

**Important:** Since OpenClaw handles all channels natively, Slack/WhatsApp/Gmail credentials go into **OpenClaw's `openclaw.json` config** on the GCP VM — NOT into `.env.local`. The app only needs `OPENCLAW_API_URL` and `OPENCLAW_API_TOKEN` to communicate with OpenClaw. The old `SLACK_SIGNING_SECRET`, `SLACK_BOT_TOKEN`, `SLACK_ALLOWED_CHANNEL_IDS` env vars are no longer needed.

---

## Database

### Supabase Project

- **Project ID:** bjudnbrcmayvppbtcjio
- **Auth mode:** Service role key (bypasses RLS)
- **Storage bucket:** `task-attachments` for file uploads

### Key Tables (50+ tables total)

**Core:**
- `members` - Team members (synced from Clerk)
- `clients` - Client entities (40+ fields)
- `projects` - Boards/projects
- `project_columns` - Kanban columns per board
- `tasks` - Task cards (all fields)
- `task_assignees`, `task_comments`, `task_attachments`, `task_outputs`, `task_links`, `task_tags`, `task_dependencies`, `subtasks`, `task_activity_log`
- `tags` - Workspace-level tag definitions

**Client Intelligence:**
- `client_contacts` - Contact persons per client
- `client_facts` - Key-value knowledge store with verification
- `brand_assets` - Brand kit uploads
- `work_streams` - Grouping entity for related work

**Finance:**
- `vendors`, `purchase_orders`, `po_line_items`, `expenses`, `invoices`, `financial_transactions`

**Comms:**
- `conversations` - Normalized threads from all channels
- `comms_messages` - Individual messages
- `conversation_insights` - AI-extracted insights per conversation
- `conversation_task_links` - Links between conversations and tasks
- `follow_up_reminders` - Follow-up tracking

**Channel Integration:**
- `channel_provider_configs` - OAuth credentials (encrypted)
- `channel_connections` - Active connections per provider
- `channel_sources` - Enabled inboxes/channels/groups
- `external_identities` - Identity resolution (email/phone/slack > client)
- `sync_jobs` - Sync job history
- `sync_cursors` - Cursor-based pagination state
- `webhook_events` - Incoming webhook event log

**Intelligence:**
- `connector_configs` - OpenClaw connector settings
- `opportunity_insights` - AI-analyzed meeting notes
- `audit_log_events` - Full audit trail
- `idempotency_keys` - Dedup for API calls (24h TTL)
- `card_relations` - Task-to-task relationships
- `source_references` - Source message links

### Database Functions
- `move_task(task_id, column_id, position)` - Atomic task move
- `swap_column_positions(col_a, pos_a, col_b, pos_b)` - Atomic column swap
- `generate_po_number()` - Auto PO number (PO-YYYYMM-###)
- `generate_invoice_number()` - Auto invoice number (INV-YYYYMM-###)
- `handle_new_user()` - Trigger: auto-create profile on signup
- `prevent_new_projects` - Trigger: blocks new board creation

---

## OpenClaw / FyndClaw Setup

### What It Is
An AI gateway server running in Docker on a Google Cloud VM. It connects to AI models and can natively handle messaging channels (Slack, WhatsApp, Telegram, etc.).

### Access
- **VM:** `tenant-env-615c242d-sohailhatim` on GCP (`asia-south1-a`)
- **Project:** `fynd-engineering-playground`
- **No public IP** - access via GCP IAP SSH tunnel only
- **Local tunnel:** `localhost:8080` > VM port 8080

### How to connect
```bash
# Run the setup script
./fyndclaw-ssh.sh
# Enter URL when prompted, or press Enter for auto-detect

# Or manually start the tunnel:
gcloud compute ssh tenant-env-615c242d-sohailhatim \
  --zone=asia-south1-a \
  --project=fynd-engineering-playground \
  --tunnel-through-iap \
  -- -L 8080:localhost:8080 -N -f
```

### Common operations
```bash
# SSH prefix for all commands:
SSH="gcloud compute ssh tenant-env-615c242d-sohailhatim --zone=asia-south1-a --project=fynd-engineering-playground --tunnel-through-iap"

# Check container status
$SSH --command="sudo docker ps"

# View logs
$SSH --command="sudo docker compose -f /data/openclaw/compose.yml logs --tail=50"

# Restart
$SSH --command="cd /data/openclaw && sudo docker compose restart"

# Read config
$SSH --command="sudo cat /data/openclaw/config/openclaw.json"

# Read docs
$SSH --command="sudo docker exec openclaw-openclaw-gateway-1 cat /app/docs/<path>"
```

### Current Config
```json
{
  "gateway": {
    "mode": "local",
    "bind": "lan",
    "auth": { "mode": "token" }
  },
  "agents": {
    "defaults": {
      "model": { "primary": "litellm/gpt-5.2" },
      "compaction": { "mode": "safeguard", "reserveTokens": 40000 }
    }
  },
  "models": {
    "providers": {
      "litellm": {
        "baseUrl": "https://llm-gateway.tools.fynd.engineering",
        "apiKey": "${LITELLM_API_KEY}",
        "api": "openai-completions",
        "models": [{ "id": "gpt-5.2", "name": "gpt-5.2", "contextWindow": 1000000 }]
      }
    }
  }
}
```

**Slack channel configured and verified (as of 2026-05-13).** OpenClaw config includes:

- `channels.slack.enabled`: true
- `channels.slack.mode`: socket (Socket Mode)
- `channels.slack.appToken`: configured on VM (xapp token, never print)
- `channels.slack.botToken`: configured on VM (xoxb token, never print)
- `channels.slack.groupPolicy`: allowlist
- `channels.slack.channels.astra-test.requireMention`: true

OpenClaw has been **restarted after Slack config and persona changes**. Slack Socket Mode connected successfully. Status:
- Astra DM replies work for paired/approved Slack users.
- `#astra-test` is allowlisted and working — Astra replies to direct @Astra mentions.
- `requireMention: true` is enabled for `#astra-test`.
- Negative tests passed: @channel ignored, @here ignored, normal channel chatter ignored.
- Group 1a read-only tools and Group 1b intelligence registered in SKILL.md and working. Write tools not yet registered.

WhatsApp, WebChat, and email channels are not yet configured.

### Slack Access Policy

**`groupPolicy`** controls which Slack channels Astra can process:
- Current Phase 1 setting: `allowlist` — only channels listed in `channels.slack.channels` are active.
- `#astra-test` is the first allowed channel.
- Options: `open` (any channel the bot is a member of), `allowlist` (explicit list), `disabled` (no channels).

**`dmPolicy`** controls who can DM Astra:
- Current Phase 1 setting: `pairing` (default) — new users who DM Astra receive a pairing code and require approval via `openclaw pairing approve slack <CODE>` on the VM.
- Options: `pairing`, `allowlist` (explicit user list), `open` (anyone), `disabled`.

**Key behavior:**
- DM pairing and channel access are **separate**. Any Slack user can @mention Astra in an allowlisted channel, even if they have not paired for DM.
- Astra responds only to direct @Astra mentions in channels and to DMs where access is allowed.
- Astra ignores @channel, @here, and normal channel chatter (enforced by `requireMention: true` and persona guardrails).

### How to Onboard a Slack Channel to Astra (Phase 1 / Pilot)

This is the temporary manual process for Phase 1 and pilot channels:

1. Choose the channel and confirm it is safe for Astra.
2. Invite Astra in Slack: `/invite @Astra`.
3. Add the channel to `/data/openclaw/config/openclaw.json` under `channels.slack.channels`:
   ```json
   "channels": {
     "channel-name": { "requireMention": true }
   }
   ```
4. Keep `groupPolicy` as `allowlist`.
5. Validate JSON is valid.
6. OpenClaw supports config hot reload for `channels.slack.channels` — changes may apply without restart. If not, restart OpenClaw: `cd /data/openclaw && sudo docker compose restart`.
7. Check OpenClaw logs for Slack provider startup and `socket mode connected`.
8. Test `@Astra` in the channel — confirm a reply.
9. Test `@channel`, `@here`, and a normal non-mention message — confirm Astra stays silent.
10. Record the channel in rollout notes.

**Warning:** Manual config editing is acceptable for Phase 1 and pilot channels only. For broader team rollout, revisit channel onboarding so teammates do not need VM/config access.

### Future Channel Rollout Options

Do not implement these now. Revisit when broader team rollout is needed.

- **Option A:** Keep `groupPolicy: allowlist` and build an admin endpoint in Command Centre to manage the channel list via OpenClaw's API, eliminating manual VM config edits.
- **Option B:** Switch to `groupPolicy: open` so teammates can invite Astra through Slack's UI (`/invite @Astra`), with Slack's own app-invite mechanism as the access gate. Channels are mention-gated by default, so this is safe — but requires an explicit architecture decision before switching.
- **DM policy:** Revisit `dmPolicy` later. Options include keeping `pairing`, switching to `allowlist` for approved team members, or another controlled access model.
- Do not switch to `groupPolicy: open` without an explicit architecture decision.

### Workspace Persona and Safety

**Workspace path:** `/data/openclaw/workspace/`

OpenClaw reads persona/instruction files from this directory on session startup. These files control how Astra behaves across all channels.

| File | Status | Purpose |
|------|--------|---------|
| `IDENTITY.md` | Configured | Defines Astra as Fynd Studio operations assistant |
| `USER.md` | Configured | Minimal project-focused context about the human operator |
| `SOUL.md` | Configured | Core personality + Astra-specific privacy, Slack, approval, and anti-leakage guardrails |
| `AGENTS.md` | Configured | Session startup, memory system, Slack mention/DM behavior, secret-handling rules |
| `BOOTSTRAP.md.disabled` | Disabled | Default onboarding flow disabled to prevent first-run conversation in Slack |
| `TOOLS.md` | Default template | Environment-specific tool notes (not yet customized) |
| `HEARTBEAT.md` | Empty | No heartbeat tasks configured |

**Key safety rules configured:**
- Astra responds only to direct @Astra mentions in channels and to DMs
- Astra ignores @channel, @here, and general channel chatter
- Astra must never print, log, or share tokens, API keys, secrets, env vars, or config values
- Astra must ask for explicit human approval before write, destructive, external, or production actions
- No third-party skills may be installed without human approval
- Irrelevant personal-assistant behavior (email/calendar/social/weather checks, proactive outreach, WhatsApp pairing) has been removed

### Fynd Studio OpenClaw Skill

The Studio API tools are exposed to Astra via an OpenClaw Skill (not a Plugin).

- **Skill path:** `/data/openclaw/workspace/skills/fynd-studio/SKILL.md`
- **Mechanism:** OpenClaw Skill — a markdown file auto-discovered by the agent at session startup. No code deployment required.
- **Purpose:** Read-only Studio API lookup tools for Astra across all channels.
- **Current enabled groups:** Group 1a (simple read-only lookups) + Group 1b (intelligence dashboard queries).
- **Group 1a tools:** search_clients, search_projects, get_board_context, get_client_profile, get_client_tasks, list_members
- **Group 1b tool:** intelligence (19 action types — tasks, finance, comms, workload, client stats)
- **Intelligence validation:** Task/workload actions validated (overdue, due this week, assignee workload). Comms-related actions (comms_summary, comms_needs_reply, etc.) are registered but validation deferred until Comms backend/ingestion is wired.
- **Exec helper scripts:** Dedicated scripts in `/data/openclaw/workspace/tools/` for assignee queries, overdue tasks, intelligence actions, and Granola rendering. GPT-5.2 prefers exec scripts over exec curl — all intelligence actions have named wrapper scripts.
- **Not registered:** Write tools (Groups 2-4) — BLOCKED. Requester identity mapping requires `slack_user_id` column on `members`, but new Supabase schema changes are paused (current Supabase is in manager's personal account, company DB target not confirmed). Do not apply `017_slack_user_id.sql`.

**Auth flow:**
- Skill uses `STUDIO_API_TOKEN` from `/data/openclaw/config/.env` on the VM to call Studio API endpoints.
- Studio API validates the incoming Bearer token against `OPENCLAW_API_TOKEN` on Vercel.
- These two values must match. Never print token values.

**Source boundary:** Default data source is Command Centre / Studio API only. No public web browsing, scraping, web_fetch, or inference unless the user explicitly requests it. Missing fields are reported as not available in Command Centre.

### Granola / JS-Rendered Link Handling — SOLVED

OpenClaw's `web_fetch` tool does a plain HTTP GET and extracts readable content via Readability. It does **not** execute JavaScript. JS-rendered pages (Granola, Notion, some Google Docs share links) return only the HTML `<title>` or `<meta>` content, not the actual page body.

**Granola solution:** A dedicated rendering helper script uses playwright-core + Chromium (headless) to render Granola pages and extract structured meeting notes text.

- **Helper script:** `/data/openclaw/workspace/tools/render-granola.js` on the VM
- **How it works:** Launches headless Chromium, navigates to Granola URL, waits for JS render, extracts text via DOM walker, prints structured meeting notes to stdout
- **Domain-locked:** Only `notes.granola.ai` URLs are accepted; all others are rejected
- **Invocation:** `exec node /home/node/.openclaw/workspace/tools/render-granola.js "<URL>"`
- **AGENTS.md:** Mandatory "Link Handling" section forces Astra to use the exec command for Granola links before any fallback
- **SKILL.md:** Formal Granola tool definition + browser fallback for other JS-rendered domains (Notion, Google Docs)
- **Tested and verified from Slack:** Granola meeting notes summarized with real content (key decisions, action items, pricing, next steps)

**Browser tool:** OpenClaw's managed browser tool is also configured and working (Chromium installed, headless, `noSandbox: true`, `defaultProfile: "openclaw"`). Used as fallback for other JS-rendered domains via SKILL.md instructions.

**Firecrawl:** Still unsupported in OpenClaw `2026.3.8`. Not needed now that the helper script + browser tool cover the use case.

**Do not use** old Next.js Slack/Granola/Tessa handlers (`lib/slack/detect-granola.ts`, `lib/openclaw/analyze-slack-note.ts`) for this. Those are legacy and on the do-not-touch list.

### Slack Reply and Feedback UX

Current config for Astra's Slack reply behavior and processing feedback:

**Config values:**
- `streaming: "off"` — streaming disabled (the native status indicator comes from typing callbacks, not streaming)
- `replyToModeByChatType: {"channel": "all", "direct": "all"}` — threaded replies in both channels and DMs
- No `typingReaction` — hourglass reaction removed
- No `ackReaction` — acknowledgement reaction removed
- `groupPolicy: "allowlist"` — only allowlisted channels are active
- `channels.slack.channels.astra-test.requireMention: true`

**Behavior — DMs (App Home):**
- User sends a DM to Astra
- Astra shows assistant-style status text ("Processing...", "Putting it all together...") while working
- Final answer replaces the status
- Uses Slack's `assistant.threads.setStatus` API via the Agents and AI Apps framework

**Behavior — Channels (#astra-test):**
- User @mentions Astra in an allowlisted channel
- Astra shows assistant-style status text in the thread while processing
- Final answer appears in the thread when ready
- Uses Slack's `assistant.threads.setStatus` API — same as DMs

**Slack app requirements for status indicator:**
- "Agents and AI Apps" must be enabled in the Slack app settings
- Bot events must include `assistant_thread_started` and `assistant_thread_context_changed`
- Bot scopes must include `assistant:write` (or `chat:write`)
- App must be reinstalled to workspace after adding these

**Critical config notes:**
- `replyToModeByChatType` must use `"all"`, not `"first"`, for both `channel` and `direct`. OpenClaw's `resolveSlackThreadTargets` only sets `statusThreadTs` when `replyToMode === "all"` — with `"first"` or default `"off"`, `statusThreadTs` is `undefined` and `setSlackThreadStatus` silently skips the `assistant.threads.setStatus` call.
- `streaming` must be `"off"`. The `streaming: "progress"` mode posts its own "Status: thinking..." / "Status: complete. Final answer posted below." messages via `chat.postMessage`, which duplicates and conflicts with the native `setStatus` indicator. The native indicator comes from OpenClaw's typing callbacks (`typingMode`), which are independent of the streaming config.

**Latency note:**
- First latency/scaling fix applied (session/history limits — see below). Further latency tuning can happen later if needed.
- If latency regresses, diagnose with logs first: OpenClaw queue/lane waits, model latency (GPT-5.2), Skill/curl execution time, Studio API/Vercel response time, Supabase query performance, Slack API rate limits, and response size/verbosity.
- Do not optimize latency blindly — diagnose with logs first.

### Slack Session and Latency Controls

Permanent config to prevent channel sessions from bloating with old messages and images, which caused ~40s reply latency when #astra-test accumulated 342 messages / 156k tokens.

| Config key | Value | Purpose |
|------------|-------|---------|
| `channels.slack.historyLimit` | 20 | Limits messages fetched from Slack thread/channel history |
| `agents.defaults.contextTokens` | 200000 | Caps context window usage for compaction triggers (model has 1M window) |
| `session.resetByType.group` | idle/120min | Auto-resets channel sessions after 2h inactivity |
| `session.resetByType.direct` | idle/240min | Auto-resets DM sessions after 4h inactivity |
| `session.parentForkMaxTokens` | 50000 | Limits parent transcript forking to threads |
| `imageMaxDimensionPx` | 800 | Reduced from default 1200 to limit vision-token cost per image |

**Model vision:** `gpt-5.2` config includes `input: ["text", "image"]` to enable Slack image understanding.

**Why these limits:**
- Prevents raw channel history and old uploaded images from being reprocessed on every prompt.
- Keeps recent conversational context while relying on Studio API tools for durable business data.
- Avoids runaway latency and token cost as more users interact with Astra.

**Skipped:** `contextPruning` — this is an Anthropic-only feature and is incompatible with the current LiteLLM/GPT-5.2 setup.

### Architecture Decision: OpenClaw Handles All Channels

OpenClaw natively supports Slack (Bolt SDK), WhatsApp (Baileys), WebChat, and many other channels. Rather than building custom webhook handlers in the Next.js app, all channels connect through OpenClaw:

```
Slack ──┐
WhatsApp ──┤──→ OpenClaw (AI brain + channel router) ──→ App API (25 endpoints)
In-app chat ──┤                                              ↕
Email ──┘                                              Supabase (data)
                                                           ↕
                                                    Comms UI (read view)
```

The 25 API endpoints at `/api/v1/*` are registered as **OpenClaw tools** so Astra can take actions (create tasks, update clients, etc.) from any channel. Comms becomes a read-only dashboard showing conversations across all channels.

### WebSocket Protocol (v3)
The Next.js app communicates with OpenClaw via WebSocket:
1. Connect to `ws://host:port`
2. Receive `connect.challenge` event
3. Send connect request with auth token, role `"admin"`
4. Receive `hello-ok` response
5. Send method requests, receive responses

Client code: `lib/openclaw/client.ts`

### Old Broken Code (to be replaced)

The following files contain old integration code from the previous approach (custom webhook handlers). This code is broken and being replaced by OpenClaw native channels. **Do not build on top of these files — they will be removed or rewritten:**

Some old files and comments may still reference "Tessa". Treat those as legacy references only. The current assistant identity for all new OpenClaw channel work is **Astra**.

- `app/api/slack/events/route.ts` — Old Slack Events API handler (legacy Tessa bot)
- `app/api/channels/slack/callback/route.ts` — Old Slack OAuth callback
- `app/api/channels/webhooks/slack/route.ts` — Old Slack webhook receiver
- `app/api/channels/webhooks/gmail/route.ts` — Old Gmail webhook
- `app/api/channels/webhooks/whatsapp/route.ts` — Old WhatsApp webhook
- `app/api/channels/google/callback/route.ts` — Old Google OAuth callback
- `app/api/channels/sync/route.ts` — Old sync trigger
- `app/api/comms/whatsapp/reply/route.ts` — Old WhatsApp reply handler
- `lib/channels/` — Old channel adapters (gmail.ts, slack.ts, whatsapp.ts, sync.ts, credentials.ts)
- `lib/slack/` — Old Granola detection (detect-granola.ts)
- `lib/openclaw/analyze-slack-note.ts` — Old meeting note analysis adapter

---

## API Layer

### V1 Endpoints (25 total)
All at `/api/v1/*`, authenticated via Bearer token (`OPENCLAW_API_TOKEN`).

**Task operations:** create-tasks, update-task, move-task, delete-task, add-comment, add-link, manage-tags, manage-assignees, manage-dependencies, manage-columns

**Client operations:** upsert-client, update-client, add-client-contact, add-client-facts, get-client-profile, search-clients

**Project operations:** create-project, update-project, search-projects, get-board-context

**Other:** ingest-message, list-members, create-work-stream

All endpoints: Zod-validated, idempotent, audit-logged, agent-flagged (`created_by_agent=true`).

Full contract: `docs/integrations/openclaw-tool-contract.md`

---

## Code Conventions

### Server Actions
- All data mutations in `app/(app)/<module>/actions.ts`
- Marked with `"use server"`
- Use Supabase service-role client

### Components
- `"use client"` only when needed; prefer server components
- Dynamic imports for non-default views (lazy loading)
- shadcn/ui primitives for all UI elements - NEVER edit `components/ui/*` manually

### Styling
- Tailwind utility classes only, no CSS modules
- `cn()` utility from `lib/utils.ts` for conditional classes
- Color themes via CSS variables in `globals.css`

### State Management
- React `useState` + `useCallback`; no global state library
- Optimistic UI: update local state immediately, call server action, rollback on error + toast

### Data Patterns
- Fractional positioning for drag-and-drop (1000-gap increments, midpoint insertion)
- Server pre-fetch with `Promise.all()` + `.catch()` fallbacks
- Partial Prerendering: static shell renders instantly, data streams in

### Error Handling
- try/catch with `toast.error()` for user feedback
- API errors return `{ ok: false, error: { code, message } }`
- Error codes: UNAUTHORIZED, VALIDATION_ERROR, INTERNAL_ERROR, NOT_FOUND

### File Naming
- kebab-case for files
- PascalCase for components
- Actions files: `actions.ts` in each route folder

---

## Design System / Component Reference

### shadcn/ui Primitives (25 components installed)
All in `components/ui/`. Never edit these manually - install new ones via `npx shadcn@latest add <component>`.

```
alert-dialog, avatar, badge, breadcrumb, button, card, checkbox,
command, dialog, dropdown-menu, input, label, loading-quote, popover,
progress, scroll-area, select, separator, sheet, skeleton, sonner,
table, tabs, textarea, tooltip
```

### Custom badge variant
The `badge` component has a custom `"success"` variant (green) added for status indicators.

### Module Components

**Tasks/Kanban:**
KanbanShell, KanbanBoard, KanbanColumn, KanbanCard, TaskSheet, FilterBar, ListView, CalendarView, ClientView, StreamView, AnalyticsPanel, SubtaskPanel, TagPicker, DependencyPicker, BoardQuote, NewProjectDialog

**Clients:**
ClientsShell, ClientProfile

**Comms:**
CommsShell

**Command Centre:**
CommandCentreShell

**Settings:**
ConnectorsShell, IntegrationsShell

**Layout:**
app-sidebar, app-topbar, color-theme-switcher, theme-switcher, auth-button

### Theming
- **Default:** Fynd Green (mint/seafoam oklch)
- **Purple variant:** `data-theme="purple"` on root
- Dark/Light mode via `next-themes`
- 11 color themes available via color-theme-switcher

### UX Writing
All UI copy follows the UX Writing Guide (`docs/ux-writing-guide.md`):
- Fun, energetic, clear tone
- Short success toasts: "Board created. Let's go."
- Friendly errors: "Couldn't save that. Try again?"
- Inviting empty states: "Nothing here yet. Create your first board."
- No "Error:", "Successfully", "Please wait", "Click here", "Oops!"
- All copy lives in `lib/copy.ts`

---

## Deployment

### Production
- **Platform:** Vercel
- **Domain:** studio.fynd.design
- **Auto-deploy:** Push to `main` branch triggers production deploy
- **Preview:** Push to any other branch creates a preview URL

### Local Development
```bash
npm install
npm run dev        # Starts Next.js dev server
```

Requires `.env.local` with Supabase + Clerk keys (minimum).
For OpenClaw features, also need the FyndClaw tunnel running.

### Build
```bash
npm run build      # Production build (must pass with zero errors)
npm run lint       # ESLint
```

---

## Git Workflow

- **Main branch:** `main` (auto-deploys to production)
- **Feature branches:** `comms-rework`, etc.
- **Current active branch:** `comms-rework`
- Push to branch > test on Vercel preview > merge PR to main > auto-deploys
- Never push broken code directly to `main`

---

## Technical Decisions Log

| Date | Decision | Why |
|------|----------|-----|
| 2026-05-12 | New Slack bot identity is Astra, not Tessa | A fresh Slack app named Fynd Studio Astra is being created for the OpenClaw-native Slack setup. Old Tessa Slack app/config and old Next.js Slack handlers are legacy and should not be reused. |
| 2026-05-11 | OpenClaw handles ALL channels natively | OpenClaw has built-in support for Slack, WhatsApp, WebChat, email. Custom webhook handlers in Next.js were reinventing what OpenClaw already does. The 25 API endpoints become OpenClaw tools. |
| 2026-05-11 | Keep integration credentials in Supabase (via Settings UI), not .env.local | Allows runtime configuration without redeployment. Only webhook signing secrets go in .env. |
| 2026-04 | Service-role key for all Supabase queries (no RLS) | Small team, internal tool. RLS overhead wasn't justified. |
| 2026-04 | Clerk for auth instead of Supabase Auth | Better DX, managed auth UI, webhook support |
| 2026-04 | Single board enforcement via DB trigger | Simplified initial launch |
| 2026-04 | Fractional positioning for drag-and-drop | Avoids renumbering all positions on every move |
| 2026-04 | WebSocket protocol for OpenClaw (not REST) | OpenClaw's native protocol, supports streaming and real-time |

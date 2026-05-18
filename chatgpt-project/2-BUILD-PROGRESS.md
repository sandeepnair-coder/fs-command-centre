# Fynd Studio Command Centre - Build Progress

> **Living document.** Update this after every significant feature push, pivot, or milestone. ChatGPT should remind you to update this at the end of each module completion.

**Last updated:** 2026-05-15
**Current branch:** `comms-rework`
**Current focus:** Slack bot integration via OpenClaw

---

## Product Lifecycle Stage

**Stage:** Early Production - Active Development
**What's live:** Core platform (Tasks, Clients, Finance, Settings) is deployed at studio.fynd.design
**What's broken:** Comms module - integrations are non-functional, using placeholder data
**What's next:** Rework all channel integrations (Slack, WhatsApp, Gmail) from scratch

---

## Module Status Overview

| Module | Status | Notes |
|--------|--------|-------|
| Task Management | Live - Stable | Full Kanban with all features working |
| Client Management | Live - Stable | CRM with 40+ fields, all tabs functional |
| Finance | Live - Stable | Invoices, expenses, POs, project budgets |
| Command Centre | Live - Partial | Dashboard works, Ask Astra needs OpenClaw connection |
| Comms | Broken | UI built, backend integrations non-functional |
| Settings - Profile | Live | Working |
| Settings - Members | Live | Working |
| Settings - Connectors | Live - Partial | UI works, OpenClaw connection needs new credentials |
| Settings - Integrations | Live - Partial | UI works, no credentials configured |
| Slack Bot (Astra, formerly Tessa) | Live - Pilot | Slack loop + Group 1a read-only + Group 1b intelligence working via OpenClaw. DMs and #astra-test verified. Native status indicator active. Write tools deferred. |
| WhatsApp Integration | Not working | Code exists but broken |
| Gmail Integration | Not working | Code exists but broken |

---

## Current Sprint

### Active Work: Comms Rework

**Branch:** `comms-rework`
**Goal:** Rebuild all channel integrations properly, starting with Slack bot

**Approach decision:** OpenClaw handles ALL channels natively (Slack, WhatsApp, in-app WebChat, email). The 25 API endpoints become OpenClaw tools so Astra can take actions on the platform from any channel. Previous approach of custom webhook handlers was reinventing what OpenClaw already does.

**Current step:** Group 1a + 1b read-only tools working. Group 2 write tools BLOCKED — new Supabase schema changes paused until company-owned DB target is confirmed.

**Module 2 — Register Studio API endpoints as OpenClaw tools: IN PROGRESS**
- Step 1: Inspected all 25 /api/v1 endpoints (previous contract documented only 7) — complete
- Step 2: Updated tool contract with all 25 endpoints, rollout groups, and OpenClaw tool exposure decision — complete
- Step 3: Verified canonical contract path (docs/integrations/openclaw-tool-contract.md), fixed stale references — complete
- Step 4: Created Group 1a SKILL.md on VM at /data/openclaw/workspace/skills/fynd-studio/SKILL.md — complete
- Step 5: Initial Slack read-only testing — working (client profile lookup verified from Slack)
- Step 6: Source-boundary patch added to SKILL.md — complete (Command Centre is default source, no public web enrichment unless explicitly requested)
- Step 7: Slack reply UX — complete
  - DMs and channels both show native assistant-style status indicator via typing callbacks + `replyToModeByChatType: {"channel": "all", "direct": "all"}`
  - `streaming: "off"` — streaming "progress" mode conflicts by posting duplicate "Status: complete" messages; the native indicator comes from typing callbacks which are independent of streaming
  - Must use `replyToMode: "all"` not `"first"` — OpenClaw bug: `"first"` sets `statusThreadTs` to undefined, silently disabling `setStatus`
  - Slack app requires: Agents & AI Apps enabled, `assistant_thread_started` + `assistant_thread_context_changed` events subscribed, `assistant:write` scope
  - Hourglass reaction removed
  - No "Status: complete" messages
- Tool exposure mechanism: OpenClaw Skills (SKILL.md) as MVP, with Plugin path documented for later
- Group 1a read-only tools and Group 1b intelligence registered and working. Write tools not yet registered.
- Step 8: Slack image understanding — complete
  - Added `input: ["text", "image"]` to gpt-5.2 model config
  - Reduced `imageMaxDimensionPx` to 800 (from default 1200) to limit vision-token cost
  - SOUL.md updated with media fallback and concise image response guidance
- Step 9: Session/history latency fix — complete
  - Root cause: #astra-test session had 342 messages, 14 image references, 156k tokens — old images reprocessed on every prompt, causing ~40s replies even for text
  - Cleared polluted #astra-test session
  - Added permanent prevention config:
    - `channels.slack.historyLimit: 20` — limits messages fetched from Slack thread/channel history
    - `agents.defaults.contextTokens: 200000` — caps context for compaction triggers (model has 1M window)
    - `session.resetByType.group: idle/120min` — auto-resets channel sessions after 2h inactivity
    - `session.resetByType.direct: idle/240min` — auto-resets DM sessions after 4h inactivity
    - `session.parentForkMaxTokens: 50000` — limits parent transcript forking to threads
  - `contextPruning` skipped — Anthropic-only, incompatible with LiteLLM/GPT-5.2
  - First latency/scaling fix applied; further latency tuning can happen later if needed
- Step 10: Granola link reading — SOLVED
  - User shared a Granola meeting link; initial attempts returned title-only via `web_fetch` (JS-rendered page)
  - Root cause: Granola share pages are JavaScript-rendered; OpenClaw `web_fetch` does plain HTTP GET and cannot execute JS
  - SKILL.md text instructions to use browser tool were not followed by GPT-5.2 — model skipped to fallback
  - Fix: Dedicated helper script + mandatory exec instruction in AGENTS.md
  - Helper: `/data/openclaw/workspace/tools/render-granola.js` — uses playwright-core + Chromium to render Granola pages, extract structured text, and print to stdout. Domain-locked to `notes.granola.ai`.
  - AGENTS.md updated with mandatory "Link Handling" section: forces exec command for Granola links before any fallback
  - SKILL.md updated with formal Granola tool definition and browser fallback for other JS-rendered domains (Notion, Google Docs)
  - Browser tool infrastructure verified working: Chromium installed, headless mode, shared libraries present
  - Slack test passed: Granola link summarized with real meeting content (key decisions, action items, pricing, next steps)
  - Normal Slack text replies still work
- Step 11: Assignee task query behavior — SOLVED
  - Root cause: `get_board_context` returns no assignee data; `list_members` returns null for all name fields
  - Fix: Dedicated helper script (`query-tasks-by-assignee.js`) queries all clients in parallel, filters by assignee/manager/priority, groups by board column
  - Wrapper scripts created for all query types the model invents (tasks-overdue, assignee-workload, finance-summary, etc.)
  - API fix: added `manager_id` resolution to `get_client_tasks` response; moved overdue/due-this-week filters to SQL level before limit
  - AGENTS.md updated with mandatory exec commands for task and intelligence queries
  - Partial name matching works ("Neha" matches "Neha Nilesh lad")
- Step 12: Group 1b intelligence — COMPLETE
  - intelligence endpoint (POST /api/v1/intelligence) added to SKILL.md with all 19 action types
  - Task/workload intelligence validated: overdue tasks, assignee workload, tasks due this week
  - Comms-related intelligence actions (comms_summary, comms_needs_reply, etc.) are contract-present but validation deferred until Comms backend/ingestion is wired
  - Exec wrapper scripts created for all intelligence actions to match model's exec pattern
  - Session clearing required after script changes to avoid poisoned context from old failed attempts
- Group 2 writes: BLOCKED — requester identity mapping needs `slack_user_id` on `members` table, but new Supabase schema changes are paused. Current Supabase project is in the manager's personal account; company-owned DB target not yet confirmed. Do not apply `supabase/migrations/017_slack_user_id.sql` to the current personal Supabase project. Committed schema/type changes (ed8031e) remain in repo but are inert until the migration is applied on the target DB.
- Next: Wait for company DB target confirmation before resuming Group 2 write tools or any new schema changes

**Module 1 — basic Slack loop: COMPLETE**

**Completed in this sprint so far:**
- Astra Slack app created on api.slack.com
- Slack scopes (Socket Mode, bot scopes, event subscriptions) configured and app installed
- OpenClaw Slack config block added to /data/openclaw/config/openclaw.json
- Real xapp and xoxb tokens manually replaced by user
- JSON validation passed
- OpenClaw workspace/persona/security files inspected (SOUL.md, IDENTITY.md, AGENTS.md, USER.md, BOOTSTRAP.md, TOOLS.md, HEARTBEAT.md)
- Astra identity and safety guardrails configured on VM workspace files
- BOOTSTRAP.md disabled (renamed to BOOTSTRAP.md.disabled) to prevent default onboarding flow in Slack
- Irrelevant personal-assistant behavior removed from AGENTS.md (email/calendar/social/weather checks, proactive outreach, WhatsApp pairing)
- Slack-specific rules added: respond only to @Astra mentions and DMs, ignore @channel/@here, never print secrets/tokens
- OpenClaw restarted successfully after Slack config and persona changes
- Astra DM test passed for paired user
- #astra-test added to channel allowlist with requireMention: true
- #astra-test @Astra mention test passed — Astra replies correctly
- Negative tests passed: @channel ignored, @here ignored, normal channel chatter ignored
- OpenClaw Slack access policies inspected (dmPolicy, groupPolicy, allowFrom, per-channel controls)
- Confirmed DM pairing and channel access are separate — users do not need DM pairing to @mention Astra in allowlisted channels
- Access policy decision: keep groupPolicy allowlist and dmPolicy pairing for Phase 1; revisit channel onboarding for broader rollout later

---

## Build History

### Phase 1: Task Management (Complete)
**Timeline:** Early April 2026
**What was built:**
- Full Kanban board with @dnd-kit drag-and-drop
- 7 default creative workflow columns
- Fractional positioning with midpoint insertion
- Rich task detail sheet (title, description, priority, due date, cost, client, manager, assignees, tags, subtasks, comments, attachments, outputs, links, dependencies)
- Column management (rename, WIP limit, description, move, delete)
- Board create/delete with cascade
- Client filter, search, priority/assignee/date filters
- 5 view modes: Kanban, List, Calendar, Client View, Stream View
- Analytics panel with charts and member breakdown
- Activity log auto-tracking
- Completion toggle with subtask progress

### Phase 2: Finance (Complete)
**Timeline:** Early April 2026
**What was built:**
- Overview dashboard with 9 KPIs
- Invoice management (receivable/payable, auto-numbered)
- Expense tracking with categories and recurring support
- Purchase order management with line items and auto-approval
- Project budget vs. spend analysis
- Vendor management

### Phase 3: Client Management (Complete)
**Timeline:** Early April 2026
**What was built:**
- Client list with grid cards, bulk selection, bulk delete
- Quick create + advanced intake sheet (6 sections)
- Client detail page with 7 tabs
- 40+ client fields including billing/tax
- Client intelligence with fact verification
- Client-first enforcement across the platform

### Phase 4: Comms (UI Complete, Backend Broken)
**Timeline:** April 2026
**What was built:**
- 3-pane layout (thread list, timeline, insight panel)
- Channel tabs, quick filters, search
- Chat-style message bubbles
- CRM insight panel with AI features
- Inline action buttons
- Conversation status and health tracking
**What's broken:**
- Gmail OAuth + sync
- Slack webhook handler + sync
- WhatsApp webhook + sync
- Auto-linker (identity to client resolution)
- All of the above being reworked on `comms-rework` branch

### Phase 5: AI Integration (Partial)
**Timeline:** April 2026
**What was built:**
- OpenClaw WebSocket client (protocol v3)
- 7 intelligence methods (summarize, extract facts, classify, etc.)
- Slack bot pipeline for @mentions and meeting note detection (old Tessa bot — now abandoned)
- Granola meeting note heuristic detector
- Command Centre "Ask Astra" chat panel (old code may still reference "Ask Tessa")
- 25 REST API endpoints for OpenClaw tools
**What's broken:**
- OpenClaw credentials need updating (moved from DigitalOcean to GCP)
- Slack bot logic unreliable
- Meeting note analysis pipeline untested with new setup

### Phase 6: Settings & Integrations (UI Complete, Backend Partial)
**Timeline:** April 2026
**What was built:**
- Profile management with avatar
- Member management with roles and manager flag
- Connector configuration UI
- Integration setup UI (Gmail, Slack, WhatsApp credential forms, OAuth flows, sync controls)
- Slack insights admin page
**What's broken:**
- No integration credentials configured
- Channel sync engine untested

---

## Pivots & Adjustments

| Date | What changed | Why |
|------|-------------|-----|
| 2026-05-12 | Renamed the unified AI assistant from Tessa to Astra | A fresh Slack app/bot is being created for OpenClaw-native Slack integration. The old Tessa Slack app/config is abandoned to avoid inheriting broken setup. Astra is the assistant name for all new prompts, configs, UI, and docs. |
| 2026-05-11 | Decided to rework Comms integrations from scratch instead of fixing existing code | Original code was vibe-coded and doing wrong things - cleaner to rebuild |
| 2026-05-11 | OpenClaw handles ALL channels natively (Slack, WhatsApp, WebChat, email) | OpenClaw has built-in support for all channels + session management + tool execution. Custom handlers were reinventing the wheel. |
| 2026-05-11 | Astra is a unified cross-platform AI assistant, not just a Slack bot | Needs shared context across all channels. OpenClaw's session system handles this natively. |
| 2026-05-11 | OpenClaw environment moved from DigitalOcean to GCP (FyndClaw) | Team set up new managed environment |
| 2026-05-11 | Channel credentials go in OpenClaw config, not .env.local | OpenClaw manages its own channel connections. App only needs OPENCLAW_API_URL and OPENCLAW_API_TOKEN. |
| 2026-04-02 | Locked to single board "Fynd Design Tasks" | Multiple boards were causing confusion for small team |

---

## Chat Log

| Chat # | Date | Summary | Key Decisions |
|--------|------|---------|---------------|
| 1 | 2026-05-11 | Project onboarding, codebase exploration, Git workflow setup, ChatGPT project setup | Created `comms-rework` branch; decided to rebuild integrations from scratch; chose OpenClaw native Slack over custom handlers |

---

## Next Up (Phase Plan)

**Phase 1:** Connect OpenClaw to Slack (DONE) + register API endpoints as OpenClaw tools (Group 1a read-only — DONE; Group 1b intelligence — DONE; Group 2 writes — BLOCKED pending company DB)
**Phase 2:** Connect OpenClaw to WhatsApp (native channel via Baileys QR pairing)
**Phase 3:** Connect in-app chat via OpenClaw WebChat channel
**Phase 4:** Wire Comms UI to display all conversations flowing through OpenClaw across all channels
**Phase 5:** Email channel integration
**Phase 6:** Advanced intelligence (lead detection, meeting note analysis, auto-actions, Fynd Studio upsell scoring)

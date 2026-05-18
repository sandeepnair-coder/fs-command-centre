# CLAUDE.md — Fynd Studio Command Centre

## Project

Internal operations platform for Fynd Studio (part of Fynd.com).
Live at https://studio.fynd.design. Next.js 16 + Supabase + Clerk + Tailwind + shadcn/ui.
AI backend: OpenClaw/FyndClaw gateway on GCP VM.

---

## How to work with the user

- User is the architect/reviewer. Claude Code does repo edits and checks.
- For normal focused tasks, proceed automatically. Give a brief one-line plan if useful, then make the change, run validation, and report results.
- After changes, report: files changed, validation results, blockers.
- Do not ask the user to manually edit files unless they explicitly request it.
- Do not ask for pre-approval on routine edits. The user reviews afterward.
- Keep outputs concise but educational so the user learns what is happening.
- One step at a time. Do not bundle unrelated changes.

### Ask for explicit approval before:
- Deleting files or large sections of code
- Modifying production config (openclaw.json, Vercel, Supabase)
- Running destructive database commands
- Committing, pushing, or merging git changes
- Touching secrets, tokens, or credentials
- Removing or refactoring legacy integration paths
- Broad architecture changes or multi-module refactors

---

## Read these docs first

Do not read all docs every time. Read selectively based on the task.
At the start of a task, mention which sources were used in one short line (e.g., "Context used: CLAUDE.md, 2-BUILD-PROGRESS.md"). If CLAUDE.md has enough context, say "Context used: CLAUDE.md only."

| When you need | Read |
|---|---|
| Product context, features, philosophy | `chatgpt-project/1-PRODUCT-CONTEXT.md` |
| Current progress, current step, sprint | `chatgpt-project/2-BUILD-PROGRESS.md` |
| Repo structure, stack, env vars, OpenClaw VM access, old broken paths | `chatgpt-project/3-TECHNICAL-SETUP.md` |
| Workflow expectations (how ChatGPT/user loop works) | `chatgpt-project/4-PERSONA-AND-SYSTEM.md` |
| Assistant naming rules (Astra vs Tessa) | `chatgpt-project/1-PRODUCT-CONTEXT.md` (AI Layer section) |
| OpenClaw tool/API contract (25 endpoints) | `docs/integrations/openclaw-tool-contract.md` |
| UI copy tone, toast patterns, empty states | `docs/ux-writing-guide.md` |
| Full product spec, DB schema, changelog | `SPEC.md` |

---

## Current focus

- **Branch:** `comms-rework`
- **Goal:** Rebuild Comms/channel integrations from scratch through OpenClaw native channels.
- **Starting with:** OpenClaw native Slack integration.
- **Assistant identity:** Astra (Slack app: Fynd Studio Astra, bot: Astra, username: astra).
- **Old identity:** Tessa — legacy only, do not use for new work.

### Module 1 — Connect OpenClaw to Slack (COMPLETE)

- Basic Slack loop verified. DMs + #astra-test working. @channel/@here ignored.
- Policy: groupPolicy allowlist, dmPolicy pairing.

### Module 2 — Register Studio API endpoints as OpenClaw tools (IN PROGRESS)

- 25 actual /api/v1 endpoints identified (contract: `docs/integrations/openclaw-tool-contract.md`).
- Tool exposure mechanism: OpenClaw Skills (SKILL.md) as MVP wrapper.
- Rollout: Group 1a (simple read-only lookups) first, then 1b (intelligence), then Groups 2-4.
- Group 1a Skill created on VM and initial Slack read-only testing works (client profile lookup verified).
- Source-boundary patch applied: Command Centre is default source, no public web enrichment unless explicitly requested.
- Slack UX: Both DMs and channels show native assistant-style status indicator via typing callbacks + `replyToModeByChatType: {"channel": "all", "direct": "all"}`. Streaming is `"off"` (streaming "progress" mode conflicts by posting duplicate status messages). Hourglass removed.
- Critical: `replyToModeByChatType` must use `"all"` for both channel and direct — `"first"` or default `"off"` silently skips `setStatus`. Streaming must stay `"off"` to avoid "Status: complete" duplicate messages.
- Slack image understanding works (`input: ["text", "image"]` on gpt-5.2, `imageMaxDimensionPx: 800`).
- Session/history limits added to prevent channel context bloat (historyLimit: 20, contextTokens: 200k, idle session resets, parentForkMaxTokens: 50k). First latency fix applied; further tuning can happen later if needed.
- Granola/JS-rendered link reading: SOLVED. Helper script (`render-granola.js`) uses playwright-core + Chromium to render Granola pages. Mandatory exec instruction in AGENTS.md. Browser tool also configured for other JS-rendered domains.
- Assignee/manager task queries: SOLVED. Helper scripts on VM query all clients, filter by assignee/manager/priority, group by column. API updated to include manager field.
- Group 1b intelligence: WORKING. 19 action types registered. Task/workload queries validated. Comms actions deferred until backend is wired.
- Exec helper pattern: GPT-5.2 prefers named exec scripts over exec curl. All intelligence actions have wrapper scripts in `/data/openclaw/workspace/tools/`.
- Write tools not yet registered.
- **Group 2 writes: BLOCKED.** Requester identity mapping requires a `slack_user_id` column on `members`, but new Supabase schema changes are paused — current Supabase project is in the manager's personal account. Company-owned DB target is not confirmed yet.
- **Do not apply** `supabase/migrations/017_slack_user_id.sql` to the current personal Supabase project.
- **Next:** Wait for company DB target confirmation before resuming Group 2 write tools or any new schema changes.

---

## Secrets policy

- Claude must not read, print, copy, or set real tokens, API keys, env values, or credentials.
- For secret-dependent config, Claude creates placeholders only (e.g. `REPLACE_WITH_...`).
- The user manually enters real secrets in Vercel, VM `.env` files, Slack dashboards, or provider dashboards.
- Claude may verify only key presence, prefixes (e.g. `xapp-`, `xoxb-`), or redacted lengths.
- Claude must not `cat` full `.env` files or print full `openclaw.json` when it contains tokens.
- If Claude needs to add a secret-bearing config entry, it writes a placeholder and tells the user to replace it.

---

## Architecture rules

- OpenClaw handles Slack, WhatsApp, WebChat, and email channels natively.
- Do not build new Next.js Slack event handlers for the new flow.
- Slack credentials go in OpenClaw config on the GCP VM, not in `.env.local`.
- The Next.js app exposes `/api/v1/*` endpoints that become OpenClaw tools.
- `.env.local` only needs `OPENCLAW_API_URL` and `OPENCLAW_API_TOKEN` for the app-to-OpenClaw connection.
- Human approval is required before important AI actions.
- All AI actions are audit-logged and idempotent.

---

## Do not touch

These files are **legacy** from the old broken integration. Do not modify, build on, or import from them unless a cleanup task explicitly asks to remove/refactor them:

- `app/api/slack/events/route.ts`
- `app/api/channels/slack/callback/route.ts`
- `app/api/channels/webhooks/slack/route.ts`
- `app/api/channels/webhooks/gmail/route.ts`
- `app/api/channels/webhooks/whatsapp/route.ts`
- `app/api/channels/google/callback/route.ts`
- `app/api/channels/sync/route.ts`
- `app/api/comms/whatsapp/reply/route.ts`
- `lib/channels/`
- `lib/slack/`
- `lib/openclaw/analyze-slack-note.ts`

Also do not edit:
- `components/ui/*` — shadcn primitives, install via CLI only.
- `app/layout.tsx` — root layout.

---

## Common commands

```bash
# Git
git branch --show-current
git status --short

# Build
npm run build
npm run dev
npm run lint

# SSH to OpenClaw VM
gcloud compute ssh tenant-env-615c242d-sohailhatim \
  --zone=asia-south1-a \
  --project=fynd-engineering-playground \
  --tunnel-through-iap \
  --command="<CMD>"

# OpenClaw on VM
# Container status
--command="sudo docker ps"

# Compose status
--command="cd /data/openclaw && sudo docker compose ps"

# Logs (last 50 lines)
--command="cd /data/openclaw && sudo docker compose logs --tail=50"

# Read config
--command="sudo cat /data/openclaw/config/openclaw.json"

# Restart OpenClaw
--command="cd /data/openclaw && sudo docker compose restart"

# Read docs inside container
--command="sudo docker exec openclaw-openclaw-gateway-1 cat /app/docs/<path>"
```

---

## Current OpenClaw setup

- **VM:** `tenant-env-615c242d-sohailhatim` (GCP, `asia-south1-a`, `fynd-engineering-playground`)
- **Container:** `openclaw-openclaw-gateway-1` (image: `ghcr.io/openclaw/openclaw:2026.3.8`)
- **Config:** `/data/openclaw/config/openclaw.json`
- **Model:** GPT-5.2 via LiteLLM proxy
- **Channels configured:** Slack (Socket Mode, Astra tokens set)
- **No public IP** — access via GCP IAP SSH tunnel only
- **Local tunnel:** `localhost:8080` when `fyndclaw-ssh.sh` is running

---

## How to resume after /clear

1. Read this file (`CLAUDE.md`).
2. Read `chatgpt-project/2-BUILD-PROGRESS.md` for current step.
3. Read `chatgpt-project/3-TECHNICAL-SETUP.md` only if the task is technical or OpenClaw-related.
4. Read `chatgpt-project/1-PRODUCT-CONTEXT.md` (AI Layer section) if assistant naming is involved.
5. Run `git status --short` and `git branch --show-current`.
6. Ask one clarifying question only if the current step is unclear.

---

## Output expectations

- Report files changed after every edit.
- Run validation (build, lint, grep) when relevant.
- Flag blockers immediately.
- Do not silently skip errors.
- Use the UX writing guide tone for any user-facing copy.
- Use Astra for current/future assistant references. Tessa is legacy only.

---

## Updating CLAUDE.md

Update this file only at meaningful checkpoints, not after every small task.

Meaningful checkpoints:
- Current module or step changes
- Major architecture or product decisions
- OpenClaw setup changes
- New durable workflow rules
- Module completion
- Legacy paths removed, replaced, or officially quarantined

Do not duplicate project docs inside CLAUDE.md. Keep it concise.

---

## Future: legacy cleanup

After OpenClaw Slack integration, tool registration, and Comms ingestion are stable, plan a cleanup module to remove or quarantine old custom integration code. Do not delete these now. Do not build on them. Cleanup comes later.

Cleanup candidates:
- `app/api/slack/events/route.ts`
- `app/api/channels/slack/callback/route.ts`
- `app/api/channels/webhooks/slack/route.ts`
- `app/api/channels/webhooks/gmail/route.ts`
- `app/api/channels/webhooks/whatsapp/route.ts`
- `app/api/channels/google/callback/route.ts`
- `app/api/channels/sync/route.ts`
- `app/api/comms/whatsapp/reply/route.ts`
- `lib/channels/`
- `lib/slack/`
- `lib/openclaw/analyze-slack-note.ts`

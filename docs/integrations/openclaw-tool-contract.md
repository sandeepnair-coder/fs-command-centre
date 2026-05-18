# OpenClaw Tool Contract — Fynd Studio Command Centre

**Last updated:** 2026-05-13
**Total endpoints:** 25
**Base URL:** `https://studio.fynd.design`
**Auth:** `Authorization: Bearer <OPENCLAW_API_TOKEN>`
**Content-Type:** `application/json`
**Method:** All endpoints use POST.

---

## OpenClaw Tool Exposure Decision

Channel integrations (Slack, WhatsApp, WebChat, email) remain **OpenClaw-native** — the Next.js app does not handle channel events. This contract is only about exposing the Studio `/api/v1` endpoints as tools so Astra can take actions on the platform from any channel.

**Chosen mechanism: OpenClaw Skills (SKILL.md)**

OpenClaw does not have a built-in "register HTTP API as a typed tool" feature. There are two paths:

1. **Skills (SKILL.md):** A markdown file in `<workspace>/skills/<name>/SKILL.md` that describes available capabilities to the agent. The agent uses `exec` (curl) or `web_fetch` to call the HTTP endpoints. Skills are auto-discovered, hot-reloadable, and require no code. This is the **first implementation path**.

2. **Plugins (agent-tools):** A Node.js module that registers typed tool schemas via `api.registerTool()`. More structured, but requires writing and maintaining a plugin package.

**Decision:** Use Skills first as an MVP wrapper. Skills are simpler, require no code deployment, and can be iterated quickly on the VM. If structured typed tools become necessary later (e.g., for schema validation at the tool layer or for per-tool approval gates beyond prompt-based guardrails), migrate to a Plugin.

This is NOT reinventing Slack/WhatsApp/email integrations. OpenClaw handles those channels natively. The SKILL.md only teaches Astra how to call Studio's data API.

---

## Rollout Groups

### Group 1a — Simple read-only lookup tools (register first, zero risk)

| Tool | Endpoint | Description |
|------|----------|-------------|
| `search_clients` | POST /api/v1/search-clients | Search clients by name |
| `search_projects` | POST /api/v1/search-projects | Search projects by name, client, status |
| `get_board_context` | POST /api/v1/get-board-context | Get full board state (columns + tasks) |
| `get_client_profile` | POST /api/v1/get-client-profile | Get client profile with contacts, facts, projects |
| `get_client_tasks` | POST /api/v1/get-client-tasks | Get tasks for a specific client |
| `list_members` | POST /api/v1/list-members | List team members |

**Status (2026-05-14):** Group 1a SKILL.md created at `/data/openclaw/workspace/skills/fynd-studio/SKILL.md`. Initial Slack read-only tests passed (client profile lookup verified). Source-boundary rules applied: Command Centre is the default data source; no public web enrichment unless explicitly requested. Pilot feedback will drive schema/response refinements before adding Group 1b or write tools.

### Group 1b — Intelligence queries (read-only, register after Group 1a passes)

| Tool | Endpoint | Description |
|------|----------|-------------|
| `intelligence` | POST /api/v1/intelligence | Query dashboards (finance, comms, tasks, workload) |

**Status (2026-05-15):** `intelligence` registered in SKILL.md and validated for task/workload read-only queries (overdue, due this week, assignee workload, tasks by priority/assignee/manager). Comms-related actions (comms_summary, comms_needs_reply, comms_unlinked, comms_high_priority, comms_follow_ups) are registered but validation deferred until Comms backend/ingestion is wired. Finance actions registered but data depends on Finance module usage.

### Group 2 — Additive low-risk writes (register after Group 1 tests pass)

| Tool | Endpoint | Description |
|------|----------|-------------|
| `add_comment` | POST /api/v1/add-comment | Add comment to a task |
| `add_link` | POST /api/v1/add-link | Add link to a task |
| `add_client_contact` | POST /api/v1/add-client-contact | Add contact person to a client |
| `add_client_facts` | POST /api/v1/add-client-facts | Add knowledge facts to a client |

### Group 3 — Create/update writes (require explicit human approval)

| Tool | Endpoint | Description |
|------|----------|-------------|
| `create_tasks` | POST /api/v1/create-tasks | Create tasks in a project |
| `create_project` | POST /api/v1/create-project | Create a new project with optional tasks |
| `update_task` | POST /api/v1/update-task | Update task fields |
| `move_task` | POST /api/v1/move-task | Move task to a different column |
| `update_project` | POST /api/v1/update-project | Update project metadata/status |
| `update_client` | POST /api/v1/update-client | Update client fields |
| `upsert_client` | POST /api/v1/upsert-client | Create or update client by name |
| `manage_tags` | POST /api/v1/manage-tags | Add/remove tags on a task |
| `manage_assignees` | POST /api/v1/manage-assignees | Add/remove assignees on a task |
| `manage_dependencies` | POST /api/v1/manage-dependencies | Add/remove task dependencies |
| `manage_columns` | POST /api/v1/manage-columns | Add/rename columns on a board |
| `create_work_stream` | POST /api/v1/create-work-stream | Create a work stream for a client |

### Group 4 — High-risk tools (defer until Groups 1-3 are stable)

| Tool | Endpoint | Description |
|------|----------|-------------|
| `delete_task` | POST /api/v1/delete-task | Permanently delete a task (destructive) |
| `ingest_message` | POST /api/v1/ingest-message | Ingest raw message into Comms (uses legacy sync code) |

---

## Naming Aliases

Previous contract used longer names. Updated mapping:

| Old contract name | New tool name |
|---|---|
| `create_project_from_client_message` | `create_project` |
| `create_tasks_for_project` | `create_tasks` |
| `search_existing_projects` | `search_projects` |
| `add_comment_to_card` | `add_comment` |
| `update_project_status` | `update_project` |

---

## Full Tool Reference

### search_clients

**Group:** 1 (read-only) | **Risk:** none | **Approval:** not required

```
POST /api/v1/search-clients
```

**Input:**
```json
{
  "query": "Spice Junction",
  "limit": 10
}
```

- `query` (string, optional, max 200) — search term
- `limit` (int, 1-50, default 10)

**Output:** `{ ok, clients: [{ id, name, company_name, primary_email, ... }] }`

---

### search_projects

**Group:** 1 (read-only) | **Risk:** none | **Approval:** not required

```
POST /api/v1/search-projects
```

**Input:**
```json
{
  "query": "Diwali",
  "client_name": "Spice Junction",
  "status": "active",
  "limit": 10
}
```

- `query` (string, optional, max 200)
- `client_name` (string, optional, max 200)
- `status` (enum: active | on_hold | completed | archived, optional)
- `limit` (int, 1-50, default 10)

**Output:** `{ ok, projects: [{ id, name, status, client, created_at }] }`

---

### get_board_context

**Group:** 1 (read-only) | **Risk:** none | **Approval:** not required

```
POST /api/v1/get-board-context
```

**Input:**
```json
{
  "project_name": "Diwali Campaign 2026",
  "include_tasks": true,
  "include_columns": true
}
```

- `project_id` (uuid, optional) or `project_name` (string, optional, max 200) — one required
- `include_tasks` (bool, default true)
- `include_columns` (bool, default true)

**Output:** `{ ok, project, columns, tasks, counts }`

---

### get_client_profile

**Group:** 1 (read-only) | **Risk:** none | **Approval:** not required

```
POST /api/v1/get-client-profile
```

**Input:**
```json
{
  "client_id": "uuid",
  "include_contacts": true,
  "include_facts": true,
  "include_projects": true
}
```

- `client_id` (uuid, required)
- `include_contacts` (bool, default true)
- `include_facts` (bool, default true)
- `include_projects` (bool, default true)

**Output:** `{ ok, client, contacts, facts, projects }`

---

### get_client_tasks

**Group:** 1 (read-only) | **Risk:** none | **Approval:** not required

```
POST /api/v1/get-client-tasks
```

**Input:**
```json
{
  "client_name": "Spice Junction",
  "limit": 50
}
```

- `client_id` (uuid, optional) or `client_name` (string, optional, max 200) — one required
- `limit` (int, 1-100, default 50)

**Output:** `{ ok, tasks: [...] }`

---

### list_members

**Group:** 1 (read-only) | **Risk:** none | **Approval:** not required

```
POST /api/v1/list-members
```

**Input:**
```json
{
  "limit": 50
}
```

- `limit` (int, 1-100, default 50)

**Output:** `{ ok, members: [{ id, name, email, role, is_manager }] }`

---

### intelligence

**Group:** 1 (read-only) | **Risk:** none | **Approval:** not required

```
POST /api/v1/intelligence
```

Multi-action query endpoint for dashboards and analytics.

**Input:**
```json
{
  "action": "tasks_overdue",
  "client_name": "Spice Junction",
  "limit": 50
}
```

- `action` (enum, required) — one of: `finance_summary`, `project_financials`, `comms_summary`, `comms_needs_reply`, `comms_unlinked`, `comms_high_priority`, `comms_follow_ups`, `tasks_advanced`, `tasks_overdue`, `tasks_due_this_week`, `tasks_in_progress`, `tasks_pending_review`, `tasks_by_assignee`, `tasks_by_manager`, `tasks_by_priority`, `tasks_completed`, `client_stats`, `client_tasks`, `assignee_workload`
- `client_name` (string, optional, max 200)
- `client_id` (uuid, optional)
- `assignee_name` (string, optional, max 200)
- `manager_name` (string, optional, max 200)
- `priority` (string, optional, max 20)
- `project_name` (string, optional, max 200)
- `search` (string, optional, max 200)
- `channel` (string, optional, max 20)
- `limit` (int, 1-100, default 50)

**Output:** varies by action

---

### add_comment

**Group:** 2 (additive write) | **Risk:** low | **Approval:** not required

```
POST /api/v1/add-comment
```

**Input:**
```json
{
  "task_id": "uuid",
  "body": "Client confirmed: use the mango motif",
  "agent_run_id": "run_abc"
}
```

- `task_id` (uuid, optional), `task_title` (string, optional), or `source_message_id` (string, optional) — one required
- `body` (string, required, 1-5000)
- `agent_run_id` (string, optional, max 200)

**Output:** `{ ok, comment: { id, body, created_at } }`
**Flags:** `created_by_agent = true`, audit logged

---

### add_link

**Group:** 2 (additive write) | **Risk:** low | **Approval:** not required

```
POST /api/v1/add-link
```

**Input:**
```json
{
  "task_id": "uuid",
  "url": "https://figma.com/...",
  "label": "Design mockup"
}
```

- `task_id` / `task_title` / `source_message_id` — one required
- `url` (string, required, valid URL, max 2000)
- `label` (string, optional, max 200)
- `agent_run_id` (string, optional)

**Output:** `{ ok, link: { id, url, label } }`
**Flags:** `created_by_agent = true`, audit logged

---

### add_client_contact

**Group:** 2 (additive write) | **Risk:** low | **Approval:** not required

```
POST /api/v1/add-client-contact
```

**Input:**
```json
{
  "client_id": "uuid",
  "name": "Rahul Sharma",
  "role": "Marketing Head",
  "email": "rahul@spicejunction.com",
  "phone": "+919876543210",
  "preferred_channel": "whatsapp"
}
```

- `client_id` (uuid, required)
- `name` (string, required, max 200)
- `role` (string, optional, max 100)
- `email` (string, optional, valid email, max 300)
- `phone` (string, optional, max 50)
- `preferred_channel` (enum: email | slack | whatsapp, optional)
- `notes` (string, optional, max 2000)
- `agent_run_id` (string, optional)

**Output:** `{ ok, contact: { id, name, role, email, phone } }`
**Flags:** `created_by_agent = true`, audit logged

---

### add_client_facts

**Group:** 2 (additive write) | **Risk:** low | **Approval:** not required

```
POST /api/v1/add-client-facts
```

**Input:**
```json
{
  "client_id": "uuid",
  "facts": [
    { "key": "budget_range", "value": "1-2L per campaign", "confidence": "medium" }
  ]
}
```

- `client_id` (uuid, required)
- `facts` (array, 1-30 items, required):
  - `key` (string, required, max 100)
  - `value` (string, required, max 2000)
  - `confidence` (enum: high | medium | low, default medium)
- `agent_run_id` (string, optional)

**Output:** `{ ok, facts: [{ id, key, value, confidence }] }`
**Flags:** `created_by_agent = true`, audit logged

---

### create_tasks

**Group:** 3 (workflow write) | **Risk:** medium | **Approval:** required

```
POST /api/v1/create-tasks
```

**Input:**
```json
{
  "project_name": "Diwali Campaign 2026",
  "tasks": [
    { "title": "Instagram post designs", "priority": "high", "column": "Intake" }
  ]
}
```

- `project_id` (uuid, optional) or `project_name` (string, optional, max 200)
- `client_id` (uuid, optional)
- `tasks` (array, 1-50, required):
  - `title` (string, required, max 500)
  - `description` (string, optional, max 2000)
  - `priority` (enum: low | medium | high | urgent, default low)
  - `due_date` (YYYY-MM-DD, optional)
  - `column` (string, optional, max 100, fuzzy matched)
  - `assignee_name` (string, optional, max 200)
  - `tags` (string[], optional)
  - `cost` (number, optional, min 0)
  - `source_message_id` (string, optional, max 500)
- `source_channel`, `source_message_id`, `agent_run_id`, `idempotency_key` (optional agent metadata)

**Output:** `{ ok, project_id, tasks: [{ id, title, column, priority }], message }`
**Flags:** `created_by_agent = true`, audit logged, idempotent via `idempotency_key` / `source_message_id`

---

### create_project

**Group:** 3 (workflow write) | **Risk:** medium | **Approval:** required

```
POST /api/v1/create-project
```

**Input:**
```json
{
  "name": "Diwali Campaign 2026",
  "client_id": "uuid",
  "description": "Full campaign including social, print, and OOH",
  "due_date": "2026-10-15",
  "tasks": [
    { "title": "Instagram post designs", "priority": "high", "column": "Intake" }
  ]
}
```

- `name` (string, required, max 200)
- `client_id` (uuid, required — use `search_clients` or `upsert_client` first)
- `description` (string, optional, max 2000)
- `brand_name` (string, optional, max 200)
- `due_date` (YYYY-MM-DD, optional)
- `conversation_summary` (string, optional, max 5000)
- `tasks` (array, optional — same schema as `create_tasks`)
- Agent metadata: `source_channel`, `source_message_id`, `agent_run_id`, `idempotency_key`

**Output:** `{ ok, project, client, columns, tasks, message }`
**Flags:** `created_by_agent = true`, audit logged, idempotent

---

### update_task

**Group:** 3 (workflow write) | **Risk:** medium | **Approval:** required

```
POST /api/v1/update-task
```

**Input:**
```json
{
  "task_id": "uuid",
  "updates": { "priority": "high", "description": "Updated scope" }
}
```

- `task_id` / `task_title` / `source_message_id` — one required
- `updates` (object, required):
  - `title`, `description`, `priority`, `due_date`, `cost`, `column`, `client_id`, `is_completed`, `task_type`
- `agent_run_id` (string, optional)

**Output:** `{ ok, task }`
**Flags:** `created_by_agent = true`, audit logged

---

### move_task

**Group:** 3 (workflow write) | **Risk:** medium | **Approval:** required

```
POST /api/v1/move-task
```

**Input:**
```json
{
  "task_id": "uuid",
  "column": "In Progress"
}
```

- `task_id` / `task_title` / `source_message_id` — one required
- `column` (string, required, max 100, fuzzy matched)
- `agent_run_id` (string, optional)

**Output:** `{ ok, task }`
**Flags:** audit logged

---

### update_project

**Group:** 3 (workflow write) | **Risk:** medium | **Approval:** required

```
POST /api/v1/update-project
```

**Input:**
```json
{
  "project_name": "Diwali Campaign 2026",
  "updates": { "status": "on_hold" }
}
```

- `project_id` (uuid, optional) or `project_name` (string, optional) — one required
- `updates` (object): `name`, `description`, `status` (active|on_hold|completed|archived), `due_date`, `conversation_summary`
- `agent_run_id` (string, optional)

**Output:** `{ ok, project }`
**Flags:** audit logged

---

### update_client

**Group:** 3 (workflow write) | **Risk:** medium | **Approval:** required

```
POST /api/v1/update-client
```

**Input:**
```json
{
  "client_id": "uuid",
  "updates": { "industry": "FMCG", "notes": "Prefers WhatsApp" }
}
```

- `client_id` (uuid, required)
- `updates` (object): `name`, `company_name`, `primary_email`, `website`, `phone`, `timezone`, `industry`, `notes`
- `agent_run_id` (string, optional)

**Output:** `{ ok, client }`
**Flags:** audit logged

---

### upsert_client

**Group:** 3 (workflow write) | **Risk:** medium | **Approval:** required

```
POST /api/v1/upsert-client
```

Creates a client if none matches by name, or returns the existing one.

**Input:**
```json
{
  "name": "Spice Junction",
  "primary_email": "hello@spicejunction.com",
  "industry": "FMCG"
}
```

- `name` (string, required, max 200)
- `company_name`, `primary_email`, `website`, `phone`, `timezone`, `industry`, `notes` (all optional)
- `agent_run_id`, `idempotency_key` (optional)

**Output:** `{ ok, client, created: true|false }`
**Flags:** `created_by_agent = true`, audit logged, idempotent

---

### manage_tags

**Group:** 3 (workflow write) | **Risk:** low-medium | **Approval:** required

```
POST /api/v1/manage-tags
```

**Input:**
```json
{
  "task_id": "uuid",
  "add_tags": ["urgent", "diwali"],
  "remove_tags": ["backlog"]
}
```

- `task_id` / `task_title` / `source_message_id` — one required
- `add_tags` (string[], optional)
- `remove_tags` (string[], optional)
- `agent_run_id` (string, optional)

**Output:** `{ ok, tags }`
**Flags:** audit logged

---

### manage_assignees

**Group:** 3 (workflow write) | **Risk:** low-medium | **Approval:** required

```
POST /api/v1/manage-assignees
```

**Input:**
```json
{
  "task_id": "uuid",
  "add_assignees": ["Priya"],
  "remove_assignees": ["Rohan"]
}
```

- `task_id` / `task_title` / `source_message_id` — one required
- `add_assignees` (string[], optional, matched by name)
- `remove_assignees` (string[], optional, matched by name)
- `agent_run_id` (string, optional)

**Output:** `{ ok, assignees }`
**Flags:** audit logged

---

### manage_dependencies

**Group:** 3 (workflow write) | **Risk:** low-medium | **Approval:** required

```
POST /api/v1/manage-dependencies
```

**Input:**
```json
{
  "task_id": "uuid",
  "add_blocks": ["Client brand kit collection"],
  "add_blocked_by": ["Final approval from Rahul"]
}
```

- `task_id` / `task_title` / `source_message_id` — one required
- `add_blocks` (string[], optional, matched by title)
- `add_blocked_by` (string[], optional, matched by title)
- `remove_dependency_ids` (uuid[], optional)
- `agent_run_id` (string, optional)

**Output:** `{ ok, dependencies }`
**Flags:** audit logged

---

### manage_columns

**Group:** 3 (workflow write) | **Risk:** medium | **Approval:** required

```
POST /api/v1/manage-columns
```

**Input:**
```json
{
  "project_name": "Diwali Campaign 2026",
  "add_columns": ["QA Review"],
  "rename_columns": [{ "from": "Intake", "to": "Intake / Backlog" }]
}
```

- `project_id` (uuid, optional) or `project_name` (string, optional) — one required
- `add_columns` (string[], optional)
- `rename_columns` (array of { from, to }, optional)
- `agent_run_id` (string, optional)

**Output:** `{ ok, columns }`
**Flags:** audit logged

---

### create_work_stream

**Group:** 3 (workflow write) | **Risk:** low-medium | **Approval:** required

```
POST /api/v1/create-work-stream
```

**Input:**
```json
{
  "client_id": "uuid",
  "name": "Diwali Social Media",
  "project_name": "Diwali Campaign 2026",
  "summary": "All social media deliverables for Diwali"
}
```

- `client_id` (uuid, required)
- `name` (string, required, max 200)
- `project_name` (string, optional, max 200)
- `summary` (string, optional, max 2000)
- `agent_run_id` (string, optional)

**Output:** `{ ok, work_stream: { id, name } }`
**Flags:** `created_by_agent = true`, audit logged

---

### delete_task

**Group:** 4 (high-risk, deferred) | **Risk:** high (destructive) | **Approval:** required

```
POST /api/v1/delete-task
```

**Input:**
```json
{
  "task_id": "uuid"
}
```

- `task_id` / `task_title` / `source_message_id` — one required
- `agent_run_id` (string, optional)

**Output:** `{ ok, deleted: true }`
**Flags:** audit logged

---

### ingest_message

**Group:** 4 (high-risk, deferred) | **Risk:** high | **Approval:** required

```
POST /api/v1/ingest-message
```

Ingests a raw message into the Comms system via the legacy sync pipeline. Uses `lib/channels/sync` which is legacy code marked for replacement.

**Input:**
```json
{
  "channel": "whatsapp",
  "from": "+919876543210",
  "body": "Message text",
  "message_id": "msg_123"
}
```

- `channel` (string, optional, defaults to "whatsapp")
- `from` or `sender` (required)
- `body` or `text` or `message` (required)
- `message_id` / `messageId` / `id` (optional, auto-generated if missing)

**Output:** `{ ok, ingested: true, message_id }`

**Note:** This endpoint uses legacy sync code (`lib/channels/sync`). Defer until the Comms rework replaces the sync pipeline.

---

## Safety Rules

1. **Idempotency:** Same `idempotency_key` or `source_message_id` = same response, no duplicates
2. **Audit trail:** Every agent action is logged in `audit_log_events`
3. **Dedup per task:** Tasks with matching `source_message_id` are not re-created
4. **Column fuzzy match:** Column names are matched case-insensitively with partial match
5. **Client auto-create:** `create_project` requires `client_id` (use `search_clients` or `upsert_client` first)
6. **All writes marked:** `created_by_agent = true` on all agent-created records
7. **Human approval:** Group 3 and Group 4 tools require explicit human approval via persona guardrails (SOUL.md / AGENTS.md)

## Error Format

All errors return:
```json
{
  "ok": false,
  "error": { "code": "VALIDATION_ERROR", "message": "name: Required" }
}
```

Codes: `UNAUTHORIZED`, `VALIDATION_ERROR`, `INTERNAL_ERROR`, `NOT_FOUND`

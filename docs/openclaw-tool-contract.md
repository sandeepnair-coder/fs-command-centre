# OpenClaw Tool Contract — Fynd Studio Command Centre

Base URL: `https://studio.fynd.design`
Auth: `Authorization: Bearer <OPENCLAW_API_TOKEN>`
Content-Type: `application/json`

---

## Tool 1: `create_project_from_client_message`

Creates a new project board with columns and optional tasks from a WhatsApp conversation.

**Endpoint:** `POST /api/v1/create-project`

**Input:**
```json
{
  "name": "Diwali Campaign 2026",
  "description": "Full campaign including social, print, and OOH",
  "client_name": "Spice Junction",
  "brand_name": "Spice Junction",
  "due_date": "2026-10-15",
  "conversation_summary": "Client wants Diwali campaign across Instagram, print ads, and outdoor hoardings. Budget discussed at 2L. Deadline mid-Oct.",
  "source_channel": "whatsapp",
  "source_message_id": "wamid.HBgLOTE5ODc2NTQzMjEwFQI...",
  "agent_run_id": "run_abc123",
  "idempotency_key": "proj-spicejunction-diwali-2026",
  "tasks": [
    { "title": "Instagram post designs (5 creatives)", "priority": "high", "column": "Intake" },
    { "title": "Print ad layout — half page", "priority": "medium", "column": "Intake" },
    { "title": "OOH hoarding design — 20x10ft", "priority": "medium", "column": "Intake" },
    { "title": "Client brand kit collection", "priority": "high", "column": "Ready" },
    { "title": "Final approval from Rahul", "priority": "low", "column": "Client Review" }
  ]
}
```

**Output (201):**
```json
{
  "ok": true,
  "project": { "id": "uuid", "name": "Diwali Campaign 2026", "status": "active", "created_at": "..." },
  "client": { "id": "uuid", "name": "Spice Junction" },
  "columns": [{ "id": "uuid", "name": "Intake / Backlog" }, ...],
  "tasks": [{ "id": "uuid", "title": "Instagram post designs", "column": "Intake / Backlog" }, ...],
  "message": "Project \"Diwali Campaign 2026\" created with 5 tasks"
}
```

**Idempotency:** If `idempotency_key` or `source_message_id` was already used, returns 200 with `deduplicated: true` and the original response.

---

## Tool 2: `create_tasks_for_project`

Adds tasks to an existing project board.

**Endpoint:** `POST /api/v1/create-tasks`

**Input:**
```json
{
  "project_name": "Diwali Campaign 2026",
  "tasks": [
    { "title": "Sticker designs for WhatsApp", "priority": "low", "column": "Intake" },
    { "title": "Reels script — 3 variants", "priority": "high", "column": "Ready" }
  ],
  "source_channel": "whatsapp",
  "agent_run_id": "run_def456"
}
```

**Output (201):**
```json
{
  "ok": true,
  "project_id": "uuid",
  "tasks": [{ "id": "uuid", "title": "Sticker designs", "column": "Intake / Backlog", "priority": "low" }, ...],
  "message": "2 tasks created, 0 deduplicated"
}
```

---

## Tool 3: `update_task`

Updates an existing task's status, priority, description, or column.

**Endpoint:** `POST /api/v1/update-task`

**Input:**
```json
{
  "task_id": "uuid",
  "updates": {
    "column": "In Progress",
    "priority": "high",
    "description": "Client confirmed the color palette. Use #FF6B35 and #004E89."
  },
  "agent_run_id": "run_ghi789"
}
```

Can also find tasks by `source_message_id` instead of `task_id`.

---

## Tool 4: `update_project_status`

Updates project metadata or status.

**Endpoint:** `POST /api/v1/update-project`

**Input:**
```json
{
  "project_name": "Diwali Campaign 2026",
  "updates": {
    "status": "on_hold",
    "conversation_summary": "Client paused the project — budget reallocation in progress"
  },
  "agent_run_id": "run_jkl012"
}
```

---

## Tool 5: `search_existing_projects`

Checks if a project already exists before creating a new one.

**Endpoint:** `POST /api/v1/search-projects`

**Input:**
```json
{
  "query": "Diwali",
  "client_name": "Spice Junction",
  "status": "active",
  "limit": 5
}
```

**Output:**
```json
{
  "ok": true,
  "projects": [
    { "id": "uuid", "name": "Diwali Campaign 2026", "status": "active", "client": "Spice Junction", "created_at": "..." }
  ]
}
```

---

## Tool 6: `get_board_context`

Gets full board state — columns, tasks, and counts.

**Endpoint:** `POST /api/v1/get-board-context`

**Input:**
```json
{
  "project_name": "Diwali Campaign 2026",
  "include_tasks": true,
  "include_columns": true
}
```

---

## Tool 7: `add_comment_to_card`

Adds a comment to a task card from the conversation.

**Endpoint:** `POST /api/v1/add-comment`

**Input:**
```json
{
  "task_id": "uuid",
  "body": "Client confirmed: use the mango motif from last year's Holi campaign",
  "agent_run_id": "run_mno345"
}
```

---

## Error Format

All errors return:
```json
{
  "ok": false,
  "error": { "code": "VALIDATION_ERROR", "message": "name: Required" }
}
```

Codes: `UNAUTHORIZED`, `VALIDATION_ERROR`, `INTERNAL_ERROR`, `NOT_FOUND`

---

## Safety Rules

1. **Idempotency:** Same `idempotency_key` or `source_message_id` = same response, no duplicates
2. **Audit trail:** Every agent action is logged in `audit_log_events`
3. **Dedup per task:** Tasks with matching `source_message_id` are not re-created
4. **Column fuzzy match:** Column names are matched case-insensitively with partial match
5. **Client auto-create:** If client doesn't exist, it's created automatically
6. **All writes marked:** `created_by_agent = true` on all agent-created records

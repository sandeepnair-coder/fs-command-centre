# Task Management Evolution — Claude Code Prompt
## Inspired by Asana's Core Principles, Built for Fynd Studio

## Context

I have an existing Next.js app called **Fynd Studio — Command Centre** with a working Kanban board under the **Task Management** section. Before making ANY changes, scan the codebase:

```bash
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) | head -80
```

Check: routing pattern (App Router / Pages Router), CSS approach, database/ORM, existing component structure, existing task data model. Match everything to the existing patterns.

### Current State of the Kanban Board

- **Sidebar nav**: Task Management (active), Finance, Mail
- **Board selector**: dropdown (e.g., "Design project 2026")
- **4 columns**: Intake/Backlog, In Progress, In Review, Approved/Done
- **Task cards** showing: title, brand/client label, budget (₹), priority tag (high/medium), due date, comment count, assignee avatar
- **Actions**: + New Board, + Add Task, + Add Column
- Drag-and-drop between columns
- Warm, clean UI: off-white background, white cards, subtle shadows, orange for high priority, green for medium

### What I Want

Evolve this into a **rich task management system** based on Asana's core working principles. I want the **simple functioning version** — no workflow automations, no rules engine, no AI features. Just the solid foundational features that make task management powerful.

---

## Core Principle: The Task Is Everything

In Asana, the task is the fundamental unit. Everything revolves around it. Currently our task cards are thin — just a title, budget, priority, date, and assignee. We need to make the task a **rich, detailed object** while keeping the card compact on the board.

---

## Feature 1: Rich Task Detail Panel

### The Slide-Over Detail View

When a user **clicks on any task card** on the Kanban board, open a **slide-over panel from the right** (roughly 50–60% of screen width). This is the task detail view. It should NOT navigate away from the board — the board stays visible and dimmed behind it.

**The detail panel has two zones:**

**Left Zone (main content area, ~65% of panel width):**

1. **Task Title** — large, editable inline (click to edit, press Enter to save). Show a subtle pencil icon on hover.

2. **Description** — a rich text area below the title. Support basic formatting: bold, italic, bulleted lists, numbered lists, links. Use a lightweight editor (Tiptap, or even a simple textarea with markdown rendering for v1). Should have a clear placeholder: "Add a description..."

3. **Subtasks Section** — a list of subtasks below the description:
   - Each subtask is a mini-task: checkbox (complete/incomplete) + title + assignee avatar + due date
   - Click a subtask title to edit inline
   - "+ Add subtask" input at the bottom of the list (type and press Enter to add)
   - Subtasks can be reordered via drag-and-drop
   - Completed subtasks get a strikethrough and move to the bottom
   - Show a progress summary above the list: "3 of 7 subtasks complete" with a thin progress bar

4. **Attachments Section** — below subtasks:
   - Drag-and-drop file upload zone, or click to browse
   - Show uploaded files as compact cards: filename, file size, upload date, thumbnail preview for images
   - Support image, PDF, and common doc types
   - Store in the app's file storage (check existing upload mechanism)

5. **Activity / Comments Feed** — at the bottom, a chronological feed showing:
   - **System activity**: "Sandeep moved this task from Intake to In Progress — 2 hours ago", "Priority changed from medium to high — yesterday"
   - **Comments**: User-written comments with avatar, name, timestamp, and text. Support @mentions (type @ to see a user list).
   - **Comment input**: A text input at the bottom with "Write a comment..." placeholder and a Send button
   - Activity items should be visually distinct from comments (activity = muted/gray, comments = full contrast)

**Right Zone (sidebar, ~35% of panel width):**

A clean metadata sidebar with these fields, each as a compact row:

| Field | Control Type |
|-------|-------------|
| **Status** | Read-only display of current column name (e.g., "In Progress"). To change status, drag the card on the board. |
| **Assignee** | Click to open a dropdown of team members. Show avatar + name. Allow single assignee (like Asana — one owner per task). |
| **Due Date** | Date picker. Show relative date below (e.g., "in 3 days" or "2 days overdue" in red). |
| **Priority** | Dropdown: High / Medium / Low / None. Each has a colored dot indicator. |
| **Project** | Shows which board/project this task belongs to. Clickable link back to the board. |
| **Brand / Client** | Text field or dropdown of existing brands. |
| **Budget (₹)** | Number input with INR formatting. |
| **Tags** | A multi-select tag input. Show as colored chips. User can create new tags inline. |
| **Dependencies** | "Blocked by" and "Blocking" task links (see Feature 5). |
| **Created** | Read-only: date created + "by [name]" |

Each field has a label on the left and the value/control on the right, neatly aligned.

**Panel behavior:**
- Close with X button, Escape key, or clicking the dimmed background
- URL should update when task is open (e.g., `?task=abc123`) so it's shareable/bookmarkable
- Keyboard shortcut: press `Tab` to move to next task in the column, `Shift+Tab` for previous

---

## Feature 2: Custom Fields

Custom fields let users add their own structured metadata to tasks — this is what makes the system adaptable to any workflow.

### Custom Field Types

Support these field types:

| Type | UI Control | Storage |
|------|-----------|---------|
| **Text** | Single-line text input | String |
| **Number** | Number input with optional unit suffix (e.g., "hours", "₹") | Decimal |
| **Single Select** | Dropdown with color-coded options | Enum string |
| **Multi Select** | Multi-select dropdown with colored chips | Array of strings |
| **Date** | Date picker | Date |
| **Person** | User dropdown with avatar | User reference |

### How Custom Fields Work

1. **Custom fields are defined at the PROJECT (board) level.** When you add a custom field to a project, every task in that project gets that field available.

2. **Managing custom fields:**
   - Add a "⚙ Fields" button near the board header (next to the + Add Column button)
   - Clicking it opens a panel/modal: "Manage Custom Fields"
   - Here you can: Add new field (name, type, options for select types), reorder fields, remove field from project, set whether field is "shown on card" (visible on the Kanban card preview)

3. **Custom fields on task detail:**
   - In the task detail sidebar (right zone), custom fields appear below the built-in fields
   - Each custom field shows its label and an appropriate input control based on type

4. **Custom fields on Kanban cards:**
   - Fields marked "show on card" appear as small metadata items on the card, below the existing info
   - Single select fields show as colored tags (like priority does now)
   - Number fields show as small text (e.g., "⏱ 8 hours")
   - Keep it compact — max 2–3 custom fields visible on the card

5. **Custom fields in List View:**
   - Custom fields become sortable/filterable columns in the list view (see Feature 3)

### Data Model Addition

```
custom_field_definitions:
  id, project_id, name, field_type (text/number/single_select/multi_select/date/person),
  options (JSON array for select types: [{value, color, order}]),
  show_on_card (boolean), field_order (integer), created_at

task_custom_field_values:
  id, task_id, field_definition_id, value (JSON — stores the appropriate type)
```

---

## Feature 3: Multiple Project Views

Currently we only have the Kanban board view. Add two more views that show the SAME data differently. All views share the same underlying tasks and respect the same filters.

### View Toggle

Add a **view toggle** in the board header area (near the board selector). Three icon buttons in a segmented control:

- **Board** (grid icon) — current Kanban view (default)
- **List** (list icon) — table/list view
- **Calendar** (calendar icon) — month calendar view

The active view is highlighted. Switching views is instant (client-side, no reload). The URL should reflect the view: `?view=board`, `?view=list`, `?view=calendar`.

### List View

A full-width table showing all tasks from the project in rows:

**Fixed columns:** Checkbox (complete), Task Name (clickable → opens detail panel), Assignee (avatar), Due Date, Priority (colored badge), Status (column name)

**Dynamic columns:** Each custom field marked as visible becomes a column. Users should be able to show/hide columns.

**Behaviors:**
- Click any column header to sort (ascending/descending toggle)
- Rows are grouped by Section (column name) with collapsible group headers: "▼ In Progress (2 tasks)" — same order as Kanban columns
- Click a task name to open the detail panel (same slide-over as board view)
- Inline editing: click a cell to edit that value directly in the table (assignee, date, priority, custom fields)
- Drag rows to reorder within a section, or drag to a different section header to move between columns
- Row background color should subtly indicate overdue (light red) or completed (light green)

### Calendar View

A month-view calendar grid showing tasks on their due dates:

- Each day cell shows task cards as small pills: colored by priority, showing title (truncated) and assignee avatar
- Tasks with no due date appear in a sidebar section: "Unscheduled (X tasks)"
- Click a task pill to open the detail panel
- Drag a task pill to a different date to change its due date
- Navigate between months with arrow buttons
- Today is highlighted
- Days with many tasks show "3 tasks" + expand indicator

---

## Feature 4: Sections as a Shared Concept

In Asana, sections are columns in board view and group headers in list view — they're the same thing. Our current columns (Intake/Backlog, In Progress, etc.) ARE sections.

### Evolve Columns into Sections

- Sections have: **name**, **order**, **color** (optional accent color for visual grouping)
- The "..." menu on each column header should include: Rename Section, Change Color, Move Section Left/Right, Delete Section (with confirmation if tasks exist — tasks move to first section)
- When adding a column (+ Add Column), it creates a new section
- Sections are shared across views: columns in board view, group headers in list view
- Sections persist their order

### Section Task Count and Limits (optional)

- Show task count next to section name (already exists: "In Progress 2")
- Optionally set a **WIP limit** on a section (e.g., max 5 tasks in "In Review"). If exceeded, the section header shows a warning badge. This is informational, not blocking.

---

## Feature 5: Task Dependencies

Dependencies let users express relationships between tasks: "Task B is blocked by Task A" means B can't start until A is done.

### Dependency Types

Two simple types:
- **Blocked by**: This task is waiting on another task
- **Blocking**: This task is blocking another task

These are the two sides of the same relationship — if Task B is "blocked by" Task A, then Task A is "blocking" Task B.

### UX in Task Detail Panel

In the task detail sidebar, under "Dependencies":
- Show existing dependencies as linked task chips: "Blocked by: [Task A title]" (clickable to open Task A's detail)
- "Blocking: [Task C title]" (clickable)
- "+ Add dependency" button opens a task search/autocomplete — search by task title within the same project
- Remove dependency with an X button on the chip

### Visual Indicators on Board

On Kanban cards that have dependencies:
- If a task is **blocked** (has unfinished "blocked by" tasks), show a small 🔒 lock icon or a yellow "Blocked" badge on the card
- If a task is **blocking others**, show a small chain icon with count
- When hovering over a blocked task's badge, show a tooltip: "Blocked by: [Task A title]"

### Data Model

```
task_dependencies:
  id, blocking_task_id (FK), blocked_task_id (FK), created_at, created_by
```

---

## Feature 6: Tags (Cross-Project Labels)

Tags are lightweight labels that span across projects. Unlike custom fields (which are project-specific), tags can be reused everywhere.

### Tag System

- Tags are workspace-level: the same tag can be applied to tasks in any project/board
- Each tag has: **name** and **color** (from a preset palette of 8–10 colors)
- Tags appear as small colored chips on task cards and in the task detail sidebar

### Managing Tags

- In the task detail sidebar, there's a "Tags" field with a multi-select input
- Type to search existing tags or create a new one
- Creating a new tag: type the name, hit Enter, pick a color from a small palette popup

### Tags on Cards

- On Kanban cards, tags appear as small colored pills below the task title (max 3 visible, "+2 more" overflow)

### Filtering by Tags

- In the filter bar, add a "Tags" filter dropdown — multi-select from all tags
- Supports AND (task has ALL selected tags) or OR (task has ANY selected tag)

---

## Feature 7: My Tasks View

A personal view showing all tasks assigned to the current user, across ALL projects/boards.

### Accessing My Tasks

- Add a "My Tasks" link at the top of the sidebar, above "Task Management" (or within it as the first item)
- Or add it as a tab in the Task Management section

### My Tasks Layout

A list view (not board) grouped by:

**Default grouping: By Due Date**
- **Overdue** (red section header, showing count)
- **Today**
- **This Week** (next 7 days)
- **Later** (beyond 7 days)
- **No Due Date**

Each row shows: Task title, Project name (as a small colored badge — so user knows which project), Priority, Due Date, and any custom fields marked as important.

**Alternative groupings** (toggle in a dropdown):
- By Project — group tasks under their parent project name
- By Priority — group by High / Medium / Low / None

### Behaviors

- Click a task to open the detail panel (same slide-over)
- Mark tasks complete with a checkbox
- Tasks auto-remove from "My Tasks" when completed (move to a collapsible "Completed" section at the bottom)

---

## Feature 8: Project Overview

Each project (board) should have a brief overview page or section accessible from the board header.

### Project Overview Panel

Add a "ℹ Overview" tab or button near the board selector. Clicking it shows:

1. **Project Name** (editable)
2. **Project Description / Brief** — a rich text area where the PM can describe the project's scope, goals, and key information
3. **Project Status** — a manual status indicator the PM sets: On Track (green), At Risk (yellow), Off Track (red), On Hold (blue). This is separate from individual task statuses.
4. **Key Stats** (auto-calculated):
   - Total tasks / Completed tasks / Overdue tasks
   - Completion percentage with a progress bar
   - Total budget (sum of all task budgets in this project)
   - Team members (avatars of all unique assignees on this project)
5. **Milestones** — optionally mark certain tasks as milestones (a flag/toggle on the task). Milestones appear here as a checklist with dates.
6. **Recent Activity** — the last 10 actions taken in this project (task created, moved, completed, etc.)

### Status Updates

The project owner can post periodic status updates:
- A "Post Update" button on the overview
- Update form: Status (On Track/At Risk/Off Track/On Hold) + Text summary + optional task highlights
- Status updates are stored and visible as a history list on the overview
- The most recent status shows as a small colored dot on the project selector dropdown

---

## Feature 9: Enhanced Search and Filtering

### Global Quick Search

- A **search bar** in the top header (replace or enhance the existing one)
- Searches across: task titles, task descriptions, comments, tags, and assignee names
- Results grouped by project, with task title, project name, and status shown
- Click a result to open the task detail panel
- Keyboard shortcut: `/` or `Cmd+K` to focus search

### Board-Level Filters

Below the board header, add a collapsible **filter bar**:

**Filter options:**
- **Assignee** — multi-select dropdown of team members
- **Priority** — multi-select: High / Medium / Low / None
- **Due Date** — preset ranges: Overdue / Due Today / Due This Week / Due This Month / No Date
- **Tags** — multi-select from all tags used in this project
- **Custom Fields** — for each single-select or multi-select custom field, show a filter dropdown with its options
- **Completion** — toggle: Show incomplete only (default) / Show all / Show completed only

**Filter behavior:**
- Multiple filters AND together
- Active filters show as chips in the filter bar with an X to remove
- Show a count: "Showing 8 of 23 tasks"
- "Clear All" button to reset filters
- Filters persist during the session (store in URL query params)
- All views (Board, List, Calendar) respect the same filters

---

## Feature 10: Enhanced Card Interactions

### Quick Actions on Cards (No Detail Panel Needed)

When hovering over a Kanban card, show a small action bar (top-right of card):

- **✓ Complete** — checkbox to mark task done. Completed cards show with reduced opacity and strikethrough title. They remain in their column until moved or archived.
- **📅 Date** — quick date picker popup
- **👤 Assign** — quick assignee picker popup
- **⋯ More** — dropdown: Edit, Duplicate, Move to Section, Copy Link, Delete

### Quick-Add Task

The "+ Add card" at the bottom of each column should support **inline task creation**:
- Click it, and it becomes an input field right there in the column
- Type the task title, press Enter to create (with defaults: no assignee, no date, medium priority)
- Press Shift+Enter to create and immediately open the detail panel
- Press Escape to cancel

### Card Compact Mode

Since cards can now show custom fields and tags, they might get tall. Add a board-level toggle: "Compact / Detailed" that controls how much metadata cards show:
- **Compact**: Title + assignee avatar only (dense board)
- **Detailed**: Title + all visible metadata (priority, date, budget, tags, custom fields, subtask progress)

---

## Data Model Additions

Extend the existing task model with these NEW fields (don't remove anything):

```
tasks (extend existing):
  + description       - text, nullable (rich text / markdown)
  + is_completed      - boolean, default false
  + completed_at      - timestamp, nullable
  + completed_by      - string, nullable
  + parent_task_id    - FK to tasks (nullable, for subtasks)
  + sort_order        - integer (for ordering within a section)
  + is_milestone      - boolean, default false
  + created_by        - string
  + created_at        - timestamp (if not already present)
  + updated_at        - timestamp

tags:
  id, name, color, workspace_id (or global), created_at

task_tags:
  id, task_id, tag_id

task_dependencies:
  id, blocking_task_id, blocked_task_id, created_at, created_by

task_attachments:
  id, task_id, filename, file_url, file_size, mime_type, uploaded_by, created_at

task_comments:
  id, task_id, author, text, created_at, updated_at

task_activity_log:
  id, task_id, actor, action (e.g., "moved", "assigned", "priority_changed"),
  old_value, new_value, created_at

custom_field_definitions:
  id, project_id, name, field_type, options (JSON), show_on_card, field_order, created_at

task_custom_field_values:
  id, task_id, field_definition_id, value (JSON), updated_at

project_status_updates:
  id, project_id, status (on_track/at_risk/off_track/on_hold),
  text, author, created_at

projects (extend existing board model):
  + description       - text, nullable
  + current_status    - enum (on_track/at_risk/off_track/on_hold), default on_track
```

---

## API Endpoints to Create

```
# Tasks (extend existing)
GET    /api/tasks?project_id=X&assignee=X&tags=X    (list with filters)
POST   /api/tasks                                     (create)
GET    /api/tasks/[id]                                (full detail with subtasks, comments, custom fields)
PUT    /api/tasks/[id]                                (update any field)
DELETE /api/tasks/[id]                                (soft delete)
POST   /api/tasks/[id]/complete                       (mark complete)
POST   /api/tasks/[id]/reorder                        (change sort_order within section)

# Subtasks
GET    /api/tasks/[id]/subtasks                       (list subtasks)
POST   /api/tasks/[id]/subtasks                       (create subtask)

# Comments & Activity
GET    /api/tasks/[id]/activity                       (comments + activity feed, merged chronologically)
POST   /api/tasks/[id]/comments                       (add comment)

# Attachments
GET    /api/tasks/[id]/attachments
POST   /api/tasks/[id]/attachments                    (file upload)
DELETE /api/attachments/[id]

# Dependencies
POST   /api/tasks/[id]/dependencies                   (add dependency)
DELETE /api/dependencies/[id]

# Tags
GET    /api/tags                                       (all tags)
POST   /api/tags                                       (create tag)
POST   /api/tasks/[id]/tags                           (add tag to task)
DELETE /api/tasks/[id]/tags/[tag_id]                   (remove tag)

# Custom Fields
GET    /api/projects/[id]/custom-fields                (field definitions for project)
POST   /api/projects/[id]/custom-fields                (create field definition)
PUT    /api/custom-fields/[id]                         (update definition)
DELETE /api/custom-fields/[id]
PUT    /api/tasks/[id]/custom-fields/[field_id]        (set value)

# Project Overview
GET    /api/projects/[id]/overview                     (stats, brief, status)
PUT    /api/projects/[id]                              (update description, status)
POST   /api/projects/[id]/status-updates               (post status update)

# My Tasks
GET    /api/my-tasks?user_id=X                        (all tasks assigned to user across projects)

# Search
GET    /api/search?q=X&project_id=X                   (global search)
```

---

## Component Structure

```
components/tasks/
  TaskBoard.tsx              (existing Kanban, enhanced)
  TaskCard.tsx               (enhanced card with custom fields, tags, deps)
  TaskDetailPanel.tsx        (the slide-over detail view)
  TaskDescription.tsx        (rich text editor)
  SubtaskList.tsx            (subtasks with checkboxes)
  ActivityFeed.tsx           (comments + system activity)
  CommentInput.tsx
  AttachmentSection.tsx

  views/
    ListView.tsx             (table view)
    CalendarView.tsx         (month calendar)
    ViewToggle.tsx           (board/list/calendar switcher)

  fields/
    CustomFieldManager.tsx   (manage field definitions)
    CustomFieldRenderer.tsx  (render appropriate input per type)
    CustomFieldCard.tsx      (compact display on cards)

  filters/
    FilterBar.tsx
    TagFilter.tsx
    AssigneeFilter.tsx
    DateFilter.tsx

  project/
    ProjectOverview.tsx
    StatusUpdateForm.tsx
    ProjectStats.tsx

  MyTasks.tsx                (personal task view)
  DependencyPicker.tsx
  TagPicker.tsx
  QuickSearch.tsx
```

---

## Build Order

1. **Task detail panel** — the slide-over with description, metadata sidebar, and close behavior. Wire it to open when clicking any card. This is the foundation everything else builds on.

2. **Subtasks** — add subtask data model, list in detail panel, progress indicator on cards.

3. **Comments & activity feed** — comment input, activity log, merged feed in detail panel.

4. **Tags** — tag model, tag picker in detail panel, tag display on cards, tag filter.

5. **Custom fields** — field definitions per project, field management UI, field values on tasks, display on cards and in detail panel.

6. **List view** — table view with sortable columns, section grouping, inline editing. Add view toggle.

7. **Calendar view** — month grid, task pills on dates, drag to reschedule.

8. **Dependencies** — dependency model, dependency picker in detail panel, blocked indicator on cards.

9. **Enhanced filters** — filter bar with assignee, priority, date, tags, custom fields. Wire to all views.

10. **My Tasks** — personal task view grouped by date, across all projects.

11. **Project overview** — description, status, stats, status updates.

12. **Attachments** — file upload, display in detail panel.

13. **Polish** — keyboard shortcuts, compact/detailed toggle, quick actions on hover, empty states.

After each step, verify:
- Existing drag-and-drop still works
- Sidebar navigation still works
- Cards render correctly with new data
- Detail panel opens and closes cleanly

---

## What NOT to Do

- Don't build workflow automation or rules engine — that's a future phase
- Don't build a notification system — just log activity, notification comes later
- Don't change the sidebar or top header layout
- Don't rewrite the existing Kanban drag-and-drop — enhance it
- Don't use a heavy rich text editor — Tiptap or simple markdown is fine for v1
- Don't add user management / auth — use the existing user system
- Don't add time tracking — that's a future phase
- Don't build forms / intake forms — future phase
- Don't build portfolios / cross-project views (other than My Tasks) — future phase
- Don't use USD — everything is ₹ with Indian number formatting (₹1,20,000)

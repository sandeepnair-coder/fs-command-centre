# Phase 1 — Task Management Kanban

## In-scope folders
| Folder | Purpose |
|--------|---------|
| `app/(app)/tasks/**` | Page route, server actions |
| `components/modules/tasks/**` | All task UI components |
| `lib/tasks/**` | Shared task utilities (position calc) |
| `lib/types/tasks.ts` | TypeScript types for task domain |
| `supabase/**` | Migrations (only when DB changes needed) |

## Out-of-scope folders
| Folder | Reason |
|--------|--------|
| `app/(app)/finance/**` | Phase 2 |
| `app/(app)/mail/**` | Phase 3 |
| `components/modules/finance/**` | Phase 2 |
| `components/modules/mail/**` | Phase 3 |
| `components/layout/**` | Global layout — shared across phases |
| `components/ui/**` | shadcn primitives — install via CLI, never edit by hand |
| `app/layout.tsx` | Root layout — off-limits |
| `lib/supabase/**` | Stable infrastructure |

## Key files

### Server actions
- `app/(app)/tasks/actions.ts` — all Supabase CRUD for tasks, boards, columns, clients, assignees, comments, attachments, links

### Components
- `components/modules/tasks/kanban/KanbanShell.tsx` — top-level shell: board selector, toolbar, board delete, client filter, add task dialog
- `components/modules/tasks/kanban/KanbanBoard.tsx` — DnD context, column rendering, task sheet, column move handler
- `components/modules/tasks/kanban/KanbanColumn.tsx` — single column: droppable, header with menu (rename, WIP, desc, move, delete), quick-add card
- `components/modules/tasks/kanban/KanbanCard.tsx` — single card: sortable, priority badge, due date, assignee avatar, tooltip
- `components/modules/tasks/kanban/TaskSheet.tsx` — right panel sheet: title edit, fields, description, attachments, links, comments, delete task
- `components/modules/tasks/new-project-dialog.tsx` — NewBoardDialog (create board)
- `components/modules/tasks/new-client-dialog.tsx` — standalone client dialog (may be unused now — candidate for cleanup)

### Types
- `lib/types/tasks.ts` — TaskPriority, ProjectColumn, Task, TaskAssignee, TaskComment, TaskAttachment, TaskLink, Profile

### Utilities
- `lib/tasks/position.ts` — `getInsertPosition()` for fractional ordering

## DB schema (Supabase project: bjudnbrcmayvppbtcjio)
| Table | Key columns |
|-------|------------|
| `projects` | id, client_id (nullable), name, status, due_date, description, created_at |
| `project_columns` | id, project_id (FK cascade), name, position, wip_limit, description |
| `tasks` | id, project_id (FK cascade), column_id (FK cascade), client_id (nullable), title, description, priority, due_date, position, created_by, created_at, updated_at |
| `task_assignees` | task_id (FK cascade), user_id |
| `task_comments` | id, task_id (FK cascade), author_id, body, created_at |
| `task_attachments` | id, task_id (FK cascade), storage_path, file_name, created_at |
| `task_links` | id, task_id (FK cascade), url, label, created_at |
| `clients` | id, name, notes |
| `profiles` | id, full_name, avatar_url |

### RPC functions
- `move_task(p_task_id, p_new_column_id, p_new_position)` — atomic task move
- `swap_column_positions(p_col_a, p_pos_a, p_col_b, p_pos_b)` — atomic column swap

### Triggers
- `tasks_set_updated_at` — auto-updates `updated_at` on task row changes

## Known safe-to-delete patterns
- `components/modules/tasks/new-client-dialog.tsx` — if no longer imported anywhere in scope (client creation moved inline to Add Task dialog)
- Any `fs_kanban_project` localStorage references — replaced by `fs_kanban_board`
- `NewProjectDialog` references — replaced by `NewBoardDialog`

## Current open tickets
_None — Phase 1 feature work complete. Ready for cleanup pass or new tickets._

## Completed work
- [x] Kanban-only rewrite with @dnd-kit
- [x] 7 default creative workflow columns
- [x] Fractional positioning with midpoint insertion
- [x] Task sheet with all sections (title, fields, description, attachments, links, comments)
- [x] Column rename, WIP limit, description, delete
- [x] Column move left/right
- [x] Card creation with client + assignee + priority + due date
- [x] Inline "Create new client" in Add Task dialog
- [x] Board create (without client requirement) and delete (cascade)
- [x] Client filter at board level
- [x] Card styling (subtle bg tint) + tooltip with created_at
- [x] Timestamps: sheet header (updated_at), attachments (created_at)
- [x] UI terminology: "Board" everywhere (not "Project")
- [x] Delete task with confirmation dialog
- [x] DRI avatar on card
- [x] Color theme switcher (11 themes)

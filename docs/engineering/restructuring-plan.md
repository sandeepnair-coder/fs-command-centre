# Fynd Studio Command Centre — Restructuring Plan

> **Status:** Approved
> **Date:** 2026-05-12
> **Approach:** Incremental, module-by-module. No big-bang rewrites. No new architectural layers.

---

## Why This Exists

An architectural audit revealed three structural failures that compound into every feature change:

1. **Shell components are god objects** — CommsShell (1,155 lines), ClientsShell (1,018), KanbanShell (961) each own layout, state, business logic, and 5-8 inline dialogs in a single file
2. **Identical queries copy-pasted 4-6 times** — client fetching, member fetching, audit logging, signed URL generation, column-done detection all duplicated across action files
3. **Zero tests** — no safety net for refactoring 3,000+ lines of code

The codebase also has a well-designed service layer (`lib/services/`) that only the API routes use. Server actions bypass it entirely. But this is **by design** — services serve the agent/API consumer (fuzzy name resolution, idempotency, batch operations) while actions serve the React UI (exact IDs, single operations, optimistic update shapes). They are parallel layers for different consumers, not duplicates.

---

## Guiding Principles

1. **Tests before refactoring.** Characterization tests on critical server actions before touching any production code.
2. **Shared components before Shell decomposition.** Extract reusable presentational components first — otherwise identical markup gets duplicated into the new smaller files.
3. **Each dialog is a self-contained action component.** It manages its own form state, calls its own server actions, shows its own toasts, and fires a single `onDone` callback. The Shell never knows dialog internals.
4. **Actions and services stay parallel.** Don't force actions to delegate to services — they serve different consumers. Eliminate duplication by extracting shared queries both layers import.
5. **Keep the 2-wave query pattern.** The current `getColumns()` uses 2 rounds of parallel queries (not N+1). It's already efficient. Don't rewrite to nested selects — PostgREST denormalization would make it slower.
6. **Each phase is independently shippable.** Every module decomposition is a separate PR. If one stalls, revert and continue with the next.

---

## Phase 0 — Safety Net

**Goal:** Test coverage on the paths we're about to refactor.

**Duration:** 2-3 days

### 0.1 Set up Vitest

| File | Action |
|------|--------|
| `vitest.config.ts` | Create — configure with `@/` path alias |
| `package.json` | Add `vitest`, `@testing-library/react`, `@testing-library/jest-dom` as devDependencies |
| `package.json` | Add scripts: `"test": "vitest run"`, `"test:watch": "vitest"` |

### 0.2 Characterization tests (20 tests)

Smoke tests that verify "does the function return the right shape" against mocked Supabase. Mock only `createClient()` from `lib/supabase/server.ts`.

| Test file | Functions covered |
|-----------|-------------------|
| `__tests__/actions/tasks-actions.test.ts` | `getClients`, `getProjects`, `getColumns`, `createTask`, `moveTask`, `getTaskDetail`, `getProfiles` |
| `__tests__/actions/comms-actions.test.ts` | `getConversations`, `getMessages`, `updateConversationStatus`, `linkConversationToClient` |
| `__tests__/actions/clients-actions.test.ts` | `getClientStats`, `createClientFull`, `deleteClient` |
| `__tests__/actions/finance-actions.test.ts` | `getFinanceOverview`, `createExpense`, `createInvoice` |

---

## Phase 1 — Shared Foundations

**Goal:** Extract reusable utilities and components BEFORE touching Shells.

**Duration:** 3-4 days

### 1.1 Consolidate duplicated data queries

**New file:** `lib/data/shared-lookups.ts`

```typescript
// Replaces 5+ copies across action files
export async function getClientOptions(): Promise<{ id: string; name: string }[]>

// Replaces 6+ copies across action files
export async function getActiveMembers(): Promise<Profile[]>

// Replaces 3+ copies of signed URL loop
export async function generateSignedUrls(bucket: string, paths: string[]): Promise<Record<string, string>>

// Replaces 3+ copies of column-done check
export function isCompletionColumn(columnName: string): boolean
```

**Updates required:** Every action file that inlines these queries switches to importing from `lib/data/shared-lookups.ts`. Both the server actions and the service layer import from here — eliminating duplication without forcing a delegation chain.

### 1.2 Single audit module

**New file:** `lib/audit.ts`

Replaces three independent copies:
- `lib/services/task-service.ts:55-61` — `audit()` helper
- `lib/services/client-service.ts` — inline audit insert
- `app/(app)/clients/actions.ts:495-511` — `logAudit()` helper

### 1.3 Extract shared presentational components

| New file | Replaces | Reuses |
|----------|----------|--------|
| `components/shared/client-avatar.tsx` | 4+ inline "first letter in colored circle" blocks | `lib/utils/avatar.ts` (`getAvatarColor`, `getInitials`) |
| `components/shared/member-avatar.tsx` | Avatar image + fallback initial pattern | `lib/utils/avatar.ts` |
| `components/shared/priority-badge.tsx` | 3+ inline priority dot + label | `PRIORITY_CONFIG` from `lib/types/comms.ts` |
| `components/shared/status-badge.tsx` | 3+ inline status badge blocks | `STATUS_CONFIG` from `lib/types/comms.ts` |
| `components/shared/stat-card.tsx` | Metric cards in CommandCentre (5) + Finance (9) | — |
| `components/shared/empty-state.tsx` | 6+ inline empty states | `EMPTY` from `lib/copy.ts` |

---

## Phase 2 — Decompose Shells

**Goal:** Break god-object Shell components into focused, composable pieces.

**Duration:** 1-2 weeks

**Order:** CommsShell (worst), then KanbanShell, then ClientsShell. Each is a separate PR with its own rollback path.

### 2.1 CommsShell (1,155 -> ~300 lines)

**Current problems:** 8 inline dialogs, 3-pane layout in one file, demo data hardcoded, generic `Record<string, string>` for all form state.

**Target structure:**

```
components/modules/comms/
  CommsShell.tsx              300 lines — layout skeleton + data loading + dialog orchestration
  ThreadList.tsx              Left pane — channel tabs, quick filters, search, conversation list
  MessageTimeline.tsx         Center pane — message bubbles, inline actions
  CrmInsightPanel.tsx         Right pane — client snapshot, AI summary, asks/decisions, actions
  WhatsAppReplyBox.tsx        Already at bottom of file — extract to own file
  dialogs/
    CreateTaskDialog.tsx      Self-contained action component
    CreateProjectDialog.tsx
    SaveFactDialog.tsx
    AddContactDialog.tsx
    SetFollowUpDialog.tsx
    LinkClientDialog.tsx
    CreateClientDialog.tsx
```

**Dialog pattern (replaces generic contract):**

Each dialog is a self-contained action component. It owns its form state, calls its own server actions, shows its own toasts, and fires a callback when done. The Shell never manages dialog-internal state.

```typescript
// Example: CreateTaskDialog
type CreateTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  clientId: string | null;
  messageId?: string;
  messagePreview?: string;
  onTaskCreated?: (taskId: string) => void;  // Shell refreshes data on this
};
```

The Shell's dialog orchestration becomes:

```typescript
// Shell just tracks which dialog is open and passes minimal seed data
const [activeDialog, setActiveDialog] = useState<string | null>(null);
const [dialogSeed, setDialogSeed] = useState<{ messageId?: string; messagePreview?: string }>({});

// In JSX:
<CreateTaskDialog
  open={activeDialog === "create_task"}
  onOpenChange={(open) => !open && setActiveDialog(null)}
  conversationId={selectedId}
  clientId={selected?.client_id ?? null}
  messageId={dialogSeed.messageId}
  messagePreview={dialogSeed.messagePreview}
  onTaskCreated={() => { setActiveDialog(null); refreshConversation(); }}
/>
```

**Demo data:** Move `DEMO_CONVERSATIONS` and `DEMO_MESSAGES` to `lib/fixtures/comms-demo.ts`.

### 2.2 KanbanShell (961 -> ~250 lines)

**Current problems:** 25+ `useState` hooks, 170-line inline Add Task dialog, inline Add Column popover, inline Rename/Delete dialogs.

**Target structure:**

```
components/modules/tasks/kanban/
  KanbanShell.tsx              250 lines — board selector + view switching + data loading
  TaskSheetWrapper.tsx         Already semi-separated (lines 875-960) — make a proper file
  dialogs/
    AddTaskDialog.tsx          Lines 552-724 extracted. Self-contained.
    AddColumnPopover.tsx       Lines 727-769 extracted
    RenameBoardDialog.tsx      Lines 502-528 extracted
```

**State ownership after decomposition:**

KanbanShell owns:
- `selectedProjectId`, `columns`, `projects`, `clients`, `profiles` (data)
- `viewMode`, `showAnalytics`, `filters` (view state)
- `subtasksMap` (shared across views)
- `refreshBoard()` callback

KanbanShell does NOT own (moved to child components):
- `addColOpen`, `addColName` -> AddColumnPopover
- `addTaskOpen`, `newTaskTitle`, `newTaskPriority`, `newTaskColumnId`, `newTaskAssigneeId`, `newTaskDueDate`, `newTaskClientId`, `newTaskManagerId`, `newTaskCreating` -> AddTaskDialog
- `renameOpen`, `renameName` -> RenameBoardDialog
- `deleting` -> delete AlertDialog
- `selectedTaskIdForSheet` -> TaskSheetWrapper

Eliminates 15+ `useState` hooks from the Shell.

### 2.3 ClientsShell (1,018 -> ~200 lines)

**Current problems:** 70-field `IntakeForm` type inline, 6-section wizard inline.

**Target structure:**

```
components/modules/clients/
  ClientsShell.tsx                 200 lines — grid + search + selection state
  ClientGrid.tsx                   Card grid with select/deselect, bulk actions
  dialogs/
    AddClientDialog.tsx            Tabbed form — orchestrates the 3 tabs below
    intake/
      QuickIntakeTab.tsx           Basic fields (name, email, phone, industry)
      AdvancedIntakeTab.tsx        Brand, contacts, intelligence sections
      BillingIntakeTab.tsx         All billing/tax fields
```

**`IntakeForm` type** moves to `lib/types/clients.ts` (new file) — it's a domain type, not a component concern.

---

## Phase 3 — Slim Down Action Files

**Goal:** Reduce action file sizes by using shared lookups from Phase 1.1. Keep actions and services as parallel layers.

**Duration:** 1 week

**Key insight:** Actions serve the React UI (exact IDs from dropdowns, optimistic update shapes, `revalidatePath`). Services serve the OpenClaw/agent API (fuzzy name resolution, idempotency, batch operations). They are NOT duplicates — they're parallel layers for different consumers. The duplication is in the underlying queries, which Phase 1.1 already centralizes.

### 3.1 tasks/actions.ts (803 -> ~500 lines)

| Change | What |
|--------|------|
| `getClients()` | Replace inline query with `getClientOptions()` from shared-lookups |
| `getProfiles()` | Replace inline query with `getActiveMembers()` from shared-lookups |
| `getTaskDetail()` | Use `generateSignedUrls()` from shared-lookups for attachment URLs |
| `getOutputsByClient()` | Use `generateSignedUrls()` from shared-lookups |
| All signed URL loops | Replace with shared utility |

Functions like `createTask()`, `getColumns()`, `moveTask()` stay in actions — they return UI-specific shapes that don't match the service layer contract.

### 3.2 clients/actions.ts (511 -> ~350 lines)

| Change | What |
|--------|------|
| `logAudit()` helper | Replace with `lib/audit.ts` import |
| `getClientStats()` thumbnail loop | Use `generateSignedUrls()` from shared-lookups |
| Client option queries in other files | Replace with `getClientOptions()` |

### 3.3 command-centre/actions.ts (638 -> ~450 lines)

| Change | What |
|--------|------|
| `buildContextSnapshot()` | Inline queries for task counts, client counts etc. — reuse shared-lookups where possible |
| Duplicate member queries | Replace with `getActiveMembers()` |

### 3.4 comms/actions.ts (342 lines — already reasonable)

Minor: replace inline client/member queries with shared-lookups.

---

## Phase 4 — Targeted Query Optimization

**Goal:** Fix specific expensive queries now that shared utilities exist. Do NOT rewrite the overall query architecture.

**Duration:** 3-5 days

### 4.1 `getClientStats()` in clients/actions.ts

**Current problem (lines 357-419):** Fetches all clients, all tasks, all conversations in 3 parallel queries. Then loops over every client's tasks to find outputs and generate signed URLs one-by-one.

**Fix:** Batch the signed URL generation using the shared `generateSignedUrls()` utility. Collect all output paths first, generate all URLs in one batch, then distribute by client.

### 4.2 `getColumns()` in tasks/actions.ts — leave the structure, reduce queries

**Current pattern (lines 107-240):** 2 waves of parallel queries (4 + 7 = 11 queries, 2 round-trips).

**Why NOT rewrite to nested selects:** Supabase PostgREST denormalizes nested results. A task with 3 assignees and 2 tags becomes 6 rows. For 50 tasks, the response balloons to ~200+ rows and requires client-side re-normalization anyway. The current 2-wave approach is already efficient.

**What to optimize instead:**
- Merge `task_assignees` + `members` into a single query with join: `task_assignees(task_id, user_id, members(full_name, avatar_url))`
- This eliminates the manual `memberMap` construction (lines 132-148)
- Net result: 10 queries in 2 waves instead of 11 — modest but clean

### 4.3 `buildContextSnapshot()` in command-centre/actions.ts

**Current:** 5 separate queries to build AI context string. Some overlap with `getSnapshotMetrics()` queries in the same file.

**Fix:** Share query results between `getSnapshotMetrics()` and `buildContextSnapshot()` when called in the same request.

---

## Phase 5 — Verification & Cleanup

**Goal:** Prove nothing broke. Delete dead code.

**Duration:** 2-3 days

### 5.1 Automated checks

```bash
npm test          # All 20+ characterization tests must pass
npm run build     # Zero TypeScript errors, zero unused import warnings
npm run lint      # Clean lint
```

### 5.2 Manual smoke test

| Route | Verify |
|-------|--------|
| `/tasks` | Board loads, cards render, Add Task dialog works, all 5 view modes render, drag-and-drop works |
| `/comms` | Thread list loads, message timeline renders, all 7 action dialogs work, WhatsApp reply box sends |
| `/clients` | Grid loads, Add Client dialog (Quick + Advanced + Billing tabs) works, profile page loads |
| `/command-centre` | All 5 metric cards render, critical items feed, Ask Tessa panel |
| `/finance` | Overview KPIs render, all 4 sub-tabs load (invoices, expenses, POs, projects) |
| `/settings` | Profile, Members, Connectors, Integrations pages all load |

### 5.3 Dead code cleanup

- Move demo data from CommsShell to `lib/fixtures/`
- Delete replaced query functions from action files (now in shared-lookups)
- Delete replaced audit helpers (now in `lib/audit.ts`)
- Remove orphaned imports

---

## Rollback Strategy

Each phase is a separate branch/PR. If any phase introduces regressions:

1. Revert the PR
2. Continue with the next phase (they're independent after Phase 1)
3. Revisit the failed phase with a narrower scope

Phase 1 (shared foundations) must land before Phase 2 (Shell decomposition) starts. Phases 2.1, 2.2, 2.3 are independent of each other. Phase 3 depends on Phase 1 only. Phase 4 is fully independent.

---

## Impact Summary

| Metric | Before | After |
|--------|--------|-------|
| CommsShell.tsx | 1,155 lines | ~300 lines |
| KanbanShell.tsx | 961 lines | ~250 lines |
| ClientsShell.tsx | 1,018 lines | ~200 lines |
| tasks/actions.ts | 803 lines | ~500 lines |
| clients/actions.ts | 511 lines | ~350 lines |
| Duplicated query patterns | 6 patterns x 4+ copies | 0 |
| Test files | 0 | 4+ |
| Shared presentational components | 0 | 6 |

### New files created (~18)

```
__tests__/actions/              4 test files
lib/data/shared-lookups.ts      Shared query utilities
lib/audit.ts                    Single audit module
lib/types/clients.ts            IntakeForm type (moved from ClientsShell)
lib/fixtures/comms-demo.ts      Demo data (moved from CommsShell)
components/shared/              6 shared presentational components
components/modules/comms/       4 extracted pane components
components/modules/comms/dialogs/   7 dialog components
components/modules/tasks/kanban/dialogs/  3 dialog components
components/modules/clients/dialogs/       1 dialog + 3 intake tabs
```

### What this plan does NOT do

- No new database migrations. Schema is fine.
- No new architectural layers. No repositories, no state management library, no ORM.
- No UI redesign. Every screen looks exactly the same after refactoring.
- No dependency changes (beyond Vitest for testing).
- No deployment changes. Same Vercel pipeline, same env vars.
- No forced delegation from actions to services. They serve different consumers.
- No PostgREST nested select rewrite. The 2-wave query pattern is already sound.

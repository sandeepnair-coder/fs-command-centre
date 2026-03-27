# Fynd Studio — UX Writing Guide

> **Voice:** Fun, energetic, clear. Like a sharp teammate who doesn't waste your time but keeps things light.
>
> **Personality archetype:** Smart friend who's great at their job, cracks a joke when things go sideways, and celebrates small wins with you.

---

## Voice Principles

| Principle | What it means | Example |
|-----------|--------------|---------|
| **Clear first** | Never sacrifice clarity for cleverness. Say what happened. | "Column deleted" not "Poof! Gone!" |
| **Warm, not wacky** | Personality lives in the edges — empty states, errors, confirmations. Core actions stay crisp. | Button: "Add Task" (crisp). Empty state: "Nothing here yet. Create your first board and let's get moving." (warm) |
| **Brief is beautiful** | One short sentence beats two medium ones. | "Board created" not "Your new board has been successfully created." |
| **Honest about failure** | When something breaks, own it plainly. No corporate fluff. | "Couldn't save that. Give it another shot?" not "An unexpected error occurred." |
| **Celebrate momentum** | Small wins deserve a nod. Not confetti — a nod. | "Task created. Keep 'em coming." |

---

## Tone Spectrum

Different moments call for different energy levels. The personality stays consistent — the intensity shifts.

```
Chill ◻◻◼◼◼◼◼◻◻◻ Hype

       ↑               ↑
  Error states    Success / empty states
  Confirmations   Onboarding moments
  Loading         First-time actions
```

- **Errors:** Calm, helpful, a touch of lightness. Never blame the user.
- **Successes:** Quick fist-bump energy. One line, move on.
- **Empty states:** Friendly invitation. Make the user want to fill the space.
- **Confirmations:** Straight and serious. Destructive actions need clarity, not comedy.
- **Loading:** Brief, optional personality. Don't distract.

---

## Copy Patterns by State

### Success Toasts

Short. Affirmative. Optional flavor word.

| Current | Rewritten |
|---------|-----------|
| Board created | Board created. Let's go. |
| Task created | Task added. |
| Board deleted | Board deleted. Clean slate. |
| Task deleted | Task removed. |
| Column deleted | Column gone. |

**Pattern:** `{Thing} {past-tense verb}. {Optional 2-3 word kicker}.`

> Keep kickers to ~30% of toasts. If every toast has personality it stops feeling special.

---

### Error Toasts

Acknowledge failure → say what went wrong (briefly) → suggest retry or next step.

| Current | Rewritten |
|---------|-----------|
| Failed to create board | Couldn't create the board. Try again? |
| Failed to create task | That task didn't save. Give it another shot. |
| Failed to move task | Drag didn't stick. Try moving it again. |
| Failed to rename column | Rename didn't go through. Try again? |
| Failed to delete column | Couldn't delete that column. Try again in a sec. |
| Failed to set WIP limit | WIP limit didn't save. One more try? |
| Failed to save description | Description didn't save. Try again? |
| Failed to upload attachment | Upload failed. Check the file and try again. |
| Failed to add comment | Comment didn't post. Give it another go. |
| Failed to add link | Link didn't save. Double-check the URL? |
| Failed to update title | Title update didn't stick. Try again. |
| Failed to move column | Column didn't budge. Try again? |
| WIP limit must be a positive number | WIP limit needs to be 1 or higher. |
| Cannot delete column with tasks. Move or delete them first. | Can't delete a column that has tasks. Move or remove them first. |

**Pattern:** `{Thing} didn't {verb}. {Friendly retry suggestion}.`

**Rules:**
- Never say "Error:" or "An error occurred."
- Never say "unexpected." If it happened, it's expected enough to handle.
- Never blame the user. "Invalid input" → "That doesn't look right."

---

### Empty States

The most important personality moment. An empty state is a blank canvas — make it inviting, not lonely.

| Location | Current | Rewritten |
|----------|---------|-----------|
| No board selected | Select a board to get started. | Pick a board to dive in — or create a fresh one. |
| Board with no tasks | *(none — just empty columns)* | *(Column footer already has "Add card" — this is fine)* |
| No columns on board | *(none)* | This board is wide open. Add your first column to get organized. |
| No comments on task | *(none)* | No comments yet. Start the conversation. |
| No attachments | *(none)* | No files attached. Drop one in. |
| No links | *(none)* | No links yet. Add a reference. |
| No assignee | Unassigned | Unassigned — grab it if it's yours. |
| Client filter — no results | *(none)* | No tasks for this client yet. |

**Pattern:** `{Acknowledge the empty} + {Invite action}.`

**Rules:**
- Always pair "nothing here" with a nudge toward the next action.
- Don't use sad language ("Unfortunately," "Sorry,"). Empty is opportunity.
- One sentence max. Two if the action needs context.

---

### Confirmation Dialogs (Destructive Actions)

Personality takes a back seat. Clarity and honesty come first. The user is about to delete something — respect the weight of that.

| Action | Title | Description |
|--------|-------|-------------|
| Delete board | Delete "{name}"? | This permanently deletes the board and everything in it — columns, tasks, comments, attachments, links. No undo. |
| Delete task | Delete "{title}"? | This permanently removes the task and all its attachments, comments, and links. No undo. |
| Delete column | *(inline — prevented if tasks exist)* | Can't delete a column that has tasks. Move or remove them first. |

**Pattern:**
- Title: `Delete "{name}"?` — always include the thing's name in quotes.
- Body: State exactly what will be lost. End with "No undo." — two words that carry weight.
- Confirm button: `Delete` (destructive variant). Never "OK" or "Yes."
- Cancel button: `Cancel`. Never "No" or "Go back."

---

### Loading States

Keep loading copy invisible or ultra-brief. The user doesn't care about your loading state — they care about what comes after.

| Location | Copy |
|----------|------|
| Board loading | Loading board... |
| General spinner | *(no text — just spinner)* |
| Button in-progress | Creating... / Deleting... / Uploading... / Posting... |

**Rules:**
- Buttons: Use `{Verb}ing...` pattern. "Creating..." not "Please wait..."
- Never say "Please wait." The spinner says that.
- If loading takes >3s, consider a subtle message: "Still on it..." (not implemented yet — future consideration).

---

### Placeholder Text

Placeholders guide without instructing. They're suggestions, not commands.

| Field | Current | Rewritten |
|-------|---------|-----------|
| Board name | Website Redesign | e.g., Website Redesign |
| Board description | What is this board for? | What's this board about? |
| Task title (quick add) | Task title... | What needs doing? |
| Task title (dialog) | Task title... | What needs doing? |
| Column name | Column name... | e.g., In Progress |
| Description field | Add a description... | Add some context... |
| Link URL | https://... | Paste a URL... |
| Link label | Label (optional) | Label (optional) |
| Comment | Write a comment... | Say something... |
| WIP limit | Leave empty to remove | Leave blank to remove limit |
| Column description | What belongs here... | What goes in this column? |
| Client name (inline) | Client name... | Client name |

**Rules:**
- Use lowercase (except proper nouns). Placeholders are quiet.
- Use "e.g.," for example-based placeholders. Don't just put the example raw — the user might think it's pre-filled.
- End with "..." only when it implies continuation. "Paste a URL..." works. "Client name..." is weird — just "Client name."
- Never use "Enter your..." — it's patronizing. The input field makes it obvious.

---

### Button Labels

Buttons are verbs. They describe what happens when you click.

| Context | Label |
|---------|-------|
| Primary create | Create Board / Create Task |
| Quick add | Add / Add card |
| In-progress | Creating... / Deleting... / Uploading... |
| Destructive | Delete / Delete Board / Delete Task |
| Secondary | Cancel |
| Save changes | Save |
| Upload file | Upload |
| Post comment | Comment |
| Add link | Add Link |

**Rules:**
- Primary buttons: `{Verb} {Noun}` — "Create Board" not "Submit."
- Never "Submit." Never "OK." Never "Yes."
- Loading state: `{Verb}ing...` — "Creating..." not "Loading..."
- Destructive buttons use the destructive variant and say exactly what they destroy.

---

### Labels & Section Headers

| Element | Style | Example |
|---------|-------|---------|
| Form labels | Title case, no colon | Title, Status, Priority |
| Section headers with count | Title case + count in parens | Attachments (3), Comments (12) |
| Page title | Title case | Task Management |
| Page subtitle | Sentence case, period | Manage boards and tasks. |

---

### Time Display

| Duration | Display |
|----------|---------|
| < 1 min | just now |
| 1–59 min | {n}m ago |
| 1–23 hrs | {n}h ago |
| 1–29 days | {n}d ago |
| 30+ days | {n}mo ago |

Prefix with context: "Created 5m ago" / "Last updated 2h ago"

---

## Anti-Patterns (Don't Do This)

| Bad | Why | Good |
|-----|-----|------|
| An unexpected error occurred. | Corporate, unhelpful | Couldn't save that. Try again? |
| Success! Your board has been created. | Over-explains | Board created. |
| Are you sure you want to delete? | Vague — delete what? | Delete "Sprint 4"? |
| Please wait while we process... | User doesn't care about your process | Creating... |
| Oops! Something went wrong! | Cringe. Too cutesy for a real failure. | That didn't work. Try again? |
| No data found. | Robot talk | Nothing here yet. |
| Invalid input. | Blaming the user | That doesn't look right. |
| Error 500 | Meaningless to users | Something broke on our end. Try again in a sec. |
| Click here to... | Never "click here" | Just the action label |
| Successfully deleted. | "Successfully" is always filler | Deleted. / Board deleted. |

---

## Applying Changes — Quick Reference

When touching any file in the task management module, refer to this map:

| File | Touchpoints |
|------|-------------|
| `KanbanShell.tsx` | Board selector placeholder, empty state, toast messages, AlertDialog copy, Add Task dialog placeholders |
| `KanbanColumn.tsx` | Toast messages (rename, delete, WIP, description), quick-add placeholder |
| `KanbanCard.tsx` | Tooltip text (created timestamp) |
| `KanbanBoard.tsx` | Toast messages (move task/column) |
| `TaskSheet.tsx` | All field placeholders, section headers, timestamps, toast messages, delete confirmation |
| `new-project-dialog.tsx` | Dialog title, field labels/placeholders, button labels |
| `page.tsx` | Page title and subtitle |

---

## Glossary

Keep terminology consistent across the entire module.

| Concept | Term to use | Never say |
|---------|------------|-----------|
| Kanban board | Board | Project, workspace |
| Kanban column | Column | List, lane, stage |
| Task card | Task | Card, ticket, item |
| Person assigned | Assignee | Owner, responsible |
| Person who created | Creator | Author, reporter |
| Client/company | Client | Customer, account |
| Work-in-progress cap | WIP limit | Max tasks, capacity |
| File on a task | Attachment | File, document, upload |
| URL on a task | Link | Reference, resource |
| Task position in column | Position | Order, rank, index |

---

*Last updated: March 2026*

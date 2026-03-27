/**
 * Fynd Studio — Soul & Personality
 *
 * Centralised UX copy, empty states, quotes, and greetings.
 * Voice: calm, warm, brief, encouraging, occasionally wry.
 */

// ─── Time-Aware Greeting ─────────────────────────────────────────────────────

export function getGreeting(name?: string | null): string {
  const h = new Date().getHours();
  const who = name ? `, ${name.split(" ")[0]}` : "";

  if (h < 12) return `Good morning${who}. Here's your studio.`;
  if (h < 17) return `Good afternoon${who}. Let's keep the momentum going.`;
  if (h < 21) return `Still at it${who}? Let's wrap up strong.`;
  return `Burning the midnight oil${who}? Don't forget to rest.`;
}

// ─── Empty-State Copy per Column Name ────────────────────────────────────────

const columnEmptyStates: Record<string, string> = {
  intake: "Nothing in the queue yet. Enjoy the calm — or drag a task here to get rolling.",
  backlog: "Nothing in the queue yet. Enjoy the calm — or drag a task here to get rolling.",
  ready: "All clear. When something's ready to go, it'll show up here.",
  "in progress": "No work in flight right now. The studio's quiet… for now.",
  progress: "No work in flight right now. The studio's quiet… for now.",
  review: "Nothing waiting for feedback. Your reviewers are free!",
  "internal review": "Nothing waiting for feedback. Your reviewers are free!",
  "client review": "Waiting on the client? Nothing here yet — enjoy the breather.",
  revisions: "No revision rounds in play. That's either perfect work or early days.",
  approved: "No wins logged yet. But they're coming — we can feel it.",
  done: "No wins logged yet. But they're coming — we can feel it.",
};

export function getColumnEmptyText(columnName: string): string {
  const key = columnName.toLowerCase().replace(/[^a-z ]/g, "").trim();
  for (const [k, v] of Object.entries(columnEmptyStates)) {
    if (key.includes(k)) return v;
  }
  return "Nothing here yet. Drag a task in or add one below.";
}

// ─── General Empty States ────────────────────────────────────────────────────

export const emptyStates = {
  board: "Every great project starts with a blank canvas. Pick a board to dive in — or create a fresh one.",
  expenses: "No expenses tracked yet. Which is either very disciplined or very suspicious.",
  purchaseOrders: "No POs in the system. When you need to order something, we'll help you do it properly.",
  invoices: "No invoices yet. Create one to keep the money side of things tidy.",
  comments: "No conversation yet. Start one — even a simple 'Let's do this' counts.",
  subtasks: "No subtasks yet. Break it down into smaller steps if it helps you think.",
  search: (query: string) => `Nothing matched "${query}". Try different keywords — we've looked everywhere.`,
  noFilterResults: "No tasks match your filters. Loosen them up a bit?",
  calendarDay: "No tasks due this day. Enjoy the white space.",
  mailPlaceholder: "The shared inbox is on its way. Phase 3 — stay tuned.",
  financeActivity: "No financial activity yet. Create a PO, log an expense, or send an invoice to get the ball rolling.",
  financeExpenseChart: "No expenses recorded yet. Add your first one to see the breakdown.",
  financeBudgetChart: "No projects with budgets yet. Set a ₹ cost on task cards to start tracking.",
  attachments: "No files attached. Drag an image here or click Attach.",
  links: "No links yet. Add references, Figma files, or anything useful.",
} as const;

// ─── Rotating Daily Quotes ──────────────────────────────────────────────────

export const studioQuotes: { text: string; author?: string }[] = [
  { text: "Design is not just what it looks like. Design is how it works.", author: "Steve Jobs" },
  { text: "Good design is as little design as possible.", author: "Dieter Rams" },
  { text: "Details are not details. They make the design.", author: "Charles Eames" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Creativity is allowing yourself to make mistakes. Design is knowing which ones to keep.", author: "Scott Adams" },
  { text: "The best design is the one you don't notice." },
  { text: "Done is better than perfect. Ship the thing." },
  { text: "Every epic feature started as a sticky note someone almost threw away." },
  { text: "The hardest part of any project is agreeing on what to call the columns." },
  { text: "Scope creep walks in smiling. Never trust it." },
  { text: "Urgent and important are not the same thing. Choose wisely." },
  { text: "A well-named task is already half the work." },
  { text: "If it's not in the board, it doesn't exist." },
  { text: "Move fast and fix things. Breaking stuff is so 2010." },
  { text: "The best task management is finishing tasks." },
  { text: "One more card in 'In Progress' never hurt anyone. (It did.)" },
  { text: "'Almost done' is not a status. Neither is 'should be fine'." },
  { text: "Somewhere, a task marked 'low priority' is silently becoming a crisis." },
  { text: "Blocked doesn't mean stuck. It means you need someone to buy you coffee." },
  { text: "Procrastination is just future-you's problem. Don't be that person." },
  { text: "The real project was the tasks we made along the way." },
  { text: "Every task was once just a thought someone didn't ignore." },
  { text: "A deadline is just a wish with a calendar attached." },
  { text: "The best time to start was yesterday. The second best is after coffee." },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Have no fear of perfection — you'll never reach it.", author: "Salvador Dalí" },
  { text: "Design adds value faster than it adds cost.", author: "Joel Spolsky" },
  { text: "Less, but better.", author: "Dieter Rams" },
  { text: "The details are not the details. They make the design.", author: "Charles Eames" },
  { text: "You can't use up creativity. The more you use, the more you have.", author: "Maya Angelou" },
];

export function getDailyQuote(): { text: string; author?: string } {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return studioQuotes[dayOfYear % studioQuotes.length];
}

// ─── Design Brief Template ──────────────────────────────────────────────────

export const designBriefTemplate = `## Objective
What are we designing and why?

## Target Audience
Who is this for?

## Key Requirements
-

## Brand Guidelines
> Reference the existing brand colors, fonts, and style

## Inspiration & References
(Paste images, links, moodboards here)

## Deliverables
-

## Timeline
Expected completion: `;

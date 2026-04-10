// ─────────────────────────────────────────────
// copy.ts — All UI text for Fynd Studio
// Tone: funny, quirky, on-theme for a PM tool
// ─────────────────────────────────────────────

// ── QUOTES ───────────────────────────────────
export const ROTATING_QUOTES = [
  "If it's not in the board, it doesn't exist.",
  "Moving cards to Done is the closest thing to therapy.",
  "Deadline: a gentle suggestion with consequences.",
  "In Progress means it's alive. Overdue means it's haunting you.",
  "The task you keep dragging to tomorrow is the task that will drag you.",
  "Nobody ever said 'I wish I had fewer completed tasks.'",
  "Your backlog is not a graveyard. Probably.",
  "A board with no Overdue cards is called a vacation.",
  "The client is always right. The deadline is always wrong.",
  "Due Soon is just Overdue in a nicer outfit.",
  "Every great project started as a card nobody wanted to pick up.",
  "Kanban: because chaos deserves columns.",
  "The only thing worse than a full backlog is pretending it doesn't exist.",
  "Add card. Assign. Forget. Panic. Deliver. Repeat.",
  "Done is a myth. There is only 'Done for now.'",
];

// ── LOADING QUOTES (per screen) ──────────────
export const LOADING_QUOTES = {
  tasks: [
    "Every great project started as a card nobody wanted to pick up.",
    "Summoning your columns from the void...",
    "Your backlog is warming up. Give it a second.",
    "Kanban: because chaos deserves columns.",
    "Loading cards. Some of them are overdue. Don't panic.",
    "Organising your beautiful mess...",
    "Counting cards. Not the Vegas kind.",
  ],
  clients: [
    "Rounding up your clients. They were scattered.",
    "Building the Rolodex nobody asked for.",
    "Every great relationship starts with a loading screen.",
    "Your clients are on their way. Fashionably late.",
    "Client data incoming. Try not to play favourites.",
    "Fetching names, emails, and suppressed frustrations.",
  ],
  comms: [
    "Reading the room. And the threads.",
    "Syncing conversations. Some of them are spicy.",
    "Loading messages. Brace for reply-all energy.",
    "Pulling threads. Not the emotional kind.",
    "Your inbox called. It has opinions.",
  ],
  commandCentre: [
    "Scanning the horizon. Threats and opportunities incoming.",
    "Loading the war room. Try to look important.",
    "Aggregating everything. You asked for the big picture.",
    "Pulling all the strings. Carefully.",
    "Command Centre online. Awaiting orders.",
  ],
  finance: [
    "Crunching numbers. Some of them crunch back.",
    "Loading the money trail. Follow it carefully.",
    "Counting rupees so you don't have to.",
    "Spreadsheet vibes, but make it pretty.",
    "Your finances are loading. Deep breaths.",
  ],
  settings: [
    "Loading preferences. You're very particular.",
    "Fetching your settings. They were hiding.",
    "Configuring the configuration configurator.",
    "Loading the knobs and levers.",
  ],
  profile: [
    "Loading your profile. Looking good already.",
    "Fetching your details. You're a mystery.",
    "Your profile is buffering. You're worth the wait.",
  ],
  mail: [
    "Checking mail. Mostly newsletters, probably.",
    "Loading your inbox. It missed you.",
    "Sorting messages. The important ones, at least.",
  ],
  generic: [
    "Almost there. Probably.",
    "Loading things. Important things.",
    "Patience is a virtue. This is your moment.",
    "Working on it. No need to refresh.",
    "Building something beautiful. Give us a sec.",
  ],
};

// ── DELETE CONFIRMATIONS ──────────────────────
export const DELETE = {
  task: {
    title: "Goodbye, little task.",
    description: "This card will vanish forever. No backup. No undo. No mercy.",
    confirm: "Nuke it",
    cancel: "Wait, I need it",
  },
  board: {
    title: "Delete this entire board?",
    description:
      "Every card, every column, every late night — gone. Are you absolutely sure?",
    confirm: "Nuke it",
    cancel: "I changed my mind",
  },
  column: {
    title: "Delete this column?",
    description:
      "All cards inside will be deleted too. They never saw it coming.",
    confirm: "Delete the column",
    cancel: "Spare them",
  },
  member: {
    title: "Remove this person?",
    description:
      "They'll lose access instantly. Their cards stay, their feelings won't.",
    confirm: "Remove them",
    cancel: "Keep the team together",
  },
  comment: {
    title: "Delete this comment?",
    description: "Your words. Your choice. Gone forever.",
    confirm: "Delete it",
    cancel: "I'll keep it",
  },
};

// ── ERROR STATES ──────────────────────────────
export const ERRORS = {
  generic: {
    title: "Something went sideways.",
    description: "We're not sure what happened. Neither is the server.",
    action: "Try again",
  },
  network: {
    title: "The internet is being dramatic.",
    description: "Check your connection. We'll be here when you're back.",
    action: "Retry",
  },
  notFound: {
    title: "This page took the day off.",
    description: "It might have been deleted, moved, or never existed at all.",
    action: "Go home",
  },
  unauthorized: {
    title: "You're not supposed to be here.",
    description: "Log in and try again. No sneaking.",
    action: "Log in",
  },
  serverError: {
    title: "The server is having a moment.",
    description: "It's not you. It's definitely us. Give it a second.",
    action: "Try again",
  },
  saveFailed: {
    title: "Didn't save. Sorry.",
    description: "Your changes are still here — try saving again.",
    action: "Save again",
  },
  loadFailed: {
    title: "Couldn't load this.",
    description: "Data is being shy today. Refresh and try again.",
    action: "Refresh",
  },
};

// ── EMPTY STATES ─────────────────────────────
export const EMPTY = {
  board: {
    title: "No boards yet.",
    description: "Every empire starts with one board. Make yours.",
    action: "Create a board",
  },
  column: {
    title: "Nothing here.",
    description: "This column is feeling lonely. Add a card to cheer it up.",
    action: "Add card",
  },
  backlog: {
    title: "Backlog is empty.",
    description:
      "Either you're incredibly on top of things, or you forgot to add tasks.",
    action: "Add a task",
  },
  tasks: {
    title: "No tasks found.",
    description: "Filters too strict? Or are you actually done? Impressive.",
    action: "Clear filters",
  },
  search: {
    title: "Nothing matched.",
    description: "Not a single result. Try different words, or try less words.",
    action: "Clear search",
  },
  members: {
    title: "Flying solo?",
    description: "Add your team so you can assign blame — we mean tasks.",
    action: "Add member",
  },
  finance: {
    title: "No records yet.",
    description: "Money comes and goes. Start tracking before it's just gone.",
    action: "Add record",
  },
  comms: {
    title: "All quiet on the comms front.",
    description: "Connect your channels to see client conversations flow in.",
    action: "Set up connectors",
  },
  clients: {
    title: "No clients yet.",
    description: "Add your first client — every great relationship starts here.",
    action: "Add client",
  },
  notifications: {
    title: "All caught up.",
    description: "No one needs anything from you right now. Enjoy it.",
    action: null,
  },
  overdue: {
    title: "No overdue tasks!",
    description: "You're either very efficient or very good at ignoring dates.",
    action: null,
  },
};

// ── SUCCESS TOASTS ────────────────────────────
export const SUCCESS = {
  taskCreated: "Card added. The board grows.",
  taskDeleted: "Gone. Like it never existed.",
  taskMoved: "Card moved. Progress feels good.",
  taskUpdated: "Saved. Nice.",
  boardCreated: "New board, new chaos. Good luck.",
  boardDeleted: "Board deleted. Clean slate.",
  boardRenamed: "Renamed. Fresh identity.",
  memberAdded: "Welcome to the team. Assign them something immediately.",
  memberRemoved: "Removed. Their tasks remain.",
  commentPosted: "Comment posted. Thoughts shared.",
  copied: "Copied to clipboard.",
  saved: "Saved.",
  clientCreated: "Client added. The relationship begins.",
  clientDeleted: "Client removed.",
  clientUpdated: "Client updated.",
  contactAdded: "Contact added to the client.",
  factAccepted: "Fact verified. Knowledge locked in.",
  factRejected: "Fact rejected. Moving on.",
  connectorUpdated: "Connector settings saved.",
  columnAdded: "Column added. More structure, less chaos.",
  expenseLogged: "Expense logged. The books are watching.",
  expenseDeleted: "Expense removed.",
  invoiceCreated: "Invoice created. Money incoming (hopefully).",
  invoiceUpdated: "Invoice updated.",
  poCreated: "PO created. Vendor notified (eventually).",
  poDeleted: "PO removed.",
  poStatusUpdated: "Status updated.",
};

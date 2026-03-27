"use client";

import { useEffect, useState } from "react";

const quotes = [
  "Done is better than perfect. Ship the thing.",
  "The to-do list is a lie. Prioritise or perish.",
  "Every task was once just a thought someone didn't ignore.",
  "Meetings are tasks in disguise. Be suspicious.",
  "A deadline is just a wish with a calendar attached.",
  "The best time to start was yesterday. The second best is after coffee.",
  "Inbox zero is a myth. Task zero is the dream.",
  "Procrastination is just future-you's problem. Don't be that person.",
  "One more card in 'In Progress' never hurt anyone. (It did.)",
  "The real project was the tasks we made along the way.",
  "Scope creep walks in smiling. Never trust it.",
  "'Almost done' is not a status. Neither is 'should be fine'.",
  "Urgent and important are not the same thing. Choose wisely.",
  "Every epic feature started as a sticky note someone almost threw away.",
  "If it's not in the board, it doesn't exist.",
  "Move fast, break things — but update the task status first.",
  "A well-named task is already half the work.",
  "Blocked doesn't mean stuck. It means you need someone to buy you coffee.",
  "The hardest part of any project is agreeing on what to call the columns.",
  "Somewhere, a task marked 'low priority' is silently becoming a crisis.",
];

export function BoardQuote() {
  const [quote, setQuote] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  if (!quote) return <div className="py-4" />;

  return (
    <p
      className="text-center text-xs text-muted-foreground/50 italic select-none py-4 transition-opacity duration-1000"
      style={{ opacity: visible ? 1 : 0 }}
    >
      &ldquo;{quote}&rdquo;
    </p>
  );
}

"use client";

import { useEffect, useState } from "react";
import { LOADING_QUOTES } from "@/lib/copy";

type QuoteKey = keyof typeof LOADING_QUOTES;

export function LoadingQuote({ screen }: { screen: QuoteKey }) {
  const [quote, setQuote] = useState("");

  useEffect(() => {
    const pool = LOADING_QUOTES[screen];
    setQuote(pool[Math.floor(Math.random() * pool.length)]);
  }, [screen]);

  if (!quote) return null;

  return (
    <p className="py-3 text-center text-xs italic text-muted-foreground/60 select-none">
      &ldquo;{quote}&rdquo;
    </p>
  );
}

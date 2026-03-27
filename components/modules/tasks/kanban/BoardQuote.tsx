"use client";

import { useEffect, useState } from "react";
import { ROTATING_QUOTES } from "@/lib/copy";

export function BoardQuote() {
  const [quote, setQuote] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setQuote(ROTATING_QUOTES[Math.floor(Math.random() * ROTATING_QUOTES.length)]);
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

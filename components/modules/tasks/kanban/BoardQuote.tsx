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

  if (!quote) {
    return null;
  }

  return (
    <p
      className="select-none text-center text-xs italic leading-5 text-muted-foreground/50 transition-opacity duration-1000"
      style={{ opacity: visible ? 1 : 0 }}
    >
      &ldquo;{quote}&rdquo;
    </p>
  );
}

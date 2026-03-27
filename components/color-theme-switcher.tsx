"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Palette } from "lucide-react";

const COLOR_THEMES = [
  { name: "Neutral", value: "neutral", color: "hsl(0, 0%, 9%)" },
  { name: "Zinc", value: "zinc", color: "hsl(240, 5.9%, 10%)" },
  { name: "Slate", value: "slate", color: "hsl(222.2, 47.4%, 11.2%)" },
  { name: "Stone", value: "stone", color: "hsl(24, 9.8%, 10%)" },
  { name: "Red", value: "red", color: "hsl(0, 72.2%, 50.6%)" },
  { name: "Rose", value: "rose", color: "hsl(346.8, 77.2%, 49.8%)" },
  { name: "Orange", value: "orange", color: "hsl(24.6, 95%, 53.1%)" },
  { name: "Yellow", value: "yellow", color: "hsl(47.9, 95.8%, 53.1%)" },
  { name: "Green", value: "green", color: "hsl(142.1, 76.2%, 36.3%)" },
  { name: "Blue", value: "blue", color: "hsl(221.2, 83.2%, 53.3%)" },
  { name: "Violet", value: "violet", color: "hsl(262.1, 83.3%, 57.8%)" },
] as const;

const STORAGE_KEY = "fs_color_theme";

export function ColorThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const [colorTheme, setColorTheme] = useState("neutral");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setColorTheme(stored);
      applyTheme(stored);
    }
    setMounted(true);
  }, []);

  function applyTheme(theme: string) {
    const root = document.documentElement;
    if (theme === "neutral") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
  }

  function handleSelect(theme: string) {
    setColorTheme(theme);
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  if (!mounted) return null;

  const active = COLOR_THEMES.find((t) => t.value === colorTheme);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          {active && active.value !== "neutral" ? (
            <span
              className="h-4 w-4 rounded-full border border-border"
              style={{ backgroundColor: active.color }}
            />
          ) : (
            <Palette size={16} className="text-muted-foreground" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {COLOR_THEMES.map((theme) => (
          <DropdownMenuItem
            key={theme.value}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => handleSelect(theme.value)}
          >
            <span
              className="h-4 w-4 rounded-full border border-border shrink-0"
              style={{ backgroundColor: theme.color }}
            />
            <span className="flex-1">{theme.name}</span>
            {colorTheme === theme.value && (
              <span className="text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

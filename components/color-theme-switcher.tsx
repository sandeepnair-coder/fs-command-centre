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
  { name: "Stone", value: "neutral", color: "hsl(24, 9.8%, 10%)", desc: "Warm & earthy" },
  { name: "Zinc", value: "zinc", color: "hsl(240, 5.9%, 10%)", desc: "Cool & neutral" },
  { name: "Lyra", value: "lyra", color: "hsl(226, 100%, 34%)", desc: "Sharp & blue" },
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Palette size={16} className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {COLOR_THEMES.map((theme) => (
          <DropdownMenuItem
            key={theme.value}
            className="flex items-center gap-2.5 cursor-pointer py-2"
            onClick={() => handleSelect(theme.value)}
          >
            <span
              className="h-4 w-4 rounded-full border border-border shrink-0"
              style={{ backgroundColor: theme.color }}
            />
            <div className="flex-1">
              <span className="text-sm">{theme.name}</span>
              <span className="text-xs text-muted-foreground ml-1.5">{theme.desc}</span>
            </div>
            {colorTheme === theme.value && (
              <span className="text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Laptop, Moon, Sun, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, useCallback } from "react";

type ColorTheme = "default" | "purple";

const ThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const [colorTheme, setColorTheme] = useState<ColorTheme>("default");

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("fs_color_theme") as ColorTheme | null;
    if (saved) {
      setColorTheme(saved);
      document.documentElement.setAttribute("data-theme", saved === "default" ? "" : saved);
    }
  }, []);

  const handleColorTheme = useCallback((value: ColorTheme) => {
    setColorTheme(value);
    localStorage.setItem("fs_color_theme", value);
    if (value === "default") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", value);
    }
  }, []);

  if (!mounted) {
    return null;
  }

  const ICON_SIZE = 16;

  const icon = colorTheme !== "default" ? (
    <Palette key="palette" size={ICON_SIZE} className="text-muted-foreground" />
  ) : theme === "light" ? (
    <Sun key="light" size={ICON_SIZE} className="text-muted-foreground" />
  ) : theme === "dark" ? (
    <Moon key="dark" size={ICON_SIZE} className="text-muted-foreground" />
  ) : (
    <Laptop key="system" size={ICON_SIZE} className="text-muted-foreground" />
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          {icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-content" align="start">
        <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">Mode</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(e) => setTheme(e)}
        >
          <DropdownMenuRadioItem className="flex gap-2" value="light">
            <Sun size={ICON_SIZE} className="text-muted-foreground" />
            <span>Light</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className="flex gap-2" value="dark">
            <Moon size={ICON_SIZE} className="text-muted-foreground" />
            <span>Dark</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className="flex gap-2" value="system">
            <Laptop size={ICON_SIZE} className="text-muted-foreground" />
            <span>System</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={colorTheme}
          onValueChange={(v) => handleColorTheme(v as ColorTheme)}
        >
          <DropdownMenuRadioItem className="flex gap-2" value="default">
            <span className="size-3 rounded-full bg-[oklch(0.8348_0.1302_160.9080)] border shrink-0" />
            <span>Fynd Green</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className="flex gap-2" value="purple">
            <span className="size-3 rounded-full bg-[oklch(0.5393_0.2713_286.7462)] border shrink-0" />
            <span>Purple</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { ThemeSwitcher };

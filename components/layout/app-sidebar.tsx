"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Mail,
  ListChecks,
  DollarSign,
  Settings,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { href: "/tasks", label: "Task Management", icon: ListChecks },
  { href: "/finance", label: "Finance", icon: DollarSign },
  { href: "/mail", label: "Mail", icon: Mail },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Link
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            active
              ? "bg-muted text-foreground font-medium"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="lg:hidden">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-card">
      {/* Brand header */}
      <div className="flex h-14 items-center px-5">
        <Link
          href="/tasks"
          className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background text-xs font-bold">
            F
          </span>
          Fynd Studio
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col px-3 pt-2">
        <div className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname.startsWith(item.href)}
            />
          ))}
        </div>

        {/* Bottom section */}
        <div className="mt-auto pb-3">
          <Separator className="mb-2" />
          <NavLink
            href="/settings"
            label="Settings"
            icon={Settings}
            active={pathname.startsWith("/settings")}
          />
        </div>
      </nav>
    </aside>
  );
}

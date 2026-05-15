import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  href,
  className,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  href?: string;
  className?: string;
}) {
  const Wrapper = href ? "a" : "div";
  const trendColor = trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "";

  return (
    <Wrapper
      {...(href ? { href } : {})}
      className={cn(
        "rounded-lg border bg-card p-4 transition-colors",
        href && "hover:bg-muted/50 cursor-pointer",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </div>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", trendColor)}>
        {value}
      </p>
    </Wrapper>
  );
}

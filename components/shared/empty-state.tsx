import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onAction,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: string | null;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center text-muted-foreground", className)}>
      {Icon && <Icon className="mb-2 size-8" />}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 text-xs text-pretty max-w-xs">{description}</p>}
      {action && onAction && (
        <button
          onClick={onAction}
          className="mt-3 text-xs font-medium text-primary hover:underline"
        >
          {action}
        </button>
      )}
    </div>
  );
}

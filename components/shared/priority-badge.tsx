import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PRIORITY_DOTS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-blue-400",
  low: "bg-gray-400",
  normal: "bg-gray-400",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  normal: "Normal",
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: string;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("text-[10px]", className)}>
      <span className={cn("size-1.5 rounded-full mr-1", PRIORITY_DOTS[priority] ?? "bg-gray-400")} />
      {PRIORITY_LABELS[priority] ?? priority}
    </Badge>
  );
}

export function PriorityDot({ priority, className }: { priority: string; className?: string }) {
  return <span className={cn("size-1.5 rounded-full shrink-0", PRIORITY_DOTS[priority] ?? "bg-gray-400", className)} />;
}

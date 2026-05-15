import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_DOTS: Record<string, string> = {
  open: "bg-blue-500",
  waiting_on_client: "bg-amber-500",
  waiting_on_us: "bg-red-500",
  approval_pending: "bg-purple-500",
  resolved: "bg-emerald-500",
  archived: "bg-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  waiting_on_client: "Client Waiting",
  waiting_on_us: "Needs Reply",
  approval_pending: "Approval",
  resolved: "Resolved",
  archived: "Archived",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("text-[10px]", className)}>
      <span className={cn("size-1.5 rounded-full mr-1", STATUS_DOTS[status] ?? "bg-gray-400")} />
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

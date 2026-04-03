import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function CommsLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 shrink-0 space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Separator className="mb-4" />
      <div className="flex flex-1 gap-0 overflow-hidden rounded-lg border">
        <Skeleton className="w-80 h-full" />
        <Skeleton className="flex-1 h-full" />
        <Skeleton className="w-72 h-full" />
      </div>
    </div>
  );
}

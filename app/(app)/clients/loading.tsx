import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { LoadingQuote } from "@/components/ui/loading-quote";

export default function ClientsLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 shrink-0 space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Separator className="mb-4" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      <div className="mt-auto">
        <LoadingQuote screen="clients" />
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { LoadingQuote } from "@/components/ui/loading-quote";

export default function ExpensesLoading() {
  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-8 w-[150px] rounded-lg" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
      <LoadingQuote screen="finance" />
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { LoadingQuote } from "@/components/ui/loading-quote";

export default function AppLoading() {
  return (
    <div className="flex flex-col h-full animate-in fade-in-50 duration-300">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <Skeleton className="mb-4 h-px w-full" />
      <div className="flex gap-4">
        <Skeleton className="h-64 w-[280px] rounded-lg" />
        <Skeleton className="h-48 w-[280px] rounded-lg" />
        <Skeleton className="h-56 w-[280px] rounded-lg" />
      </div>
      <div className="mt-auto">
        <LoadingQuote screen="generic" />
      </div>
    </div>
  );
}

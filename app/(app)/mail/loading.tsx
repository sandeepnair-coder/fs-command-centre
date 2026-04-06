import { Skeleton } from "@/components/ui/skeleton";
import { LoadingQuote } from "@/components/ui/loading-quote";

export default function MailLoading() {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in-50 duration-300">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="mt-4 h-px w-full" />
      <div className="space-y-3 mt-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
      <div className="mt-auto">
        <LoadingQuote screen="mail" />
      </div>
    </div>
  );
}

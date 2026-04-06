import { Skeleton } from "@/components/ui/skeleton";
import { LoadingQuote } from "@/components/ui/loading-quote";

export default function FinanceLoading() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in-50 duration-300">
      <div className="flex gap-1 border-b pb-2">
        {["Overview", "Expenses", "Invoices", "Purchase Orders", "Projects"].map((t) => (
          <Skeleton key={t} className="h-8 w-24 rounded-md" />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
      <LoadingQuote screen="finance" />
    </div>
  );
}

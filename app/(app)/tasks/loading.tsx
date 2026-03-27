import { Skeleton } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4 animate-in fade-in-50 duration-300">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-3 pb-2">
        <Skeleton className="h-9 w-[280px]" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      {/* Columns skeleton */}
      <div className="flex gap-4 flex-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-72 space-y-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
            {i < 3 && <Skeleton className="h-28 w-full rounded-lg" />}
          </div>
        ))}
      </div>
    </div>
  );
}

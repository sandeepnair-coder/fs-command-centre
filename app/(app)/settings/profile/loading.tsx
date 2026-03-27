import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="flex flex-col h-full animate-in fade-in-50 duration-300">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-7 w-36" />
        </div>
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <Skeleton className="mb-6 h-px w-full" />
      <div className="max-w-lg space-y-8">
        <div className="flex items-center gap-5">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-px w-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-72 rounded-md" />
        </div>
      </div>
    </div>
  );
}

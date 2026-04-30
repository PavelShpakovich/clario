import { Skeleton } from '@/components/ui/skeleton';

function StorePageSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div>
        <Skeleton className="h-8 w-20 rounded-lg mb-2" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64 mt-1" />
      </div>

      {/* Balance card */}
      <div className="rounded-xl border bg-card p-6 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="size-16 rounded-full" />
      </div>

      {/* 2-col grid: packs + costs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Credit packs */}
        <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        {/* Cost reference */}
        <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-12" />
          </div>
        ))}
      </div>
    </main>
  );
}

export default function Loading() {
  return <StorePageSkeleton />;
}

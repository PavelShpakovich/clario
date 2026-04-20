import { Skeleton } from '@/components/ui/skeleton';

function AdminPageSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div>
        <Skeleton className="h-8 w-20 rounded-lg mb-2" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-72 mt-1" />
      </div>

      {/* Analytics card */}
      <div className="rounded-lg border bg-card p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="size-9 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>

      {/* Users table card */}
      <div className="rounded-lg border bg-card p-6 flex flex-col gap-4">
        <Skeleton className="h-5 w-32" />
        {/* Mobile skeleton */}
        <div className="md:hidden flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 flex flex-col gap-3 bg-card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1.5 flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-8 w-32 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            </div>
          ))}
        </div>
        {/* Desktop skeleton */}
        <div className="hidden md:block">
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg w-full" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Loading() {
  return <AdminPageSkeleton />;
}

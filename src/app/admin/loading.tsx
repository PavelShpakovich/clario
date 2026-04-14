import { Skeleton } from '@/components/ui/skeleton';

function AdminPageSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Analytics card */}
      <div className="rounded-lg border bg-card p-6 flex flex-col gap-4">
        <Skeleton className="h-5 w-24" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </div>

      {/* Users table card */}
      <div className="rounded-lg border bg-card p-6 flex flex-col gap-4">
        <Skeleton className="h-5 w-32" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}

export default function Loading() {
  return <AdminPageSkeleton />;
}

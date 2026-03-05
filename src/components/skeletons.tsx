import { Skeleton } from '@/components/ui/skeleton';

export function SettingsSkeleton() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      {/* Profile Card */}
      <div className="rounded-lg border bg-card p-6 space-y-6">
        <div>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="flex justify-end">
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      {/* Security Card */}
      <div className="rounded-lg border bg-card p-6 space-y-6">
        <div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-40 mt-2" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="flex justify-end">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </main>
  );
}

export function DashboardSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div>
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-60 mb-6" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 h-32">
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export function StudySkeleton() {
  return (
    <main className="fixed inset-0 z-50 overflow-hidden bg-background">
      <div className="w-full flex flex-col h-full relative">
        <div className="px-5 py-6 pt-6 md:px-10 md:py-8 md:pt-10 w-full">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Title Skeleton */}
            <Skeleton className="h-10 md:h-12 w-3/4 rounded-lg" />

            {/* Content Skeleton */}
            <div className="space-y-4 pt-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-[95%]" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-[90%]" />
              <Skeleton className="h-6 w-4/6" />
            </div>

            <div className="space-y-4 pt-6">
              <Skeleton className="h-6 w-[92%]" />
              <Skeleton className="h-6 w-[96%]" />
              <Skeleton className="h-6 w-[88%]" />
            </div>
          </div>
        </div>

        {/* Fake bottom bar to match UI spacing */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-between w-[95%] max-w-lg h-14 bg-background/80 backdrop-blur-lg border rounded-full px-6 shadow-sm">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </main>
  );
}

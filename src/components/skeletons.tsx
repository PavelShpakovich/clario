import { Skeleton } from '@/components/ui/skeleton';

// ─── Settings ────────────────────────────────────────────────────────────────
// Mirrors: settings/page.tsx + settings-form.tsx
// Layout: page header → 2-col grid (profile + privacy) → preferences card → danger zone → action buttons

export function SettingsSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <section className="flex flex-col gap-2">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </section>

      {/* 2-col card grid: Profile + Privacy */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile card */}
        <div className="rounded-xl border bg-card p-6 flex flex-col gap-0">
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-3 w-44 mb-4" />
          {/* FieldRows: email, name, timezone */}
          {['w-10', 'w-8', 'w-24'].map((w, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0"
            >
              <Skeleton className={`h-3.5 ${w}`} />
              <Skeleton className="h-3.5 w-28" />
            </div>
          ))}
        </div>

        {/* Privacy card */}
        <div className="rounded-xl border bg-card p-6 flex flex-col gap-0">
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-3 w-56 mb-4" />
          {/* FieldRow: birth consent */}
          <div className="flex items-center justify-between gap-4 py-3">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>

      {/* Reading preferences card */}
      <div className="rounded-xl border bg-card p-6 flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-3 w-72" />
        {/* Tone + Spiritual toggle */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-24" />
            <div className="flex items-center gap-3 h-9">
              <Skeleton className="h-5 w-9 rounded-full" />
              <Skeleton className="h-3.5 w-12" />
            </div>
          </div>
        </div>
        {/* Focus areas */}
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-3.5 w-28" />
          <div className="flex flex-wrap gap-4">
            {['w-24', 'w-20', 'w-32'].map((w, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-5 w-9 rounded-full" />
                <Skeleton className={`h-3.5 ${w}`} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-8 w-40 rounded-lg" />
        </div>
      </div>

      {/* Danger zone card */}
      <div className="rounded-xl border border-destructive/30 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-3 w-48 mb-4" />
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <Skeleton className="h-8 w-36 rounded-lg shrink-0" />
        </div>
      </div>

      {/* Bottom action buttons */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-44 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
    </main>
  );
}

// ─── Admin table ──────────────────────────────────────────────────────────────
// Mirrors: admin/page.tsx user table

export function AdminTableSkeleton() {
  return (
    <div className="flex flex-col gap-6">
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
            <Skeleton className="h-3 w-28" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-8 w-32 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="size-8 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop skeleton */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {Array.from({ length: 5 }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b">
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-40" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-28" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-8 w-32 rounded-md" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="size-8 rounded-md" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
// Mirrors: dashboard/page.tsx
// Layout: hero → stats row (2 cards) → quick-actions card → recent charts (3-col grid) → recent readings (list)

export function DashboardSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="flex flex-col gap-1.5">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-9 w-64" />
      </section>

      {/* Stats row — 2 equal cards */}
      <div className="flex gap-3">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border bg-card py-6"
          >
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-7 w-8" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>

      {/* Quick actions card */}
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-6 py-5">
        <Skeleton className="h-4 w-28 shrink-0" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
      </div>

      {/* Recent charts */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-full shrink-0" />
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent readings */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
              <Skeleton className="size-4 shrink-0 rounded" />
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

// ─── Charts page ─────────────────────────────────────────────────────────────
// Mirrors: charts-overview.tsx
// Layout: hero (h1 + desc + button) → "Saved charts" heading → 3-col card grid

export function ChartsPageSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg shrink-0" />
      </section>

      {/* "Saved charts" heading */}
      <section className="flex flex-col gap-4">
        <Skeleton className="h-5 w-36" />

        {/* Card grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card flex flex-col">
              {/* CardHeader: avatar + label/name */}
              <div className="p-4 pb-3 flex items-start gap-3">
                <Skeleton className="size-11 rounded-full shrink-0" />
                <div className="flex flex-col gap-1.5 min-w-0 pt-0.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
              </div>
              {/* CardContent: date + location */}
              <div className="px-4 pb-3 flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-36" />
              </div>
              {/* CardFooter: subject badge + status + delete */}
              <div className="px-4 py-3 border-t flex items-center justify-between">
                <Skeleton className="h-5 w-14 rounded-full" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-12" />
                  <Skeleton className="size-8 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export function NewChartSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-4 w-[32rem] max-w-full" />
      </section>

      <section className="rounded-xl border bg-card">
        <div className="flex flex-col gap-4 border-b px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-7 w-56 max-w-full" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="size-9 rounded-full" />
              ))}
            </div>
          </div>

          <Skeleton className="h-2 w-full rounded-full" />
        </div>

        <div className="grid gap-5 px-6 py-6">
          <div className="rounded-2xl border bg-muted/20 p-4">
            <Skeleton className="h-4 w-full max-w-[34rem]" />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="grid gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="hidden md:block" />
          </div>

          <div className="flex flex-col gap-3 border-t pt-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Skeleton className="h-10 w-24 rounded-lg" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-10 w-36 rounded-lg" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// ─── Chart detail ────────────────────────────────────────────────────────────
// Mirrors: charts/[chartId]/page.tsx
// Layout: hero card (avatar + name + actions + birth DL) → wheel → positions grid → aspects grid → readings list

export function ChartDetailSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero card */}
      <section className="rounded-2xl border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-full shrink-0" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-3.5 w-32" />
              <div className="mt-1 flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
        </div>
        <div className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </section>

      {/* Chart wheel */}
      <Skeleton className="h-[300px] w-full rounded-2xl sm:h-[400px]" />

      {/* Positions */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
              <Skeleton className="size-5 rounded shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Aspects */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-16" />
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5">
              <Skeleton className="size-6 rounded shrink-0" />
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

// ─── Readings page ────────────────────────────────────────────────────────────
// Mirrors: readings/page.tsx + readings-list.tsx
// Layout: section header → list of Card items (type label + title + summary + status/date/delete)

export function ReadingsPageSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Section header */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </section>

      {/* Reading cards */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card">
            {/* CardHeader: type label + title */}
            <div className="px-5 pt-4 pb-2 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <Skeleton className="size-3.5 rounded shrink-0" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-56" />
            </div>
            {/* CardContent: summary + footer row */}
            <div className="px-5 pb-4 flex flex-col gap-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/4" />
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="size-8 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

# Performance Guidelines for Developers

This document provides best practices for maintaining and extending the performance optimizations already in place.

## Quick Reference

### ✅ DO's

1. **Use Server Components by default**

   ```tsx
   // ✅ Good - Server component (default in App Router)
   export default async function DashboardPage() {
     const data = await fetchData();
     return <Dashboard data={data} />;
   }
   ```

2. **Fetch data on the server**

   ```tsx
   // ✅ Good - Data fetched server-side, no waterfall
   const [users, themes] = await Promise.all([fetchUsers(), fetchThemes()]);
   ```

3. **Use Suspense for async operations**

   ```tsx
   <Suspense fallback={<Skeleton />}>
     <AsyncComponent />
   </Suspense>
   ```

4. **Add cache headers to API routes**

   ```tsx
   import { getCacheHeaders, CACHE_PRESETS } from '@/lib/cache-utils';

   const response = NextResponse.json(data);
   Object.entries(getCacheHeaders(CACHE_PRESETS.userThemes)).forEach(([key, value]) =>
     response.headers.set(key, value),
   );
   return response;
   ```

5. **Revalidate on mutations**

   ```tsx
   import { revalidateTag, revalidatePath } from 'next/cache';

   // After updating user theme
   revalidateTag('user-themes');
   revalidatePath('/dashboard');
   ```

6. **Deduplicate requests**

   ```tsx
   import { cachedFetch } from '@/lib/request-deduplication';

   const user = await cachedFetch('user-123', async () => await fetchUser('123'));
   ```

### ❌ DON'Ts

1. **Don't fetch data in useEffect on first render**

   ```tsx
   // ❌ Bad - Creates waterfall, no data on initial load
   'use client';
   export function Component() {
     useEffect(() => {
       fetchData();
     }, []);
   }

   // ✅ Good - Fetch on server instead
   export default async function Component() {
     const data = await fetchData();
   }
   ```

2. **Don't create missing 'use client' directives**

   ```tsx
   // ❌ Bad - Unnecessary client component
   'use client';
   export default function Page() {
     return <Header />; // Header can be server component
   }

   // ✅ Good - Keep as server unless needed
   export default function Page() {
     return <Header />;
   }
   ```

3. **Don't forget cache headers on API routes**

   ```tsx
   // ❌ Bad - No caching, every request hits DB
   export async function GET() {
     return NextResponse.json(data);
   }

   // ✅ Good - Add cache headers
   const response = NextResponse.json(data);
   response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=3600');
   return response;
   ```

4. **Don't make duplicate API calls**

   ```tsx
   // ❌ Bad - Same data fetched twice
   const user = await fetch('/api/user');
   const user2 = await fetch('/api/user');

   // ✅ Good - Use deduplication or single fetch
   const user = await cachedFetch('user', () => fetch('/api/user'));
   ```

5. **Don't load multiple pages worth of data on initial load**

   ```tsx
   // ❌ Bad - Fetching all 1000 items
   const items = await db.items.findMany({ take: 1000 });

   // ✅ Good - Paginate and load as needed
   const items = await db.items.findMany({ take: 20 });
   ```

---

## Building New Features

### Server vs Client Components Decision Tree

```
Is it static/doesn't change?
  ├─ Yes → Server Component
  └─ No

Is it interactive (button clicks, form submission)?
  ├─ Yes → Client Component
  └─ No

Does it need to fetch data?
  ├─ On first load → Server Component (fetch there)
  └─ On user action → Client Component (use useEffect or server action)
```

### Adding a New Page

1. **Create as server component by default**

   ```tsx
   export default async function NewPage() {
     // Server code here
   }
   ```

2. **Fetch data server-side in parallel**

   ```tsx
   const [data1, data2] = await Promise.all([fetchData1(), fetchData2()]);
   ```

3. **Add metadata**

   ```tsx
   export const metadata = {
     title: 'Page Title | Microlearning',
     description: 'Page description',
   };
   ```

4. **Wrap interactive parts in Suspense**

   ```tsx
   <Suspense fallback={<Skeleton />}>
     <InteractiveComponent data={data} />
   </Suspense>
   ```

5. **Add cache headers if fetching**
   ```tsx
   const res = NextResponse.json(data);
   Object.entries(getCacheHeaders(CACHE_PRESETS.userProfile)).forEach(([k, v]) =>
     res.headers.set(k, v),
   );
   ```

### Adding a New API Route

1. **Identify cache strategy**
   - User-specific data? Use `CACHE_PRESETS.userThemes`
   - Real-time data? Use `CACHE_PRESETS.studySession`
   - Public data? Use `CACHE_PRESETS.publicContent`

2. **Add cache headers**

   ```tsx
   import { getCacheHeaders, CACHE_PRESETS } from '@/lib/cache-utils';

   export async function GET() {
     const data = await fetchData();
     const response = NextResponse.json(data);

     Object.entries(getCacheHeaders(CACHE_PRESETS.userThemes)).forEach(([k, v]) =>
       response.headers.set(k, v),
     );

     return response;
   }
   ```

3. **Revalidate on mutations**

   ```tsx
   import { revalidateTag } from 'next/cache';

   export async function POST(req: Request) {
     // ... create/update logic
     revalidateTag('user-themes');
     return NextResponse.json(result);
   }
   ```

---

## Performance Monitoring Checklist

When adding features:

- [ ] No new `useEffect` waterfalls created?
- [ ] Cache headers added to new API routes?
- [ ] Revalidation tags added on mutations?
- [ ] Large lists paginated?
- [ ] Images optimized with Next.js Image?
- [ ] Client components minimized?
- [ ] Suspense fallbacks showing for async data?
- [ ] Metadata added to new pages?
- [ ] No unnecessary client-side JS added?

---

## Common Optimizations

### Lazy Load Routes

```tsx
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./heavy'), {
  loading: () => <Skeleton />,
});
```

### Optimize Images

```tsx
import Image from 'next/image';

<Image
  src="/image.jpg"
  alt="Description"
  width={400}
  height={300}
  priority // Only for above-the-fold
  placeholder="blur"
  blurDataURL={baseImage}
/>;
```

### Use Server Actions for Mutations

```tsx
'use server';

export async function updateTheme(formData: FormData) {
  const result = await db.themes.update(...);
  revalidateTag('user-themes');
  return result;
}
```

### Memoize in Client Components

```tsx
import { useMemo, useCallback } from 'react';

const expensive = useMemo(() => compute(), [dep]);
const handler = useCallback(() => handle(), []);
```

---

## Debugging Performance Issues

### Slow Page Load

1. Check Network tab → API requests slow?
2. Check DevTools Profiler → Component render slow?
3. Check API response times → Database query slow?
4. Check bundle size → Too much JS shipped?

### Duplicate Requests

1. Use DevTools Network tab filter
2. Check for missing `cachedFetch()`
3. Review useEffect hooks with missing dependencies
4. Check for missing revalidation tags

### High Server Load

1. Enable request deduplication
2. Increase cache TTL values
3. Optimize database queries
4. Add pagination to large lists
5. Use connection pooling

### User Sees Blank Screen

1. Add Suspense fallback skeleton
2. Pre-fetch critical data server-side
3. Check for missing error boundaries

---

## Resources

- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-core-web-vitals)
- [React Server Components](https://react.dev/reference/rsc/use-server)
- [Web Vitals](https://web.dev/vitals/)
- [HTTP Caching](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching)
- [ISR & Revalidation](https://nextjs.org/docs/basic-features/data-fetching/incremental-static-regeneration)

---

## Questions?

Refer to `OPTIMIZATION_REPORT.md` for comprehensive optimization details.

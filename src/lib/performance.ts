/**
 * Performance monitoring and analytics utilities
 * Helps track Core Web Vitals and custom performance metrics
 */

export function reportWebVitals(metric: {
  name: string;
  value: number;
  label: string;
  id: string;
}) {
  // Send to analytics service in production
  if (process.env.NODE_ENV === 'production') {
    // You can send to services like Google Analytics, Vercel Analytics, etc.
    console.log('Web Vitals:', metric);
  } else if (process.env.NODE_ENV === 'development') {
    console.log(`${metric.label}: ${metric.value.toFixed(2)}ms`);
  }
}

/**
 * Measure component render time
 * @example
 * const { endMeasure } = measurePerformance('ComponentName');
 * // ... component renders
 * endMeasure();
 */
export function measurePerformance(label: string) {
  const startTime = performance.now();

  return {
    endMeasure: () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Perf] ${label}: ${duration.toFixed(2)}ms`);
      }

      return duration;
    },
  };
}

/**
 * Track API request performance
 */
export function trackApiRequest(url: string, method: string, duration: number) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] ${method} ${url} - ${duration.toFixed(2)}ms`);
  }
}

/**
 * Network Information API interface
 */
interface NetworkInformation extends EventTarget {
  readonly effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  readonly rtt: number;
  readonly downlink: number;
  readonly saveData: boolean;
  onchange: EventListener;
}

interface NavigatorWithConnection extends Navigator {
  readonly connection?: NetworkInformation;
  readonly mozConnection?: NetworkInformation;
  readonly webkitConnection?: NetworkInformation;
}

/**
 * Create performance observer for Network Information API
 */
export function useNetworkQuality(): 'slow' | 'normal' | 'fast' {
  if (typeof window === 'undefined') return 'normal';

  const nav = navigator as NavigatorWithConnection;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

  if (!connection) return 'normal';

  const effectiveType = connection.effectiveType;

  if (effectiveType === '4g') return 'fast';
  if (effectiveType === '3g') return 'normal';
  return 'slow';
}

/**
 * Adaptive data fetching based on network quality
 */
export function getAdaptivePageSize(quality: 'slow' | 'normal' | 'fast' = 'normal'): number {
  const sizes = {
    slow: 10,
    normal: 20,
    fast: 50,
  };
  return sizes[quality];
}

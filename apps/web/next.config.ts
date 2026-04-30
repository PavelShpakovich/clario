import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Expose selected env vars to Edge middleware (process.env is not fully available there)
  env: {
    MOBILE_ONLY: process.env.MOBILE_ONLY ?? '',
  },

  // React Compiler enables automatic memoization and optimizations
  reactCompiler: true,

  // @react-pdf/renderer uses native canvas internals — must not be bundled by webpack.
  serverExternalPackages: ['@react-pdf/renderer'],

  // Image optimization
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Security and cache control headers
  async headers() {
    // Security headers applied to every response
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api-maps.yandex.ru https://yastatic.net https://mc.yandex.ru",
          "style-src 'self' 'unsafe-inline' https://yastatic.net",
          "img-src 'self' data: https:",
          "font-src 'self' data: https://yastatic.net",
          "connect-src 'self' https://*.supabase.co https://*.maps.yandex.net https://geocode-maps.yandex.ru https://api-maps.yandex.ru https://yastatic.net https://nominatim.openstreetmap.org https://mc.yandex.ru",
          'worker-src blob:',
          "frame-ancestors 'none'", // overridden for /tg below
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      },
    ];

    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // API routes must NEVER be cached — they return per-user,
        // per-session data and dynamic generation state.
        // CORS headers allow mobile clients (Bearer token auth, no session cookie).
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PATCH, PUT, DELETE, OPTIONS' },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Authorization, Content-Type, X-Request-Id',
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Experimental features for better performance
  experimental: {
    // Note: after() from next/server is stable in Next.js 15+ and does not need
    // an experimental flag.
  },

  // Compression settings
  compress: true,

  // Production source maps disabled for performance
  productionBrowserSourceMaps: false,

  // Logging configuration
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },
};

export default withNextIntl(nextConfig);

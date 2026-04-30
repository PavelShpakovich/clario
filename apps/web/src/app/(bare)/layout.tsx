/**
 * Bare layout — no header, footer, or providers.
 * Used for pages that need to be completely standalone (e.g. deep-link redirects).
 */
export default function BareLayout({ children }: { children: React.ReactNode }) {
  return children;
}

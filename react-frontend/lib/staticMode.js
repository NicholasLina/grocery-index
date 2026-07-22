/**
 * Client-safe static mode detection (no Node.js filesystem APIs).
 *
 * Priority:
 * 1. NEXT_PUBLIC_DATA_SOURCE=static|api (explicit)
 * 2. On Vercel, default to static (same-origin Next.js API routes)
 * 3. Otherwise, static when no remote API URL is configured
 */

export function usesStaticData() {
  const source = process.env.NEXT_PUBLIC_DATA_SOURCE;
  if (source === 'static') {
    return true;
  }
  if (source === 'api') {
    return false;
  }

  // Vercel previews/production should not depend on a separate API host by default.
  if (process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL) {
    return true;
  }

  // When no external API URL is configured, prefer bundled static API routes.
  return !process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_BASE_URL;
}

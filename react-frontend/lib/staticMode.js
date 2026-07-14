/**
 * Client-safe static mode detection (no Node.js filesystem APIs).
 */

export function usesStaticData() {
  const source = process.env.NEXT_PUBLIC_DATA_SOURCE;
  if (source === 'static') {
    return true;
  }
  if (source === 'api') {
    return false;
  }

  // When no external API URL is configured, prefer bundled static API routes.
  return !process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_BASE_URL;
}

export const RELOAD_FLAG_KEY = 'cgi-static-asset-reload';

/**
 * True for Next.js build assets under /_next/static/.
 * Missing hashed files after a deploy are served as text/plain 404s on Vercel,
 * which browsers reject as stylesheets/scripts under X-Content-Type-Options: nosniff.
 */
export function isNextStaticAssetUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const pathname = new URL(url, 'https://example.invalid').pathname;
    return pathname.includes('/_next/static/');
  } catch {
    return url.includes('/_next/static/');
  }
}

export function shouldReloadForFailedAsset({ url, alreadyReloaded }) {
  if (alreadyReloaded) {
    return false;
  }

  return isNextStaticAssetUrl(url);
}

export function isDeploymentSkewErrorMessage(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }

  return /Loading chunk [\w.-]+ failed|ChunkLoadError|Failed to fetch dynamically imported module/i.test(
    message
  );
}

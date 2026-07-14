/**
 * API URL helpers used by both server and client components.
 */

import { usesStaticData } from './staticMode';

const DEFAULT_API_BASE_URL = 'http://localhost:3000/api/statcan';

function normalizeBaseUrl(url) {
  const withProtocol =
    url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
  return withProtocol.replace(/\/+$/, '');
}

function getServerBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL);
  }
  if (process.env.VERCEL_URL) {
    return normalizeBaseUrl(process.env.VERCEL_URL);
  }
  return 'http://localhost:5000';
}

function getSameOriginApiBaseUrl() {
  if (typeof window === 'undefined') {
    return `${getServerBaseUrl()}/api/statcan`;
  }
  return '/api/statcan';
}

export function getApiBaseUrl() {
  if (usesStaticData()) {
    return getSameOriginApiBaseUrl();
  }

  const configuredBaseUrl =
    process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;

  if (configuredBaseUrl) {
    return normalizeBaseUrl(configuredBaseUrl);
  }

  // Prefer same-origin Next.js API routes over a hard-coded remote host.
  // Remote APIs must be opted into via NEXT_PUBLIC_API_URL (+ DATA_SOURCE=api).
  if (process.env.NODE_ENV === 'production') {
    return getSameOriginApiBaseUrl();
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    if (!isLocalHost) {
      return getSameOriginApiBaseUrl();
    }
  }

  return normalizeBaseUrl(DEFAULT_API_BASE_URL);
}

export function buildApiUrl(endpoint, params = {}) {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(normalizedEndpoint, `${getApiBaseUrl()}/`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });

  return url.toString();
}

/**
 * API URL helpers used by both server and client components.
 */

const DEFAULT_API_BASE_URL = 'http://localhost:3000/api/statcan';
const DEFAULT_PRODUCTION_API_BASE_URL = 'https://grocery-index-api.nicklina.com/api/statcan';

function normalizeBaseUrl(url) {
  const withProtocol =
    url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
  return withProtocol.replace(/\/+$/, '');
}

export function getApiBaseUrl() {
  const configuredBaseUrl =
    process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;

  if (configuredBaseUrl) {
    return normalizeBaseUrl(configuredBaseUrl);
  }

  // Never use localhost as an implicit fallback in production-like environments.
  if (process.env.NODE_ENV === 'production') {
    return DEFAULT_PRODUCTION_API_BASE_URL;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    if (!isLocalHost) {
      return DEFAULT_PRODUCTION_API_BASE_URL;
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
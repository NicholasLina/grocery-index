/**
 * API URL helpers used by both server and client components.
 */

const DEFAULT_API_BASE_URL = 'http://localhost:3000/api/statcan';

function normalizeBaseUrl(url) {
  const withProtocol =
    url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
  return withProtocol.replace(/\/+$/, '');
}

export function getApiBaseUrl() {
  const configuredBaseUrl =
    process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;

  return normalizeBaseUrl(configuredBaseUrl);
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
import { getApiBaseUrl as getRemoteApiBaseUrl } from './api';
import * as staticData from './staticData';

export function usesStaticData() {
  if (process.env.NEXT_PUBLIC_DATA_SOURCE === 'static') {
    return true;
  }
  if (process.env.NEXT_PUBLIC_DATA_SOURCE === 'api') {
    return false;
  }
  return staticData.isStaticDataAvailable() && !process.env.NEXT_PUBLIC_API_URL;
}

export function getDataApiBaseUrl() {
  if (usesStaticData()) {
    return '/api/statcan';
  }
  return getRemoteApiBaseUrl();
}

export async function fetchDataEndpoint(endpoint, params = {}, init = {}) {
  if (usesStaticData()) {
    return fetchStaticEndpoint(endpoint, params);
  }

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(normalizedEndpoint, `${getRemoteApiBaseUrl()}/`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });

  const response = await fetch(url.toString(), init);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}`);
  }
  return response.json();
}

function fetchStaticEndpoint(endpoint, params = {}) {
  const normalized = endpoint.replace(/^\//, '');

  if (normalized === 'products') {
    return Promise.resolve(staticData.getProducts());
  }
  if (normalized === 'regions') {
    return Promise.resolve(staticData.getRegions());
  }
  if (normalized === 'price-changes') {
    const payload = staticData.getPriceChanges(
      params.geo,
      Number(params.limit ?? 3),
      Number(params.trendPoints ?? 12)
    );
    if (!payload) {
      return Promise.reject(new Error('Region not found'));
    }
    return Promise.resolve(payload);
  }
  if (normalized === 'streaks') {
    const payload = staticData.getStreaks(params.geo, Number(params.limit ?? 3));
    if (!payload) {
      return Promise.reject(new Error('Region not found'));
    }
    return Promise.resolve(payload);
  }
  if (normalized === 'all-price-changes') {
    const payload = staticData.getAllPriceChanges(params.geo);
    if (!payload) {
      return Promise.reject(new Error('Region not found'));
    }
    return Promise.resolve(payload);
  }
  if (normalized === 'product-trends') {
    const payload = staticData.getProductTrends(
      params.geo,
      Number(params.limit ?? 6),
      Number(params.months ?? params.points ?? 12)
    );
    if (!payload) {
      return Promise.reject(new Error('Region not found'));
    }
    return Promise.resolve(payload);
  }
  if (normalized === '' || normalized === 'index') {
    const rows = staticData.querySourcePrices({
      date: params.date,
      geo: params.geo,
      product: params.product,
      limit: params.limit ? Number(params.limit) : undefined,
    });
    return Promise.resolve(rows);
  }

  return Promise.reject(new Error(`Unsupported static endpoint: ${endpoint}`));
}

export function buildDataUrl(endpoint, params = {}) {
  const base = getDataApiBaseUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(normalizedEndpoint, `${base}/`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });
  return url.toString();
}

/**
 * Server-side data fetching helpers for static JSON mode.
 * Do not import this module from client components.
 */

import { usesStaticData } from './staticMode';
import { getApiBaseUrl as getRemoteApiBaseUrl } from './api';

async function loadStaticData() {
  if (typeof window !== 'undefined') {
    throw new Error('staticData access is server-only');
  }
  return import('./staticData');
}

export function getDataApiBaseUrl() {
  if (usesStaticData()) {
    return '/api/statcan';
  }
  return getRemoteApiBaseUrl();
}

export async function fetchDataEndpoint(endpoint, params = {}, init = {}) {
  if (usesStaticData() && typeof window === 'undefined') {
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

async function fetchStaticEndpoint(endpoint, params = {}) {
  const staticData = await loadStaticData();
  const normalized = endpoint.replace(/^\//, '');

  if (normalized === 'products') {
    return staticData.getProducts();
  }
  if (normalized === 'regions') {
    return staticData.getRegions();
  }
  if (normalized === 'price-changes') {
    const payload = staticData.getPriceChanges(
      params.geo,
      Number(params.limit ?? 3),
      Number(params.trendPoints ?? 12)
    );
    if (!payload) {
      throw new Error('Region not found');
    }
    return payload;
  }
  if (normalized === 'streaks') {
    const payload = staticData.getStreaks(params.geo, Number(params.limit ?? 3));
    if (!payload) {
      throw new Error('Region not found');
    }
    return payload;
  }
  if (normalized === 'all-price-changes') {
    const payload = staticData.getAllPriceChanges(params.geo);
    if (!payload) {
      throw new Error('Region not found');
    }
    return payload;
  }
  if (normalized === 'product-trends') {
    const payload = staticData.getProductTrends(
      params.geo,
      Number(params.limit ?? 6),
      Number(params.months ?? params.points ?? 12)
    );
    if (!payload) {
      throw new Error('Region not found');
    }
    return payload;
  }
  if (normalized === '' || normalized === 'index') {
    return staticData.querySourcePrices({
      date: params.date,
      geo: params.geo,
      product: params.product,
      limit: params.limit ? Number(params.limit) : undefined,
    });
  }

  throw new Error(`Unsupported static endpoint: ${endpoint}`);
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

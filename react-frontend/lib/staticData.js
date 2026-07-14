import fs from 'fs';
import path from 'path';

const DATA_ROOT = path.join(process.cwd(), 'data');

function readJson(relativePath) {
  const fullPath = path.join(DATA_ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

export function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getManifest() {
  return readJson('manifest.json');
}

export function getRegionSlug(geo) {
  const manifest = getManifest();
  if (manifest?.regionSlugs?.[geo]) {
    return manifest.regionSlugs[geo];
  }
  return slugify(geo);
}

export function getProducts() {
  return readJson('products.json') ?? { products: [], count: 0 };
}

export function getRegions() {
  return readJson('regions.json') ?? { regions: [], count: 0 };
}

export function getPriceChanges(geo, limit = 3, trendPoints = 12) {
  const payload = readJson(`by-region/${getRegionSlug(geo)}/price-changes.json`);
  if (!payload) {
    return null;
  }
  return {
    ...payload,
    gainers: (payload.gainers ?? []).slice(0, limit).map((item) => ({
      ...item,
      history: (item.history ?? []).slice(-trendPoints),
    })),
    losers: (payload.losers ?? []).slice(0, limit).map((item) => ({
      ...item,
      history: (item.history ?? []).slice(-trendPoints),
    })),
    trendPoints,
  };
}

export function getStreaks(geo, limit = 3) {
  const payload = readJson(`by-region/${getRegionSlug(geo)}/streaks.json`);
  if (!payload) {
    return null;
  }
  return {
    ...payload,
    streaks: (payload.streaks ?? []).slice(0, limit),
  };
}

export function getAllPriceChanges(geo) {
  return readJson(`by-region/${getRegionSlug(geo)}/all-price-changes.json`);
}

export function getProductTrends(geo, limit = 6, months = 12) {
  const payload = readJson(`by-region/${getRegionSlug(geo)}/product-trends.json`);
  if (!payload) {
    return null;
  }
  const entries = Object.entries(payload.trends ?? {}).slice(0, limit * 2);
  const trends = Object.fromEntries(
    entries.map(([product, series]) => [product, (series ?? []).slice(-months)])
  );
  return {
    geo,
    trends,
    count: Object.keys(trends).length,
    months,
  };
}

export function getProductSeries(geo, product) {
  const geoSlug = getRegionSlug(geo);
  const productSlug = slugify(product);
  return readJson(`prices/${geoSlug}/${productSlug}.json`) ?? [];
}

export function querySourcePrices({ date, geo, product, limit }) {
  if (!geo || !product) {
    return [];
  }
  const rows = getProductSeries(geo, product);
  const filtered = rows.filter((row) => {
    if (date && row.REF_DATE !== date) {
      return false;
    }
    return true;
  });
  return typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
}

export function isStaticDataAvailable() {
  return fs.existsSync(path.join(DATA_ROOT, 'manifest.json'));
}

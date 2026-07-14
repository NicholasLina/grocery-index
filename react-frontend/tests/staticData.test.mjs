import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';

process.chdir(path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));

const staticData = await import('../lib/staticData.js');

test('static data manifest is available', () => {
  assert.equal(staticData.isStaticDataAvailable(), true);
  const manifest = staticData.getManifest();
  assert.equal(manifest.regions.includes('Canada'), true);
  assert.ok(manifest.products.length > 0);
});

test('getProducts returns product list', () => {
  const payload = staticData.getProducts();
  assert.ok(Array.isArray(payload.products));
  assert.ok(payload.products.length >= 2);
  assert.equal(payload.count, payload.products.length);
});

test('getPriceChanges returns gainers and losers for Canada', () => {
  const payload = staticData.getPriceChanges('Canada', 3, 12);
  assert.ok(payload);
  assert.ok(payload.gainers.length <= 3);
  assert.ok(payload.losers.length <= 3);
  assert.ok(payload.gainers[0]?.product);
  assert.ok(Array.isArray(payload.gainers[0]?.history));
});

test('querySourcePrices returns product history', () => {
  const products = staticData.getProducts().products;
  const product = products.find((name) => name.toLowerCase().includes('apple')) || products[0];
  const rows = staticData.querySourcePrices({
    geo: 'Canada',
    product,
  });
  assert.ok(rows.length > 12);
  assert.ok(rows[0].REF_DATE);
  assert.equal(typeof rows[0].VALUE, 'number');
});

test('getRegionSlug resolves from manifest', () => {
  assert.equal(staticData.getRegionSlug('Canada'), 'canada');
});

test('getStreaks returns active streaks for Canada', () => {
  const payload = staticData.getStreaks('Canada', 3);
  assert.ok(payload);
  assert.ok(payload.streaks.length <= 3);
  assert.ok(payload.streaks[0]?.streakType);
});

test('Ontario region payloads are available', () => {
  const payload = staticData.getAllPriceChanges('Ontario');
  assert.ok(payload);
  assert.ok((payload.products || []).length > 0);
});

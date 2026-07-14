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
});

test('getProducts returns fixture products', () => {
  const payload = staticData.getProducts();
  assert.deepEqual(payload.products, ['Apples', 'Bananas']);
  assert.equal(payload.count, 2);
});

test('getPriceChanges returns gainers and losers for Canada', () => {
  const payload = staticData.getPriceChanges('Canada', 3, 12);
  assert.equal(payload.gainers.length, 1);
  assert.equal(payload.losers.length, 1);
  assert.equal(payload.gainers[0].product, 'Apples');
});

test('querySourcePrices returns product history', () => {
  const rows = staticData.querySourcePrices({
    geo: 'Canada',
    product: 'Apples',
  });
  assert.equal(rows.length, 3);
  assert.equal(rows[0].REF_DATE, '2024-01');
});

test('getRegionSlug resolves from manifest', () => {
  assert.equal(staticData.getRegionSlug('Canada'), 'canada');
});

test('getStreaks returns active streaks for Canada', () => {
  const payload = staticData.getStreaks('Canada', 3);
  assert.equal(payload.streaks.length, 2);
  assert.equal(payload.streaks[0].streakType, 'increase');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

process.chdir(path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));

const {
  generatePriceInsights,
  getProductDisplayName,
  normalizeHistory,
  INSIGHT_THRESHOLDS,
} = await import('../lib/priceInsights.js');

function buildSeries({ start = '2017-01', months = 113, values }) {
  const [startYear, startMonth] = start.split('-').map(Number);
  const rows = [];
  for (let i = 0; i < months; i += 1) {
    const date = new Date(startYear, startMonth - 1 + i, 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    rows.push({
      REF_DATE: `${y}-${m}`,
      VALUE: values(i, date.getMonth() + 1, y),
    });
  }
  return rows;
}

test('getProductDisplayName strips unit suffix', () => {
  assert.equal(getProductDisplayName('Strawberries, 454 grams'), 'Strawberries');
  assert.equal(getProductDisplayName('Milk'), 'Milk');
});

test('normalizeHistory sorts and drops invalid rows', () => {
  const rows = normalizeHistory([
    { REF_DATE: '2024-03', VALUE: 3 },
    { REF_DATE: 'bad', VALUE: 1 },
    { REF_DATE: '2024-01', VALUE: '2.5' },
    { REF_DATE: '2024-02', VALUE: 'nope' },
  ]);
  assert.deepEqual(rows.map((r) => r.date), ['2024-01', '2024-03']);
  assert.equal(rows[0].value, 2.5);
});

test('short histories produce no insights', () => {
  const history = [
    { REF_DATE: '2024-01', VALUE: 100 },
    { REF_DATE: '2024-02', VALUE: 110 },
    { REF_DATE: '2024-03', VALUE: 120 },
  ];
  const insights = generatePriceInsights(history, 'Apples, per kilogram');
  assert.deepEqual(insights, []);
});

test('detects seasonal best and expensive months for produce-like series', () => {
  // Cheap in May/June, expensive in Nov/Dec, with a mild upward trend.
  const history = buildSeries({
    months: 96,
    values: (i, month, year) => {
      const seasonal = {
        1: 0.4, 2: -0.2, 3: -0.5, 4: -0.3, 5: -0.8, 6: -0.9,
        7: -0.4, 8: -0.1, 9: 0.0, 10: 0.3, 11: 1.4, 12: 1.6,
      }[month];
      const trend = (year - 2017) * 0.15;
      return 4 + seasonal + trend;
    },
  });

  const insights = generatePriceInsights(history, 'Strawberries, 454 grams');
  const seasonal = insights.filter((item) => item.type === 'seasonal');
  assert.ok(seasonal.length >= 1, 'expected seasonal insights');

  const best = seasonal.find((item) => item.id === 'seasonal-best');
  const expensive = seasonal.find((item) => item.id === 'seasonal-expensive');
  assert.ok(best, 'expected best-time insight');
  assert.match(best.text, /Best time to buy Strawberries is usually in May\/June/);
  assert.ok(expensive, 'expected most-expensive insight');
  assert.match(expensive.text, /Strawberries prices are typically highest in November\/December/);
});

test('detects significant long-term price increase', () => {
  const history = buildSeries({
    months: 96,
    values: (i) => 5 + i * 0.05, // steady climb, low seasonality
  });

  const insights = generatePriceInsights(history, 'Roasted or ground coffee, 340 grams');
  const trend = insights.find((item) => item.type === 'trend');
  assert.ok(trend, 'expected trend insight');
  assert.match(trend.text, /increased significantly since 2017/);
});

test('detects year-over-year increase', () => {
  const history = buildSeries({
    months: 36,
    values: (i) => (i < 24 ? 10 : 12),
  });
  const insights = generatePriceInsights(history, 'Eggs, 1 dozen', { maxInsights: 6 });
  const yoy = insights.find((item) => item.type === 'yoy');
  assert.ok(yoy, 'expected YoY insight');
  assert.match(yoy.text, /higher than this time last year/);
});

test('detects near historical high', () => {
  const history = buildSeries({
    months: 48,
    values: (i, month, year) => 10 + (year - 2017) * 0.5 + i * 0.01,
  });
  const insights = generatePriceInsights(history, 'Bananas, per kilogram', { maxInsights: 6 });
  const position = insights.find((item) => item.type === 'position');
  assert.ok(position, 'expected position insight');
  assert.match(position.text, /near its highest recorded price/);
});

test('detects active multi-month streak', () => {
  const history = buildSeries({
    months: 40,
    values: (i) => {
      if (i < 36) return 10 + (i % 3) * 0.1;
      return 10 + (i - 36) * 0.5;
    },
  });
  const insights = generatePriceInsights(history, 'Beef stewing cuts, per kilogram', { maxInsights: 8 });
  const streak = insights.find((item) => item.type === 'streak');
  assert.ok(streak, 'expected streak insight');
  assert.match(streak.text, /rising for .* months in a row/);
});

test('skips weak seasonality for stable products', () => {
  const history = buildSeries({
    months: 96,
    values: (i, month) => 5 + (month === 1 ? -0.01 : 0) + i * 0.002,
  });
  const insights = generatePriceInsights(history, 'Milk, 2 litres');
  assert.equal(insights.some((item) => item.type === 'seasonal'), false);
});

test('real StatCan sample: strawberries seasonal pattern', () => {
  const samplePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'fixtures',
    'strawberries-canada.json',
  );
  if (!fs.existsSync(samplePath)) {
    // Fixture is optional when StatCan sample is not checked in.
    return;
  }
  const history = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
  const insights = generatePriceInsights(history, 'Strawberries, 454 grams');
  const best = insights.find((item) => item.id === 'seasonal-best');
  const expensive = insights.find((item) => item.id === 'seasonal-expensive');
  assert.ok(best);
  assert.match(best.text, /May\/June/);
  assert.ok(expensive);
  assert.match(expensive.text, /November\/December/);
});

test('thresholds are exported for documentation', () => {
  assert.equal(INSIGHT_THRESHOLDS.SEASONAL_MIN_AMP_PCT, 8);
  assert.equal(INSIGHT_THRESHOLDS.MIN_STREAK_LENGTH, 3);
});

/**
 * Derive plain-English price insights from a monthly StatCan series.
 *
 * Expected row shape: { REF_DATE: 'YYYY-MM', VALUE: number }
 *
 * Patterns (validated against Canada national data, 2017–present):
 * - Seasonal best / most-expensive contiguous month pairs
 * - Multi-year price trend
 * - Year-over-year change
 * - Near historical high / low
 * - Active multi-month streak
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MIN_POINTS_SEASONAL = 36;
const MIN_YEARS_SEASONAL = 4;
const SEASONAL_MIN_AMP_PCT = 8;
const SEASONAL_MIN_CONSISTENCY = 0.5;

const MIN_POINTS_TREND = 36;
const TREND_SIGNIFICANT_PCT = 40;
const TREND_NOTABLE_PCT = 25;
const TREND_DECREASE_PCT = -10;

const MIN_POINTS_YOY = 13;
const YOY_NOTABLE_PCT = 10;

const MIN_POINTS_POSITION = 24;
const NEAR_HIGH_PCTILE = 95;
const NEAR_LOW_PCTILE = 15;
const NEAR_EXTREME_WITHIN_MONTHS = 3;

const MIN_STREAK_LENGTH = 3;

/**
 * @param {string} productName Full StatCan label, e.g. "Apples, per kilogram"
 * @returns {string} Display name without unit suffix
 */
export function getProductDisplayName(productName) {
  if (!productName || typeof productName !== 'string') {
    return 'This product';
  }
  const main = productName.split(',')[0].trim();
  return main || productName;
}

/**
 * @param {Array<{REF_DATE?: string, VALUE?: number|string}>} history
 * @returns {Array<{date: string, value: number, year: number, month: number}>}
 */
export function normalizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .map((row) => {
      const date = row?.REF_DATE;
      const value = Number(row?.VALUE);
      if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}$/.test(date) || !Number.isFinite(value)) {
        return null;
      }
      const year = Number(date.slice(0, 4));
      const month = Number(date.slice(5, 7));
      if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
        return null;
      }
      return { date, value, year, month };
    })
    .filter(Boolean)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function formatMonthPair(monthA, monthB) {
  return `${MONTH_NAMES[monthA - 1]}/${MONTH_NAMES[monthB - 1]}`;
}

function formatPercent(value, digits = 0) {
  const rounded = Math.abs(value).toFixed(digits);
  return `${rounded}%`;
}

/**
 * Year-demeaned seasonal residuals by calendar month.
 * @param {Array<{year: number, month: number, value: number}>} points
 * @returns {Map<number, number>|null} month -> mean residual
 */
function computeSeasonalResiduals(points) {
  const byYear = new Map();
  for (const point of points) {
    if (!byYear.has(point.year)) {
      byYear.set(point.year, []);
    }
    byYear.get(point.year).push(point);
  }

  const residualSums = new Map();
  const residualCounts = new Map();

  for (const yearPoints of byYear.values()) {
    if (yearPoints.length < 10) {
      continue;
    }
    const yearMean = yearPoints.reduce((sum, p) => sum + p.value, 0) / yearPoints.length;
    for (const point of yearPoints) {
      const resid = point.value - yearMean;
      residualSums.set(point.month, (residualSums.get(point.month) || 0) + resid);
      residualCounts.set(point.month, (residualCounts.get(point.month) || 0) + 1);
    }
  }

  if (residualSums.size < 12) {
    return null;
  }

  const seasonal = new Map();
  for (let month = 1; month <= 12; month += 1) {
    const count = residualCounts.get(month) || 0;
    if (count === 0) {
      return null;
    }
    seasonal.set(month, residualSums.get(month) / count);
  }
  return seasonal;
}

function bestAdjacentPair(seasonal, findMin) {
  let bestScore = null;
  let bestMonths = null;

  for (let month = 1; month <= 12; month += 1) {
    const next = (month % 12) + 1;
    const score = (seasonal.get(month) + seasonal.get(next)) / 2;
    if (
      bestScore === null
      || (findMin && score < bestScore)
      || (!findMin && score > bestScore)
    ) {
      bestScore = score;
      bestMonths = [month, next];
    }
  }

  return { score: bestScore, months: bestMonths };
}

function pairConsistency(points, targetPair, preferCheapest) {
  const byYear = new Map();
  for (const point of points) {
    if (!byYear.has(point.year)) {
      byYear.set(point.year, new Map());
    }
    byYear.get(point.year).set(point.month, point.value);
  }

  let yearsChecked = 0;
  let hits = 0;

  for (const monthMap of byYear.values()) {
    if (monthMap.size < 10) {
      continue;
    }

    const pairAverages = [];
    for (let month = 1; month <= 12; month += 1) {
      const next = (month % 12) + 1;
      if (!monthMap.has(month) || !monthMap.has(next)) {
        continue;
      }
      pairAverages.push({
        pair: [month, next],
        avg: (monthMap.get(month) + monthMap.get(next)) / 2,
      });
    }

    if (pairAverages.length < 3) {
      continue;
    }

    yearsChecked += 1;
    pairAverages.sort((a, b) => a.avg - b.avg);
    const window = preferCheapest
      ? pairAverages.slice(0, 3)
      : pairAverages.slice(-3);
    const matched = window.some(
      (entry) => entry.pair[0] === targetPair[0] && entry.pair[1] === targetPair[1],
    );
    if (matched) {
      hits += 1;
    }
  }

  return {
    yearsChecked,
    consistency: yearsChecked > 0 ? hits / yearsChecked : 0,
  };
}

function buildSeasonalInsights(points, productLabel) {
  if (points.length < MIN_POINTS_SEASONAL) {
    return [];
  }

  const seasonal = computeSeasonalResiduals(points);
  if (!seasonal) {
    return [];
  }

  const meanPrice = points.reduce((sum, p) => sum + p.value, 0) / points.length;
  if (!(meanPrice > 0)) {
    return [];
  }

  const residuals = [...seasonal.values()];
  const ampPct = ((Math.max(...residuals) - Math.min(...residuals)) / meanPrice) * 100;
  if (ampPct < SEASONAL_MIN_AMP_PCT) {
    return [];
  }

  const cheap = bestAdjacentPair(seasonal, true);
  const expensive = bestAdjacentPair(seasonal, false);
  const cheapStats = pairConsistency(points, cheap.months, true);
  const expensiveStats = pairConsistency(points, expensive.months, false);

  if (
    cheapStats.yearsChecked < MIN_YEARS_SEASONAL
    && expensiveStats.yearsChecked < MIN_YEARS_SEASONAL
  ) {
    return [];
  }

  const insights = [];

  if (
    cheapStats.yearsChecked >= MIN_YEARS_SEASONAL
    && cheapStats.consistency >= SEASONAL_MIN_CONSISTENCY
  ) {
    insights.push({
      id: 'seasonal-best',
      type: 'seasonal',
      priority: 10 + Math.min(ampPct, 40),
      text: `Best time to buy ${productLabel} is usually in ${formatMonthPair(cheap.months[0], cheap.months[1])}.`,
      meta: {
        months: cheap.months,
        amplitudePct: ampPct,
        consistency: cheapStats.consistency,
      },
    });
  }

  if (
    expensiveStats.yearsChecked >= MIN_YEARS_SEASONAL
    && expensiveStats.consistency >= SEASONAL_MIN_CONSISTENCY
  ) {
    insights.push({
      id: 'seasonal-expensive',
      type: 'seasonal',
      priority: 9 + Math.min(ampPct, 40),
      text: `${productLabel} prices are typically highest in ${formatMonthPair(expensive.months[0], expensive.months[1])}.`,
      meta: {
        months: expensive.months,
        amplitudePct: ampPct,
        consistency: expensiveStats.consistency,
      },
    });
  }

  return insights;
}

function buildTrendInsight(points, productLabel) {
  if (points.length < MIN_POINTS_TREND) {
    return [];
  }

  const first = points[0].value;
  const last = points[points.length - 1].value;
  if (!(first > 0)) {
    return [];
  }

  const overallPct = ((last - first) / first) * 100;
  const yearsSpan = (points.length - 1) / 12;
  const earlyAvg = points.slice(0, 12).reduce((sum, p) => sum + p.value, 0) / 12;
  const lateAvg = points.slice(-12).reduce((sum, p) => sum + p.value, 0) / 12;
  const cagr = earlyAvg > 0 && yearsSpan > 0
    ? ((lateAvg / earlyAvg) ** (1 / yearsSpan) - 1) * 100
    : null;

  const startYear = points[0].year;
  const endYear = points[points.length - 1].year;

  if (overallPct >= TREND_SIGNIFICANT_PCT) {
    return [{
      id: 'trend-up-significant',
      type: 'trend',
      priority: 8 + Math.min(overallPct / 10, 8),
      text: `${productLabel} prices have increased significantly since ${startYear}`
        + `${cagr !== null ? `, rising about ${formatPercent(cagr, 1)} per year on average` : ''}.`,
      meta: { overallPct, cagr, startYear, endYear },
    }];
  }

  if (overallPct >= TREND_NOTABLE_PCT) {
    return [{
      id: 'trend-up-notable',
      type: 'trend',
      priority: 6,
      text: `${productLabel} prices have risen about ${formatPercent(overallPct)} since ${startYear}.`,
      meta: { overallPct, cagr, startYear, endYear },
    }];
  }

  if (overallPct <= TREND_DECREASE_PCT) {
    return [{
      id: 'trend-down',
      type: 'trend',
      priority: 7,
      text: `${productLabel} prices have decreased about ${formatPercent(overallPct)} since ${startYear}.`,
      meta: { overallPct, cagr, startYear, endYear },
    }];
  }

  return [];
}

function buildYoyInsight(points, productLabel) {
  if (points.length < MIN_POINTS_YOY) {
    return [];
  }

  const last = points[points.length - 1];
  const yearAgo = points[points.length - 13];
  if (!yearAgo || !(yearAgo.value > 0)) {
    return [];
  }

  const yoyPct = ((last.value - yearAgo.value) / yearAgo.value) * 100;
  if (Math.abs(yoyPct) < YOY_NOTABLE_PCT) {
    return [];
  }

  if (yoyPct >= YOY_NOTABLE_PCT) {
    return [{
      id: 'yoy-up',
      type: 'yoy',
      priority: 5 + Math.min(Math.abs(yoyPct) / 5, 4),
      text: `The price of ${productLabel} is about ${formatPercent(yoyPct)} higher than this time last year.`,
      meta: { yoyPct },
    }];
  }

  return [{
    id: 'yoy-down',
    type: 'yoy',
    priority: 5 + Math.min(Math.abs(yoyPct) / 5, 4),
    text: `The price of ${productLabel} is about ${formatPercent(yoyPct)} lower than this time last year.`,
    meta: { yoyPct },
  }];
}

function buildPositionInsight(points, productLabel) {
  if (points.length < MIN_POINTS_POSITION) {
    return [];
  }

  const values = points.map((p) => p.value);
  const last = values[values.length - 1];
  const high = Math.max(...values);
  const low = Math.min(...values);
  const highIdx = values.indexOf(high);
  const lowIdx = values.indexOf(low);
  const monthsSinceHigh = values.length - 1 - highIdx;
  const monthsSinceLow = values.length - 1 - lowIdx;
  const pctile = (values.filter((v) => v < last).length / values.length) * 100;

  if (
    pctile >= NEAR_HIGH_PCTILE
    && monthsSinceHigh <= NEAR_EXTREME_WITHIN_MONTHS
  ) {
    return [{
      id: 'near-high',
      type: 'position',
      priority: 4,
      text: `${productLabel} is currently near its highest recorded price`
        + `${high > 0 ? ` (about $${high.toFixed(2)})` : ''}.`,
      meta: { pctile, high, monthsSinceHigh },
    }];
  }

  if (
    pctile <= NEAR_LOW_PCTILE
    && monthsSinceLow <= NEAR_EXTREME_WITHIN_MONTHS
  ) {
    return [{
      id: 'near-low',
      type: 'position',
      priority: 4.5,
      text: `${productLabel} is currently near its lowest recorded price`
        + `${low > 0 ? ` (about $${low.toFixed(2)})` : ''}.`,
      meta: { pctile, low, monthsSinceLow },
    }];
  }

  return [];
}

function buildStreakInsight(points, productLabel) {
  if (points.length < MIN_STREAK_LENGTH + 1) {
    return [];
  }

  let streak = 0;
  let streakType = null;

  for (let i = points.length - 1; i > 0; i -= 1) {
    const current = points[i].value;
    const previous = points[i - 1].value;
    let direction = null;
    if (current > previous) {
      direction = 'increase';
    } else if (current < previous) {
      direction = 'decrease';
    } else {
      break;
    }

    if (streakType === null) {
      streakType = direction;
      streak = 1;
    } else if (direction === streakType) {
      streak += 1;
    } else {
      break;
    }
  }

  if (streak < MIN_STREAK_LENGTH || !streakType) {
    return [];
  }

  const verb = streakType === 'increase' ? 'rising' : 'falling';
  return [{
    id: `streak-${streakType}`,
    type: 'streak',
    priority: 3 + Math.min(streak, 5),
    text: `${productLabel} prices have been ${verb} for ${streak} months in a row.`,
    meta: { streak, streakType },
  }];
}

/**
 * Generate ranked plain-English insights for a product price history.
 *
 * @param {Array<{REF_DATE?: string, VALUE?: number|string}>} history
 * @param {string} productName
 * @param {{ maxInsights?: number }} [options]
 * @returns {Array<{id: string, type: string, priority: number, text: string, meta?: object}>}
 */
export function generatePriceInsights(history, productName, options = {}) {
  const maxInsights = options.maxInsights ?? 4;
  const points = normalizeHistory(history);
  if (points.length === 0) {
    return [];
  }

  const productLabel = getProductDisplayName(productName);
  const insights = [
    ...buildSeasonalInsights(points, productLabel),
    ...buildTrendInsight(points, productLabel),
    ...buildYoyInsight(points, productLabel),
    ...buildPositionInsight(points, productLabel),
    ...buildStreakInsight(points, productLabel),
  ];

  insights.sort((a, b) => b.priority - a.priority);

  const selected = [];
  const typeCounts = new Map();

  for (const insight of insights) {
    const count = typeCounts.get(insight.type) || 0;
    // Allow both best-time and most-expensive seasonal insights; one of each other type.
    const maxForType = insight.type === 'seasonal' ? 2 : 1;
    if (count >= maxForType) {
      continue;
    }

    selected.push(insight);
    typeCounts.set(insight.type, count + 1);

    if (selected.length >= maxInsights) {
      break;
    }
  }

  return selected;
}

export const INSIGHT_THRESHOLDS = {
  MIN_POINTS_SEASONAL,
  MIN_YEARS_SEASONAL,
  SEASONAL_MIN_AMP_PCT,
  SEASONAL_MIN_CONSISTENCY,
  MIN_POINTS_TREND,
  TREND_SIGNIFICANT_PCT,
  TREND_NOTABLE_PCT,
  TREND_DECREASE_PCT,
  MIN_POINTS_YOY,
  YOY_NOTABLE_PCT,
  MIN_POINTS_POSITION,
  NEAR_HIGH_PCTILE,
  NEAR_LOW_PCTILE,
  MIN_STREAK_LENGTH,
  MONTH_NAMES,
};

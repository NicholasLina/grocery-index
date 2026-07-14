/**
 * StatCan API Routes (SQLite-backed)
 */

import { Router, Request, Response } from 'express';
import { REGIONS } from '../constants/regions';
import {
  calculateAndStorePriceChanges,
  countSourceByGeo,
  countSourceByProduct,
  countSourceRows,
  getDistinctGeos,
  getDistinctProducts,
  getPriceChangesByGeo,
  getProductTrends,
  getRecentPriceHistoryByProduct,
  getSampleSourceRows,
  getStreaksByGeo,
  getTopGainers,
  getTopLosers,
  getYearAgoPrices,
  querySourcePrices,
} from '../db/repository';
import { isDatabaseReady } from '../db/sqlite';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  const ready = isDatabaseReady();
  res.json({
    status: ready ? 'ok' : 'degraded',
    storage: {
      driver: 'sqlite',
      ready,
    },
  });
});

const cacheMiddleware = (duration: number = 86400) => {
  return (_req: Request, res: Response, next: Function) => {
    res.set('Cache-Control', `public, max-age=${duration}, s-maxage=${duration}`);
    res.set('Expires', new Date(Date.now() + duration * 1000).toUTCString());
    next();
  };
};

const parsePositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

router.get('/price-changes', cacheMiddleware(86400), async (req: Request, res: Response) => {
  const { geo } = req.query;
  const limit = parsePositiveInt(req.query.limit, 3);
  const trendPoints = parsePositiveInt(req.query.trendPoints, 12);

  if (!geo) {
    return res.status(400).json({ error: 'Geographic location (geo) is required' });
  }

  try {
    const geoValue = String(geo);
    const gainers = getTopGainers(geoValue, limit);
    const losers = getTopLosers(geoValue, limit);
    const products = [
      ...new Set(
        [...gainers, ...losers]
          .map((item) => item.product)
          .filter((product): product is string => Boolean(product))
      ),
    ];
    const historyByProduct = getRecentPriceHistoryByProduct(geoValue, products, trendPoints);
    const withHistory = (item: { product: string }) => ({
      ...item,
      history: historyByProduct.get(item.product) ?? [],
    });

    res.json({
      geo: geoValue,
      gainers: gainers.map(withHistory),
      losers: losers.map(withHistory),
      totalGainers: gainers.length,
      totalLosers: losers.length,
      trendPoints,
    });
  } catch (err) {
    console.error('❌ Price changes endpoint error:', err);
    res.status(500).json({ error: 'Failed to fetch price changes', details: err });
  }
});

router.get('/product-trends', cacheMiddleware(86400), async (req: Request, res: Response) => {
  const { geo } = req.query;
  const limit = parsePositiveInt(req.query.limit, 6);
  const months = parsePositiveInt(req.query.months ?? req.query.points, 12);

  if (!geo) {
    return res.status(400).json({ error: 'Geographic location (geo) is required' });
  }

  try {
    const geoValue = String(geo);
    const topGainers = getTopGainers(geoValue, limit).map((item) => ({ product: item.product }));
    const topLosers = getTopLosers(geoValue, limit).map((item) => ({ product: item.product }));
    const products = [...new Set([...topGainers, ...topLosers].map((item) => item.product).filter(Boolean))];

    if (products.length === 0) {
      return res.json({ geo: geoValue, trends: {}, count: 0 });
    }

    const trends = getProductTrends(geoValue, products, months);
    return res.json({
      geo: geoValue,
      trends,
      count: Object.keys(trends).length,
      months,
    });
  } catch (err) {
    console.error('❌ Product trends endpoint error:', err);
    return res.status(500).json({ error: 'Failed to fetch product trends', details: err });
  }
});

router.post('/calculate-changes', async (req: Request, res: Response) => {
  const { geo } = req.body;

  if (!geo) {
    return res.status(400).json({ error: 'Geographic location (geo) is required' });
  }

  try {
    const processedCount = calculateAndStorePriceChanges(String(geo));
    res.json({
      success: true,
      geo,
      processedCount,
      message: `Successfully processed ${processedCount} products for ${geo}`,
    });
  } catch (err) {
    console.error('❌ Calculate changes error:', err);
    res.status(500).json({ error: 'Failed to calculate price changes', details: err });
  }
});

router.get('/calculate-all', async (_req: Request, res: Response) => {
  try {
    const geoValues = getDistinctGeos();
    const results = [];
    let totalProcessed = 0;

    for (const geo of geoValues) {
      try {
        const processedCount = calculateAndStorePriceChanges(geo);
        results.push({ geo, processedCount, success: true });
        totalProcessed += processedCount;
      } catch (err) {
        results.push({ geo, processedCount: 0, success: false, error: (err as Error).message });
      }
    }

    res.json({
      success: true,
      totalProcessed,
      totalRegions: geoValues.length,
      results,
    });
  } catch (err) {
    console.error('❌ Calculate all error:', err);
    res.status(500).json({ error: 'Failed to calculate all price changes', details: err });
  }
});

router.get('/regions', cacheMiddleware(86400), (_req: Request, res: Response) => {
  res.json({
    regions: [...REGIONS],
    count: REGIONS.length,
  });
});

router.get('/', async (req: Request, res: Response) => {
  const { date, geo, product, limit } = req.query;

  try {
    const results = querySourcePrices({
      date: date ? String(date) : undefined,
      geo: geo ? String(geo) : undefined,
      product: product ? String(product) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    if (results.length === 0 && geo && product) {
      const geoCount = countSourceByGeo(String(geo));
      const productCount = countSourceByProduct(String(product));
      console.log(`🔍 Records with GEO="${geo}": ${geoCount}`);
      console.log(`🔍 Records with Products="${product}": ${productCount}`);
    }

    res.json(results);
  } catch (err) {
    console.error('❌ Database error:', err);
    res.status(500).json({ error: 'Database query failed', details: err });
  }
});

router.get('/products', cacheMiddleware(86400), async (_req: Request, res: Response) => {
  try {
    const products = getDistinctProducts();
    res.json({
      products,
      count: products.length,
    });
  } catch (err) {
    console.error('❌ Products endpoint error:', err);
    res.status(500).json({ error: 'Failed to fetch products', details: err });
  }
});

router.get('/debug', async (_req: Request, res: Response) => {
  try {
    const geoValues = getDistinctGeos();
    const productValues = getDistinctProducts();

    res.json({
      totalRecords: countSourceRows(),
      sampleRecords: getSampleSourceRows(5),
      geoValues: geoValues.slice(0, 10),
      productValues: productValues.slice(0, 10),
      allGeoCount: geoValues.length,
      allProductCount: productValues.length,
    });
  } catch (err) {
    console.error('❌ Debug error:', err);
    res.status(500).json({ error: 'Debug query failed', details: err });
  }
});

router.get('/streaks', cacheMiddleware(86400), async (req: Request, res: Response) => {
  const { geo } = req.query;
  const limit = parsePositiveInt(req.query.limit, 3);

  if (!geo) {
    return res.status(400).json({ error: 'Geographic location (geo) is required' });
  }

  try {
    const streaks = getStreaksByGeo(String(geo), limit);
    res.json({ geo, streaks });
  } catch (err) {
    console.error('❌ Streaks endpoint error:', err);
    res.status(500).json({ error: 'Failed to fetch streaks', details: err });
  }
});

router.get('/all-price-changes', cacheMiddleware(86400), async (req: Request, res: Response) => {
  const { geo } = req.query;

  if (!geo) {
    return res.status(400).json({ error: 'Geographic location (geo) is required' });
  }

  try {
    const geoValue = String(geo);
    const allChanges = getPriceChangesByGeo(geoValue);
    const yearAgoKeys = allChanges
      .filter((item) => item.currentDate && item.product)
      .map((item) => {
        const date = new Date(`${item.currentDate}-01`);
        date.setMonth(date.getMonth() - 12);
        return { product: item.product, yearAgoDate: date.toISOString().slice(0, 7) };
      });

    const yearAgoMap = getYearAgoPrices(geoValue, yearAgoKeys);
    const results = allChanges.map((item) => {
      let yearAgoPrice: number | null = null;
      let yearAgoPercent: number | null = null;

      if (item.currentDate && item.product) {
        const date = new Date(`${item.currentDate}-01`);
        date.setMonth(date.getMonth() - 12);
        const yearAgoDate = date.toISOString().slice(0, 7);
        const found = yearAgoMap.get(`${item.product}::${yearAgoDate}`);
        if (typeof found === 'number') {
          yearAgoPrice = found;
          yearAgoPercent =
            yearAgoPrice === 0 ? null : (((item.currentPrice ?? 0) - yearAgoPrice) / yearAgoPrice) * 100;
        }
      }

      return {
        product: item.product,
        geo: item.geo,
        currentPrice: item.currentPrice ?? 0,
        previousPrice: item.previousPrice,
        change: item.change,
        changePercent: item.changePercent,
        currentDate: item.currentDate,
        previousDate: item.previousDate,
        yearAgoPrice,
        yearAgoChange: yearAgoPrice !== null ? (item.currentPrice ?? 0) - yearAgoPrice : null,
        yearAgoPercent,
      };
    });

    res.json({ geo: geoValue, products: results });
  } catch (err) {
    console.error('❌ all-price-changes endpoint error:', err);
    res.status(500).json({ error: 'Failed to fetch all price changes', details: err });
  }
});

export default router;

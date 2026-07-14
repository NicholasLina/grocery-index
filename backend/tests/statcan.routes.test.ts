import request from 'supertest';
import app from '../src/app';
import { seedTestDatabase, resetTestDatabase } from './helpers/seed';
import { setDatabase } from '../src/db/sqlite';

describe('StatCan API routes (SQLite)', () => {
  beforeEach(() => {
    seedTestDatabase();
  });

  afterEach(() => {
    resetTestDatabase();
  });

  test('GET /api/statcan/price-changes requires geo', async () => {
    const response = await request(app).get('/api/statcan/price-changes');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Geographic location (geo) is required' });
  });

  test('GET /api/statcan/products returns sorted products with count', async () => {
    const response = await request(app).get('/api/statcan/products');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      products: ['Apples', 'Bananas'],
      count: 2,
    });
  });

  test('GET /api/statcan/regions returns configured regions with count', async () => {
    const response = await request(app).get('/api/statcan/regions');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.regions)).toBe(true);
    expect(response.body.count).toBe(response.body.regions.length);
    expect(response.body.regions).toContain('Canada');
  });

  test('GET /api/statcan returns results for geo+product with limit', async () => {
    const response = await request(app).get('/api/statcan?geo=Canada&product=Apples&limit=2');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toMatchObject({
      REF_DATE: '2024-01',
      GEO: 'Canada',
      Products: 'Apples',
      VALUE: 100,
    });
  });

  test('GET /api/statcan/debug returns database summary', async () => {
    const response = await request(app).get('/api/statcan/debug');

    expect(response.status).toBe(200);
    expect(response.body.totalRecords).toBe(8);
    expect(response.body.allGeoCount).toBe(2);
    expect(response.body.allProductCount).toBe(2);
    expect(response.body.sampleRecords).toHaveLength(5);
  });

  test('GET /api/statcan/price-changes returns gainers and losers with history', async () => {
    const response = await request(app).get('/api/statcan/price-changes?geo=Canada&limit=2');

    expect(response.status).toBe(200);
    expect(response.body.gainers.length).toBeGreaterThan(0);
    expect(response.body.losers.length).toBeGreaterThan(0);
    expect(response.body.gainers[0]).toHaveProperty('history');
  });

  test('GET /api/statcan/health reports sqlite readiness', async () => {
    const response = await request(app).get('/api/statcan/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      storage: {
        driver: 'sqlite',
        ready: true,
      },
    });
  });

  test('returns 503 when database is unavailable', async () => {
    const previousSkip = process.env.SKIP_DB_CONNECT;
    process.env.SKIP_DB_CONNECT = 'false';
    setDatabase(null);

    const response = await request(app).get('/api/statcan/products');

    process.env.SKIP_DB_CONNECT = previousSkip;
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'Database not connected' });
  });
});

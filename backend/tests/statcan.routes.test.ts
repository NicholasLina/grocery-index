import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';

describe('StatCan API routes', () => {
  const StatCan = mongoose.model('StatCan') as any;

  test('GET /api/statcan/price-changes requires geo', async () => {
    const response = await request(app).get('/api/statcan/price-changes');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Geographic location (geo) is required' });
  });

  test('GET /api/statcan/products returns sorted products with count', async () => {
    jest.spyOn(StatCan, 'distinct').mockResolvedValue(['Bananas', 'Apples']);

    const response = await request(app).get('/api/statcan/products');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      products: ['Apples', 'Bananas'],
      count: 2
    });
  });

  test('GET /api/statcan returns results for geo+product with limit', async () => {
    const mockResults = [
      { REF_DATE: '2024-01', GEO: 'Canada', Products: 'Apples', VALUE: 1.23 },
      { REF_DATE: '2024-02', GEO: 'Canada', Products: 'Apples', VALUE: 1.5 }
    ];

    const limit = jest.fn().mockResolvedValue(mockResults);
    const sort = jest.fn().mockReturnValue({ limit });
    jest.spyOn(StatCan, 'find').mockReturnValue({ sort } as any);

    const response = await request(app).get('/api/statcan?geo=Canada&product=Apples&limit=2');

    expect(StatCan.find).toHaveBeenCalledWith({ GEO: 'Canada', Products: 'Apples' });
    expect(sort).toHaveBeenCalledWith({ REF_DATE: 1 });
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  test('GET /api/statcan/debug returns database summary', async () => {
    const mockRecords = [{ id: 1 }, { id: 2 }];

    jest.spyOn(StatCan, 'countDocuments').mockResolvedValue(42);
    jest.spyOn(StatCan, 'find').mockReturnValue({
      limit: jest.fn().mockResolvedValue(mockRecords)
    } as any);
    jest.spyOn(StatCan, 'distinct').mockImplementation((field: string) => {
      if (field === 'GEO') {
        return Promise.resolve(['Canada', 'Ontario']);
      }
      if (field === 'Products') {
        return Promise.resolve(['Apples']);
      }
      return Promise.resolve([]);
    });

    const response = await request(app).get('/api/statcan/debug');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      totalRecords: 42,
      sampleRecords: mockRecords,
      geoValues: ['Canada', 'Ontario'],
      productValues: ['Apples'],
      allGeoCount: 2,
      allProductCount: 1
    });
  });
});

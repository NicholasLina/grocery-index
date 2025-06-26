import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

const StatCanSchema = new mongoose.Schema({
  REF_DATE: String,
  GEO: String,
  Products: String,
  VECTOR: String,
  VALUE: mongoose.Schema.Types.Mixed,
}, { collection: 'table_18100245' });

const StatCan = mongoose.model('StatCan', StatCanSchema);

// GET /api/statcan?date=YYYY-MM&geo=Ontario&product=Bread
router.get('/', async (req: Request, res: Response) => {
  const { date, geo, product, limit = 100 } = req.query;
  const query: any = {};
  if (date) query.REF_DATE = date;
  if (geo) query.GEO = geo;
  if (product) query.Products = product;

  console.log('Query parameters:', { date, geo, product, limit });
  console.log('MongoDB query:', JSON.stringify(query, null, 2));

  try {
    let results;
    
    // If only geo and product are provided (no date), get all dates ordered by date
    if (geo && product && !date) {
      console.log('Executing geo + product query with date sorting...');
      results = await StatCan.find(query)
        .sort({ REF_DATE: 1 }) // Sort by date in ascending order
        .limit(Number(limit));
    } else {
      // Original behavior for other cases
      console.log('Executing standard query...');
      results = await StatCan.find(query).limit(Number(limit));
    }
    
    console.log(`Found ${results.length} results`);
    if (results.length > 0) {
      console.log('First result:', JSON.stringify(results[0], null, 2));
      console.log('Last result:', JSON.stringify(results[results.length - 1], null, 2));
    } else {
      // Let's check if there are any records with just the geo or just the product
      const geoOnlyCount = await StatCan.countDocuments({ GEO: geo });
      const productOnlyCount = await StatCan.countDocuments({ Products: product });
      console.log(`Records with GEO="${geo}": ${geoOnlyCount}`);
      console.log(`Records with Products="${product}": ${productOnlyCount}`);
    }
    
    res.json(results);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database query failed', details: err });
  }
});

// GET /api/statcan/products - Returns all product types
router.get('/products', async (req: Request, res: Response) => {
  try {
    const products = await StatCan.distinct('Products');
    res.json({
      products: products.sort(), // Sort alphabetically
      count: products.length
    });
  } catch (err) {
    console.error('Products endpoint error:', err);
    res.status(500).json({ error: 'Failed to fetch products', details: err });
  }
});

// Debug endpoint to check database contents
router.get('/debug', async (req: Request, res: Response) => {
  try {
    const totalCount = await StatCan.countDocuments();
    const sampleRecords = await StatCan.find().limit(5);
    const geoValues = await StatCan.distinct('GEO');
    const productValues = await StatCan.distinct('Products');
    
    res.json({
      totalRecords: totalCount,
      sampleRecords,
      geoValues: geoValues.slice(0, 10), // First 10 geo values
      productValues: productValues.slice(0, 10), // First 10 product values
      allGeoCount: geoValues.length,
      allProductCount: productValues.length
    });
  } catch (err) {
    console.error('Debug error:', err);
    res.status(500).json({ error: 'Debug query failed', details: err });
  }
});

export default router; 
/**
 * StatCan API Routes
 * 
 * This module provides REST API endpoints for accessing Statistics Canada grocery price data.
 * It includes endpoints for querying price data, getting product lists, and debugging database contents.
 * 
 * @author Canadian Grocery Index Team
 * @version 1.0.0
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

/** Express router instance for StatCan routes */
const router = Router();

/**
 * MongoDB Schema for StatCan price data
 * 
 * Represents the structure of grocery price data from Statistics Canada.
 * Maps to the 'table_18100245' collection in MongoDB.
 */
const StatCanSchema = new mongoose.Schema({
  /** Reference date in YYYY-MM format */
  REF_DATE: String,
  /** Geographic location (e.g., 'Canada', 'Ontario') */
  GEO: String,
  /** Product name and description */
  Products: String,
  /** Vector identifier from StatCan */
  VECTOR: String,
  /** Price value (can be mixed type due to StatCan data format) */
  VALUE: mongoose.Schema.Types.Mixed,
}, { collection: 'table_18100245' });

/**
 * MongoDB Schema for pre-calculated price changes
 * 
 * Stores pre-calculated price change data for quick retrieval by the frontend.
 * This eliminates the need for real-time calculations and improves performance.
 */
const PriceChangeSchema = new mongoose.Schema({
  /** Product name */
  product: String,
  /** Geographic location */
  geo: String,
  /** Current price */
  currentPrice: Number,
  /** Previous price */
  previousPrice: Number,
  /** Absolute price change */
  change: Number,
  /** Percentage change */
  changePercent: Number,
  /** Current date */
  currentDate: String,
  /** Previous date */
  previousDate: String,
  /** Last updated timestamp */
  lastUpdated: { type: Date, default: Date.now },
}, { collection: 'price_changes' });

// Create compound index for efficient queries
PriceChangeSchema.index({ geo: 1, changePercent: -1 });
PriceChangeSchema.index({ product: 1, geo: 1 });

/** Mongoose model for StatCan data */
const StatCan = mongoose.model('StatCan', StatCanSchema);

/** Mongoose model for pre-calculated price changes */
const PriceChange = mongoose.model('PriceChange', PriceChangeSchema);

/**
 * Service function to calculate and store price changes for all products in a region
 * 
 * This function processes all products in a given geographic location and calculates
 * their price changes between the most recent two data points. Results are stored
 * in the price_changes collection for quick retrieval.
 * 
 * @param {string} geo - Geographic location to process
 * @returns {Promise<number>} Number of price changes calculated and stored
 */
async function calculateAndStorePriceChanges(geo: string): Promise<number> {
  console.log(`🔄 Calculating price changes for ${geo}...`);
  
  try {
    // Get all products for this geographic location
    const products = await StatCan.distinct('Products', { GEO: geo });
    console.log(`📦 Found ${products.length} products for ${geo}`);
    
    let processedCount = 0;
    
    // Process each product
    for (const product of products) {
      try {
        // Get all price data for this product in this region, sorted by date
        const priceData = await StatCan.find({ 
          GEO: geo, 
          Products: product 
        }).sort({ REF_DATE: 1 });
        
        // Need at least 2 data points to calculate a change
        if (priceData.length < 2) {
          console.log(`⚠️ Insufficient data for ${product} in ${geo} (${priceData.length} points)`);
          continue;
        }
        
        // Get the two most recent data points
        const current = priceData[priceData.length - 1];
        const previous = priceData[priceData.length - 2];
        
        // Ensure we have valid numeric values
        const currentPrice = Number(current.VALUE);
        const previousPrice = Number(previous.VALUE);
        
        if (isNaN(currentPrice) || isNaN(previousPrice)) {
          console.log(`⚠️ Invalid price data for ${product} in ${geo}`);
          continue;
        }
        
        // Calculate changes
        const change = currentPrice - previousPrice;
        const changePercent = (change / previousPrice) * 100;
        
        // Create or update the price change record
        await PriceChange.findOneAndUpdate(
          { product, geo },
          {
            product,
            geo,
            currentPrice,
            previousPrice,
            change,
            changePercent,
            currentDate: current.REF_DATE,
            previousDate: previous.REF_DATE,
            lastUpdated: new Date()
          },
          { upsert: true, new: true }
        );
        
        processedCount++;
        
        if (processedCount % 10 === 0) {
          console.log(`✅ Processed ${processedCount}/${products.length} products for ${geo}`);
        }
        
      } catch (err) {
        console.error(`❌ Error processing ${product} in ${geo}:`, err);
      }
    }
    
    console.log(`✅ Completed price change calculation for ${geo}: ${processedCount} products processed`);
    return processedCount;
    
  } catch (err) {
    console.error(`❌ Error calculating price changes for ${geo}:`, err);
    throw err;
  }
}

/**
 * GET /api/statcan/price-changes - Get pre-calculated price changes for a region
 * 
 * Returns the top gainers and losers for a specific geographic location.
 * This endpoint uses pre-calculated data for fast response times.
 * 
 * @param {string} req.query.geo - Geographic location (required)
 * @param {number} [req.query.limit=3] - Number of top gainers/losers to return
 * 
 * @returns {Object} Object containing top gainers and losers
 * @returns {Array} returns.gainers - Array of top gainers (highest percentage increases)
 * @returns {Array} returns.losers - Array of top losers (highest percentage decreases)
 * 
 * @example
 * GET /api/statcan/price-changes?geo=Canada&limit=5
 * // Returns top 5 gainers and losers for Canada
 */
router.get('/price-changes', async (req: Request, res: Response) => {
  const { geo, limit = 3 } = req.query;
  
  if (!geo) {
    return res.status(400).json({ error: 'Geographic location (geo) is required' });
  }
  
  try {
    console.log(`📊 Fetching price changes for ${geo} (limit: ${limit})`);
    
    // Get top gainers (positive percentage changes)
    const gainers = await PriceChange.find({ geo })
      .where('changePercent').gt(0)
      .sort({ changePercent: -1 })
      .limit(Number(limit));
    
    // Get top losers (negative percentage changes)
    const losers = await PriceChange.find({ geo })
      .where('changePercent').lt(0)
      .sort({ changePercent: 1 })
      .limit(Number(limit));
    
    console.log(`✅ Found ${gainers.length} gainers and ${losers.length} losers for ${geo}`);
    
    res.json({
      geo,
      gainers,
      losers,
      totalGainers: gainers.length,
      totalLosers: losers.length
    });
    
  } catch (err) {
    console.error('❌ Price changes endpoint error:', err);
    res.status(500).json({ error: 'Failed to fetch price changes', details: err });
  }
});

/**
 * POST /api/statcan/calculate-changes - Trigger price change calculation for a region
 * 
 * Manually triggers the calculation and storage of price changes for a specific region.
 * This is useful for updating the pre-calculated data when new data is ingested.
 * 
 * @param {string} req.body.geo - Geographic location to process
 * 
 * @returns {Object} Calculation results
 * @returns {number} returns.processedCount - Number of products processed
 * @returns {string} returns.geo - Geographic location processed
 * 
 * @example
 * POST /api/statcan/calculate-changes
 * Content-Type: application/json
 * { "geo": "Canada" }
 */
router.post('/calculate-changes', async (req: Request, res: Response) => {
  const { geo } = req.body;
  
  if (!geo) {
    return res.status(400).json({ error: 'Geographic location (geo) is required' });
  }
  
  try {
    console.log(`🚀 Starting price change calculation for ${geo}...`);
    const processedCount = await calculateAndStorePriceChanges(geo);
    
    res.json({
      success: true,
      geo,
      processedCount,
      message: `Successfully processed ${processedCount} products for ${geo}`
    });
    
  } catch (err) {
    console.error('❌ Calculate changes error:', err);
    res.status(500).json({ error: 'Failed to calculate price changes', details: err });
  }
});

/**
 * GET /api/statcan/calculate-all - Calculate price changes for all regions
 * 
 * Processes all available geographic locations and calculates price changes for each.
 * This is useful for initial setup or bulk updates.
 * 
 * @returns {Object} Summary of all calculations
 * @returns {Array} returns.results - Array of results for each region
 * @returns {number} returns.totalProcessed - Total number of products processed
 * 
 * @example
 * GET /api/statcan/calculate-all
 * // Processes all regions and returns summary
 */
router.get('/calculate-all', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Starting price change calculation for all regions...');
    
    // Get all available geographic locations
    const geoValues = await StatCan.distinct('GEO');
    console.log(`🌍 Found ${geoValues.length} geographic locations:`, geoValues);
    
    const results = [];
    let totalProcessed = 0;
    
    // Process each region
    for (const geo of geoValues) {
      try {
        const processedCount = await calculateAndStorePriceChanges(geo);
        results.push({ geo, processedCount, success: true });
        totalProcessed += processedCount;
      } catch (err) {
        console.error(`❌ Failed to process ${geo}:`, err);
        results.push({ geo, processedCount: 0, success: false, error: (err as Error).message });
      }
    }
    
    console.log(`✅ Completed all calculations: ${totalProcessed} total products processed`);
    
    res.json({
      success: true,
      totalProcessed,
      totalRegions: geoValues.length,
      results
    });
    
  } catch (err) {
    console.error('❌ Calculate all error:', err);
    res.status(500).json({ error: 'Failed to calculate all price changes', details: err });
  }
});

/**
 * GET /api/statcan - Query price data with optional filters
 * 
 * Supports querying by date, geographic location, and product name.
 * When only geo and product are provided (no date), returns all dates ordered chronologically.
 * 
 * @param {string} [req.query.date] - Date filter in YYYY-MM format
 * @param {string} [req.query.geo] - Geographic location filter
 * @param {string} [req.query.product] - Product name filter
 * @param {number} [req.query.limit=100] - Maximum number of results to return
 * 
 * @returns {Array} Array of price data objects matching the query criteria
 * 
 * @example
 * // Get all dates for apples in Canada
 * GET /api/statcan?geo=Canada&product=Apples
 * 
 * @example
 * // Get specific date for bread in Ontario
 * GET /api/statcan?date=2024-01&geo=Ontario&product=Bread
 */
router.get('/', async (req: Request, res: Response) => {
  const { date, geo, product, limit = 100 } = req.query;
  
  /** Query object for MongoDB */
  const query: any = {};
  if (date) query.REF_DATE = date;
  if (geo) query.GEO = geo;
  if (product) query.Products = product;

  console.log('🔍 Query parameters:', { date, geo, product, limit });
  console.log('📊 MongoDB query:', JSON.stringify(query, null, 2));

  try {
    let results;
    
    // If only geo and product are provided (no date), get all dates ordered by date
    if (geo && product && !date) {
      console.log('📅 Executing geo + product query with date sorting...');
      results = await StatCan.find(query)
        .sort({ REF_DATE: 1 }) // Sort by date in ascending order
        .limit(Number(limit));
    } else {
      // Original behavior for other cases
      console.log('🔍 Executing standard query...');
      results = await StatCan.find(query).limit(Number(limit));
    }
    
    console.log(`✅ Found ${results.length} results`);
    if (results.length > 0) {
      console.log('📋 First result:', JSON.stringify(results[0], null, 2));
      console.log('📋 Last result:', JSON.stringify(results[results.length - 1], null, 2));
    } else {
      // Debug information when no results found
      const geoOnlyCount = await StatCan.countDocuments({ GEO: geo });
      const productOnlyCount = await StatCan.countDocuments({ Products: product });
      console.log(`🔍 Records with GEO="${geo}": ${geoOnlyCount}`);
      console.log(`🔍 Records with Products="${product}": ${productOnlyCount}`);
    }
    
    res.json(results);
  } catch (err) {
    console.error('❌ Database error:', err);
    res.status(500).json({ error: 'Database query failed', details: err });
  }
});

/**
 * GET /api/statcan/products - Get all available product types
 * 
 * Returns a list of all unique product names in the database.
 * Useful for populating dropdown menus or product selection interfaces.
 * 
 * @returns {Object} Object containing products array and count
 * @returns {string[]} returns.products - Alphabetically sorted array of product names
 * @returns {number} returns.count - Total number of unique products
 * 
 * @example
 * GET /api/statcan/products
 * // Returns: { products: ["Apples", "Bread", "Milk"], count: 3 }
 */
router.get('/products', async (req: Request, res: Response) => {
  try {
    const products = await StatCan.distinct('Products');
    res.json({
      products: products.sort(), // Sort alphabetically
      count: products.length
    });
  } catch (err) {
    console.error('❌ Products endpoint error:', err);
    res.status(500).json({ error: 'Failed to fetch products', details: err });
  }
});

/**
 * GET /api/statcan/debug - Debug endpoint for database inspection
 * 
 * Provides detailed information about the database contents including:
 * - Total record count
 * - Sample records
 * - Available geographic locations
 * - Available product types
 * 
 * Useful for debugging and understanding the data structure.
 * 
 * @returns {Object} Debug information about the database
 * @returns {number} returns.totalRecords - Total number of records in the database
 * @returns {Array} returns.sampleRecords - First 5 records from the database
 * @returns {string[]} returns.geoValues - First 10 geographic locations
 * @returns {string[]} returns.productValues - First 10 product types
 * @returns {number} returns.allGeoCount - Total number of unique geographic locations
 * @returns {number} returns.allProductCount - Total number of unique products
 * 
 * @example
 * GET /api/statcan/debug
 * // Returns comprehensive database statistics
 */
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
    console.error('❌ Debug error:', err);
    res.status(500).json({ error: 'Debug query failed', details: err });
  }
});

export default router; 
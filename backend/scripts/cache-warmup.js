/**
 * Cache warmup script.
 *
 * This script recalculates derived metrics and triggers key reads so API-level
 * response caches and query paths are primed.
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/statcan';
const MONGODB_URI = process.env.MONGODB_URI || '';
const REQUEST_TIMEOUT_MS = 30000;

const FALLBACK_REGIONS = [
  'Canada',
  'Ontario',
  'Quebec',
  'British Columbia',
  'Alberta',
  'Manitoba',
  'Saskatchewan',
  'Nova Scotia',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Prince Edward Island',
  'Northwest Territories',
  'Nunavut',
  'Yukon',
];

async function getRegions() {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/regions`, { timeout: REQUEST_TIMEOUT_MS });
    if (Array.isArray(data?.regions) && data.regions.length > 0) {
      return data.regions;
    }
    return FALLBACK_REGIONS;
  } catch (_error) {
    return FALLBACK_REGIONS;
  }
}

async function warmupCache() {
  console.log('🔥 Starting cache warmup...');
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is required to run cache warmup safely.');
  }
  const regions = await getRegions();
  const results = [];

  for (const region of regions) {
    console.log(`\n🌍 Warming up cache for ${region}...`);

    try {
      const calculateResponse = await axios.post(
        `${API_BASE_URL}/calculate-changes`,
        { geo: region },
        { timeout: REQUEST_TIMEOUT_MS }
      );

      console.log(
        `✅ Calculated price changes for ${region}: ${calculateResponse.data.processedCount} products`
      );

      const endpoints = [
        `/price-changes?geo=${encodeURIComponent(region)}&limit=3`,
        `/streaks?geo=${encodeURIComponent(region)}&limit=3`,
        `/all-price-changes?geo=${encodeURIComponent(region)}`,
      ];

      for (const endpoint of endpoints) {
        try {
          await axios.get(`${API_BASE_URL}${endpoint}`, { timeout: REQUEST_TIMEOUT_MS });
          console.log(`✅ Pre-fetched ${endpoint}`);
        } catch (error) {
          console.error(`❌ Failed to pre-fetch ${endpoint}:`, error.message);
        }
      }

      results.push({
        region,
        success: true,
        processedCount: calculateResponse.data.processedCount,
      });
    } catch (error) {
      console.error(`❌ Failed to warm up cache for ${region}:`, error.message);
      results.push({
        region,
        success: false,
        error: error.message,
      });
    }
  }

  const successful = results.filter((result) => result.success);
  const failed = results.filter((result) => !result.success);

  console.log('\n📊 Cache Warmup Summary:');
  console.log('========================');
  console.log(`✅ Successful: ${successful.length}/${regions.length} regions`);
  console.log(`❌ Failed: ${failed.length}/${regions.length} regions`);

  if (successful.length > 0) {
    const totalProcessed = successful.reduce((sum, result) => sum + result.processedCount, 0);
    console.log(`📦 Total products processed: ${totalProcessed}`);
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed regions:');
    failed.forEach((result) => console.log(`  - ${result.region}: ${result.error}`));
  }
}

if (require.main === module) {
  warmupCache()
    .then(() => {
      console.log('\n🎉 Cache warmup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Cache warmup failed:', error);
      process.exit(1);
    });
}

module.exports = { warmupCache };
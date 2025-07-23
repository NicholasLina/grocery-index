/**
 * Cache Warmup Script
 * 
 * This script pre-calculates price changes and streaks for all regions
 * to ensure fast loading times when users visit the homepage.
 * 
 * Run this script periodically (e.g., daily) to keep the cache fresh.
 */

const mongoose = require('mongoose');
const axios = require('axios');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/grocery-index';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/statcan';

// Regions to warm up
const REGIONS = ['Canada', 'Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Manitoba', 'Saskatchewan', 'Nova Scotia', 'New Brunswick', 'Newfoundland and Labrador', 'Prince Edward Island', 'Northwest Territories', 'Nunavut', 'Yukon'];

async function warmupCache() {
    console.log('🔥 Starting cache warmup...');

    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const results = [];

        // Warm up cache for each region
        for (const region of REGIONS) {
            console.log(`\n🌍 Warming up cache for ${region}...`);

            try {
                // Trigger price change calculation
                const calculateResponse = await axios.post(`${API_BASE_URL}/calculate-changes`, {
                    geo: region
                });

                console.log(`✅ Calculated price changes for ${region}: ${calculateResponse.data.processedCount} products`);

                // Pre-fetch API endpoints to warm up cache
                const endpoints = [
                    `/price-changes?geo=${encodeURIComponent(region)}&limit=3`,
                    `/streaks?geo=${encodeURIComponent(region)}&limit=3`,
                    `/all-price-changes?geo=${encodeURIComponent(region)}`
                ];

                for (const endpoint of endpoints) {
                    try {
                        const response = await axios.get(`${API_BASE_URL}${endpoint}`);
                        console.log(`✅ Pre-fetched ${endpoint}`);
                    } catch (error) {
                        console.error(`❌ Failed to pre-fetch ${endpoint}:`, error.message);
                    }
                }

                results.push({
                    region,
                    success: true,
                    processedCount: calculateResponse.data.processedCount
                });

            } catch (error) {
                console.error(`❌ Failed to warm up cache for ${region}:`, error.message);
                results.push({
                    region,
                    success: false,
                    error: error.message
                });
            }
        }

        // Print summary
        console.log('\n📊 Cache Warmup Summary:');
        console.log('========================');

        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        console.log(`✅ Successful: ${successful.length}/${REGIONS.length} regions`);
        console.log(`❌ Failed: ${failed.length}/${REGIONS.length} regions`);

        if (successful.length > 0) {
            const totalProcessed = successful.reduce((sum, r) => sum + r.processedCount, 0);
            console.log(`📦 Total products processed: ${totalProcessed}`);
        }

        if (failed.length > 0) {
            console.log('\n❌ Failed regions:');
            failed.forEach(r => console.log(`  - ${r.region}: ${r.error}`));
        }

    } catch (error) {
        console.error('❌ Cache warmup failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the warmup
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
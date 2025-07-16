const https = require('https');
const http = require('http');

// Configuration
const LOCAL_URL = 'http://localhost:3000/dev/api';
const PROD_URL = 'https://your-api-gateway-url.amazonaws.com/dev/api'; // Replace with your actual URL

// Test endpoints
const endpoints = [
    '/products',
    '/price-changes',
    '/streaks',
    '/all-price-changes',
    '/debug'
];

function makeRequest(url, endpoint) {
    return new Promise((resolve, reject) => {
        const fullUrl = `${url}${endpoint}`;
        const protocol = url.startsWith('https') ? https : http;

        protocol.get(fullUrl, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        endpoint,
                        status: res.statusCode,
                        data: jsonData,
                        success: res.statusCode >= 200 && res.statusCode < 300
                    });
                } catch (e) {
                    resolve({
                        endpoint,
                        status: res.statusCode,
                        data: data,
                        success: res.statusCode >= 200 && res.statusCode < 300
                    });
                }
            });
        }).on('error', (err) => {
            reject({
                endpoint,
                error: err.message,
                success: false
            });
        });
    });
}

async function testAPI(baseUrl, environment) {
    console.log(`\n🧪 Testing ${environment} API at ${baseUrl}`);
    console.log('='.repeat(60));

    const results = [];

    for (const endpoint of endpoints) {
        try {
            const result = await makeRequest(baseUrl, endpoint);
            results.push(result);

            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${endpoint} - Status: ${result.status}`);

            if (result.success && result.data) {
                if (Array.isArray(result.data)) {
                    console.log(`   📊 Found ${result.data.length} items`);
                } else if (typeof result.data === 'object') {
                    console.log(`   📊 Response received`);
                }
            }
        } catch (error) {
            results.push(error);
            console.log(`❌ ${endpoint} - Error: ${error.error}`);
        }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`\n📈 Summary: ${successCount}/${endpoints.length} endpoints working`);

    return results;
}

async function runTests() {
    console.log('🚀 Starting API Tests...\n');

    // Test local environment
    try {
        await testAPI(LOCAL_URL, 'LOCAL');
    } catch (error) {
        console.log('❌ Local API not available. Make sure to run: npm run offline');
    }

    // Test production environment (if URL is configured)
    if (PROD_URL !== 'https://your-api-gateway-url.amazonaws.com/dev/api') {
        try {
            await testAPI(PROD_URL, 'PRODUCTION');
        } catch (error) {
            console.log('❌ Production API not available or URL not configured');
        }
    } else {
        console.log('\n⚠️  Production URL not configured. Update PROD_URL in this script after deployment.');
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testAPI, makeRequest }; 
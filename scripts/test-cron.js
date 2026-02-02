#!/usr/bin/env node

/**
 * Test script for meal notification cron job
 * This script tests the cron endpoint locally
 */

const http = require('http');

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = 'localhost';
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Test the cron endpoint
 */
async function testCronEndpoint() {
  return new Promise((resolve, reject) => {
    let path = '/api/cron/meal-notifications';
    
    // Add secret if configured
    if (CRON_SECRET) {
      path += `?secret=${encodeURIComponent(CRON_SECRET)}`;
    }

    const options = {
      hostname: HOST,
      port: PORT,
      path: path,
      method: 'GET',
      timeout: 30000,
      headers: {
        'User-Agent': 'Test-Cron/1.0',
      },
    };

    console.log(`🧪 Testing cron endpoint: http://${HOST}:${PORT}${path}`);

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: result,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: { raw: data, parseError: error.message },
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Main test function
 */
async function main() {
  console.log(`🧪 [${new Date().toISOString()}] Testing meal notification cron job...`);
  
  try {
    const result = await testCronEndpoint();
    
    console.log(`📊 Status Code: ${result.statusCode}`);
    console.log(`📊 Content-Type: ${result.headers['content-type']}`);
    
    if (result.statusCode === 200) {
      console.log('✅ Cron endpoint is working!');
      
      if (result.data && result.data.results) {
        const { totalUsers, eligibleUsers, notificationsSent, errors } = result.data.results;
        console.log(`📊 Results:`);
        console.log(`   - Total users: ${totalUsers}`);
        console.log(`   - Eligible users: ${eligibleUsers}`);
        console.log(`   - Notifications sent: ${notificationsSent}`);
        console.log(`   - Errors: ${errors}`);
        
        if (result.data.results.details && result.data.results.details.length > 0) {
          console.log(`📝 Notification details:`);
          result.data.results.details.forEach((detail, index) => {
            console.log(`   ${index + 1}. ${detail.userName} - ${detail.mealType} (${detail.timeLate}min late)`);
          });
        } else {
          console.log('ℹ️  No notifications were sent (no users needed reminders)');
        }
      }
    } else if (result.statusCode === 401) {
      console.error('❌ Unauthorized - check CRON_SECRET environment variable');
    } else if (result.statusCode === 500) {
      console.error('❌ Server error:');
      console.error(JSON.stringify(result.data, null, 2));
    } else {
      console.error(`❌ Unexpected status code: ${result.statusCode}`);
      console.error(JSON.stringify(result.data, null, 2));
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused - make sure your Next.js server is running on port', PORT);
      console.error('   Run: npm run dev');
    } else {
      console.error('❌ Test failed:', error.message);
    }
    process.exit(1);
  }
}

// Run the test
main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
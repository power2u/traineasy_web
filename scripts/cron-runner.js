#!/usr/bin/env node

/**
 * Simple cron runner for meal notifications
 * This script should be run every hour via system cron
 * 
 * Add to crontab with:
 * 0 * * * * cd /path/to/your/project && node scripts/cron-runner.js
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Make HTTP request to trigger cron job
 */
function triggerCronJob() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/cron/meal-notifications', BASE_URL);
    
    // Add secret if configured
    if (CRON_SECRET) {
      url.searchParams.set('secret', CRON_SECRET);
    }

    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'Cron-Runner/1.0',
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: result,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: { raw: data },
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
 * Main execution
 */
async function main() {
  const startTime = Date.now();
  
  console.log(`🕐 [${new Date().toISOString()}] Starting meal notification cron job...`);
  console.log(`📍 Target URL: ${BASE_URL}/api/cron/meal-notifications`);
  
  try {
    const result = await triggerCronJob();
    const duration = Date.now() - startTime;
    
    if (result.statusCode === 200) {
      console.log(`✅ [${new Date().toISOString()}] Cron job completed successfully in ${duration}ms`);
      
      if (result.data && result.data.results) {
        const { totalUsers, eligibleUsers, notificationsSent, errors } = result.data.results;
        console.log(`📊 Results: ${notificationsSent} notifications sent to ${eligibleUsers}/${totalUsers} users (${errors} errors)`);
        
        if (result.data.results.details && result.data.results.details.length > 0) {
          console.log(`📝 Notifications sent:`);
          result.data.results.details.forEach((detail, index) => {
            console.log(`   ${index + 1}. ${detail.userName} - ${detail.mealType} (${detail.timeLate}min late, ${detail.devicesSent} devices)`);
          });
        }
      }
    } else {
      console.error(`❌ [${new Date().toISOString()}] Cron job failed with status ${result.statusCode}`);
      console.error('Response:', result.data);
      process.exit(1);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [${new Date().toISOString()}] Cron job error after ${duration}ms:`, error.message);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, exiting...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, exiting...');
  process.exit(0);
});

// Run the main function
main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
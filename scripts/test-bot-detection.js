#!/usr/bin/env node

/**
 * Bot Detection Test Script
 * Tests various user agents against the bot detection system
 */

const testCases = [
  // Legitimate browsers
  {
    name: 'Chrome Desktop',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    expectedBot: false
  },
  {
    name: 'Safari Mobile',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    expectedBot: false
  },
  {
    name: 'Firefox',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    expectedBot: false
  },
  
  // Obvious bots
  {
    name: 'Curl',
    userAgent: 'curl/7.68.0',
    expectedBot: true
  },
  {
    name: 'Python Requests',
    userAgent: 'python-requests/2.25.1',
    expectedBot: true
  },
  {
    name: 'Googlebot',
    userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    expectedBot: true
  },
  {
    name: 'Postman',
    userAgent: 'PostmanRuntime/7.28.0',
    expectedBot: true
  },
  
  // Edge cases
  {
    name: 'Empty User Agent',
    userAgent: '',
    expectedBot: true
  },
  {
    name: 'Short User Agent',
    userAgent: 'Bot',
    expectedBot: true
  },
  {
    name: 'Headless Chrome',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/91.0.4472.124 Safari/537.36',
    expectedBot: true
  }
];

async function testBotDetection() {
  console.log('🤖 Bot Detection Test Suite\n');
  
  const baseUrl = process.env.TEST_URL || 'http://localhost:3000';
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    try {
      const response = await fetch(`${baseUrl}/api/admin/debug/bot-detection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN}` // You'd need to set this
        },
        body: JSON.stringify({
          userAgent: testCase.userAgent,
          testIP: '192.168.1.100'
        })
      });
      
      if (!response.ok) {
        console.log(`❌ ${testCase.name}: HTTP ${response.status}`);
        failed++;
        continue;
      }
      
      const result = await response.json();
      const isBot = result.analysis.botDetection.isBot;
      const confidence = result.analysis.botDetection.confidence;
      
      if (isBot === testCase.expectedBot) {
        console.log(`✅ ${testCase.name}: ${isBot ? 'BOT' : 'HUMAN'} (${confidence}%)`);
        passed++;
      } else {
        console.log(`❌ ${testCase.name}: Expected ${testCase.expectedBot ? 'BOT' : 'HUMAN'}, got ${isBot ? 'BOT' : 'HUMAN'} (${confidence}%)`);
        failed++;
      }
      
    } catch (error) {
      console.log(`❌ ${testCase.name}: Error - ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Check the bot detection rules.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testBotDetection().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { testBotDetection, testCases };
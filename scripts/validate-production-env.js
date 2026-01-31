#!/usr/bin/env node

/**
 * Production Environment Validation Script
 * Validates that all required environment variables are set for production deployment
 */

// Load environment variables from .env.local for testing
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.local' });
}

const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_VAPID_KEY',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'SMTP_SERVER',
  'SMTP_PORT',
  'SMTP_FROM',
  'SMTP_PASS',
];

const optionalEnvVars = [
  'CRON_SECRET',
  'REQUIRE_EMAIL_VERIFICATION',
  'BOT_DETECTION_ENABLED',
  'BOT_DETECTION_THRESHOLD',
  'RATE_LIMIT_ENABLED',
  'ENABLE_CAPTCHA',
];

function validateEnvironment() {
  console.log('🔍 Validating production environment variables...\n');

  const missing = [];
  const present = [];
  const warnings = [];

  // Check required variables
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
    } else {
      present.push(varName);
    }
  });

  // Check optional variables
  optionalEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      warnings.push(varName);
    }
  });

  // Validate specific values
  if (process.env.NODE_ENV !== 'production') {
    warnings.push('NODE_ENV should be set to "production"');
  }

  if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.startsWith('https://')) {
    warnings.push('NEXTAUTH_URL should use HTTPS in production');
  }

  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    warnings.push('DATABASE_URL should be a PostgreSQL connection string');
  }

  // Validate Firebase Service Account JSON
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (error) {
      missing.push('FIREBASE_SERVICE_ACCOUNT_JSON (invalid JSON format)');
    }
  }

  // Report results
  console.log('✅ Required variables present:', present.length);
  present.forEach(varName => {
    const value = process.env[varName];
    const displayValue = varName.includes('SECRET') || varName.includes('PASSWORD') || varName.includes('KEY')
      ? '***HIDDEN***'
      : value.length > 50 
        ? value.substring(0, 50) + '...'
        : value;
    console.log(`   ✓ ${varName}: ${displayValue}`);
  });

  if (missing.length > 0) {
    console.log('\n❌ Missing required variables:', missing.length);
    missing.forEach(varName => {
      console.log(`   ✗ ${varName}`);
    });
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Optional/Warning variables:', warnings.length);
    warnings.forEach(item => {
      console.log(`   ⚠ ${item}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  if (missing.length > 0) {
    console.log('❌ VALIDATION FAILED');
    console.log('Please set all required environment variables before deploying to production.');
    process.exit(1);
  } else {
    console.log('✅ VALIDATION PASSED');
    console.log('All required environment variables are present.');
    if (warnings.length > 0) {
      console.log('Note: Some optional variables are missing, but deployment can proceed.');
    }
    process.exit(0);
  }
}

// Run validation
validateEnvironment();
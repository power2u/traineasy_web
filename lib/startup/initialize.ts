/**
 * Application startup initialization
 * This runs when the Next.js app starts up
 */

import { internalScheduler } from '@/lib/cron/internal-scheduler';

let isInitialized = false;

/**
 * Initialize the application on startup
 */
export function initializeApp() {
  if (isInitialized) {
    console.log('🔄 App already initialized, skipping...');
    return;
  }

  console.log('🚀 Initializing TrainEasy application...');

  try {
    // Only initialize on server-side
    if (typeof window === 'undefined') {
      console.log('🖥️  Server-side initialization...');

      // Start internal scheduler in production
      if (process.env.NODE_ENV === 'production') {
        console.log('🏭 Production mode: Starting internal scheduler...');
        internalScheduler.start();
      } else {
        console.log('🧪 Development mode: Scheduler not auto-started');
        console.log('   Use /api/admin/scheduler to manually control');
      }

      // Log environment info
      console.log('📊 Environment info:');
      console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
      console.log(`   CRON_SECRET: ${process.env.CRON_SECRET ? '✅ Set' : '❌ Not set'}`);
      console.log(`   FIREBASE_SERVICE_ACCOUNT_JSON: ${process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? '✅ Set' : '❌ Not set'}`);
    }

    isInitialized = true;
    console.log('✅ TrainEasy application initialized successfully');

  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    // Don't throw - let the app continue even if initialization fails
  }
}

/**
 * Get initialization status
 */
export function getInitializationStatus() {
  return {
    isInitialized,
    schedulerStatus: internalScheduler.getStatus(),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  };
}
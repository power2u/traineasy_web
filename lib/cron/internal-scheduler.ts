/**
 * Internal cron scheduler that runs within the Next.js app
 * This eliminates the need for system-level cron setup
 */

class InternalScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  /**
   * Start the internal scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('📅 Internal scheduler already running');
      return;
    }

    console.log('🚀 Starting internal cron scheduler...');
    this.isRunning = true;

    // Send welcome notification when scheduler starts
    this.sendWelcomeNotification();

    // Schedule meal notifications every hour
    this.scheduleJob('meal-notifications', this.runMealNotifications.bind(this), 60 * 60 * 1000); // 1 hour

    // Schedule token cleanup daily
    this.scheduleJob('token-cleanup', this.runTokenCleanup.bind(this), 24 * 60 * 60 * 1000); // 24 hours

    console.log('✅ Internal scheduler started successfully');
  }

  /**
   * Stop the internal scheduler
   */
  stop() {
    console.log('🛑 Stopping internal scheduler...');
    
    for (const [jobName, interval] of this.intervals) {
      clearInterval(interval);
      console.log(`   Stopped job: ${jobName}`);
    }
    
    this.intervals.clear();
    this.isRunning = false;
    console.log('✅ Internal scheduler stopped');
  }

  /**
   * Schedule a recurring job
   */
  private scheduleJob(name: string, callback: () => Promise<void>, intervalMs: number) {
    // Run immediately on startup
    this.runJobSafely(name, callback);

    // Then schedule recurring execution
    const interval = setInterval(() => {
      this.runJobSafely(name, callback);
    }, intervalMs);

    this.intervals.set(name, interval);
    console.log(`📅 Scheduled job '${name}' to run every ${intervalMs / 1000}s`);
  }

  /**
   * Run a job with error handling
   */
  private async runJobSafely(name: string, callback: () => Promise<void>) {
    try {
      console.log(`🔄 Running job: ${name} at ${new Date().toISOString()}`);
      await callback();
      console.log(`✅ Job completed: ${name}`);
    } catch (error) {
      console.error(`❌ Job failed: ${name}`, error);
    }
  }

  /**
   * Run meal notifications job
   */
  private async runMealNotifications() {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const cronSecret = process.env.CRON_SECRET;
      
      let url = `${baseUrl}/api/cron/meal-notifications`;
      if (cronSecret) {
        url += `?secret=${encodeURIComponent(cronSecret)}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Internal-Scheduler/1.0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON response but got ${contentType}. Response: ${text.substring(0, 200)}...`);
      }

      const result = await response.json();
      
      if (result.results) {
        const { notificationsSent, eligibleUsers, totalUsers } = result.results;
        console.log(`📊 Meal notifications: ${notificationsSent} sent to ${eligibleUsers}/${totalUsers} users`);
      }
    } catch (error) {
      console.error('❌ Meal notifications job failed:', error);
      throw error;
    }
  }

  /**
   * Send welcome notification when scheduler starts
   */
  private async sendWelcomeNotification() {
    try {
      console.log('🎉 Sending welcome notification...');
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      const response = await fetch(`${baseUrl}/api/admin/welcome-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Internal-Scheduler/1.0',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          title: '🚀 TrainEasy Scheduler Active!',
          body: 'Hi {name}! Your meal reminders and notifications are now active. Stay consistent with your fitness goals! 💪',
          type: 'scheduler_welcome'
        }),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error(`❌ Welcome notification failed: Expected JSON but got ${contentType}. Response: ${text.substring(0, 200)}...`);
          return;
        }

        const result = await response.json();
        console.log(`🎉 Welcome notification result:`, result);
        console.log(`✅ Welcome notification sent to ${result.sent || 0} devices for ${result.users || 0} users`);
      } else {
        const errorText = await response.text();
        console.error(`❌ Welcome notification failed: HTTP ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Welcome notification failed:', error);
      // Don't throw - welcome notification failure shouldn't stop scheduler
    }
  }

  /**
   * Run token cleanup job
   */
  private async runTokenCleanup() {
    try {
      console.log('🧹 Running FCM token cleanup job...');
      
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      const response = await fetch(`${baseUrl}/api/admin/cleanup-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Internal-Scheduler/1.0',
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(`Expected JSON response but got ${contentType}. Response: ${text.substring(0, 200)}...`);
        }

        const result = await response.json();
        console.log(`🧹 Token cleanup completed: ${result.removed || 0} tokens removed`);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Token cleanup job failed:', error);
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.intervals.keys()),
      jobCount: this.intervals.size,
    };
  }
}

// Singleton instance
export const internalScheduler = new InternalScheduler();

// Auto-start in production
if (process.env.NODE_ENV === 'production' && 
    typeof window === 'undefined' && 
    !process.env.NEXT_PHASE &&
    !process.env.BUILDING &&
    process.env.VERCEL_ENV !== 'preview' &&
    !process.argv.includes('build') &&
    !process.argv.includes('start')) {
  // Only start on server-side in production runtime, not during build
  console.log('� Auto-starting scheduler in production...');
  internalScheduler.start();
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('📡 Received SIGTERM, stopping scheduler...');
    internalScheduler.stop();
  });
  
  process.on('SIGINT', () => {
    console.log('📡 Received SIGINT, stopping scheduler...');
    internalScheduler.stop();
  });
} else {
  console.log('🔧 Scheduler not auto-started (development mode or build phase)');
}
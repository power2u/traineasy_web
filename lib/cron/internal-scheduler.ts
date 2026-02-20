import { runFcmTokenCleanupJob } from '@/app/api/admin/cleanup-tokens/job';
import { sendCustomNotificationToActiveUsers } from '@/app/api/admin/welcome-notification/job';

class InternalScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  start() {
    if (this.isRunning) {
      console.log('📅 Internal scheduler already running');
      return;
    }

    console.log('🚀 Starting internal cron scheduler...');
    this.isRunning = true;

    this.sendWelcomeNotification();

    this.scheduleJob('meal-notifications', this.runMealNotifications.bind(this), 60 * 60 * 1000);
    this.scheduleJob('token-cleanup', this.runTokenCleanup.bind(this), 24 * 60 * 60 * 1000);

    console.log('✅ Internal scheduler started successfully');
  }

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

  private scheduleJob(name: string, callback: () => Promise<void>, intervalMs: number) {
    this.runJobSafely(name, callback);
    const interval = setInterval(() => {
      this.runJobSafely(name, callback);
    }, intervalMs);

    this.intervals.set(name, interval);
    console.log(`📅 Scheduled job '${name}' to run every ${intervalMs / 1000}s`);
  }

  private async runJobSafely(name: string, callback: () => Promise<void>) {
    try {
      console.log(`🔄 Running job: ${name} at ${new Date().toISOString()}`);
      await callback();
      console.log(`✅ Job completed: ${name}`);
    } catch (error) {
      console.error(`❌ Job failed: ${name}`, error);
    }
  }

  private async runMealNotifications() {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
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

  private async sendWelcomeNotification() {
    try {
      console.log('🎉 Sending welcome notification...');
      const result = await sendCustomNotificationToActiveUsers({
        title: '🚀 TrainEasy Scheduler Active!',
        body: 'Hi {name}! Your meal reminders and notifications are now active. Stay consistent with your fitness goals! 💪',
        type: 'scheduler_welcome',
      });
      console.log('🎉 Welcome notification result:', result);
      console.log(
        `✅ Welcome notification sent to ${result.sent || 0} devices for ${result.users || 0} users`
      );
    } catch (error) {
      console.error('❌ Welcome notification failed:', error);
    }
  }

  private async runTokenCleanup() {
    try {
      console.log('🧹 Running FCM token cleanup job...');
      const result = await runFcmTokenCleanupJob();
      console.log(`🧹 Token cleanup completed: ${result.removed || 0} tokens removed`);
    } catch (error) {
      console.error('❌ Token cleanup job failed:', error);
      throw error;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.intervals.keys()),
      jobCount: this.intervals.size,
    };
  }
}

export const internalScheduler = new InternalScheduler();

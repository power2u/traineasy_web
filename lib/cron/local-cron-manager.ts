import { createClient } from '@/lib/supabase/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

interface UserCronJob {
  id: string;
  user_id: string;
  notification_type: string;
  cron_expression: string;
  timezone: string;
  is_active: boolean;
}

export class LocalCronManager {
  private static instance: LocalCronManager;
  private readonly cronJobPrefix = 'fitness_tracker_';
  private readonly scriptPath = path.join(process.cwd(), 'scripts', 'send-notification.js');

  private constructor() {}

  static getInstance(): LocalCronManager {
    if (!LocalCronManager.instance) {
      LocalCronManager.instance = new LocalCronManager();
    }
    return LocalCronManager.instance;
  }

  /**
   * Register cron jobs for a new user based on their preferences
   * Uses device local time (ignores timezone complexity)
   */
  async registerUserCronJobs(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = await createClient();

      // Check if cron jobs were updated today (limit to once per day)
      const { data: existingJobs } = await supabase
        .from('user_cron_jobs')
        .select('updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (existingJobs && existingJobs.length > 0) {
        const lastUpdate = new Date(existingJobs[0].updated_at);
        const today = new Date();
        const isSameDay = lastUpdate.toDateString() === today.toDateString();
        
        if (isSameDay) {
          return { 
            success: true, 
            message: `Cron jobs already updated today for user ${userId}` 
          };
        }
      }

      // Get user preferences
      const { data: userPrefs, error: prefsError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('id', userId)
        .single();

      if (prefsError || !userPrefs) {
        return { success: false, message: 'User preferences not found' };
      }

      // Remove existing cron jobs for this user
      await this.removeUserCronJobs(userId);

      const cronJobs: Partial<UserCronJob>[] = [];

      // Create meal reminder cron jobs based on user's meal times (local device time)
      if (userPrefs.meal_reminders_enabled && userPrefs.notifications_enabled) {
        const mealTimes = [
          { type: 'meal_reminder_breakfast', time: userPrefs.breakfast_time },
          { type: 'meal_reminder_snack1', time: userPrefs.snack1_time },
          { type: 'meal_reminder_lunch', time: userPrefs.lunch_time },
          { type: 'meal_reminder_snack2', time: userPrefs.snack2_time },
          { type: 'meal_reminder_dinner', time: userPrefs.dinner_time },
        ];

        for (const meal of mealTimes) {
          if (meal.time) {
            const [hours, minutes] = meal.time.split(':');
            const cronExpression = `${minutes} ${hours} * * *`; // Daily at specific time (local server time)
            
            cronJobs.push({
              user_id: userId,
              notification_type: meal.type,
              cron_expression: cronExpression,
              timezone: 'local', // Use local server time instead of user timezone
              is_active: true,
            });
          }
        }
      }

      // Water reminders (every 2 hours from 8 AM to 8 PM - local time)
      if (userPrefs.water_reminders_enabled && userPrefs.notifications_enabled) {
        cronJobs.push({
          user_id: userId,
          notification_type: 'water_reminder',
          cron_expression: '0 8,10,12,14,16,18,20 * * *', // Every 2 hours (local time)
          timezone: 'local',
          is_active: true,
        });
      }

      // Good morning (7 AM daily - local time)
      if (userPrefs.notifications_enabled) {
        cronJobs.push({
          user_id: userId,
          notification_type: 'good_morning',
          cron_expression: '0 7 * * *',
          timezone: 'local',
          is_active: true,
        });
      }

      // Good night (9 PM daily - local time)
      if (userPrefs.notifications_enabled) {
        cronJobs.push({
          user_id: userId,
          notification_type: 'good_night',
          cron_expression: '0 21 * * *',
          timezone: 'local',
          is_active: true,
        });
      }

      // Weekly weight reminder (Saturday 9 AM - local time)
      if (userPrefs.weight_reminders_enabled && userPrefs.notifications_enabled) {
        cronJobs.push({
          user_id: userId,
          notification_type: 'weekly_weight_reminder',
          cron_expression: '0 9 * * 6', // Saturday 9 AM (local time)
          timezone: 'local',
          is_active: true,
        });
      }

      // Weekly measurement reminder (Saturday 10 AM - local time)
      if (userPrefs.weight_reminders_enabled && userPrefs.notifications_enabled) {
        cronJobs.push({
          user_id: userId,
          notification_type: 'weekly_measurement_reminder',
          cron_expression: '0 10 * * 6', // Saturday 10 AM (local time)
          timezone: 'local',
          is_active: true,
        });
      }

      // Insert cron jobs into database
      if (cronJobs.length > 0) {
        const { error: insertError } = await supabase
          .from('user_cron_jobs')
          .insert(cronJobs);

        if (insertError) {
          console.error('Error inserting cron jobs:', insertError);
          return { success: false, message: 'Failed to save cron jobs to database' };
        }

        // Register actual system cron jobs (using local server time)
        for (const job of cronJobs) {
          await this.addSystemCronJob(userId, job.notification_type!, job.cron_expression!);
        }
      }

      return { 
        success: true, 
        message: `Registered ${cronJobs.length} cron jobs for user ${userId} (updated today)` 
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error registering user cron jobs:', errorMessage);
      return { success: false, message: errorMessage };
    }
  }

  /**
   * Remove all cron jobs for a user
   */
  async removeUserCronJobs(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = await createClient();

      // Get existing cron jobs for this user
      const { data: existingJobs } = await supabase
        .from('user_cron_jobs')
        .select('*')
        .eq('user_id', userId);

      // Remove from system crontab
      if (existingJobs) {
        for (const job of existingJobs) {
          await this.removeSystemCronJob(userId, job.notification_type);
        }
      }

      // Remove from database
      const { error } = await supabase
        .from('user_cron_jobs')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing cron jobs from database:', error);
        return { success: false, message: 'Failed to remove cron jobs from database' };
      }

      return { success: true, message: `Removed cron jobs for user ${userId}` };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error removing user cron jobs:', errorMessage);
      return { success: false, message: errorMessage };
    }
  }

  /**
   * Update cron jobs when user preferences change (no daily limit)
   */
  async updateUserCronJobs(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = await createClient();

      // Get user preferences
      const { data: userPrefs, error: prefsError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('id', userId)
        .single();

      if (prefsError || !userPrefs) {
        return { success: false, message: 'User preferences not found' };
      }

      // Remove existing cron jobs for this user
      await this.removeUserCronJobs(userId);

      const cronJobs: Partial<UserCronJob>[] = [];

      // Create meal reminder cron jobs based on user's meal times (local device time)
      if (userPrefs.meal_reminders_enabled && userPrefs.notifications_enabled) {
        const mealTimes = [
          { type: 'meal_reminder_breakfast', time: userPrefs.breakfast_time },
          { type: 'meal_reminder_snack1', time: userPrefs.snack1_time },
          { type: 'meal_reminder_lunch', time: userPrefs.lunch_time },
          { type: 'meal_reminder_snack2', time: userPrefs.snack2_time },
          { type: 'meal_reminder_dinner', time: userPrefs.dinner_time },
        ];

        for (const meal of mealTimes) {
          if (meal.time) {
            const [hours, minutes] = meal.time.split(':');
            const cronExpression = `${minutes} ${hours} * * *`; // Daily at specific time (local server time)
            
            cronJobs.push({
              user_id: userId,
              notification_type: meal.type,
              cron_expression: cronExpression,
              timezone: 'local', // Use local server time instead of user timezone
              is_active: true,
            });
          }
        }
      }

      // Water reminders (every 2 hours from 8 AM to 8 PM - local time)
      if (userPrefs.water_reminders_enabled && userPrefs.notifications_enabled) {
        cronJobs.push({
          user_id: userId,
          notification_type: 'water_reminder',
          cron_expression: '0 8,10,12,14,16,18,20 * * *', // Every 2 hours (local time)
          timezone: 'local',
          is_active: true,
        });
      }

      // Good morning (7 AM daily - local time)
      if (userPrefs.notifications_enabled) {
        cronJobs.push({
          user_id: userId,
          notification_type: 'good_morning',
          cron_expression: '0 7 * * *',
          timezone: 'local',
          is_active: true,
        });
      }

      // Good night (9 PM daily - local time)
      if (userPrefs.notifications_enabled) {
        cronJobs.push({
          user_id: userId,
          notification_type: 'good_night',
          cron_expression: '0 21 * * *',
          timezone: 'local',
          is_active: true,
        });
      }

      // Weekly weight reminder (Saturday 9 AM - local time)
      if (userPrefs.weight_reminders_enabled && userPrefs.notifications_enabled) {
        cronJobs.push({
          user_id: userId,
          notification_type: 'weekly_weight_reminder',
          cron_expression: '0 9 * * 6', // Saturday 9 AM (local time)
          timezone: 'local',
          is_active: true,
        });
      }

      // Weekly measurement reminder (Saturday 10 AM - local time)
      if (userPrefs.weight_reminders_enabled && userPrefs.notifications_enabled) {
        cronJobs.push({
          user_id: userId,
          notification_type: 'weekly_measurement_reminder',
          cron_expression: '0 10 * * 6', // Saturday 10 AM (local time)
          timezone: 'local',
          is_active: true,
        });
      }

      // Insert cron jobs into database
      if (cronJobs.length > 0) {
        const { error: insertError } = await supabase
          .from('user_cron_jobs')
          .insert(cronJobs);

        if (insertError) {
          console.error('Error inserting cron jobs:', insertError);
          return { success: false, message: 'Failed to save cron jobs to database' };
        }

        // Register actual system cron jobs (using local server time)
        for (const job of cronJobs) {
          await this.addSystemCronJob(userId, job.notification_type!, job.cron_expression!);
        }
      }

      return { 
        success: true, 
        message: `Updated ${cronJobs.length} cron jobs for user ${userId} (preference change)` 
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error updating user cron jobs:', errorMessage);
      return { success: false, message: errorMessage };
    }
  }

  /**
   * Add a cron job to the system crontab (using local server time)
   */
  private async addSystemCronJob(userId: string, notificationType: string, cronExpression: string): Promise<void> {
    try {
      const jobName = `${this.cronJobPrefix}${userId}_${notificationType}`;
      const command = `node ${this.scriptPath} ${userId} ${notificationType}`;
      
      // Create cron job entry (no timezone prefix - uses local server time)
      const cronEntry = `# ${jobName}\n${cronExpression} ${command}`;
      
      // Add to crontab
      const { stdout: currentCrontab } = await execAsync('crontab -l 2>/dev/null || echo ""');
      
      // Check if job already exists
      if (!currentCrontab.includes(jobName)) {
        const newCrontab = currentCrontab.trim() + '\n' + cronEntry + '\n';
        
        // Write new crontab
        await execAsync(`echo "${newCrontab}" | crontab -`);
        console.log(`Added cron job: ${jobName} (local time)`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error adding system cron job for ${userId}:`, errorMessage);
    }
  }

  /**
   * Remove a cron job from the system crontab
   */
  private async removeSystemCronJob(userId: string, notificationType: string): Promise<void> {
    try {
      const jobName = `${this.cronJobPrefix}${userId}_${notificationType}`;
      
      // Get current crontab
      const { stdout: currentCrontab } = await execAsync('crontab -l 2>/dev/null || echo ""');
      
      // Remove lines containing the job name
      const lines = currentCrontab.split('\n');
      const filteredLines = lines.filter(line => !line.includes(jobName));
      
      if (filteredLines.length !== lines.length) {
        const newCrontab = filteredLines.join('\n');
        await execAsync(`echo "${newCrontab}" | crontab -`);
        console.log(`Removed cron job: ${jobName}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error removing system cron job for ${userId}:`, errorMessage);
    }
  }

  /**
   * List all active cron jobs for a user
   */
  async getUserCronJobs(userId: string): Promise<UserCronJob[]> {
    try {
      const supabase = await createClient();
      
      const { data, error } = await supabase
        .from('user_cron_jobs')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('notification_type');

      if (error) {
        console.error('Error fetching user cron jobs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user cron jobs:', error);
      return [];
    }
  }

  /**
   * Disable/Enable cron jobs for a user
   */
  async toggleUserCronJobs(userId: string, enabled: boolean): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = await createClient();

      if (enabled) {
        // Re-register cron jobs
        return await this.registerUserCronJobs(userId);
      } else {
        // Disable cron jobs
        const { error } = await supabase
          .from('user_cron_jobs')
          .update({ is_active: false })
          .eq('user_id', userId);

        if (error) {
          return { success: false, message: 'Failed to disable cron jobs' };
        }

        // Remove from system crontab
        await this.removeUserCronJobs(userId);
        
        return { success: true, message: 'Cron jobs disabled' };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error toggling user cron jobs:', errorMessage);
      return { success: false, message: errorMessage };
    }
  }
}

export const cronManager = LocalCronManager.getInstance();
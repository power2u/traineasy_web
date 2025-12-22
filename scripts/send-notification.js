#!/usr/bin/env node

/**
 * Local notification script executed by cron jobs
 * This script runs locally without internet dependency for basic notifications
 * Usage: node send-notification.js <userId> <notificationType>
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Get command line arguments
const [, , userId, notificationType] = process.argv;

if (!userId || !notificationType) {
  console.error('Usage: node send-notification.js <userId> <notificationType>');
  process.exit(1);
}

/**
 * Send local notification via Service Worker (no internet required)
 */
function sendLocalNotification(title, message, userId, notificationType) {
  try {
    // Create notification data
    const notification = {
      id: Date.now().toString(),
      userId,
      type: notificationType,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      local: true
    };

    // Store in local file system for offline access
    const notificationsDir = path.join(process.cwd(), 'data', 'notifications');
    const userNotificationsFile = path.join(notificationsDir, `${userId}.json`);

    // Ensure directory exists
    if (!fs.existsSync(notificationsDir)) {
      fs.mkdirSync(notificationsDir, { recursive: true });
    }

    // Read existing notifications
    let notifications = [];
    if (fs.existsSync(userNotificationsFile)) {
      try {
        const data = fs.readFileSync(userNotificationsFile, 'utf8');
        notifications = JSON.parse(data);
      } catch (error) {
        console.warn('Error reading existing notifications:', error.message);
        notifications = [];
      }
    }

    // Add new notification
    notifications.unshift(notification);

    // Keep only last 50 notifications
    notifications = notifications.slice(0, 50);

    // Save to file
    fs.writeFileSync(userNotificationsFile, JSON.stringify(notifications, null, 2));

    console.log(`Local notification saved for user ${userId}: ${title}`);

    // Try to trigger browser notification via API call (if app is open)
    triggerBrowserNotification(userId, title, message, notificationType).catch(err => {
      console.log('Browser notification failed (app may be closed):', err.message);
    });

    return true;
  } catch (error) {
    console.error('Error sending local notification:', error);
    return false;
  }
}

/**
 * Trigger browser notification via API (if user has app open)
 */
async function triggerBrowserNotification(userId, title, message, notificationType) {
  try {
    // Determine URL path based on notification type
    let urlPath = '/dashboard';
    if (notificationType.includes('meal')) urlPath = '/meals';
    if (notificationType.includes('water')) urlPath = '/water';
    if (notificationType.includes('weight') || notificationType.includes('measurement')) urlPath = '/weight';

    // Call browser notification API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/browser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({
        userId,
        title,
        body: message,
        tag: notificationType,
        url: urlPath,
        data: {
          type: notificationType,
          timestamp: new Date().toISOString(),
        },
      }),
    });

    if (response.ok) {
      console.log('Browser notification triggered successfully');
      return true;
    } else {
      console.log('Browser notification API failed:', response.statusText);
      return false;
    }
  } catch (error) {
    console.log('Browser notification trigger failed:', error.message);
    return false;
  }
}

/**
 * Send push notification via Firebase (when internet is available)
 */
async function sendPushNotification(userId, title, message, notificationType) {
  try {
    // Get user's FCM tokens
    const { data: tokens, error } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', userId);

    if (error || !tokens || tokens.length === 0) {
      console.log('No FCM tokens found for user:', userId);
      return false;
    }

    // Call the Firebase admin API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({
        tokens: tokens.map(t => t.token),
        title,
        body: message,
        data: {
          type: notificationType,
          userId,
          timestamp: new Date().toISOString(),
        },
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`Push notification sent to ${result.successCount || 0} devices`);
      return true;
    } else {
      console.error('Failed to send push notification:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

/**
 * Get notification message template
 */
async function getNotificationMessage(notificationType) {
  try {
    const { data, error } = await supabase
      .from('notification_messages')
      .select('title, message')
      .eq('notification_type', notificationType)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      // Fallback messages
      const fallbackMessages = {
        meal_reminder_breakfast: { title: '🍳 Breakfast Time!', message: 'Time for a healthy breakfast!' },
        meal_reminder_snack1: { title: '🍎 Snack Time!', message: 'Time for a healthy snack!' },
        meal_reminder_lunch: { title: '🍱 Lunch Time!', message: 'Time for a balanced lunch!' },
        meal_reminder_snack2: { title: '🥤 Afternoon Snack!', message: 'Time for an afternoon snack!' },
        meal_reminder_dinner: { title: '🍽️ Dinner Time!', message: 'Time for a nutritious dinner!' },
        water_reminder: { title: '💧 Hydration Time!', message: 'Time to drink some water!' },
        good_morning: { title: '🌅 Good Morning!', message: 'Ready to start your wellness journey?' },
        good_night: { title: '🌙 Good Night!', message: 'Sweet dreams! Rest well!' },
        weekly_weight_reminder: { title: '⚖️ Weekly Weigh-In!', message: 'Time for your weekly weight check!' },
        weekly_measurement_reminder: { title: '📏 Measurement Time!', message: 'Time for your weekly measurements!' },
      };

      return fallbackMessages[notificationType] || { title: 'Reminder', message: 'You have a reminder!' };
    }

    return data;
  } catch (error) {
    console.error('Error getting notification message:', error);
    return { title: 'Reminder', message: 'You have a reminder!' };
  }
}

/**
 * Get user information
 */
async function getUserInfo(userId) {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('full_name, notifications_enabled, meal_reminders_enabled, water_reminders_enabled, weight_reminders_enabled')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return { full_name: 'User', notifications_enabled: true };
    }

    return data;
  } catch (error) {
    console.error('Error getting user info:', error);
    return { full_name: 'User', notifications_enabled: true };
  }
}

/**
 * Check if user should receive this notification type
 */
function shouldSendNotification(userInfo, notificationType) {
  if (!userInfo.notifications_enabled) {
    return false;
  }

  // Check specific notification type preferences
  if (notificationType.includes('meal_reminder') && !userInfo.meal_reminders_enabled) {
    return false;
  }

  if (notificationType === 'water_reminder' && !userInfo.water_reminders_enabled) {
    return false;
  }

  if ((notificationType === 'weekly_weight_reminder' || notificationType === 'weekly_measurement_reminder') 
      && !userInfo.weight_reminders_enabled) {
    return false;
  }

  return true;
}

/**
 * Update cron job execution tracking
 */
async function updateCronJobExecution(userId, notificationType) {
  try {
    const now = new Date().toISOString();
    
    await supabase
      .from('user_cron_jobs')
      .update({ 
        last_executed_at: now,
        next_execution_at: calculateNextExecution(notificationType)
      })
      .eq('user_id', userId)
      .eq('notification_type', notificationType);
  } catch (error) {
    console.error('Error updating cron job execution:', error);
  }
}

/**
 * Calculate next execution time (simplified)
 */
function calculateNextExecution(notificationType) {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (notificationType.includes('weekly')) {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString();
  }
  
  return tomorrow.toISOString();
}

/**
 * Main execution function
 */
async function main() {
  try {
    const now = new Date();
    const localTime = now.toLocaleString();
    console.log(`Executing notification job for user ${userId}, type: ${notificationType} at ${localTime} (local server time)`);

    // Get user information
    const userInfo = await getUserInfo(userId);

    // Check if user should receive this notification
    if (!shouldSendNotification(userInfo, notificationType)) {
      console.log(`Notification disabled for user ${userId}, type: ${notificationType}`);
      return;
    }

    // Get notification message template
    const messageTemplate = await getNotificationMessage(notificationType);

    // Replace placeholders
    const displayName = userInfo.full_name?.split(' ')[0] || 'there';
    const title = messageTemplate.title.replace(/{name}/g, displayName);
    const message = messageTemplate.message.replace(/{name}/g, displayName);

    // Send local notification (always works, saves to file + triggers browser notification)
    const localSent = sendLocalNotification(title, message, userId, notificationType);

    // Try to send push notification as backup (requires internet)
    let pushSent = false;
    try {
      pushSent = await sendPushNotification(userId, title, message, notificationType);
    } catch (error) {
      console.log('Push notification failed (using local notifications only)');
    }

    // Update execution tracking
    await updateCronJobExecution(userId, notificationType);

    if (localSent || pushSent) {
      console.log(`Notification sent successfully for user ${userId} at ${localTime}`);
    } else {
      console.error(`Failed to send notification for user ${userId}`);
    }

  } catch (error) {
    console.error('Error in main execution:', error);
    process.exit(1);
  }
}

// Execute the script
main();
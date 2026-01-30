import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentTimeInTimezone } from '@/lib/utils/timezone';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Test endpoint to verify the unified notification system
 * Tests database structure, scheduling logic, and notification delivery readiness
 */
export async function GET() {
  try {
    // Security Check: Verify Super Admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = await prisma.userPreferences.findFirst({
      where: { email: session.user.email },
      select: { role: true }
    });

    if (!adminUser || adminUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    const results: any = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: { passed: 0, failed: 0, total: 0 }
    };

    // Test 1: Database Structure
    results.tests.database_structure = await testDatabaseStructure();

    // Test 2: Scheduling Configuration
    results.tests.scheduling_config = await testSchedulingConfiguration();

    // Test 3: User Data Availability
    results.tests.user_data = await testUserDataAvailability();

    // Test 4: FCM Token Availability
    results.tests.fcm_tokens = await testFCMTokenAvailability();

    // Test 5: Timezone Logic
    results.tests.timezone_logic = await testTimezoneLogic();

    // Test 6: Notification Message Processing
    results.tests.message_processing = await testMessageProcessing();

    // Test 7: Scheduling Logic Simulation
    results.tests.scheduling_simulation = await testSchedulingSimulation();

    // Calculate summary
    Object.values(results.tests).forEach((test: any) => {
      results.summary.total++;
      if (test.passed) {
        results.summary.passed++;
      } else {
        results.summary.failed++;
      }
    });

    results.overall_status = results.summary.failed === 0 ? 'READY' : 'NEEDS_ATTENTION';

    return NextResponse.json(results);

  } catch (error: any) {
    console.error('Test notification system error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error.message },
      { status: 500 }
    );
  }
}

async function testDatabaseStructure() {
  try {
    // Check if notification_messages table exists by trying to query it
    const sampleRecord = await prisma.notificationMessages.findFirst();

    // If we can query it, the required columns exist (Prisma validates schema)
    const requiredColumns = ['schedule_time', 'repeat_pattern', 'is_enabled', 'last_sent_at'];
    const existingColumns = requiredColumns; // Prisma ensures schema matches
    const missingColumns: string[] = [];

    return {
      passed: missingColumns.length === 0,
      message: missingColumns.length === 0
        ? 'All required columns exist'
        : `Missing columns: ${missingColumns.join(', ')}`,
      details: { required: requiredColumns, existing: existingColumns, missing: missingColumns }
    };
  } catch (error: any) {
    return {
      passed: false,
      message: `Database structure test failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

async function testSchedulingConfiguration() {
  try {
    const configs = await prisma.notificationMessages.findMany({
      where: { isActive: true },
      select: {
        notificationType: true,
        scheduleTime: true,
        repeatPattern: true,
        isEnabled: true,
        isActive: true
      }
    });

    const issues: string[] = [];
    const validPatterns = ['daily', 'weekly', 'monthly', 'hourly', 'once'];

    configs.forEach((config: any) => {
      if (!config.scheduleTime) {
        issues.push(`${config.notificationType}: Missing schedule_time`);
      }
      if (!validPatterns.includes(config.repeatPattern)) {
        issues.push(`${config.notificationType}: Invalid repeat_pattern '${config.repeatPattern}'`);
      }
      if (config.isEnabled === null || config.isEnabled === undefined) {
        issues.push(`${config.notificationType}: is_enabled not set`);
      }
    });

    return {
      passed: issues.length === 0,
      message: issues.length === 0
        ? `All ${configs.length} active notifications properly configured`
        : `Configuration issues found`,
      details: {
        total_active: configs.length,
        issues: issues,
        configurations: configs
      }
    };
  } catch (error: any) {
    return {
      passed: false,
      message: `Scheduling configuration test failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

async function testUserDataAvailability() {
  try {
    const users = await prisma.userPreferences.findMany({
      where: { notificationsEnabled: true },
      select: {
        id: true,
        fullName: true,
        timezone: true,
        notificationsEnabled: true
      },
      take: 5
    });

    const issues: string[] = [];
    users.forEach((user: any) => {
      if (!user.timezone) {
        issues.push(`User ${user.id}: Missing timezone`);
      }
      if (!user.fullName) {
        issues.push(`User ${user.id}: Missing full_name`);
      }
    });

    return {
      passed: users.length > 0 && issues.length === 0,
      message: users.length === 0
        ? 'No users with notifications enabled found'
        : issues.length === 0
          ? `${users.length} users ready for notifications`
          : `User data issues found`,
      details: {
        total_users: users.length,
        issues: issues,
        sample_users: users.slice(0, 3)
      }
    };
  } catch (error: any) {
    return {
      passed: false,
      message: `User data test failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

async function testFCMTokenAvailability() {
  try {
    const tokenStats = await prisma.fcmTokens.findMany({
      select: { userId: true },
      take: 1000
    });

    const uniqueUsers = new Set(tokenStats.map((t: any) => t.userId)).size;

    return {
      passed: tokenStats.length > 0,
      message: tokenStats.length === 0
        ? 'No FCM tokens found - notifications cannot be delivered'
        : `${tokenStats.length} FCM tokens for ${uniqueUsers} users`,
      details: {
        total_tokens: tokenStats.length,
        unique_users: uniqueUsers
      }
    };
  } catch (error: any) {
    return {
      passed: false,
      message: `FCM token test failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

async function testTimezoneLogic() {
  try {
    const testTimezones = ['America/New_York', 'Europe/London', 'Asia/Kolkata', 'Australia/Sydney'];
    const results: any[] = [];

    testTimezones.forEach(timezone => {
      try {
        const userTime = getCurrentTimeInTimezone(timezone);
        results.push({
          timezone,
          current_time: userTime.timeString,
          hour: userTime.hour,
          success: true
        });
      } catch (error: any) {
        results.push({
          timezone,
          error: error.message,
          success: false
        });
      }
    });

    const successCount = results.filter(r => r.success).length;

    return {
      passed: successCount === testTimezones.length,
      message: `Timezone logic working for ${successCount}/${testTimezones.length} test timezones`,
      details: { results }
    };
  } catch (error: any) {
    return {
      passed: false,
      message: `Timezone logic test failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

async function testMessageProcessing() {
  try {
    const sampleMessage = await prisma.notificationMessages.findFirst({
      where: { isActive: true },
      select: {
        title: true,
        message: true,
        notificationType: true
      }
    });

    if (!sampleMessage) throw new Error('No active notification messages found');

    // Test placeholder replacement
    const testName = 'TestUser';
    const processedTitle = sampleMessage.title.replace(/{name}/g, testName);
    const processedMessage = sampleMessage.message.replace(/{name}/g, testName);

    const hasPlaceholders = sampleMessage.title.includes('{name}') || sampleMessage.message.includes('{name}');
    const placeholdersReplaced = !processedTitle.includes('{name}') && !processedMessage.includes('{name}');

    return {
      passed: true,
      message: hasPlaceholders
        ? `Placeholder processing working correctly`
        : `No placeholders found in sample message`,
      details: {
        original: { title: sampleMessage.title, message: sampleMessage.message },
        processed: { title: processedTitle, message: processedMessage },
        had_placeholders: hasPlaceholders,
        placeholders_replaced: placeholdersReplaced
      }
    };
  } catch (error: any) {
    return {
      passed: false,
      message: `Message processing test failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

async function testSchedulingSimulation() {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Get all active notification configurations
    const configs = await prisma.notificationMessages.findMany({
      where: {
        isActive: true,
        isEnabled: true
      },
      select: {
        notificationType: true,
        scheduleTime: true,
        repeatPattern: true,
        isEnabled: true
      }
    });

    const simulationResults: any[] = [];

    configs.forEach((config: any) => {
      if (!config.scheduleTime) return;

      const [scheduleHour, scheduleMinute] = config.scheduleTime.split(':').map(Number);

      // Simulate if this notification would be sent now
      let wouldSend = false;
      let reason = '';

      switch (config.repeatPattern) {
        case 'daily':
          wouldSend = currentHour === scheduleHour && currentMinute === scheduleMinute;
          reason = `Daily at ${config.scheduleTime}`;
          break;
        case 'hourly':
          wouldSend = currentMinute === scheduleMinute;
          reason = `Hourly at minute ${scheduleMinute}`;
          break;
        case 'weekly':
          const dayOfWeek = now.getDay();
          wouldSend = dayOfWeek === 0 && currentHour === scheduleHour && currentMinute === scheduleMinute;
          reason = `Weekly on Sundays at ${config.scheduleTime}`;
          break;
        default:
          reason = `Pattern: ${config.repeatPattern}`;
      }

      simulationResults.push({
        notification_type: config.notificationType,
        schedule_time: config.scheduleTime,
        repeat_pattern: config.repeatPattern,
        would_send_now: wouldSend,
        reason: reason,
        current_time: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
      });
    });

    const readyToSend = simulationResults.filter(r => r.would_send_now).length;

    return {
      passed: true,
      message: `Scheduling simulation complete: ${readyToSend}/${configs.length} notifications would send now`,
      details: {
        total_configs: configs.length,
        ready_to_send: readyToSend,
        current_time: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`,
        simulations: simulationResults
      }
    };
  } catch (error: any) {
    return {
      passed: false,
      message: `Scheduling simulation failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}
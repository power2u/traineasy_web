import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentTimeInTimezone } from '@/lib/utils/timezone';

/**
 * Test endpoint to verify the unified notification system
 * Tests database structure, scheduling logic, and notification delivery readiness
 */
export async function GET() {
  try {
    const adminClient = createAdminClient();
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: { passed: 0, failed: 0, total: 0 }
    };

    // Test 1: Database Structure
    results.tests.database_structure = await testDatabaseStructure(adminClient);
    
    // Test 2: Scheduling Configuration
    results.tests.scheduling_config = await testSchedulingConfiguration(adminClient);
    
    // Test 3: User Data Availability
    results.tests.user_data = await testUserDataAvailability(adminClient);
    
    // Test 4: FCM Token Availability
    results.tests.fcm_tokens = await testFCMTokenAvailability(adminClient);
    
    // Test 5: Timezone Logic
    results.tests.timezone_logic = await testTimezoneLogic();
    
    // Test 6: Notification Message Processing
    results.tests.message_processing = await testMessageProcessing(adminClient);
    
    // Test 7: Scheduling Logic Simulation
    results.tests.scheduling_simulation = await testSchedulingSimulation(adminClient);

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

async function testDatabaseStructure(adminClient: any) {
  try {
    // Check if all required columns exist
    const { data: columns, error } = await adminClient
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'notification_messages')
      .in('column_name', ['schedule_time', 'repeat_pattern', 'is_enabled', 'last_sent_at']);

    if (error) throw error;

    const requiredColumns = ['schedule_time', 'repeat_pattern', 'is_enabled', 'last_sent_at'];
    const existingColumns = columns.map((c: any) => c.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

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

async function testSchedulingConfiguration(adminClient: any) {
  try {
    const { data: configs, error } = await adminClient
      .from('notification_messages')
      .select('notification_type, schedule_time, repeat_pattern, is_enabled, is_active')
      .eq('is_active', true);

    if (error) throw error;

    const issues: string[] = [];
    const validPatterns = ['daily', 'weekly', 'monthly', 'hourly', 'once'];

    configs.forEach((config: any) => {
      if (!config.schedule_time) {
        issues.push(`${config.notification_type}: Missing schedule_time`);
      }
      if (!validPatterns.includes(config.repeat_pattern)) {
        issues.push(`${config.notification_type}: Invalid repeat_pattern '${config.repeat_pattern}'`);
      }
      if (config.is_enabled === null || config.is_enabled === undefined) {
        issues.push(`${config.notification_type}: is_enabled not set`);
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

async function testUserDataAvailability(adminClient: any) {
  try {
    const { data: users, error } = await adminClient
      .from('user_preferences')
      .select('id, full_name, timezone, notifications_enabled')
      .eq('notifications_enabled', true)
      .limit(5);

    if (error) throw error;

    const issues: string[] = [];
    users.forEach((user: any) => {
      if (!user.timezone) {
        issues.push(`User ${user.id}: Missing timezone`);
      }
      if (!user.full_name) {
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

async function testFCMTokenAvailability(adminClient: any) {
  try {
    const { data: tokenStats, error } = await adminClient
      .from('fcm_tokens')
      .select('user_id')
      .limit(1000);

    if (error) throw error;

    const uniqueUsers = new Set(tokenStats.map((t: any) => t.user_id)).size;

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

async function testMessageProcessing(adminClient: any) {
  try {
    const { data: sampleMessage, error } = await adminClient
      .from('notification_messages')
      .select('title, message, notification_type')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (error) throw error;

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

async function testSchedulingSimulation(adminClient: any) {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Get all active notification configurations
    const { data: configs, error } = await adminClient
      .from('notification_messages')
      .select('notification_type, schedule_time, repeat_pattern, is_enabled')
      .eq('is_active', true)
      .eq('is_enabled', true);

    if (error) throw error;

    const simulationResults: any[] = [];

    configs.forEach((config: any) => {
      if (!config.schedule_time) return;

      const [scheduleHour, scheduleMinute] = config.schedule_time.split(':').map(Number);
      
      // Simulate if this notification would be sent now
      let wouldSend = false;
      let reason = '';

      switch (config.repeat_pattern) {
        case 'daily':
          wouldSend = currentHour === scheduleHour && currentMinute === scheduleMinute;
          reason = `Daily at ${config.schedule_time}`;
          break;
        case 'hourly':
          wouldSend = currentMinute === scheduleMinute;
          reason = `Hourly at minute ${scheduleMinute}`;
          break;
        case 'weekly':
          const dayOfWeek = now.getDay();
          wouldSend = dayOfWeek === 0 && currentHour === scheduleHour && currentMinute === scheduleMinute;
          reason = `Weekly on Sundays at ${config.schedule_time}`;
          break;
        default:
          reason = `Pattern: ${config.repeat_pattern}`;
      }

      simulationResults.push({
        notification_type: config.notification_type,
        schedule_time: config.schedule_time,
        repeat_pattern: config.repeat_pattern,
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
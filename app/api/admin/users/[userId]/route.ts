import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role
    const isSuperAdmin = session.user.role === 'super_admin';

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId } = await params;

    // Create admin client for database operations (bypasses RLS)
    const adminClient = createAdminClient();

    // Test admin client connection with a simple query
    console.log('Testing admin client connection...');
    try {
      const { data: testConnection, error: connectionError } = await adminClient
        .from('user_preferences')
        .select('id')
        .limit(1);
      console.log('Admin client connection test:', {
        success: !connectionError,
        error: connectionError?.message
      });
    } catch (connError) {
      console.error('Admin client connection failed:', connError);
    }

    // Get user profile and preferences using admin client
    const { data: profile, error: profileError } = await adminClient
      .from('user_preferences')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile query error:', profileError);
      return NextResponse.json({
        error: 'User profile not found',
        details: profileError?.message || 'User does not exist in preferences',
        userId: userId
      }, { status: 404 });
    }

    const userProfile = profile;
    console.log(`Found existing profile for user ${userId}`);

    // Weight logs are now stored in body_measurements table with measurement_type = 'weight'
    // No separate weight_logs table needed

    // Get all user's meal logs
    const { data: mealLogs } = await adminClient
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    // Get all user's water intake
    const { data: waterLogs } = await adminClient
      .from('water_intake')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    // Test if body_measurements table exists and has any data
    const { data: tableTest, error: testError } = await adminClient
      .from('body_measurements')
      .select('id')
      .limit(1);

    console.log('Body measurements table test:', {
      tableExists: !testError,
      hasData: tableTest && tableTest.length > 0,
      error: testError
    });

    // Get all user's body measurements
    const { data: measurements, error: measurementsError } = await adminClient
      .from('body_measurements')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (measurementsError) {
      console.error('Error fetching measurements:', measurementsError);
      console.error('Measurements error details:', {
        code: measurementsError.code,
        message: measurementsError.message,
        details: measurementsError.details,
        hint: measurementsError.hint
      });
    } else {
      console.log(`Found ${measurements?.length || 0} measurements for user ${userId}`);
      if (measurements && measurements.length > 0) {
        console.log('Sample measurements:', measurements.slice(0, 3));
        console.log('Weight measurements:', measurements.filter(m => m.measurement_type === 'weight').length);
        console.log('Other measurements:', measurements.filter(m => m.measurement_type !== 'weight').length);
      }
    }

    // Get user's active membership
    const { data: membership } = await adminClient
      .from('memberships')
      .select(`
        *,
        packages (
          name,
          price,
          duration_days,
          description
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();



    // Filter weight measurements from body_measurements for backward compatibility
    const weightLogs = measurements?.filter(m => m.measurement_type === 'weight') || [];

    return NextResponse.json({
      success: true,
      user: userProfile,
      weightLogs: weightLogs, // Weight data from body_measurements table
      mealLogs: mealLogs || [],
      waterLogs: waterLogs || [],
      measurements: measurements || [], // All body measurements including weight
      membership: membership || null,
    });

  } catch (error: any) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
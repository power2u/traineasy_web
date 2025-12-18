import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role
    const role = user.app_metadata?.role || user.user_metadata?.role;
    const isSuperAdmin = role === 'super_admin';
    
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

    // First, verify the user exists in Supabase Auth
    const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(userId);
    
    if (authUserError || !authUser.user) {
      console.error('Auth user query error:', authUserError);
      return NextResponse.json({ 
        error: 'User not found in authentication system', 
        details: authUserError?.message || 'User does not exist',
        userId: userId 
      }, { status: 404 });
    }

    // Get user profile and preferences using admin client
    const { data: profile, error: profileError } = await adminClient
      .from('user_preferences')
      .select('*')
      .eq('id', userId)
      .single();

    // If user doesn't have preferences yet, create one in the database
    let userProfile = profile;
    if (profileError) {
      console.log(`Profile error for user ${userId}:`, profileError);
      
      if (profileError.code === 'PGRST116') { // No rows returned
        console.log(`Creating user_preferences record for user ${userId}`);
      
      const newProfile = {
        id: authUser.user.id,
        full_name: authUser.user.user_metadata?.full_name || authUser.user.email?.split('@')[0] || 'Unknown User',
        preferred_unit: 'kg',
        theme: 'dark',
        timezone: 'Asia/Kolkata',
        notifications_enabled: true,
        meal_reminders_enabled: true,
        water_reminders_enabled: true,
        weight_reminders_enabled: true,
        meal_times_configured: false,
        breakfast_time: '08:00:00',
        snack1_time: '10:30:00',
        lunch_time: '13:00:00',
        snack2_time: '16:00:00',
        dinner_time: '19:00:00'
      };

      // Insert the new profile into the database using admin client
      const { data: insertedProfile, error: insertError } = await adminClient
        .from('user_preferences')
        .insert(newProfile)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user profile:', insertError);
        // If insert fails, return the basic profile without saving
        userProfile = newProfile;
      } else {
        userProfile = insertedProfile;
      }
    } else {
      // Different error - not "no rows returned"
      console.error('Profile query error:', profileError);
      return NextResponse.json({ 
        error: 'Error fetching user profile', 
        details: profileError.message,
        code: profileError.code,
        userId: userId 
      }, { status: 500 });
    }
  } else {
    // Profile found successfully
    console.log(`Found existing profile for user ${userId}`);
  }

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
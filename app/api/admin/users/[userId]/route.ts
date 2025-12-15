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

    // Get all user's weight logs
    const { data: weightLogs } = await adminClient
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

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

    // Get all user's body measurements
    const { data: measurements } = await adminClient
      .from('body_measurements')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

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



    return NextResponse.json({
      success: true,
      user: userProfile,
      weightLogs: weightLogs || [],
      mealLogs: mealLogs || [],
      waterLogs: waterLogs || [],
      measurements: measurements || [],
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
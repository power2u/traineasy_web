import { createClient } from '@/lib/supabase/server';
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

    // Get user profile and preferences
    const { data: profile, error: profileError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('id', userId)
      .single();

    // If user doesn't have preferences yet, create one in the database
    let userProfile = profile;
    if (profileError && profileError.code === 'PGRST116') { // No rows returned
      console.log(`Creating user_preferences record for user ${userId}`);
      
      const newProfile = {
        id: authUser.user.id,
        email: authUser.user.email,
        full_name: authUser.user.user_metadata?.full_name || authUser.user.email?.split('@')[0] || 'Unknown User',
        created_at: authUser.user.created_at,
        last_sign_in_at: authUser.user.last_sign_in_at,
        // Personal information
        age: null,
        gender: null,
        height: null,
        activity_level: null,
        goal: null,
        goal_weight: null,
        // Settings
        preferred_unit: 'kg',
        theme: 'dark',
        timezone: 'Asia/Kolkata',
        water_target: 2000,
        // Notifications
        notifications_enabled: true,
        meal_reminders_enabled: true,
        water_reminders_enabled: true,
        weight_reminders_enabled: true,
        // Meal timing
        meal_times_configured: false,
        breakfast_time: null,
        snack1_time: null,
        lunch_time: null,
        snack2_time: null,
        dinner_time: null
      };

      // Insert the new profile into the database
      const { data: insertedProfile, error: insertError } = await supabase
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
    } else if (profileError) {
      console.error('Profile query error:', profileError);
      return NextResponse.json({ 
        error: 'Error fetching user profile', 
        details: profileError.message,
        userId: userId 
      }, { status: 500 });
    }

    // Get user's weight logs (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: weightLogs } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    // Get user's meal logs (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: mealLogs } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    // Get user's water logs (last 7 days)
    const { data: waterLogs } = await supabase
      .from('water_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    // Get user's body measurements (last 30 days)
    const { data: measurements } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', userId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    // Get user's active membership
    const { data: membership } = await supabase
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

    // Get FCM tokens
    const { data: fcmTokens } = await supabase
      .from('fcm_tokens')
      .select('token, created_at, last_used_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      user: userProfile,
      weightLogs: weightLogs || [],
      mealLogs: mealLogs || [],
      waterLogs: waterLogs || [],
      measurements: measurements || [],
      membership: membership || null,
      fcmTokens: fcmTokens || [],
    });

  } catch (error: any) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
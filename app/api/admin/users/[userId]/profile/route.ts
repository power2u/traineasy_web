import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function PUT(
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
    const profileData = await request.json();

    // Create admin client for database operations (bypasses RLS)
    const adminClient = createAdminClient();

    // Remove fields that shouldn't be updated
    const {
      id,
      email,
      created_at,
      last_sign_in_at,
      ...updateData
    } = profileData;

    console.log(`[Admin Profile Update] ${user.email} updating profile for user ${userId}`);

    // Use upsert to handle both update and insert cases
    const upsertData = {
      id: userId,
      ...updateData
    };

    const { data: updatedProfile, error: updateError } = await adminClient
      .from('user_preferences')
      .upsert(upsertData, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (updateError) {
      console.error('Profile upsert error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update profile', 
        details: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: updatedProfile,
      message: 'Profile updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
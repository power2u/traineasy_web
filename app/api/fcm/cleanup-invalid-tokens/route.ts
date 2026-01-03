import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Cleanup invalid FCM tokens for the current user
 * This endpoint removes tokens that Firebase reports as invalid
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { invalidTokens } = await request.json();

    if (!invalidTokens || !Array.isArray(invalidTokens)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { invalidTokens: string[] }' },
        { status: 400 }
      );
    }

    // Delete invalid tokens
    const { error: deleteError } = await supabase
      .from('fcm_tokens')
      .delete()
      .eq('user_id', user.id)
      .in('token', invalidTokens);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: `Removed ${invalidTokens.length} invalid token(s)`,
      removedCount: invalidTokens.length,
    });

  } catch (error: any) {
    console.error('Error cleaning up invalid tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

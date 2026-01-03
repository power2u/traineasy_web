import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get request body to check if specific token should be removed
    const body = await request.json();
    const { token, removeAll } = body;

    let query = supabase
      .from('fcm_tokens')
      .delete()
      .eq('user_id', user.id);

    // If specific token provided, remove only that token
    if (token && !removeAll) {
      query = query.eq('token', token);
    }
    // Otherwise remove all tokens (for complete logout)

    const { error } = await query;

    if (error) {
      console.error('Error removing FCM tokens:', error);
      return NextResponse.json(
        { error: 'Failed to remove tokens' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: token && !removeAll ? 'Specific token removed' : 'All tokens removed'
    });

  } catch (error: any) {
    console.error('Error in remove-token API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

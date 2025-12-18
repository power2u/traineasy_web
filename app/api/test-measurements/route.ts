import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const adminClient = createAdminClient();
    
    // Test basic connection
    console.log('Testing body_measurements table access...');
    
    // Get all measurements (limit 10 for testing)
    const { data: allMeasurements, error: allError } = await adminClient
      .from('body_measurements')
      .select('*')
      .limit(10);
    
    console.log('All measurements query result:', { 
      count: allMeasurements?.length || 0, 
      error: allError,
      sample: allMeasurements?.[0] 
    });
    
    // Get count by measurement type
    const { data: weightCount, error: weightError } = await adminClient
      .from('body_measurements')
      .select('*', { count: 'exact' })
      .eq('measurement_type', 'weight');
    
    console.log('Weight measurements:', { 
      count: weightCount?.length || 0, 
      error: weightError 
    });
    
    return NextResponse.json({
      success: true,
      totalMeasurements: allMeasurements?.length || 0,
      weightMeasurements: weightCount?.length || 0,
      sampleData: allMeasurements?.slice(0, 3) || [],
      errors: {
        allError,
        weightError
      }
    });
    
  } catch (error: any) {
    console.error('Test measurements error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error.message },
      { status: 500 }
    );
  }
}
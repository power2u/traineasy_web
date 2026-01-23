'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export interface AdminUserDetails {
    user: any;
    weightLogs: any[];
    mealLogs: any[];
    waterLogs: any[];
    measurements: any[];
    membership: any;
}

export type AdminUserDetailsResponse =
    | { success: true; data: AdminUserDetails }
    | { success: false; error: string; details?: any };

export async function getAdminUserDetails(userId: string): Promise<AdminUserDetailsResponse> {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return { success: false, error: 'Unauthorized' };
        }

        // Check if user has admin role
        const userRole = (session.user as any).role || (session.user as any).raw_app_meta_data?.role;
        const isSuperAdmin = userRole === 'super_admin';

        if (!isSuperAdmin) {
            return { success: false, error: 'Admin access required' };
        }

        // Create admin client for database operations (bypasses RLS)
        const adminClient = createAdminClient();

        // First, verify the user exists in Supabase Auth
        const { data: authUser, error: authUserError } = await adminClient.auth.admin.getUserById(userId);

        if (authUserError || !authUser.user) {
            return {
                success: false,
                error: 'User not found in authentication system',
                details: authUserError?.message
            };
        }

        // Get user profile and preferences using admin client
        const { data: profile, error: profileError } = await adminClient
            .from('user_preferences')
            .select('*')
            .eq('id', userId)
            .single();

        // If user doesn't have preferences yet, properly handle it
        let userProfile = profile;
        if (profileError) {
            if (profileError.code === 'PGRST116') { // No rows returned
                // Construct a basic profile from auth data
                userProfile = {
                    id: authUser.user.id,
                    full_name: authUser.user.user_metadata?.full_name || authUser.user.email?.split('@')[0] || 'Unknown User',
                    email: authUser.user.email,
                    created_at: authUser.user.created_at,
                    last_sign_in_at: authUser.user.last_sign_in_at,
                    // Defaults
                    preferred_unit: 'kg',
                    theme: 'dark',
                    notifications_enabled: true
                };
            } else {
                return { success: false, error: 'Error fetching user profile', details: profileError.message };
            }
        } else {
            // Merge auth data into profile for display
            userProfile = {
                ...profile,
                email: authUser.user.email,
                last_sign_in_at: authUser.user.last_sign_in_at,
                created_at: authUser.user.created_at // Prefer auth creation date
            };
        }

        // Run parallel queries for logs
        const [mealLogsResult, waterLogsResult, measurementsResult, membershipResult] = await Promise.all([
            adminClient.from('meals').select('*').eq('user_id', userId).order('date', { ascending: false }),
            adminClient.from('water_intake').select('*').eq('user_id', userId).order('timestamp', { ascending: false }),
            adminClient.from('body_measurements').select('*').eq('user_id', userId).order('date', { ascending: false }),
            adminClient.from('memberships').select(`*, packages (name, price, duration_days, description)`).eq('user_id', userId).eq('is_active', true).single()
        ]);

        const measurements = measurementsResult.data || [];

        // Filter weight measurements from body_measurements for backward compatibility/separate view
        const weightLogs = measurements.filter(m => m.measurement_type === 'weight');

        return {
            success: true,
            data: {
                user: userProfile,
                weightLogs,
                mealLogs: mealLogsResult.data || [],
                waterLogs: waterLogsResult.data || [],
                measurements, // All body measurements including weight
                membership: membershipResult.data || null,
            }
        };

    } catch (error: any) {
        console.error('Error fetching admin user details:', error);
        return { success: false, error: 'Internal server error', details: error.message };
    }
}

export async function updateAdminUserProfile(userId: string, profileData: any) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return { success: false, error: 'Unauthorized' };
        }

        // Check if user has admin role
        const userRole = (session.user as any).role || (session.user as any).raw_app_meta_data?.role;
        const isSuperAdmin = userRole === 'super_admin';

        if (!isSuperAdmin) {
            return { success: false, error: 'Admin access required' };
        }

        const adminClient = createAdminClient();

        // Check if preferences exist
        const { data: existing } = await adminClient
            .from('user_preferences')
            .select('id')
            .eq('id', userId)
            .single();

        let result;
        if (existing) {
            result = await adminClient
                .from('user_preferences')
                .update(profileData)
                .eq('id', userId)
                .select()
                .single();
        } else {
            result = await adminClient
                .from('user_preferences')
                .insert({
                    id: userId,
                    ...profileData,
                })
                .select()
                .single();
        }

        if (result.error) throw result.error;

        return { success: true, user: result.data };
    } catch (error: any) {
        console.error('Error updating admin user profile:', error);
        return { success: false, error: error.message || 'Failed to update profile' };
    }
}

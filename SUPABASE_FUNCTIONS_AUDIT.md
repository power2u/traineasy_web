# Supabase Functions Audit & Cleanup Plan

## 📋 **Function Analysis**

### ✅ **KEEP - Essential Functions (19 functions)**

#### **Core Notification System (6 functions)**
1. `call_notification_api` - ✅ **KEEP** - Calls your API from cron
2. `get_active_notification_message` - ✅ **KEEP** - Gets notification templates
3. `get_notification_action` - ✅ **KEEP** - Maps notification types to actions
4. `process_message_placeholders` - ✅ **KEEP** - Personalizes notifications
5. `should_send_notification` - ✅ **KEEP** - Smart scheduling logic
6. `get_current_time_in_timezone` - ✅ **KEEP** - Timezone calculations

#### **Membership Management (4 functions)**
7. `get_active_membership` - ✅ **KEEP** - Gets user's current membership
8. `has_active_membership` - ✅ **KEEP** - Checks if user has active membership
9. `deactivate_user_memberships` - ✅ **KEEP** - Prevents duplicate memberships
10. `sync_membership_status_db` - ✅ **KEEP** - Daily membership sync

#### **User Management (3 functions)**
11. `create_default_preferences` - ✅ **KEEP** - Sets up new users
12. `handle_new_user` - ✅ **KEEP** - User onboarding
13. `is_admin` - ✅ **KEEP** - Admin role checking

#### **Data Maintenance (3 functions)**
14. `cleanup_old_fcm_tokens` - ✅ **KEEP** - Removes invalid tokens
15. `get_weight_log_streak` - ✅ **KEEP** - User engagement tracking
16. `was_notification_sent_today` - ✅ **KEEP** - Prevents duplicate notifications

#### **Trigger Functions (3 functions)**
17. `update_user_memberships_updated_at` - ✅ **KEEP** - Auto timestamps
18. `update_body_measurements_updated_at` - ✅ **KEEP** - Auto timestamps
19. `ensure_single_active_banner` - ✅ **KEEP** - Prevents duplicate banners

### ❌ **REMOVE - Deprecated/Unused Functions (21 functions)**

#### **Old Notification System (8 functions)**
1. `calculate_next_send_time` - ❌ **REMOVE** - Old scheduling system
2. `process_hourly_notifications` - ❌ **REMOVE** - Replaced by API calls
3. `process_unified_hourly_tasks` - ❌ **REMOVE** - Replaced by API calls
4. `should_send_notification_to_user` - ❌ **REMOVE** - Duplicate functionality
5. `send_meal_reminders` - ❌ **REMOVE** - Old meal reminder system
6. `trigger_good_morning_check` - ❌ **REMOVE** - Old trigger system
7. `trigger_good_night_check` - ❌ **REMOVE** - Old trigger system
8. `trigger_meal_reminder_check` - ❌ **REMOVE** - Old trigger system

#### **Test/Debug Functions (4 functions)**
9. `call_unified_notification_api` - ❌ **REMOVE** - Test function
10. `trigger_test_good_morning_check` - ❌ **REMOVE** - Test function
11. `test_table_access` - ❌ **REMOVE** - Debug function
12. `trigger_weekly_measurement_reminder_check` - ❌ **REMOVE** - Old system

#### **Duplicate/Legacy Functions (5 functions)**
13. `get_active_package` - ❌ **REMOVE** - Duplicate of get_active_membership
14. `has_active_package` - ❌ **REMOVE** - Duplicate of has_active_membership
15. `handle_new_user_preferences` - ❌ **REMOVE** - Handled by create_default_preferences
16. `deactivate_expired_banners` - ❌ **REMOVE** - Can be done with simple SQL
17. `update_daily_wellness_updated_at` - ❌ **REMOVE** - Generic trigger exists

#### **Unused Trigger Functions (4 functions)**
18. `update_fcm_tokens_updated_at` - ❌ **REMOVE** - Generic trigger exists
19. `update_updated_at_column` - ❌ **REMOVE** - Generic trigger exists
20. `update_user_plans_updated_at` - ❌ **REMOVE** - Generic trigger exists
21. One more unnamed trigger - ❌ **REMOVE**

## 🎯 **Current Cron Jobs Analysis**

### ✅ **KEEP - Active Cron Job (1 job)**
```sql
hourly-notification-api-call: "0 * * * *" 
→ SELECT call_notification_api();
```
**Purpose**: Calls your `/api/cron/notifications` endpoint every hour

### ❌ **REMOVE - No Other Cron Jobs Needed**
All other notification processing is now handled by your API endpoint.

## 🧹 **Cleanup Plan**

### **Phase 1: Remove Test/Debug Functions (Safe)**
```sql
DROP FUNCTION IF EXISTS call_unified_notification_api();
DROP FUNCTION IF EXISTS trigger_test_good_morning_check();
DROP FUNCTION IF EXISTS test_table_access();
```

### **Phase 2: Remove Old Notification System (Safe)**
```sql
DROP FUNCTION IF EXISTS calculate_next_send_time(time, text, text, timestamptz);
DROP FUNCTION IF EXISTS process_hourly_notifications();
DROP FUNCTION IF EXISTS process_unified_hourly_tasks();
DROP FUNCTION IF EXISTS should_send_notification_to_user(uuid, text);
DROP FUNCTION IF EXISTS send_meal_reminders();
DROP FUNCTION IF EXISTS trigger_good_morning_check();
DROP FUNCTION IF EXISTS trigger_good_night_check();
DROP FUNCTION IF EXISTS trigger_meal_reminder_check();
DROP FUNCTION IF EXISTS trigger_weekly_measurement_reminder_check();
```

### **Phase 3: Remove Duplicate Functions (Careful)**
```sql
DROP FUNCTION IF EXISTS get_active_package(uuid);
DROP FUNCTION IF EXISTS has_active_package(uuid);
DROP FUNCTION IF EXISTS handle_new_user_preferences();
DROP FUNCTION IF EXISTS deactivate_expired_banners();
```

### **Phase 4: Remove Unused Triggers (Careful)**
```sql
DROP FUNCTION IF EXISTS update_daily_wellness_updated_at();
DROP FUNCTION IF EXISTS update_fcm_tokens_updated_at();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS update_user_plans_updated_at();
```

## 📊 **Summary**

### **Current State:**
- **40 total functions** (estimated)
- **1 active cron job**

### **After Cleanup:**
- **19 essential functions** (52% reduction)
- **1 active cron job** (same)

### **Benefits:**
- ✅ **Cleaner database** - Remove 21 unused functions
- ✅ **Better performance** - Less function overhead
- ✅ **Easier maintenance** - Clear separation of active vs unused
- ✅ **Reduced complexity** - Single notification system

## 🎯 **Essential Functions for Cron Jobs**

Only **1 function** is needed for cron jobs:
```sql
call_notification_api() -- Calls your API endpoint
```

All other notification logic is now in your API endpoint (`/api/cron/notifications`), which is the correct architecture!

## ⚠️ **Cleanup Order**

1. **Start with test functions** (completely safe)
2. **Remove old notification system** (safe - replaced by API)
3. **Remove duplicates** (check dependencies first)
4. **Remove unused triggers** (verify no tables use them)

This will give you a **clean, efficient database** with only the functions you actually need! 🎉
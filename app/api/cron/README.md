# Cron Job API Routes

This directory contains internal cron job API endpoints for automated system tasks.

## 📂 **API Endpoints**

### `/meal-notifications` - Meal Reminder Notifications
- **File**: `meal-notifications/route.ts`
- **Methods**: GET
- **Purpose**: Automated meal reminder notification system
- **Access**: Internal only (requires CRON_SECRET)

## 🍽️ **Meal Notifications System**

### **Functionality**
- Runs every hour to check for users needing meal reminders
- Processes users with configured meal times and notifications enabled
- Sends FCM push notifications for missed meals
- Timezone-aware notification timing

### **Notification Logic**
Notifications are sent when:
- Current time is **after** the scheduled meal time
- **Less than 60 minutes** have passed since meal time
- The meal is **not already completed** for today
- User has **valid FCM tokens**

### **Meal Types Processed**
- **Breakfast** - Morning meal reminders
- **Morning Snack** - Mid-morning snack reminders
- **Lunch** - Afternoon meal reminders
- **Afternoon Snack** - Mid-afternoon snack reminders
- **Dinner** - Evening meal reminders

### **Request Format**
```
GET /api/cron/meal-notifications?secret=CRON_SECRET
```

### **Response Format**
```json
{
  "success": true,
  "timestamp": "2024-02-02T10:00:00.000Z",
  "results": {
    "totalUsers": 150,
    "eligibleUsers": 25,
    "notificationsSent": 5,
    "errors": 0,
    "details": [
      {
        "userId": "user_uuid",
        "userName": "John Doe",
        "mealType": "breakfast",
        "mealTime": "08:00",
        "timeLate": 15,
        "devicesSent": 2,
        "timezone": "America/New_York",
        "userTimezone": "2024-02-02T08:15:00.000Z",
        "currentTime": "2024-02-02T13:15:00.000Z",
        "mealDateTime": "2024-02-02T13:00:00.000Z",
        "timeDiffMinutes": 15
      }
    ]
  }
}
```

## 🔒 **Security**

### **Access Control**
- **CRON_SECRET**: Required query parameter for authentication
- **Internal Only**: Not accessible from public internet
- **Server-side**: Only callable from server environment

### **Security Headers**
- User-Agent validation for cron job identification
- Request timeout protection (30 seconds)
- Error handling without data leakage

## ⏰ **Scheduling**

### **Execution Frequency**
- **Recommended**: Every hour (0 * * * *)
- **Minimum**: Every 30 minutes for better responsiveness
- **Maximum**: Every 2 hours (may miss some notifications)

### **Timezone Handling**
- Converts user meal times to their local timezone
- Compares against current time in user's timezone
- Handles daylight saving time transitions
- Supports all standard timezone identifiers

## 📊 **Monitoring & Logging**

### **Execution Logs**
- Start/end timestamps
- User processing statistics
- Notification delivery results
- Error tracking and reporting

### **Performance Metrics**
- Total execution time
- Users processed per minute
- Notification success rate
- Error rate tracking

## 🚨 **Error Handling**

### **Token Management**
- Automatically removes invalid FCM tokens
- Handles Firebase messaging errors gracefully
- Continues processing other users on individual failures

### **Database Resilience**
- Handles database connection issues
- Graceful degradation on partial failures
- Transaction rollback on critical errors

## 🔧 **Integration**

### **External Dependencies**
- **Firebase Admin SDK**: Push notification delivery
- **Database**: User preferences and meal data
- **Timezone Libraries**: Accurate timezone conversion

### **Internal Systems**
- **FCM Token Management**: Automatic token cleanup
- **User Preferences**: Meal timing and notification settings
- **Meal Tracking**: Daily completion status
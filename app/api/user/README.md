# User API Routes

This directory contains user-specific API endpoints for personal data management.

## 📂 **API Endpoints**

### `/preferences` - User Preferences Management
- **File**: `preferences/route.ts`
- **Methods**: GET, PUT
- **Purpose**: Manage user preferences and settings
- **Access**: Authenticated users (own preferences only)

## ⚙️ **User Preferences**

### **GET /api/user/preferences**
Retrieve current user preferences and settings.

**Response**:
```json
{
  "success": true,
  "preferences": {
    "theme": "system",
    "language": "en",
    "timezone": "America/New_York",
    "notificationsEnabled": true,
    "mealRemindersEnabled": true,
    "waterRemindersEnabled": true,
    "weightRemindersEnabled": true,
    "dailyWaterTarget": 8,
    "glassSizeMl": 250,
    "preferredUnit": "kg",
    "mealTimesConfigured": true,
    "breakfastTime": "08:00",
    "snack1Time": "10:30",
    "lunchTime": "13:00",
    "snack2Time": "16:00",
    "dinnerTime": "19:00",
    "waterReminderTimes": ["10:00", "15:00", "20:00"],
    "weightReminderDay": 1,
    "weightReminderTime": "09:00"
  }
}
```

### **PUT /api/user/preferences**
Update user preferences and settings.

**Request**:
```json
{
  "theme": "dark",
  "notificationsEnabled": false,
  "dailyWaterTarget": 10,
  "breakfastTime": "07:30",
  "waterReminderTimes": ["09:00", "14:00", "19:00"]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Preferences updated successfully",
  "updated": {
    "theme": "dark",
    "notificationsEnabled": false,
    "dailyWaterTarget": 10,
    "breakfastTime": "07:30",
    "waterReminderTimes": ["09:00", "14:00", "19:00"]
  }
}
```

## 🎛️ **Preference Categories**

### **App Preferences**
- **theme**: Light, dark, or system theme
- **language**: Application language preference
- **timezone**: User's timezone (auto-detected)

### **Notification Settings**
- **notificationsEnabled**: Master notification toggle
- **mealRemindersEnabled**: Meal reminder notifications
- **waterRemindersEnabled**: Water intake reminders
- **weightRemindersEnabled**: Weight logging reminders

### **Fitness Settings**
- **dailyWaterTarget**: Daily water intake goal (glasses)
- **glassSizeMl**: Water glass size in milliliters
- **preferredUnit**: Weight unit preference (kg/lbs)

### **Meal Timing**
- **mealTimesConfigured**: Whether meal times are set up
- **breakfastTime**: Preferred breakfast time (HH:MM)
- **snack1Time**: Morning snack time
- **lunchTime**: Preferred lunch time
- **snack2Time**: Afternoon snack time
- **dinnerTime**: Preferred dinner time

### **Reminder Schedules**
- **waterReminderTimes**: Array of water reminder times
- **weightReminderDay**: Day of week for weight reminders (1-7)
- **weightReminderTime**: Time for weight reminders (HH:MM)

## 🔒 **Security**

### **Authentication**
- Requires valid NextAuth session
- Users can only access their own preferences
- Session user ID validation

### **Data Validation**
- Input sanitization and validation
- Time format validation (HH:MM)
- Numeric range validation for targets
- Array validation for reminder times

## 🔄 **Real-time Updates**

### **Preference Sync**
- Changes are immediately applied
- Client-side cache invalidation
- Cross-device synchronization
- Optimistic updates for better UX

### **Notification Impact**
- Preference changes affect notification scheduling
- Meal time changes update cron job targeting
- Reminder settings immediately apply to FCM tokens

## 🚨 **Error Handling**
- 401: Unauthorized (no valid session)
- 400: Bad request (validation errors)
- 404: User preferences not found
- 500: Internal server error

## 🔧 **Integration**
- **NextAuth.js**: Session authentication
- **Database**: User preferences storage
- **FCM System**: Notification preference updates
- **Cron Jobs**: Meal timing updates
- **Client State**: Real-time preference sync
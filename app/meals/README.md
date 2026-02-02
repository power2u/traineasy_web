# Meals Tracking Directory

This directory contains the meal tracking and nutrition logging interface.

## 📄 **Files**
- `page.tsx` - Main meals tracking page with server-side data fetching
- `meals-client.tsx` - Client-side meal tracking components and interactions

## 🍽️ **Features**

### **Meal Tracking**
- Daily meal completion tracking (breakfast, snack1, lunch, snack2, dinner)
- Meal timing configuration and reminders
- Progress visualization for daily meal goals
- Historical meal completion data

### **Meal Types**
- **Breakfast** - Morning meal tracking
- **Morning Snack** - Mid-morning snack logging
- **Lunch** - Afternoon meal tracking
- **Afternoon Snack** - Mid-afternoon snack logging
- **Dinner** - Evening meal tracking

### **Notifications**
- Automated meal reminders based on user's configured times
- Push notifications for missed meals (0-60 minutes after scheduled time)
- Timezone-aware notifications

### **Wellness Integration**
- Daily wellness check-ins
- Mood and energy level tracking
- Symptom tracking (bloated, low energy, hungry, etc.)
- Overall feeling assessment

## 🎯 **User Experience**
- Simple one-tap meal completion
- Visual progress indicators
- Calendar view of meal history
- Quick access to meal timing settings

## 📊 **Data Tracking**
- Meal completion timestamps
- Daily completion rates
- Weekly and monthly progress
- Streak tracking for consistency

## 🔔 **Notification System**
- FCM push notifications for meal reminders
- Smart timing based on user's timezone
- Configurable meal times per user
- Automatic notification cleanup for completed meals

## 🔒 **Access Control**
- **Required**: Authenticated user session
- **Data Privacy**: Users only access their own meal data
- **Membership**: Some advanced features may require active membership
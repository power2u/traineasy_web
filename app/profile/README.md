# User Profile Directory

This directory contains the user profile management and settings interface.

## 📄 **Files**
- `page.tsx` - Main profile page with server-side data fetching
- `profile-client.tsx` - Client-side profile management components and interactions

## 👤 **Profile Features**

### **Personal Information**
- **Full Name** - User's display name
- **Email Address** - Account email (with verification status)
- **Date of Birth** - Age calculation and age-based recommendations
- **Phone Number** - Contact information
- **Height** - For BMI and body composition calculations

### **Health Information**
- **Blood Group** - Medical information storage
- **Current Condition** - Health status and medical conditions
- **Allergies** - Food and environmental allergy tracking
- **Medical Notes** - Additional health information

### **Emergency Contact**
- **Contact Name** - Emergency contact person
- **Contact Phone** - Emergency contact number
- **Relationship** - Relationship to emergency contact

### **Fitness Preferences**
- **Goal Weight** - Target weight for tracking
- **Preferred Units** - Metric (kg/cm) or Imperial (lbs/inches)
- **Daily Water Target** - Hydration goal customization
- **Glass Size** - Water intake measurement unit

## ⚙️ **Settings & Preferences**

### **Meal Timing Configuration**
- **Breakfast Time** - Preferred breakfast time
- **Morning Snack Time** - Mid-morning snack timing
- **Lunch Time** - Preferred lunch time
- **Afternoon Snack Time** - Mid-afternoon snack timing
- **Dinner Time** - Preferred dinner time
- **Timezone** - Auto-detected user timezone (read-only)

### **Notification Preferences**
- **Notifications Enabled** - Master notification toggle
- **Push Notifications** - Mobile push notification settings
- **Email Notifications** - Email notification preferences
- **Meal Reminders** - Meal timing notification settings
- **Water Reminders** - Hydration reminder settings
- **Weight Reminders** - Weight logging reminder settings

### **App Preferences**
- **Theme** - Light/Dark/System theme preference
- **Language** - Application language selection

## 🔔 **Notification Settings**

### **Meal Reminders**
- Enable/disable meal reminder notifications
- Delay settings for reminder timing
- Customizable reminder messages

### **Water Reminders**
- Configurable reminder times throughout the day
- Frequency settings for hydration reminders
- Smart reminders based on intake progress

### **Weight Reminders**
- Weekly weight logging reminders
- Preferred day and time for weight tracking
- Progress milestone notifications

## 🎯 **User Experience**
- Tabbed interface for organized settings
- Real-time validation for form inputs
- Auto-save functionality for preferences
- Visual feedback for setting changes

## 🔒 **Security Features**
- Password change functionality
- Email verification for email changes
- Secure data handling for sensitive information
- Privacy controls for data sharing

## 📱 **Integration**
- **FCM Tokens** - Push notification device registration
- **Timezone Sync** - Automatic timezone detection and updates
- **Theme Sync** - Cross-device theme preference sync
- **Data Export** - Profile data export capabilities

## 🔒 **Access Control**
- **Required**: Authenticated user session
- **Data Privacy**: Users only access and modify their own profile
- **Validation**: Server-side validation for all profile updates
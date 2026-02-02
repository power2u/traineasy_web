# Server Actions Directory

This directory contains all server actions for the TrainEasy application. Server actions handle form submissions and data mutations on the server side.

## 📄 **Action Files**

### **Admin Actions**
- `admin-details.ts` - Admin user detail operations and management
- `admin.ts` - General administrative operations and system management

### **Authentication Actions**
- `auth.ts` - User authentication, login, and session management
- `email-verification.ts` - Email verification process and token handling
- `password-reset.ts` - Password reset request and confirmation handling

### **User Management Actions**
- `user.ts` - User account management and profile operations
- `profile.ts` - User profile updates and settings management

### **Fitness Tracking Actions**
- `meals.ts` - Meal logging, completion tracking, and nutrition data
- `meal-timing.ts` - Meal timing configuration and schedule management
- `water.ts` - Water intake logging and daily target tracking
- `weight.ts` - Weight logging, progress tracking, and goal management
- `measurements.ts` - Body measurement tracking (biceps, chest, waist, etc.)
- `wellness.ts` - Daily wellness check-ins and mood tracking

### **System Management Actions**
- `banners.ts` - Motivation banner management and display control
- `memberships.ts` - User membership management and status updates
- `packages.ts` - Package and plan management for memberships

## 🔒 **Security Features**
- Server-side validation for all inputs
- Authentication checks for protected actions
- Role-based authorization (admin vs user actions)
- CSRF protection via Next.js built-in mechanisms
- Input sanitization and data validation

## 🎯 **Usage Pattern**
Server actions are called from:
- Form submissions in React components
- Client-side event handlers
- API route handlers
- Background processes

All actions return standardized response objects with success/error states and appropriate data or error messages.
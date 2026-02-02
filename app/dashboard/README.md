# Dashboard Directory

This directory contains the main user dashboard interface providing an overview of all fitness tracking data.

## 📄 **Root Files**
- `page.tsx` - Main dashboard page with data aggregation
- `loading.tsx` - Dashboard-specific loading state

## 📂 **Components Directory**
Dashboard-specific components for displaying user data:

### **Card Components**
- `meals-card.tsx` - Daily meal progress and quick meal logging
- `water-card.tsx` - Water intake progress and quick water logging
- `weight-card.tsx` - Weight progress and goal tracking display
- `membership-section.tsx` - Membership status and renewal information
- `quick-stats.tsx` - Overview statistics and progress summaries

### **UI Components**
- `skeletons.tsx` - Loading skeleton components for dashboard cards

## 🎯 **Dashboard Features**

### **Quick Overview**
- Daily progress for meals, water, and weight
- Membership status and expiration
- Quick action buttons for logging data
- Progress charts and statistics

### **Data Visualization**
- Progress bars for daily goals
- Charts for weight and measurement trends
- Calendar view for meal completion
- Achievement badges and milestones

### **Quick Actions**
- Log water intake
- Mark meals as completed
- Quick weight entry
- Access detailed tracking pages

## 📱 **Responsive Design**
- Mobile-first approach
- Card-based layout for easy scanning
- Touch-friendly quick action buttons
- Optimized for various screen sizes

## 🔄 **Data Flow**
- Server-side data fetching for initial load
- Client-side updates for real-time interactions
- Optimistic updates for better user experience
- Automatic refresh on data changes

## 🔒 **Access Control**
- **Required**: Authenticated user session
- **Data Isolation**: Users only see their own data
- **Membership Checks**: Some features require active membership
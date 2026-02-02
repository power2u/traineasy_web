# Admin Dashboard Directory

This directory contains the complete administrative interface for managing the TrainEasy application.

## 📄 **Root Files**
- `layout.tsx` - Admin-specific layout with navigation and access control
- `page.tsx` - Admin dashboard home page with system overview
- `admin-tabs.tsx` - Navigation component for admin sections

## 📂 **Admin Sections**

### `/banners` - Banner Management
- `page.tsx` - Banner management interface
- `banners-client.tsx` - Client-side banner management components
- **Purpose**: Manage motivational banners and announcements

### `/bot-detection` - Bot Detection
- `page.tsx` - Bot detection monitoring and logs
- **Purpose**: Monitor and manage bot detection system

### `/memberships` - Membership Management
- `page.tsx` - Membership management interface
- `memberships-client.tsx` - Client-side membership components
- **Purpose**: Manage user memberships, renewals, and status

### `/packages` - Package Management
- `page.tsx` - Package management interface
- `packages-client.tsx` - Client-side package components
- **Purpose**: Manage subscription packages and pricing plans

### `/scheduler` - Internal Scheduler
- `page.tsx` - Cron scheduler management interface
- **Purpose**: Monitor and control the internal notification scheduler

### `/settings` - System Settings
- `page.tsx` - System configuration and settings
- **Purpose**: Global application settings and configuration

### `/users` - User Management
- `page.tsx` - User management interface
- `users-client.tsx` - Client-side user management components
- **Purpose**: Manage user accounts, roles, and permissions

## 🔒 **Access Control**
- **Required Role**: Admin
- **Authentication**: NextAuth session with admin role
- **Layout Protection**: Admin layout checks user role on every page

## 🎨 **UI Components**
- Consistent admin navigation via `admin-tabs.tsx`
- Client-server component pattern for optimal performance
- Responsive design for desktop and mobile admin access

## 📊 **Features**
- User account management
- Membership and package administration
- System monitoring and logs
- Banner and content management
- Internal scheduler control
- Bot detection monitoring
# App Directory

This is the main application directory using Next.js 13+ App Router structure.

## 📁 **Root Files**
- `layout.tsx` - Root layout with providers, error boundary, and global components
- `page.tsx` - Landing/home page
- `loading.tsx` - Global loading component
- `not-found.tsx` - 404 error page
- `providers.tsx` - App providers (NextAuth, Theme, etc.)
- `globals.css` - Global styles
- `favicon.ico` - App icon

## 📂 **Directories**

### `/actions` - Server Actions
Server-side actions for data manipulation and form handling.

### `/admin` - Admin Dashboard
Complete admin interface for managing users, memberships, packages, and system settings.

### `/api` - API Routes
All REST API endpoints for the application.

### `/auth` - Authentication Pages
User authentication flow including login, signup, password reset, and email verification.

### `/dashboard` - User Dashboard
Main user dashboard with overview of all tracking data and quick actions.

### `/dev` - Development Tools
Development and testing utilities (development environment only).

### `/info` - Information Pages
Static information pages about the application.

### `/maintenance` - Maintenance Mode
Placeholder for maintenance mode pages.

### `/meals` - Meal Tracking
Meal logging and nutrition tracking interface.

### `/measurements` - Body Measurements
Body measurement tracking (biceps, chest, waist, etc.).

### `/membership-expired` - Membership Status
Pages shown when user's membership has expired.

### `/profile` - User Profile
User profile management and settings.

### `/user-details` - User Details View
View detailed user information (admin/trainer access).

### `/user-profile-edit` - User Profile Editing
Edit user profile information (admin/trainer access).

### `/water` - Water Tracking
Daily water intake tracking interface.

### `/weight` - Weight Tracking
Weight progress monitoring and goal setting.

## 🔒 **Access Control**
- Public routes: `/`, `/info`, `/auth/*`
- Authenticated routes: `/dashboard`, `/meals`, `/water`, `/weight`, `/measurements`, `/profile`
- Admin routes: `/admin/*`, `/user-details/*`, `/user-profile-edit/*`
- Development routes: `/dev/*`
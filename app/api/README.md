# API Routes Directory

This directory contains all REST API endpoints for the TrainEasy application using Next.js App Router API routes.

## 📂 **API Structure**

### `/admin` - Admin APIs
Administrative endpoints for system management:
- User management
- System monitoring
- Security logs
- Internal scheduler control
- Bot detection debugging

### `/auth` - Authentication APIs
User authentication and account management:
- NextAuth.js integration
- User registration
- CAPTCHA verification

### `/cleanup-reset-tokens` - Token Cleanup
Utility endpoint for cleaning expired password reset tokens.

### `/cron` - Cron Job APIs
Internal cron job endpoints:
- Meal notification scheduler
- Automated system tasks

### `/fcm` - Firebase Cloud Messaging
Push notification management:
- FCM token registration
- Token validation and cleanup
- Test notifications

### `/user` - User APIs
User-specific data management:
- User preferences
- Profile settings

## 🔒 **Security**

### **Access Levels**
- **Public**: `/auth/*` endpoints
- **Authenticated**: `/user/*`, `/fcm/*` endpoints
- **Admin**: `/admin/*` endpoints
- **Internal**: `/cron/*`, `/cleanup-reset-tokens` (require secrets)

### **Authentication Methods**
- Session-based authentication via NextAuth.js
- CRON_SECRET for internal endpoints
- Role-based access control for admin endpoints

## 📝 **API Conventions**
- All routes use `route.ts` files
- Standard HTTP methods (GET, POST, PUT, DELETE)
- JSON request/response format
- Consistent error handling
- Input validation and sanitization
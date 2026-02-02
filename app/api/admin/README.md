# Admin API Routes

This directory contains all administrative API endpoints for system management and monitoring.

## 📂 **API Endpoints**

### `/bot-logs` - Bot Detection Logs
- **File**: `bot-logs/route.ts`
- **Methods**: GET
- **Purpose**: Retrieve bot detection logs and security events
- **Access**: Admin only

### `/debug` - Debug Utilities
- **Directory**: `debug/`
- **Purpose**: Development and debugging tools for system analysis

#### `/debug/bot-detection`
- **File**: `debug/bot-detection/route.ts`
- **Methods**: GET, POST
- **Purpose**: Bot detection system debugging and testing
- **Access**: Admin only

### `/scheduler` - Internal Scheduler Management
- **File**: `scheduler/route.ts`
- **Methods**: GET, POST
- **Purpose**: Control and monitor the internal cron scheduler
- **Features**:
  - GET: Get scheduler status and active jobs
  - POST: Start/stop scheduler with `{"action": "start|stop"}`
- **Access**: Admin only

### `/welcome-notification` - Custom Notifications
- **File**: `welcome-notification/route.ts`
- **Methods**: POST
- **Purpose**: Send custom notifications to all active users
- **Features**:
  - Send personalized notifications with custom title and body
  - Support for `{name}` placeholder for personalization
  - Multiple notification types: `admin_notification`, `offer`, `announcement`, `update`, `reminder`
  - Targets users with active FCM tokens (last 7 days)
- **Request Body**:
  ```json
  {
    "title": "🎉 Special Offer!",
    "body": "Get 20% off premium plans! Hi {name}, don't miss out!",
    "type": "offer"
  }
  ```
- **Access**: Admin only

### `/cleanup-tokens` - FCM Token Cleanup
- **File**: `cleanup-tokens/route.ts`
- **Methods**: POST
- **Purpose**: Clean up old and invalid FCM tokens
- **Features**:
  - Remove tokens older than 90 days
  - Validate tokens with Firebase and remove invalid ones
  - Automatic cleanup during notification failures
- **Access**: Admin only

### `/manual-cleanup` - Manual Token Cleanup
- **File**: `manual-cleanup/route.ts`
- **Methods**: POST
- **Purpose**: Trigger manual cleanup of expired tokens
- **Access**: Admin only

### `/security` - Security Monitoring
- **Directory**: `security/`
- **Purpose**: Security audit logs and monitoring

#### `/security/logs`
- **File**: `security/logs/route.ts`
- **Methods**: GET
- **Purpose**: Retrieve security audit logs and events
- **Access**: Admin only

### `/users` - User Management
- **Directory**: `users/`
- **Purpose**: Administrative user management operations

#### `/users/[userId]`
- **File**: `users/[userId]/route.ts`
- **Methods**: GET, PUT, DELETE
- **Purpose**: Individual user account management
- **Features**:
  - GET: Retrieve user details
  - PUT: Update user information
  - DELETE: Delete user account
- **Access**: Admin only

#### `/users/[userId]/profile`
- **File**: `users/[userId]/profile/route.ts`
- **Methods**: GET, PUT
- **Purpose**: User profile management by admin
- **Features**:
  - GET: Retrieve user profile details
  - PUT: Update user profile information
- **Access**: Admin only

## 🔒 **Security**
- All endpoints require admin role authentication
- Session-based authentication via NextAuth.js
- Input validation and sanitization
- Audit logging for all admin actions

## 📝 **Response Format**
All admin APIs return standardized JSON responses:
```json
{
  "success": boolean,
  "data": object | array,
  "message": string,
  "timestamp": string
}
```

## 🚨 **Error Handling**
- 401: Unauthorized (not logged in)
- 403: Forbidden (not admin role)
- 404: Resource not found
- 500: Internal server error
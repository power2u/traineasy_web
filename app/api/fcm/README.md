# Firebase Cloud Messaging API Routes

This directory contains all FCM (Firebase Cloud Messaging) related API endpoints for push notification management.

## 📂 **API Endpoints**

### `/check-token` - Token Validation
- **File**: `check-token/route.ts`
- **Methods**: POST
- **Purpose**: Validate if an FCM token exists and is active
- **Request**:
  ```json
  {
    "userId": "user_uuid",
    "token": "fcm_token_string"
  }
  ```
- **Response**:
  ```json
  {
    "exists": boolean,
    "tokenId": "token_uuid",
    "lastUpdated": "timestamp"
  }
  ```
- **Access**: Authenticated users (own tokens only)

### `/cleanup-tokens` - Token Cleanup
- **File**: `cleanup-tokens/route.ts`
- **Methods**: POST
- **Purpose**: Clean up invalid or expired FCM tokens for the authenticated user
- **Features**:
  - Tests token validity with Firebase
  - Removes invalid tokens from database
  - Removes tokens older than 90 days
- **Response**:
  ```json
  {
    "success": true,
    "message": "Cleaned up X invalid/old tokens",
    "removed": number,
    "details": {
      "invalidTokens": number,
      "oldTokens": number,
      "validTokens": number
    }
  }
  ```
- **Access**: Authenticated users (own tokens only)

### `/save-token` - Token Registration
- **File**: `save-token/route.ts`
- **Methods**: POST
- **Purpose**: Save or update FCM token for push notifications
- **Request**:
  ```json
  {
    "userId": "user_uuid",
    "token": "fcm_token_string"
  }
  ```
- **Features**:
  - Saves new FCM tokens
  - Updates existing token timestamps
  - Sends welcome notification for first-time registration
  - Stores device information from User-Agent
- **Response**:
  ```json
  {
    "success": true,
    "message": "Token saved and welcome notification sent",
    "tokenId": "token_uuid"
  }
  ```
- **Access**: Authenticated users (own tokens only)

### `/test-notification` - Test Notifications
- **File**: `test-notification/route.ts`
- **Methods**: POST
- **Purpose**: Send test notification to user's registered devices
- **Features**:
  - Sends test notification to all user's FCM tokens
  - Provides delivery status for each device
  - Useful for testing notification setup
- **Response**:
  ```json
  {
    "success": true,
    "message": "Test notification sent to X device(s)",
    "results": {
      "total": number,
      "success": number,
      "failed": number,
      "details": [
        {
          "tokenId": "token_uuid",
          "success": boolean,
          "error": "error_message"
        }
      ]
    }
  }
  ```
- **Access**: Authenticated users (own devices only)

## 🔒 **Security**

### **Authentication**
- All endpoints require valid NextAuth session
- Users can only manage their own FCM tokens
- User ID validation against session

### **Authorization**
- Session user ID must match request user ID
- No cross-user token access allowed
- Admin users have no special privileges (user-specific data)

## 🔔 **Notification Features**

### **Welcome Notifications**
- Automatically sent when new token is registered
- Confirms notification setup is working
- Includes app branding and welcome message

### **Test Notifications**
- Manual testing capability for users
- Verifies notification delivery
- Helps troubleshoot notification issues

## 🧹 **Token Management**

### **Automatic Cleanup**
- Invalid tokens are automatically removed
- Tokens older than 90 days are cleaned up
- Failed delivery attempts trigger token validation

### **Token Validation**
- Dry-run message sending to test token validity
- Firebase Admin SDK integration for validation
- Automatic removal of invalid tokens

## 🚨 **Error Handling**
- 401: Unauthorized (no valid session)
- 403: Forbidden (wrong user ID)
- 404: No FCM tokens found
- 500: Firebase messaging not initialized or internal error

## 🔧 **Integration**
- **Firebase Admin SDK**: Server-side messaging
- **NextAuth.js**: Session authentication
- **Database**: FCM token storage and management
- **Client FCM**: Token generation and refresh
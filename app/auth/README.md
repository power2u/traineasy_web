# Authentication Pages Directory

This directory contains all user authentication and account management pages.

## 📄 **Authentication Pages**

### `/login` - User Login
- `page.tsx` - Login form and authentication interface
- **Purpose**: User sign-in with email/password
- **Features**: Form validation, error handling, redirect after login

### `/signup` - User Registration
- `page.tsx` - User registration form
- **Purpose**: New user account creation
- **Features**: Email validation, password requirements, CAPTCHA integration

### `/forgot-password` - Password Reset Request
- `page.tsx` - Password reset request form
- **Purpose**: Initiate password reset process
- **Features**: Email validation, reset token generation

### `/reset-password` - Password Reset Confirmation
- `page.tsx` - Password reset form with token validation
- **Purpose**: Complete password reset with new password
- **Features**: Token validation, password confirmation, security checks

### `/verify-email` - Email Verification
- `page.tsx` - Email verification confirmation page
- **Purpose**: Verify user email address with token
- **Features**: Token validation, account activation

### `/callback` - OAuth Callback
- **Directory**: Empty (placeholder for OAuth callbacks)
- **Purpose**: Handle OAuth provider callbacks (if needed)

## 🔒 **Security Features**
- CSRF protection on all forms
- Input validation and sanitization
- Rate limiting on authentication attempts
- Secure token generation and validation
- Password strength requirements
- Email verification requirement

## 🎯 **Authentication Flow**
1. **Registration**: `/signup` → Email verification → Account activation
2. **Login**: `/login` → Dashboard redirect
3. **Password Reset**: `/forgot-password` → Email → `/reset-password`
4. **Email Verification**: Registration → `/verify-email`

## 🔧 **Integration**
- **NextAuth.js**: Session management and authentication
- **Server Actions**: Form handling and validation
- **Email Service**: Verification and reset emails
- **CAPTCHA**: Bot protection on registration
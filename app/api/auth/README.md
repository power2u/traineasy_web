# Authentication API Routes

This directory contains all authentication-related API endpoints.

## 📂 **API Endpoints**

### `/[...nextauth]` - NextAuth.js Handler
- **File**: `[...nextauth]/route.ts`
- **Methods**: GET, POST
- **Purpose**: NextAuth.js authentication handler
- **Features**:
  - User login/logout
  - Session management
  - JWT token handling
  - OAuth provider integration (if configured)
- **Access**: Public

### `/captcha` - CAPTCHA Verification
- **File**: `captcha/route.ts`
- **Methods**: GET, POST
- **Purpose**: CAPTCHA generation and verification for bot protection
- **Features**:
  - GET: Generate new CAPTCHA challenge
  - POST: Verify CAPTCHA response
- **Access**: Public
- **Usage**: Registration and sensitive operations

### `/register` - User Registration
- **File**: `register/route.ts`
- **Methods**: POST
- **Purpose**: New user account creation
- **Features**:
  - Email validation
  - Password hashing
  - CAPTCHA verification
  - Email verification token generation
  - Bot detection integration
- **Access**: Public

## 🔒 **Security Features**

### **Registration Security**
- CAPTCHA verification required
- Email validation and verification
- Password strength requirements
- Rate limiting on registration attempts
- Bot detection and prevention
- Input sanitization and validation

### **Authentication Security**
- Secure session management
- JWT token encryption
- CSRF protection
- Rate limiting on login attempts
- Secure password hashing (bcrypt)

## 📝 **Request/Response Examples**

### Registration Request
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "fullName": "John Doe",
  "captcha": "captcha_response_token"
}
```

### Registration Response
```json
{
  "success": true,
  "message": "Registration successful. Please check your email for verification.",
  "userId": "uuid"
}
```

## 🚨 **Error Handling**
- 400: Bad request (validation errors)
- 401: Unauthorized (invalid credentials)
- 429: Too many requests (rate limiting)
- 500: Internal server error

## 🔧 **Integration**
- **NextAuth.js**: Session and authentication management
- **Email Service**: Verification email sending
- **CAPTCHA Service**: Bot protection
- **Database**: User account storage
- **Bot Detection**: Security monitoring
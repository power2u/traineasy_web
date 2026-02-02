# TrainEasy Web Application Scripts

This directory contains utility scripts for the TrainEasy Web application.

## Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Environment variables configured

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env.local`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/your_db_name"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

## Available Scripts

### Database Management
- `check-table-usage.js` - Check database table usage and statistics
- `check-target-counts.ts` - Verify target counts in database
- `test-db-connection.js` - Test database connectivity

### User Management
- `inspect-user.js` - Inspect user data and details
- `list-users.js` - List all users in the system
- `reset-user-password.js` - Reset user password
- `set-user-password.ts` - Set user password
- `verify-user-email.js` - Verify user email address

### Development & Testing
- `test-login.ts` - Test login functionality
- `validate-production-env.js` - Validate production environment variables

### Data Migration
- `migrate-memberships.js` - Migrate membership data
- `reset-to-fixed-hash.ts` - Reset to fixed hash for testing

## Usage

Most scripts can be run using Node.js or tsx:

```bash
# For JavaScript files
node scripts/script-name.js

# For TypeScript files
npx tsx scripts/script-name.ts
```

Make sure your environment variables are properly configured before running any scripts.
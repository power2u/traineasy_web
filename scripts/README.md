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
   FIREBASE_SERVICE_ACCOUNT_JSON="your-firebase-service-account-json"
   CRON_SECRET="your-cron-secret" # Optional, for cron job security
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

## Available Scripts

### Cron Jobs & Notifications
- `cron-runner.js` - Main cron job runner for meal notifications (runs every hour)
- `setup-cron.sh` - Setup script to configure cron job on VPS
- `test-cron.js` - Test script to verify cron job functionality

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
- `test-bot-detection.js` - Test bot detection functionality

### Data Migration
- `migrate-memberships.js` - Migrate membership data
- `reset-to-fixed-hash.ts` - Reset to fixed hash for testing

### Docker & Deployment
- `docker-build.sh` - Docker build script

## Cron Job Setup

The application includes an automated meal notification system that runs every hour.

### Quick Setup
1. Run the setup script:
   ```bash
   ./scripts/setup-cron.sh
   ```

2. Follow the prompts to install the cron job

### Manual Setup
1. Make scripts executable:
   ```bash
   chmod +x scripts/cron-runner.js
   chmod +x scripts/setup-cron.sh
   ```

2. Add to crontab (runs every hour):
   ```bash
   # Edit crontab
   crontab -e
   
   # Add this line (replace /path/to/project with your actual path):
   0 * * * * cd /path/to/project && ./scripts/cron-wrapper.sh >> logs/cron.log 2>&1
   ```

### Testing Cron Jobs
```bash
# Test the cron endpoint (make sure your dev server is running)
node scripts/test-cron.js

# Test the cron runner directly
./scripts/cron-runner.js

# View cron logs
tail -f logs/cron.log
```

### Cron Job Features
- **Automatic meal reminders**: Sends notifications when users miss their meal times
- **Timezone aware**: Respects each user's timezone settings
- **Smart timing**: Only sends notifications 0-60 minutes after meal time
- **FCM integration**: Uses Firebase Cloud Messaging for push notifications
- **Error handling**: Automatically cleans up invalid FCM tokens
- **Logging**: Comprehensive logging for monitoring and debugging

## Usage

Most scripts can be run using Node.js or tsx:

```bash
# For JavaScript files
node scripts/script-name.js

# For TypeScript files
npx tsx scripts/script-name.ts

# For shell scripts
./scripts/script-name.sh
```

Make sure your environment variables are properly configured before running any scripts.
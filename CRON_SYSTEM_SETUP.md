# Meal Notification Cron System

This document explains the automated meal notification system that sends push notifications to users when they miss their meal times.

## 🔄 **Two Deployment Options**

### Option 1: Internal Scheduler (Recommended) ⭐
- **Auto-deploys** with your Next.js app
- **No manual setup** required
- **Self-contained** within the application
- **Admin dashboard** for monitoring and control

### Option 2: External Cron (Traditional)
- Requires **manual server setup** after deployment
- Uses system-level cron jobs
- More traditional approach

---

## 🚀 **Option 1: Internal Scheduler (Auto-Deploy)**

### ✅ **How It Works**
- **Automatically starts** when your app deploys to production
- **Runs within** the Next.js app process
- **No server setup** required
- **Admin control** via `/admin/scheduler` page

### ✅ **Features**
- **Self-initializing**: Starts automatically in production
- **Admin dashboard**: Monitor and control via web interface
- **Graceful shutdown**: Properly stops when app restarts
- **Error handling**: Continues running even if individual jobs fail
- **Development mode**: Manual control for testing

### ✅ **Setup**
1. **Deploy your app** - Scheduler starts automatically
2. **Check admin panel** - Visit `/admin/scheduler` to monitor
3. **Done!** - No additional setup needed

### ✅ **Environment Variables**
```env
NODE_ENV=production                    # Enables auto-start
CRON_SECRET=your-secret-key           # Optional security
FIREBASE_SERVICE_ACCOUNT_JSON=...     # Firebase credentials
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### ✅ **Admin Control**
- Visit `/admin/scheduler` in your app
- **Start/Stop** scheduler manually
- **Monitor status** and active jobs
- **View logs** and job history

---

## 🛠️ **Option 2: External Cron (Manual Setup)**

### When to Use
- If you prefer traditional cron jobs
- If you want scheduler independent of app process
- If you have specific server requirements

### Setup Instructions
1. **Deploy your app first**
2. **SSH into your server**
3. **Run setup script**:
   ```bash
   ./scripts/setup-cron.sh
   ```
4. **Follow prompts** to install system cron job

### Files for External Cron
- `scripts/cron-runner.js` - Main cron job runner
- `scripts/setup-cron.sh` - Automated setup script
- `scripts/test-cron.js` - Testing utility

---

## 📊 **System Details**

### Notification Logic
Notifications are sent when:
- Current time is **after** the meal time (not before)
- **Less than 60 minutes** have passed since meal time
- The meal is **not already completed** for today
- User has **valid FCM tokens**

### Job Schedule
- **Meal Notifications**: Every hour
- **Token Cleanup**: Daily (removes invalid tokens)

### Security
- **FCM APIs**: Require user authentication
- **Cron endpoint**: Protected by CRON_SECRET
- **Admin panel**: Requires admin role

---

## 🔧 **Development & Testing**

### Local Development
```bash
# Test the cron endpoint (with dev server running)
node scripts/test-cron.js

# Check scheduler status in admin panel
# Visit: http://localhost:3000/admin/scheduler
```

### Production Monitoring
```bash
# Check app logs for scheduler activity
# Look for messages like:
# "🚀 Starting internal cron scheduler..."
# "📅 Scheduled job 'meal-notifications' to run every 3600s"
# "🔄 Running job: meal-notifications at 2024-02-02T10:00:00.000Z"
```

---

## 🆚 **Comparison**

| Feature | Internal Scheduler | External Cron |
|---------|-------------------|---------------|
| **Setup** | ✅ Automatic | ❌ Manual |
| **Deployment** | ✅ Auto-deploys | ❌ Requires server access |
| **Monitoring** | ✅ Web dashboard | ❌ Server logs only |
| **Control** | ✅ Admin panel | ❌ SSH required |
| **Reliability** | ✅ App-coupled | ✅ Independent |
| **Scaling** | ⚠️ Per instance | ✅ Centralized |

---

## 🎯 **Recommended Approach**

**Use Internal Scheduler** for:
- ✅ Easy deployment and maintenance
- ✅ Teams without server admin access
- ✅ Development and testing
- ✅ Small to medium applications

**Use External Cron** for:
- ✅ High-availability requirements
- ✅ Multiple app instances
- ✅ Strict separation of concerns
- ✅ Traditional infrastructure setups

---

## 🚨 **Migration**

### From External to Internal
1. **Remove old cron job**:
   ```bash
   crontab -l | grep -v "cron-wrapper.sh" | crontab -
   ```
2. **Deploy app** with internal scheduler
3. **Check admin panel** to verify it's running

### From Internal to External
1. **Stop internal scheduler** via admin panel
2. **Run setup script**: `./scripts/setup-cron.sh`
3. **Verify** system cron is working

---

## 📝 **Quick Start (Internal Scheduler)**

1. **Set environment variables**:
   ```env
   NODE_ENV=production
   CRON_SECRET=your-secret-key
   FIREBASE_SERVICE_ACCOUNT_JSON=your-firebase-credentials
   ```

2. **Deploy your app** - Scheduler starts automatically

3. **Monitor via admin panel**: `/admin/scheduler`

4. **Done!** 🎉

The internal scheduler is the easiest way to get automated meal notifications working with zero manual setup!
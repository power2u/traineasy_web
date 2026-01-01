# Dokploy Cron Job Setup Guide

## Option 1: System Cron Job (Recommended)

### 1. SSH into your Dokploy server
```bash
ssh user@your-server-ip
```

### 2. Create a cron script
```bash
sudo nano /usr/local/bin/train-easy-notifications.sh
```

Add this content:
```bash
#!/bin/bash
# Train Easy Notification Cron Job

# Your app URL (replace with your actual domain)
APP_URL="https://traineasy.teamsouravfitness.com/"
CRON_SECRET="b54b1718b96a21052bb093c404cf13ea62d78be6d525d9c67b450a3d8248665e"

# Call the notification API
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  "$APP_URL/api/notifications/check-and-send" \
  --max-time 30 \
  --silent \
  --show-error \
  >> /var/log/train-easy-cron.log 2>&1

# Add timestamp to log
echo "$(date): Cron job completed" >> /var/log/train-easy-cron.log
```

### 3. Make script executable
```bash
sudo chmod +x /usr/local/bin/train-easy-notifications.sh
```

### 4. Add to system crontab
```bash
sudo crontab -e
```

Add this line (runs every hour):
```bash
0 * * * * /usr/local/bin/train-easy-notifications.sh
```

### 5. Create log file with proper permissions
```bash
sudo touch /var/log/train-easy-cron.log
sudo chmod 644 /var/log/train-easy-cron.log
```

### 6. Test the script
```bash
sudo /usr/local/bin/train-easy-notifications.sh
```

### 7. Check logs
```bash
sudo tail -f /var/log/train-easy-cron.log
```

## Option 2: Docker Container Cron

If you prefer to keep cron inside your Docker container:

### 1. Create Dockerfile with cron
```dockerfile
FROM node:18-alpine

# Install cron
RUN apk add --no-cache dcron

# Copy your app
COPY . /app
WORKDIR /app

# Install dependencies
RUN npm install

# Create cron script
RUN echo '#!/bin/sh' > /usr/local/bin/notifications-cron.sh
RUN echo 'curl -X GET -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/notifications/check-and-send' >> /usr/local/bin/notifications-cron.sh
RUN chmod +x /usr/local/bin/notifications-cron.sh

# Add cron job
RUN echo '0 * * * * /usr/local/bin/notifications-cron.sh' > /etc/crontabs/root

# Start script that runs both Next.js and cron
COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
```

### 2. Create start.sh
```bash
#!/bin/sh
# Start cron daemon
crond -f -d 8 &

# Start Next.js app
npm start
```

## Option 3: External Cron Service

Use a third-party service like:

### 1. Cron-job.org (Free)
- Go to https://cron-job.org
- Create account
- Add new cron job:
  - URL: `https://your-domain.com/api/notifications/check-and-send`
  - Schedule: `0 * * * *` (every hour)
  - Headers: `Authorization: Bearer your-cron-secret`

### 2. EasyCron (Free tier available)
- Similar setup to cron-job.org
- More features in paid plans

### 3. UptimeRobot (Free monitoring + cron)
- Set up HTTP monitor
- Configure to call your endpoint every hour

## Option 4: GitHub Actions (Free)

Create `.github/workflows/cron-notifications.yml`:

```yaml
name: Hourly Notifications

on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Allow manual trigger

jobs:
  send-notifications:
    runs-on: ubuntu-latest
    steps:
      - name: Call Notification API
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            "${{ secrets.APP_URL }}/api/notifications/check-and-send" \
            --fail --show-error --silent
```

Add these secrets to your GitHub repository:
- `CRON_SECRET`: Your cron secret
- `APP_URL`: Your app URL

## Recommended Setup for Dokploy

**Use Option 1 (System Cron)** because:
- ✅ Most reliable
- ✅ Independent of your app container
- ✅ Easy to monitor and debug
- ✅ No additional services needed

## Environment Variables

Make sure these are set in your Dokploy environment:
```bash
CRON_SECRET=your-secret-key-here
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FIREBASE_SERVICE_ACCOUNT_JSON=your-firebase-service-account
```

## Testing

1. **Test your API endpoint manually:**
```bash
curl -X GET \
  -H "Authorization: Bearer your-cron-secret" \
  "https://your-domain.com/api/notifications/check-and-send"
```

2. **Check if notifications are working:**
```bash
curl -X GET "https://your-domain.com/api/test/manual-notification-check"
```

3. **Monitor logs:**
```bash
sudo tail -f /var/log/train-easy-cron.log
```

## Troubleshooting

- **Cron not running**: Check `sudo systemctl status cron`
- **Script permissions**: Ensure script is executable
- **Network issues**: Test curl command manually
- **Environment variables**: Make sure CRON_SECRET is correct
- **Logs**: Always check the log file for errors
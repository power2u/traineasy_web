# Custom VPS Cron Job Setup

Since you are deploying to a custom VPS (via Dockoply) instead of Vercel, Vercel Cron Jobs (defined in `vercel.json` or `vercel-cron-unified.json`) **will not run automatically**. You must set up a periodic task on your server to trigger the notification endpoint.

## Prerequisite: Environment Variables

Ensure your VPS environment (or `.env` file) has:
```env
CRON_SECRET=your_secure_random_string
```
This matches the `CRON_SECRET` used in your Next.js app.

## Option 1: Using System Cron (Linux/Unix)

You can use `crontab` on the host machine or inside the Docker container to trigger the job hourly.

1. Open crontab:
   ```bash
   crontab -e
   ```

2. Add the following line (runs at minute 0 of every hour):
   ```bash
   0 * * * * curl -X GET "https://your-domain.com/api/notifications/check-and-send" -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```
   Replace `https://your-domain.com` with your actual deploy domain and `YOUR_CRON_SECRET` with the actual secret value.

## Option 2: Using the Helper Script

We have included helper scripts in `scripts/`.

### Bash Script
```bash
# Run manually to test
./scripts/cron-job.sh https://your-domain.com YOUR_CRON_SECRET
```

### Node Script
```bash
# Run manually to test
node scripts/trigger-cron.js https://your-domain.com YOUR_CRON_SECRET
```

## Troubleshooting Browser Notifications

If users are not getting the "Allow Notifications" prompt:
1. **HTTPS is Required**: Browser notifications (Service Workers) **only work on HTTPS**. Ensure your VPS serves the app via HTTPS (using Let's Encrypt, Caddy, Nginx, etc.).
2. **User Gesture Required**: Browsers block automatic permission requests. We have added an **"Enable Notifications" button** on the Dashboard for users whose permissions are not yet granted.
3. **Check Console**: Open browser DevTools (F12) -> Console. Look for "Service Worker registered successfully" or errors.

## Verifying the Cron Job

You can manually trigger the API route to test if it sends notifications:
1. Ensure you have a user with `notifications_enabled: true`.
2. Ensure `meal_reminders_enabled: true` for that user.
3. Run the valid `curl` command or script.
4. Check the JSON response for `sent: X` count.

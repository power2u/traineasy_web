#!/bin/bash

# Setup script for local cron notification system
# Run this script on your VPS to set up the local cron system

echo "Setting up Local Cron Notification System..."

# Create necessary directories
echo "Creating directories..."
mkdir -p data/notifications
mkdir -p logs/cron

# Make notification script executable
echo "Making scripts executable..."
chmod +x scripts/send-notification.js

# Create log rotation for cron logs
echo "Setting up log rotation..."
sudo tee /etc/logrotate.d/fitness-tracker-cron > /dev/null <<EOF
/var/log/fitness-tracker-cron.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF

# Create systemd service for cron management (optional)
echo "Creating systemd service..."
sudo tee /etc/systemd/system/fitness-tracker-cron.service > /dev/null <<EOF
[Unit]
Description=Fitness Tracker Cron Manager
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$(pwd)
Environment=NODE_ENV=production
Environment=NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
Environment=NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
Environment=NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
Environment=CRON_SECRET=${CRON_SECRET}
ExecStart=/usr/bin/node scripts/cron-manager.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
echo "Enabling systemd service..."
sudo systemctl daemon-reload
sudo systemctl enable fitness-tracker-cron.service

# Create cron manager script
echo "Creating cron manager script..."
cat > scripts/cron-manager.js << 'EOF'
#!/usr/bin/env node

/**
 * Cron Manager Service
 * Monitors database for cron job changes and updates system crontab
 */

const { createClient } = require('@supabase/supabase-js');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

class CronManager {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 60000; // Check every minute
  }

  async start() {
    console.log('Starting Cron Manager Service...');
    this.isRunning = true;
    
    // Initial sync
    await this.syncCronJobs();
    
    // Set up periodic sync
    setInterval(async () => {
      if (this.isRunning) {
        await this.syncCronJobs();
      }
    }, this.checkInterval);
  }

  async stop() {
    console.log('Stopping Cron Manager Service...');
    this.isRunning = false;
  }

  async syncCronJobs() {
    try {
      // Get all active cron jobs from database
      const { data: cronJobs, error } = await supabase
        .from('user_cron_jobs')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching cron jobs:', error);
        return;
      }

      console.log(`Found ${cronJobs?.length || 0} active cron jobs`);
      
      // Update system crontab if needed
      await this.updateSystemCrontab(cronJobs || []);
      
    } catch (error) {
      console.error('Error syncing cron jobs:', error);
    }
  }

  async updateSystemCrontab(cronJobs) {
    try {
      // Get current crontab
      const { stdout: currentCrontab } = await execAsync('crontab -l 2>/dev/null || echo ""');
      
      // Filter out existing fitness tracker jobs
      const lines = currentCrontab.split('\n');
      const filteredLines = lines.filter(line => !line.includes('fitness_tracker_'));
      
      // Add new cron jobs (using local server time)
      const newCronEntries = cronJobs.map(job => {
        const jobName = `fitness_tracker_${job.user_id}_${job.notification_type}`;
        const command = `node ${process.cwd()}/scripts/send-notification.js ${job.user_id} ${job.notification_type}`;
        return `# ${jobName}\n${job.cron_expression} ${command}`;
      });
      
      // Combine filtered lines with new entries
      const newCrontab = [...filteredLines, ...newCronEntries].join('\n');
      
      // Update crontab
      await execAsync(`echo "${newCrontab}" | crontab -`);
      console.log(`Updated crontab with ${cronJobs.length} jobs`);
      
    } catch (error) {
      console.error('Error updating system crontab:', error);
    }
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await cronManager.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await cronManager.stop();
  process.exit(0);
});

// Start the service
const cronManager = new CronManager();
cronManager.start();
EOF

chmod +x scripts/cron-manager.js

# Create environment file template
echo "Creating environment template..."
cat > .env.cron.example << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=your_cron_secret

# Node Environment
NODE_ENV=production
EOF

echo ""
echo "✅ Local Cron Notification System setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy your environment variables to .env.cron"
echo "2. Source the environment: source .env.cron"
echo "3. Start the cron manager service: sudo systemctl start fitness-tracker-cron"
echo "4. Check service status: sudo systemctl status fitness-tracker-cron"
echo "5. View logs: sudo journalctl -u fitness-tracker-cron -f"
echo ""
echo "To register cron jobs for existing users, call:"
echo "curl -X POST http://localhost:3000/api/cron/register-user -H 'Content-Type: application/json' -d '{\"userId\":\"user-id-here\"}'"
echo ""
echo "Local notifications will be stored in: $(pwd)/data/notifications/"
echo "Cron logs will be in: /var/log/fitness-tracker-cron.log"
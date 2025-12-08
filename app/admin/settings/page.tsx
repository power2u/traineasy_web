'use client';

import { Card } from '@heroui/react';

export default function SettingsPage() {
  return (
    <>
      <div className="grid gap-4 md:gap-6">
        <Card className="p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-3 md:text-xl md:mb-4">System Settings</h2>
          <p className="text-sm text-default-500">
            Settings page coming soon. This will include:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-default-600">
            <li>• Email configuration</li>
            <li>• Notification templates</li>
            <li>• System preferences</li>
            <li>• Backup & restore</li>
            <li>• API keys management</li>
          </ul>
        </Card>

        <Card className="p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-3 md:text-xl md:mb-4">Application Info</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-default-500">Version:</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-default-500">Environment:</span>
              <span className="font-medium">Development</span>
            </div>
            <div className="flex justify-between">
              <span className="text-default-500">Database:</span>
              <span className="font-medium text-green-500">Connected</span>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

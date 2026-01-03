'use client';

import { useState } from 'react';
import { Card, Button, Input, TextArea, Chip, Spinner, TextField, Label } from '@heroui/react';
import { toast } from 'sonner';
import Link from 'next/link';
 
interface NotificationResult {
  success: boolean;
  totalTokens: number;
  successCount: number;
  failureCount: number;
  message: string;
}

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<NotificationResult | null>(null);

  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Please fill in both title and message');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          body: message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send notification');
      }

      setResult(data);
      toast.success(`Notification sent to ${data.successCount} devices!`);
      
      // Clear form on success
      setTitle('');
      setMessage('');
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast.error(error.message || 'Failed to send notification');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Send Push Notifications</h1>
          <p className="text-default-500 mt-1">
            Send manual push notifications to all users with active FCM tokens
          </p>
        </div>
        <div className="flex gap-2">
       <Link href="/admin/notifications/custom-templates" ><Button  
            
            
            className="bg-green-600 text-white hover:bg-green-700"
          >
            Manage Messages
          </Button></Link>
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <TextField>
            <Label>Notification Title</Label>
            <Input
              placeholder="e.g., Special Offer!"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              maxLength={50}
            />
            <div className="text-xs text-default-500 mt-1">{title.length}/50 characters</div>
          </TextField>

          <TextField>
            <Label>Notification Message</Label>
            <TextArea
              placeholder="e.g., Get 20% off on premium features this week!"
              value={message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
              maxLength={200}
              rows={3}
            />
            <div className="text-xs text-default-500 mt-1">{message.length}/200 characters</div>
          </TextField>

          <Button
            onPress={handleSendNotification}
            isDisabled={isLoading || !title.trim() || !message.trim()}
            className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Sending...
              </>
            ) : (
              'Send Notification'
            )}
          </Button>
        </div>
      </Card>

      {result && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Notification Results</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-default-500">Status:</span>
              <Chip className={result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {result.success ? 'Success' : 'Failed'}
              </Chip>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-default-500">Total Tokens:</span>
              <span className="font-medium">{result.totalTokens}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-default-500">Successfully Sent:</span>
              <span className="font-medium text-green-600">{result.successCount}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-default-500">Failed:</span>
              <span className="font-medium text-red-600">{result.failureCount}</span>
            </div>
            
            <div className="mt-4">
              <span className="text-default-500">Message:</span>
              <p className="text-sm mt-1 p-3 bg-default-100 rounded-lg">
                {result.message}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
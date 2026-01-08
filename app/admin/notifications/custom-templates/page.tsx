'use client';

import { useEffect, useState } from 'react';
import { Button, Card, TextField, Label, Input, TextArea, Spinner } from '@heroui/react';
import { 
  getAllNotificationMessages, 
  createNotificationMessage, 
  updateNotificationMessage, 
  activateNotificationMessage, 
  deactivateNotificationMessage, 
  deleteNotificationMessage,
  type NotificationMessage 
} from '@/app/actions/notification-messages';
import { NOTIFICATION_TYPES } from '@/lib/constants/notification-types';
import { toast } from 'sonner';
import { Bell, Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';

export default function NotificationMessagesAdminPage() {
  const [messages, setMessages] = useState<NotificationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [notificationType, setNotificationType] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [repeatPattern, setRepeatPattern] = useState('daily');
  const [isEnabled, setIsEnabled] = useState(true);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const result = await getAllNotificationMessages();
      if (result.success) {
        setMessages(result.messages);
      } else {
        toast.error('Failed to load notification messages');
        console.error('Load messages error:', result.error);
      }
    } catch (error) {
      console.error('Load messages exception:', error);
      toast.error('Failed to load notification messages');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const resetForm = () => {
    setNotificationType('');
    setTitle('');
    setMessage('');
    setScheduleTime('');
    setRepeatPattern('daily');
    setIsEnabled(true);
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!notificationType || !title.trim() || !message.trim()) {
      toast.error('Notification type, title, and message are required');
      return;
    }

    setIsCreating(true);
    try {
      const result = await createNotificationMessage(
        notificationType,
        title.trim(),
        message.trim(),
        scheduleTime || undefined,
        repeatPattern || 'daily',
        isEnabled
      );

      if (result.success) {
        toast.success('Notification message created successfully');
        resetForm();
        loadMessages();
      } else {
        toast.error(result.error || 'Failed to create notification message');
      }
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Failed to create notification message');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    try {
      const result = await updateNotificationMessage(
        id,
        title.trim(),
        message.trim()
      );

      if (result.success) {
        toast.success('Notification message updated successfully');
        resetForm();
        loadMessages();
      } else {
        toast.error(result.error || 'Failed to update notification message');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update notification message');
    }
  };

  const handleActivate = async (id: string, type: string) => {
    try {
      const result = await activateNotificationMessage(id, type);
      if (result.success) {
        toast.success('Notification message activated');
        loadMessages();
      } else {
        toast.error(result.error || 'Failed to activate notification message');
      }
    } catch (error) {
      console.error('Activate error:', error);
      toast.error('Failed to activate notification message');
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      const result = await deactivateNotificationMessage(id);
      if (result.success) {
        toast.success('Notification message deactivated');
        loadMessages();
      } else {
        toast.error(result.error || 'Failed to deactivate notification message');
      }
    } catch (error) {
      console.error('Deactivate error:', error);
      toast.error('Failed to deactivate notification message');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification message?')) {
      return;
    }

    try {
      const result = await deleteNotificationMessage(id);
      if (result.success) {
        toast.success('Notification message deleted');
        loadMessages();
      } else {
        toast.error(result.error || 'Failed to delete notification message');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete notification message');
    }
  };

  const startEdit = (msg: NotificationMessage) => {
    setEditingId(msg.id);
    setNotificationType(msg.notification_type);
    setTitle(msg.title);
    setMessage(msg.message);
    setScheduleTime(msg.schedule_time || '');
    setRepeatPattern(msg.repeat_pattern || 'daily');
    setIsEnabled(msg.is_enabled !== false);
  };

  const cancelEdit = () => {
    resetForm();
  };

  const getTypeLabel = (type: string) => {
    const typeObj = NOTIFICATION_TYPES.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  };

  const getScheduleInfo = (type: string) => {
    const scheduleMap: Record<string, { defaultTime: string; defaultRepeat: string; description: string }> = {
      'good_morning': { 
        defaultTime: '07:00', 
        defaultRepeat: 'daily', 
        description: 'Sent every morning at 7 AM in user\'s timezone' 
      },
      'good_night': { 
        defaultTime: '20:00', 
        defaultRepeat: 'daily', 
        description: 'Sent every evening at 8 PM or after dinner time' 
      },
      'water_reminder': { 
        defaultTime: '12:00', 
        defaultRepeat: 'daily', 
        description: 'Sent at noon daily for hydration reminder' 
      },
      'meal_reminder_breakfast': { 
        defaultTime: '08:00', 
        defaultRepeat: 'daily', 
        description: 'Sent at breakfast time if meal not logged' 
      },
      'meal_reminder_snack1': { 
        defaultTime: '10:30', 
        defaultRepeat: 'daily', 
        description: 'Sent at morning snack time if not logged' 
      },
      'meal_reminder_lunch': { 
        defaultTime: '13:00', 
        defaultRepeat: 'daily', 
        description: 'Sent at lunch time if meal not logged' 
      },
      'meal_reminder_snack2': { 
        defaultTime: '16:00', 
        defaultRepeat: 'daily', 
        description: 'Sent at afternoon snack time if not logged' 
      },
      'meal_reminder_dinner': { 
        defaultTime: '19:00', 
        defaultRepeat: 'daily', 
        description: 'Sent at dinner time if meal not logged' 
      },
      'weekly_measurement_reminder': { 
        defaultTime: '10:00', 
        defaultRepeat: 'weekly', 
        description: 'Sent every Saturday at 10 AM' 
      },
      'weekly_weight_reminder': { 
        defaultTime: '09:00', 
        defaultRepeat: 'weekly', 
        description: 'Sent every Saturday at 9 AM' 
      },
      'membership_expiring': { 
        defaultTime: '09:00', 
        defaultRepeat: 'daily', 
        description: 'Sent when membership is about to expire' 
      },
      'membership_expired': { 
        defaultTime: '09:00', 
        defaultRepeat: 'daily', 
        description: 'Sent when membership has expired' 
      },
      'feedback_request': { 
        defaultTime: '18:00', 
        defaultRepeat: 'weekly', 
        description: 'Weekly feedback request' 
      }
    };
    return scheduleMap[type] || { defaultTime: '', defaultRepeat: 'daily', description: 'Custom scheduling' };
  };

  // Auto-fill scheduling when notification type changes
  useEffect(() => {
    if (notificationType && !editingId) {
      const scheduleInfo = getScheduleInfo(notificationType);
      setScheduleTime(scheduleInfo.defaultTime);
      setRepeatPattern(scheduleInfo.defaultRepeat);
    }
  }, [notificationType, editingId]);

  const insertPlaceholder = (placeholder: string, field: 'title' | 'message') => {
    if (field === 'title') {
      setTitle(prev => prev + placeholder);
    } else {
      // Try to insert at cursor position in message textarea
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = message.substring(0, start) + placeholder + message.substring(end);
        setMessage(newValue);
        // Set cursor position after inserted placeholder
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
        }, 0);
      } else {
        // Fallback: append to end of message
        setMessage(prev => prev + placeholder);
      }
    }
  };

  // Group messages by type
  const messagesByType = messages.reduce((acc, msg) => {
    if (!acc[msg.notification_type]) {
      acc[msg.notification_type] = [];
    }
    acc[msg.notification_type].push(msg);
    return acc;
  }, {} as Record<string, NotificationMessage[]>);

  return (
    <>
      <div className="mb-4 md:mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="h-5 w-5 md:h-6 md:w-6 text-blue-400" />
          <h1 className="text-xl md:text-2xl font-bold">Notification Messages</h1>
        </div>
        <p className="text-sm text-default-500">
          Manage notification messages used by cron jobs. Only one message per type can be active.
        </p>
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-xs md:text-sm text-amber-800 dark:text-amber-300">
            ⏰ <strong>Timezone Notice:</strong> All notification times are based on each user's individual timezone settings. 
            The system automatically adjusts delivery times to match user preferences.
          </p>
        </div>
      </div>

      {/* Create/Edit Form */}
      <Card className="p-4 md:p-6 mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl font-semibold mb-4">
          {editingId ? 'Edit Notification Message' : 'Create New Notification Message'}
        </h2>
        <div className="space-y-4">
          <TextField value={notificationType} onChange={setNotificationType} isRequired>
            <Label className="text-sm font-medium">Notification Type</Label>
            <select 
              className="w-full px-3 py-2 text-sm border border-default-300 rounded-lg bg-default-100 text-default-900 dark:bg-default-50 dark:text-default-900 dark:border-default-600 focus:ring-2 focus:ring-primary focus:border-primary"
              value={notificationType}
              onChange={(e) => setNotificationType(e.target.value)}
              disabled={!!editingId}
            >
              <option value="">Select notification type</option>
              {NOTIFICATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {notificationType && (
              <div className="text-xs text-default-600 dark:text-default-400 mt-1">
                📋 {getScheduleInfo(notificationType).description}
              </div>
            )}
          </TextField>

          <TextField value={title} onChange={setTitle} isRequired>
            <Label className="text-sm font-medium">Title</Label>
            <Input placeholder="e.g., 🌅 Good Morning!" className="text-sm" />
          </TextField>

          <TextField value={message} onChange={setMessage} isRequired>
            <Label className="text-sm font-medium">Message</Label>
            <TextArea 
              placeholder="e.g., Good morning {name}! Ready to start your wellness journey today?" 
              rows={3}
              className="text-sm"
            />
          </TextField>

          {/* Scheduling Section */}
          <div className="border-t pt-4">
            <h3 className="text-base md:text-lg font-medium mb-4 text-default-900 dark:text-default-100">
              📅 Scheduling Settings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField value={scheduleTime} onChange={setScheduleTime}>
                <Label className="text-sm font-medium">Schedule Time (Optional)</Label>
                <Input 
                  type="time"
                  placeholder="e.g., 07:00"
                  className="text-sm"
                />
                <div className="text-xs text-default-500 mt-1">
                  Time when notification should be sent (user's timezone)
                </div>
              </TextField>

              <TextField value={repeatPattern} onChange={setRepeatPattern}>
                <Label className="text-sm font-medium">Repeat Pattern</Label>
                <select 
                  className="w-full px-3 py-2 text-sm border border-default-300 rounded-lg bg-default-100 text-default-900 dark:bg-default-50 dark:text-default-900 dark:border-default-600 focus:ring-2 focus:ring-primary focus:border-primary"
                  value={repeatPattern}
                  onChange={(e) => setRepeatPattern(e.target.value)}
                >
                  <option value="">Select repeat pattern</option>
                  <option value="daily">Daily - Every day at specified time</option>
                  <option value="weekly">Weekly - Every week (e.g., Sundays)</option>
                  <option value="monthly">Monthly - Once per month</option>
                  <option value="hourly">Hourly - Every hour during active hours</option>
                  <option value="once">One Time Only - Single notification</option>
                </select>
                <div className="text-xs text-default-500 mt-1">
                  How often this notification should repeat
                </div>
              </TextField>
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="rounded border-default-300 text-primary focus:ring-primary dark:bg-default-100 dark:border-default-600"
                />
                <span className="text-sm text-default-700 dark:text-default-300">
                  Enable this notification schedule
                </span>
              </label>
            </div>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2 text-sm">📋 Repeat Pattern Examples:</h4>
              <div className="text-xs md:text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <div>• <strong>Daily:</strong> Good morning/night notifications (every day at set time)</div>
                <div>• <strong>Weekly:</strong> Measurement reminders (every Sunday at 10 AM)</div>
                <div>• <strong>Monthly:</strong> Progress reports (first day of each month)</div>
                <div>• <strong>Hourly:</strong> Water reminders (every 2 hours during active hours)</div>
                <div>• <strong>One Time:</strong> Special announcements or updates</div>
              </div>
            </div>
          </div>

          <div className="p-3 md:p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2 text-sm">Available Placeholders:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm mb-3">
              {[
                { placeholder: '{name}', description: 'User\'s first name' },
                { placeholder: '{mealsCompleted}', description: 'Number of completed meals' },
                { placeholder: '{currentTime}', description: 'Current time in user timezone' },
                { placeholder: '{daysLeft}', description: 'Days remaining (membership)' },
                { placeholder: '{mealTime}', description: 'Specific meal time' }
              ].map(({ placeholder, description }) => (
                <button
                  key={placeholder}
                  type="button"
                  onClick={() => insertPlaceholder(placeholder, 'message')}
                  className="bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800/70 px-2 py-2 rounded border border-blue-300 dark:border-blue-700 transition-colors cursor-pointer text-left"
                  title={`Click to insert ${placeholder} - ${description}`}
                >
                  <code className="text-xs font-mono text-blue-800 dark:text-blue-200 block">{placeholder}</code>
                  <span className="text-xs text-blue-600 dark:text-blue-400 mt-1 block">{description}</span>
                </button>
              ))}
            </div>
            <p className="text-xs md:text-sm text-blue-700 dark:text-blue-400">
              Click any placeholder above to insert it into your message. Placeholders will be replaced with actual user data when notifications are sent.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {editingId ? (
              <>
                <Button
                  variant="primary"
                  onPress={() => handleUpdate(editingId)}
                  className="w-full sm:w-auto"
                >
                  Update Message
                </Button>
                <Button
                  variant="secondary"
                  onPress={cancelEdit}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                onPress={handleCreate}
                isDisabled={isCreating}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isCreating ? 'Creating...' : 'Create Message'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Messages List */}
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-lg md:text-xl font-semibold">All Notification Messages</h2>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : Object.keys(messagesByType).length === 0 ? (
          <Card className="p-8 md:p-12 text-center">
            <Bell className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-3 text-default-400" />
            <p className="text-default-400 text-sm md:text-base">No notification messages yet. Create your first one!</p>
          </Card>
        ) : (
          Object.entries(messagesByType).map(([type, typeMessages]) => (
            <Card key={type} className="p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold mb-4">{getTypeLabel(type)}</h3>
              <div className="space-y-3">
                {typeMessages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`p-3 md:p-4 border rounded-lg ${msg.is_active ? 'border-2 border-green-500 bg-green-50 dark:bg-green-950/20' : 'bg-default-50 dark:bg-default-100/50'}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                          <h4 className="font-medium text-default-900 dark:text-default-100 text-sm md:text-base wrap-break-word">{msg.title}</h4>
                          {msg.is_active && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-600 dark:text-green-400 rounded w-fit">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-default-600 dark:text-default-400 mb-2 wrap-break-word">{msg.message}</p>
                        <div className="text-xs text-default-500 dark:text-default-500">
                          Created: {new Date(msg.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col lg:flex-row gap-2 shrink-0">
                        {msg.is_active ? (
                          <Button
                            size="sm"
                            className="bg-red-600 text-white hover:bg-red-700 min-w-0"
                            onPress={() => handleDeactivate(msg.id)}
                          >
                            <PowerOff className="h-3 w-3 md:h-4 md:w-4" />
                            <span className="hidden sm:inline ml-1">Deactivate</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-green-600 text-white hover:bg-green-700 min-w-0"
                            onPress={() => handleActivate(msg.id, msg.notification_type)}
                          >
                            <Power className="h-3 w-3 md:h-4 md:w-4" />
                            <span className="hidden sm:inline ml-1">Activate</span>
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onPress={() => startEdit(msg)}
                          className="min-w-0"
                        >
                          <Edit className="h-3 w-3 md:h-4 md:w-4" />
                          <span className="hidden sm:inline ml-1">Edit</span>
                        </Button>
                        
                        <Button
                          size="sm"
                          className="bg-red-600 text-white hover:bg-red-700 min-w-0"
                          onPress={() => handleDelete(msg.id)}
                        >
                          <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                          <span className="hidden sm:inline ml-1">Delete</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
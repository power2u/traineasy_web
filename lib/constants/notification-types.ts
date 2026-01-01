export const NOTIFICATION_TYPES = [
  {
    value: 'good_morning',
    label: '🌅 Good Morning',
    description: 'Daily morning greeting'
  },
  {
    value: 'good_night',
    label: '🌙 Good Night',
    description: 'Daily evening message'
  },
  {
    value: 'water_reminder',
    label: '💧 Water Reminder',
    description: 'Hydration reminders'
  },
  {
    value: 'meal_reminder_breakfast',
    label: '🍳 Breakfast Reminder',
    description: 'Morning meal reminder'
  },
  {
    value: 'meal_reminder_snack1',
    label: '🍎 Morning Snack',
    description: 'Mid-morning snack reminder'
  },
  {
    value: 'meal_reminder_lunch',
    label: '🍱 Lunch Reminder',
    description: 'Afternoon meal reminder'
  },
  {
    value: 'meal_reminder_snack2',
    label: '🥤 Afternoon Snack',
    description: 'Afternoon snack reminder'
  },
  {
    value: 'meal_reminder_dinner',
    label: '🍽️ Dinner Reminder',
    description: 'Evening meal reminder'
  },
  {
    value: 'weekly_weight_reminder',
    label: '⚖️ Weekly Weight Check',
    description: 'Weekly weight tracking reminder'
  },
  {
    value: 'weekly_measurement_reminder',
    label: '📏 Weekly Measurements',
    description: 'Weekly body measurements reminder'
  },
  {
    value: 'membership_expiring',
    label: '⏰ Membership Expiring',
    description: 'Membership expiration warning'
  },
  {
    value: 'membership_expired',
    label: '❌ Membership Expired',
    description: 'Membership expired notification'
  },
  {
    value: 'feedback_request',
    label: '📝 Feedback Request',
    description: 'Request user feedback'
  }
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number]['value'];
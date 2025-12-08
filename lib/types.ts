// Authentication Types
export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  banned_until?: string;
  provider: 'email' | 'phone' | 'google';
  createdAt: Date;
  displayName?: string;
  raw_app_meta_data?: {
    role?: string;
    provider?: string;
    providers?: string[];
  };
  raw_user_meta_data?: {
    role?: string;
    display_name?: string;
    full_name?: string;
    [key: string]: any;
  };
}

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (provider: AuthProvider, credentials: AuthCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

export type AuthProvider = 'email' | 'phone' | 'google';

export interface AuthCredentials {
  email?: string;
  password?: string;
  phone?: string;
  code?: string;
}

// Water Intake Types
export interface WaterIntakeEntry {
  id: string;
  userId: string;
  timestamp: Date;
  glassCount: number;
  createdAt: Date;
}

export interface DailyWaterSummary {
  date: Date;
  totalGlasses: number;
  entries: WaterIntakeEntry[];
}

// Meals Types
export interface MealsEntry {
  id: string;
  userId: string;
  date: Date;
  breakfastCompleted: boolean;
  breakfastTime?: Date;
  lunchCompleted: boolean;
  lunchTime?: Date;
  dinnerCompleted: boolean;
  dinnerTime?: Date;
  snackCompleted: boolean;
  snackTime?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MealReminder {
  id: string;
  userId: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  reminderTime: string;
  isActive: boolean;
  createdAt: Date;
}

// Weight Tracking Types
export interface WeightLog {
  id: string;
  userId: string;
  weight: number;
  unit: 'kg' | 'lbs';
  date: Date;
  notes?: string;
  createdAt: Date;
}

export interface WeightTrend {
  weekStart: Date;
  weekEnd: Date;
  entries: WeightLog[];
  averageWeight: number;
  changeFromPreviousWeek: number | null;
}

// Dashboard Types
export interface DashboardData {
  waterIntake: DailyWaterSummary;
  mealsEntry: MealsEntry | null;
  latestWeight: WeightLog | null;
  upcomingReminders: MealReminder[];
  lastUpdated: Date;
}

// PWA Types
export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  table: 'water_intake' | 'meals' | 'weight_logs';
  data: any;
  timestamp: Date;
  retryCount: number;
}

export interface PWAState {
  isInstalled: boolean;
  isOnline: boolean;
  syncQueue: SyncQueueItem[];
  canInstall: boolean;
}

// User Profile Types
export interface UserProfile {
  id: string;
  displayName?: string;
  preferredUnit: 'kg' | 'lbs';
  goalWeight?: number;
  goalWeightUnit?: 'kg' | 'lbs';
  heightCm?: number;
  dateOfBirth?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Body Measurements Types
export type MeasurementType =
  | 'weight'
  | 'biceps_left'
  | 'biceps_right'
  | 'chest'
  | 'waist'
  | 'hips'
  | 'thighs_left'
  | 'thighs_right'
  | 'calves_left'
  | 'calves_right'
  | 'forearms_left'
  | 'forearms_right'
  | 'shoulders'
  | 'neck';

export interface BodyMeasurement {
  id: string;
  user_id: string;
  measurement_type: MeasurementType;
  value: number;
  unit: 'kg' | 'lbs' | 'cm' | 'in';
  date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MeasurementGoal {
  value: number;
  unit: 'kg' | 'lbs' | 'cm' | 'in';
}

export const MEASUREMENT_LABELS: Record<MeasurementType, string> = {
  weight: 'Weight',
  biceps_left: 'Left Bicep',
  biceps_right: 'Right Bicep',
  chest: 'Chest',
  waist: 'Waist',
  hips: 'Hips',
  thighs_left: 'Left Thigh',
  thighs_right: 'Right Thigh',
  calves_left: 'Left Calf',
  calves_right: 'Right Calf',
  forearms_left: 'Left Forearm',
  forearms_right: 'Right Forearm',
  shoulders: 'Shoulders',
  neck: 'Neck',
};

export const MUSCLE_MEASUREMENTS: MeasurementType[] = [
  'biceps_left',
  'biceps_right',
  'chest',
  'thighs_left',
  'thighs_right',
  'calves_left',
  'calves_right',
  'forearms_left',
  'forearms_right',
  'shoulders',
];

// Weight Statistics Types
export interface WeightStatistics {
  totalLogs: number;
  lowestWeight: number;
  highestWeight: number;
  averageWeight: number;
  firstLogDate: Date;
  lastLogDate: Date;
  currentWeight?: number;
  goalWeight?: number;
  progressPercentage?: number;
  weeklyAverage?: number;
  monthlyAverage?: number;
  bmi?: number;
}

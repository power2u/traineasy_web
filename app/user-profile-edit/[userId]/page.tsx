'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, Button, Spinner, Chip, TextField, Label, Input, Select, ListBox } from '@heroui/react';
import { ArrowLeft, Save, Edit, User, Mail, Calendar, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  // Personal information
  date_of_birth?: string;
  phone?: string;
  blood_group?: string;
  height_cm?: number;
  goal_weight?: number;
  goal_weight_unit?: string;
  // Settings
  preferred_unit?: string;
  theme?: string;
  timezone: string;
  daily_water_target?: number;
  glass_size_ml?: number;
  // Notifications
  notifications_enabled: boolean;
  meal_reminders_enabled: boolean;
  water_reminders_enabled?: boolean;
  weight_reminders_enabled?: boolean;
  // Meal timing
  meal_times_configured: boolean;
  breakfast_time?: string;
  snack1_time?: string;
  lunch_time?: string;
  snack2_time?: string;
  dinner_time?: string;
  // System fields
  created_at: string;
  last_sign_in_at?: string;
}

export default function UserProfileEditPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});

  useEffect(() => {
    if (user) {
      const role = user.raw_app_meta_data?.role || user.raw_user_meta_data?.role;
      const isSuperAdmin = role === 'super_admin';
      
      if (!isSuperAdmin) {
        router.push('/dashboard');
      } else {
        loadUserProfile();
      }
    }
  }, [user, userId, router]);

  const loadUserProfile = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('API Error Response:', data);
        throw new Error(data.error || 'Failed to load user profile');
      }
      
      setUserProfile(data.user);
      setEditedProfile(data.user);
    } catch (error: any) {
      console.error('Error loading user profile:', error);
      setError(error.message || 'Failed to load user profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editedProfile || !userProfile) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedProfile),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setUserProfile(data.user);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedProfile(userProfile || {});
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-2">{error}</p>
        <p className="text-default-500 mb-4 text-sm">User ID: {userId}</p>
        <div className="flex gap-2 justify-center">
          <Button onPress={() => router.push(`/user-details/${userId}`)}>Go Back</Button>
          <Button variant="ghost" onPress={() => loadUserProfile()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-default-500 mb-4">User profile not found</p>
        <Button onPress={() => router.push(`/user-details/${userId}`)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onPress={() => router.push(`/user-details/${userId}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to User Details
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                onPress={handleCancelEdit}
                isDisabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onPress={handleSaveProfile}
                isDisabled={isSaving}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isSaving ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button
              onPress={() => setIsEditing(true)}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Profile Header */}
      <Card className="p-6">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{userProfile.full_name || 'Unnamed User'}</h1>
            <div className="flex items-center gap-2 mt-2 text-default-500">
              <Mail className="w-4 h-4" />
              <span>{userProfile.email}</span>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <Chip className="bg-blue-100 text-blue-800">
                ID: {userProfile.id.slice(0, 8)}...
              </Chip>
              {userProfile.notifications_enabled && (
                <Chip className="bg-green-100 text-green-800">
                  Notifications Enabled
                </Chip>
              )}
              {userProfile.meal_reminders_enabled && (
                <Chip className="bg-orange-100 text-orange-800">
                  Meal Reminders On
                </Chip>
              )}
            </div>
          </div>
          
          <div className="text-right text-sm text-default-500">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4" />
              <span>Joined {new Date(userProfile.created_at).toLocaleDateString()}</span>
            </div>
            {userProfile.last_sign_in_at && (
              <div>Last active: {new Date(userProfile.last_sign_in_at).toLocaleDateString()}</div>
            )}
          </div>
        </div>
      </Card>

      {/* Personal Information */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TextField>
            <Label>Full Name</Label>
            {isEditing ? (
              <Input
                value={editedProfile.full_name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setEditedProfile(prev => ({ ...prev, full_name: e.target.value }))
                }
              />
            ) : (
              <div className="px-3 py-2 bg-default-100 rounded-lg">
                {userProfile.full_name || 'Not set'}
              </div>
            )}
          </TextField>

          <TextField>
            <Label>Email</Label>
            <div className="px-3 py-2 bg-default-100 rounded-lg text-default-500">
              {userProfile.email} (Cannot be changed)
            </div>
          </TextField>

          <TextField>
            <Label>Phone</Label>
            {isEditing ? (
              <Input
                value={editedProfile.phone || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setEditedProfile(prev => ({ ...prev, phone: e.target.value }))
                }
              />
            ) : (
              <div className="px-3 py-2 bg-default-100 rounded-lg">
                {userProfile.phone || 'Not set'}
              </div>
            )}
          </TextField>

          <TextField>
            <Label>Blood Group</Label>
            {isEditing ? (
              <Select 
                className="w-full" 
                placeholder="Select blood group"
                selectedKey={editedProfile.blood_group || ''}
                onSelectionChange={(key) => setEditedProfile(prev => ({ ...prev, blood_group: key as string }))}
              >
                <Label>Blood Group</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="" textValue="Not set">
                      Not set
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="A+" textValue="A+">
                      A+
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="A-" textValue="A-">
                      A-
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="B+" textValue="B+">
                      B+
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="B-" textValue="B-">
                      B-
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="AB+" textValue="AB+">
                      AB+
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="AB-" textValue="AB-">
                      AB-
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="O+" textValue="O+">
                      O+
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="O-" textValue="O-">
                      O-
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            ) : (
              <div className="px-3 py-2 bg-default-100 rounded-lg">
                {userProfile.blood_group || 'Not set'}
              </div>
            )}
          </TextField>

          <TextField>
            <Label>Height (cm)</Label>
            {isEditing ? (
              <Input
                type="number"
                value={editedProfile.height_cm?.toString() || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setEditedProfile(prev => ({ ...prev, height_cm: e.target.value ? parseInt(e.target.value) : undefined }))
                }
              />
            ) : (
              <div className="px-3 py-2 bg-default-100 rounded-lg">
                {userProfile.height_cm ? `${userProfile.height_cm} cm` : 'Not set'}
              </div>
            )}
          </TextField>

          <TextField>
            <Label>Goal Weight</Label>
            {isEditing ? (
              <Input
                type="number"
                step="0.1"
                value={editedProfile.goal_weight?.toString() || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setEditedProfile(prev => ({ ...prev, goal_weight: e.target.value ? parseFloat(e.target.value) : undefined }))
                }
              />
            ) : (
              <div className="px-3 py-2 bg-default-100 rounded-lg">
                {userProfile.goal_weight ? `${userProfile.goal_weight} ${userProfile.goal_weight_unit || 'kg'}` : 'Not set'}
              </div>
            )}
          </TextField>
        </div>
      </Card>

      {/* Settings */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TextField>
            <Label>Water Target (glasses)</Label>
            {isEditing ? (
              <Input
                type="number"
                value={editedProfile.daily_water_target?.toString() || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setEditedProfile(prev => ({ ...prev, daily_water_target: e.target.value ? parseInt(e.target.value) : undefined }))
                }
              />
            ) : (
              <div className="px-3 py-2 bg-default-100 rounded-lg">
                {userProfile.daily_water_target ? `${userProfile.daily_water_target} glasses` : 'Not set'}
              </div>
            )}
          </TextField>

          <TextField>
            <Label>Glass Size (ml)</Label>
            {isEditing ? (
              <Input
                type="number"
                value={editedProfile.glass_size_ml?.toString() || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setEditedProfile(prev => ({ ...prev, glass_size_ml: e.target.value ? parseInt(e.target.value) : undefined }))
                }
              />
            ) : (
              <div className="px-3 py-2 bg-default-100 rounded-lg">
                {userProfile.glass_size_ml ? `${userProfile.glass_size_ml} ml` : 'Not set'}
              </div>
            )}
          </TextField>

          <TextField>
            <Label>Timezone</Label>
            {isEditing ? (
              <Select 
                className="w-full" 
                placeholder="Select timezone"
                selectedKey={editedProfile.timezone || 'Asia/Kolkata'}
                onSelectionChange={(key) => setEditedProfile(prev => ({ ...prev, timezone: key as string }))}
              >
                <Label>Timezone</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="Asia/Kolkata" textValue="Asia/Kolkata">
                      Asia/Kolkata
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="America/New_York" textValue="America/New_York">
                      America/New_York
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="Europe/London" textValue="Europe/London">
                      Europe/London
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="Asia/Tokyo" textValue="Asia/Tokyo">
                      Asia/Tokyo
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="Australia/Sydney" textValue="Australia/Sydney">
                      Australia/Sydney
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            ) : (
              <div className="px-3 py-2 bg-default-100 rounded-lg flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {userProfile.timezone || 'Asia/Kolkata'}
              </div>
            )}
          </TextField>

          <TextField>
            <Label>Preferred Unit</Label>
            {isEditing ? (
              <Select 
                className="w-full" 
                placeholder="Select unit"
                selectedKey={editedProfile.preferred_unit || 'kg'}
                onSelectionChange={(key) => setEditedProfile(prev => ({ ...prev, preferred_unit: key as string }))}
              >
                <Label>Preferred Unit</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="kg" textValue="Kilograms (kg)">
                      Kilograms (kg)
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="lbs" textValue="Pounds (lbs)">
                      Pounds (lbs)
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            ) : (
              <div className="px-3 py-2 bg-default-100 rounded-lg">
                {userProfile.preferred_unit === 'lbs' ? 'Pounds (lbs)' : 'Kilograms (kg)'}
              </div>
            )}
          </TextField>

          <TextField>
            <Label>Theme Preference</Label>
            {isEditing ? (
              <Select 
                className="w-full" 
                placeholder="Select theme"
                selectedKey={editedProfile.theme || 'dark'}
                onSelectionChange={(key) => setEditedProfile(prev => ({ ...prev, theme: key as string }))}
              >
                <Label>Theme</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="dark" textValue="Dark">
                      Dark
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="light" textValue="Light">
                      Light
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="system" textValue="System">
                      System
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            ) : (
              <div className="px-3 py-2 bg-default-100 rounded-lg">
                {userProfile.theme ? userProfile.theme.charAt(0).toUpperCase() + userProfile.theme.slice(1) : 'Dark'}
              </div>
            )}
          </TextField>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Notification Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-default-50 rounded-lg">
            <div>
              <div className="font-medium">Push Notifications</div>
              <div className="text-sm text-default-500">Receive general app notifications</div>
            </div>
            {isEditing ? (
              <input
                type="checkbox"
                checked={editedProfile.notifications_enabled || false}
                onChange={(e) => setEditedProfile(prev => ({ ...prev, notifications_enabled: e.target.checked }))}
                className="w-5 h-5"
              />
            ) : (
              <Chip className={userProfile.notifications_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {userProfile.notifications_enabled ? 'Enabled' : 'Disabled'}
              </Chip>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-default-50 rounded-lg">
            <div>
              <div className="font-medium">Meal Reminders</div>
              <div className="text-sm text-default-500">Get reminded about meal times</div>
            </div>
            {isEditing ? (
              <input
                type="checkbox"
                checked={editedProfile.meal_reminders_enabled || false}
                onChange={(e) => setEditedProfile(prev => ({ ...prev, meal_reminders_enabled: e.target.checked }))}
                className="w-5 h-5"
              />
            ) : (
              <Chip className={userProfile.meal_reminders_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {userProfile.meal_reminders_enabled ? 'Enabled' : 'Disabled'}
              </Chip>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-default-50 rounded-lg">
            <div>
              <div className="font-medium">Water Reminders</div>
              <div className="text-sm text-default-500">Get reminded to drink water</div>
            </div>
            {isEditing ? (
              <input
                type="checkbox"
                checked={editedProfile.water_reminders_enabled || false}
                onChange={(e) => setEditedProfile(prev => ({ ...prev, water_reminders_enabled: e.target.checked }))}
                className="w-5 h-5"
              />
            ) : (
              <Chip className={userProfile.water_reminders_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {userProfile.water_reminders_enabled ? 'Enabled' : 'Disabled'}
              </Chip>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-default-50 rounded-lg">
            <div>
              <div className="font-medium">Weight Reminders</div>
              <div className="text-sm text-default-500">Get reminded to log weight</div>
            </div>
            {isEditing ? (
              <input
                type="checkbox"
                checked={editedProfile.weight_reminders_enabled || false}
                onChange={(e) => setEditedProfile(prev => ({ ...prev, weight_reminders_enabled: e.target.checked }))}
                className="w-5 h-5"
              />
            ) : (
              <Chip className={userProfile.weight_reminders_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {userProfile.weight_reminders_enabled ? 'Enabled' : 'Disabled'}
              </Chip>
            )}
          </div>
        </div>
      </Card>

      {/* Meal Timing Schedule */}
      {userProfile.meal_times_configured && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Meal Timing Schedule</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { key: 'breakfast_time', label: 'Breakfast' },
              { key: 'snack1_time', label: 'Morning Snack' },
              { key: 'lunch_time', label: 'Lunch' },
              { key: 'snack2_time', label: 'Afternoon Snack' },
              { key: 'dinner_time', label: 'Dinner' }
            ].map(({ key, label }) => {
              const timeValue = userProfile[key as keyof UserProfile] as string;
              if (!timeValue) return null;
              
              return (
                <div key={key} className="text-center p-4 bg-default-100 rounded-lg">
                  <div className="text-sm text-default-500 mb-1">{label}</div>
                  <div className="font-medium">{timeValue}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
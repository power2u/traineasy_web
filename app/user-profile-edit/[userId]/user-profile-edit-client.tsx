'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card, Button, Spinner, Chip, TextField, Label, Input, Select, ListBox } from '@heroui/react';
import { ArrowLeft, Save, Edit, User, Mail, Calendar, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { updateAdminUserProfile } from '@/app/actions/admin-details';

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

interface UserProfileEditClientProps {
    userId: string;
    initialProfile: UserProfile;
}

export function UserProfileEditClient({ userId, initialProfile }: UserProfileEditClientProps) {
    const router = useRouter();
    const [userProfile, setUserProfile] = useState<UserProfile>(initialProfile);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>(initialProfile);

    const handleSaveProfile = async () => {
        if (!editedProfile || !userProfile) return;

        setIsSaving(true);
        try {
            const result = await updateAdminUserProfile(userId, editedProfile);

            if (!result.success) {
                throw new Error(result.error);
            }

            // Merge the updated fields back into the local state
            const updatedUser = { ...userProfile, ...result.user };

            setUserProfile(updatedUser);
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
        setEditedProfile(userProfile);
        setIsEditing(false);
    };

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
                            <Chip className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                ID: {userProfile.id.slice(0, 8)}...
                            </Chip>
                            {userProfile.notifications_enabled && (
                                <Chip className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                                    Notifications Enabled
                                </Chip>
                            )}
                            {userProfile.meal_reminders_enabled && (
                                <Chip className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
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
                            <Chip className={userProfile.notifications_enabled ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}>
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
                            <Chip className={userProfile.meal_reminders_enabled ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}>
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
                            <Chip className={userProfile.water_reminders_enabled ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}>
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
                            <Chip className={userProfile.weight_reminders_enabled ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}>
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

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card, Button, Spinner, Chip, TextField, Label, Input, Select, ListBox } from '@heroui/react';
import { ArrowLeft, Save, Edit, User, Mail, Calendar, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { updateAdminUserProfile } from '@/app/actions/admin-details';
import { COMMON_TIMEZONES } from '@/lib/utils/timezone';

interface UserProfile {
    id: string;
    email: string;
    fullName: string;
    // Personal information
    dateOfBirth?: Date | null;
    phone?: string | null;
    bloodGroup?: string | null;
    heightCm?: number | null; // Decimal in DB becomes number in JSON serialization
    goalWeight?: number | null;
    goalWeightUnit?: string | null;
    // Settings
    preferredUnit?: string | null;
    theme?: string | null;
    timezone?: string | null;
    dailyWaterTarget?: number | null;
    glassSizeMl?: number | null;
    // Notifications
    notificationsEnabled: boolean;
    mealRemindersEnabled: boolean;
    waterRemindersEnabled: boolean;
    weightRemindersEnabled: boolean;
    // Meal timing
    mealTimesConfigured: boolean;
    breakfastTime?: string | null;
    snack1Time?: string | null;
    lunchTime?: string | null;
    snack2Time?: string | null;
    dinnerTime?: string | null;
    // System fields
    createdAt: Date;
    lastSignInAt?: Date | null;
}

interface UserProfileEditClientProps {
    userId: string;
    initialData: any; // Accept any from server initially then cast/map
}

export function UserProfileEditClient({ userId, initialData }: UserProfileEditClientProps) {
    const router = useRouter();
    // Assuming initialData is now camelCase from server
    const [userProfile, setUserProfile] = useState<UserProfile>(initialData);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>(initialData);

    const handleSaveProfile = async () => {
        if (!editedProfile || !userProfile) return;

        setIsSaving(true);
        try {
            // editedProfile is partial UserProfile (camelCase)
            // updateAdminUserProfile expects something it can pass to Prisma (camelCase)
            const result = await updateAdminUserProfile(userId, editedProfile);

            if (!result.success) {
                throw new Error(result.error);
            }

            // Merge the updated fields back into the local state
            // Convert any Decimal fields to numbers for client-side compatibility
            const updatedUser = result.user ? {
                ...userProfile,
                ...result.user,
                heightCm: result.user.heightCm ? Number(result.user.heightCm) : null,
                goalWeight: result.user.goalWeight ? Number(result.user.goalWeight) : null,
            } : userProfile;

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
                        <h1 className="text-3xl font-bold">{userProfile.fullName || 'Unnamed User'}</h1>
                        <div className="flex items-center gap-2 mt-2 text-default-500">
                            <Mail className="w-4 h-4" />
                            <span>{userProfile.email}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-3">
                            <Chip className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                ID: {userProfile.id.slice(0, 8)}...
                            </Chip>
                            {userProfile.notificationsEnabled && (
                                <Chip className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                                    Notifications Enabled
                                </Chip>
                            )}
                            {userProfile.mealRemindersEnabled && (
                                <Chip className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
                                    Meal Reminders On
                                </Chip>
                            )}
                        </div>
                    </div>

                    <div className="text-right text-sm text-default-500">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4" />
                            <span>Joined {new Date(userProfile.createdAt).toLocaleDateString()}</span>
                        </div>
                        {userProfile.lastSignInAt && (
                            <div>Last active: {new Date(userProfile.lastSignInAt).toLocaleDateString()}</div>
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
                                value={editedProfile.fullName || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setEditedProfile(prev => ({ ...prev, fullName: e.target.value }))
                                }
                            />
                        ) : (
                            <div className="px-3 py-2 bg-default-100 rounded-lg">
                                {userProfile.fullName || 'Not set'}
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
                                selectedKey={editedProfile.bloodGroup || ''}
                                onSelectionChange={(key) => setEditedProfile(prev => ({ ...prev, bloodGroup: key as string }))}
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
                                {userProfile.bloodGroup || 'Not set'}
                            </div>
                        )}
                    </TextField>

                    <TextField>
                        <Label>Height (cm)</Label>
                        {isEditing ? (
                            <Input
                                type="number"
                                value={editedProfile.heightCm?.toString() || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setEditedProfile(prev => ({ ...prev, heightCm: e.target.value ? parseInt(e.target.value) : undefined }))
                                }
                            />
                        ) : (
                            <div className="px-3 py-2 bg-default-100 rounded-lg">
                                {userProfile.heightCm ? `${userProfile.heightCm} cm` : 'Not set'}
                            </div>
                        )}
                    </TextField>

                    <TextField>
                        <Label>Goal Weight</Label>
                        {isEditing ? (
                            <Input
                                type="number"
                                step="0.1"
                                value={editedProfile.goalWeight?.toString() || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setEditedProfile(prev => ({ ...prev, goalWeight: e.target.value ? parseFloat(e.target.value) : undefined }))
                                }
                            />
                        ) : (
                            <div className="px-3 py-2 bg-default-100 rounded-lg">
                                {userProfile.goalWeight ? `${userProfile.goalWeight} ${userProfile.goalWeightUnit || 'kg'}` : 'Not set'}
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
                                value={editedProfile.dailyWaterTarget?.toString() || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setEditedProfile(prev => ({ ...prev, dailyWaterTarget: e.target.value ? parseInt(e.target.value) : undefined }))
                                }
                            />
                        ) : (
                            <div className="px-3 py-2 bg-default-100 rounded-lg">
                                {userProfile.dailyWaterTarget ? `${userProfile.dailyWaterTarget} glasses` : 'Not set'}
                            </div>
                        )}
                    </TextField>

                    <TextField>
                        <Label>Glass Size (ml)</Label>
                        {isEditing ? (
                            <Input
                                type="number"
                                value={editedProfile.glassSizeMl?.toString() || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setEditedProfile(prev => ({ ...prev, glassSizeMl: e.target.value ? parseInt(e.target.value) : undefined }))
                                }
                            />
                        ) : (
                            <div className="px-3 py-2 bg-default-100 rounded-lg">
                                {userProfile.glassSizeMl ? `${userProfile.glassSizeMl} ml` : 'Not set'}
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
                                        {COMMON_TIMEZONES.map((tz) => (
                                            <ListBox.Item key={tz.value} id={tz.value} textValue={tz.label}>
                                                {tz.label}
                                                <ListBox.ItemIndicator />
                                            </ListBox.Item>
                                        ))}
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
                                selectedKey={editedProfile.preferredUnit || 'kg'}
                                onSelectionChange={(key) => setEditedProfile(prev => ({ ...prev, preferredUnit: key as string }))}
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
                                {userProfile.preferredUnit === 'lbs' ? 'Pounds (lbs)' : 'Kilograms (kg)'}
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
                                checked={editedProfile.notificationsEnabled || false}
                                onChange={(e) => setEditedProfile(prev => ({ ...prev, notificationsEnabled: e.target.checked }))}
                                className="w-5 h-5"
                            />
                        ) : (
                            <Chip className={userProfile.notificationsEnabled ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}>
                                {userProfile.notificationsEnabled ? 'Enabled' : 'Disabled'}
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
                                checked={editedProfile.mealRemindersEnabled || false}
                                onChange={(e) => setEditedProfile(prev => ({ ...prev, mealRemindersEnabled: e.target.checked }))}
                                className="w-5 h-5"
                            />
                        ) : (
                            <Chip className={userProfile.mealRemindersEnabled ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}>
                                {userProfile.mealRemindersEnabled ? 'Enabled' : 'Disabled'}
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
                                checked={editedProfile.waterRemindersEnabled || false}
                                onChange={(e) => setEditedProfile(prev => ({ ...prev, waterRemindersEnabled: e.target.checked }))}
                                className="w-5 h-5"
                            />
                        ) : (
                            <Chip className={userProfile.waterRemindersEnabled ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}>
                                {userProfile.waterRemindersEnabled ? 'Enabled' : 'Disabled'}
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
                                checked={editedProfile.weightRemindersEnabled || false}
                                onChange={(e) => setEditedProfile(prev => ({ ...prev, weightRemindersEnabled: e.target.checked }))}
                                className="w-5 h-5"
                            />
                        ) : (
                            <Chip className={userProfile.weightRemindersEnabled ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}>
                                {userProfile.weightRemindersEnabled ? 'Enabled' : 'Disabled'}
                            </Chip>
                        )}
                    </div>
                </div>
            </Card>

            {/* Meal Timing Schedule */}
            {userProfile.mealTimesConfigured && (
                <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-6">Meal Timing Schedule</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                            { key: 'breakfastTime', label: 'Breakfast' },
                            { key: 'snack1Time', label: 'Morning Snack' },
                            { key: 'lunchTime', label: 'Lunch' },
                            { key: 'snack2Time', label: 'Afternoon Snack' },
                            { key: 'dinnerTime', label: 'Dinner' }
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

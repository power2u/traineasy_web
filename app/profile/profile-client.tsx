'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useState } from 'react';
import { Button, Card, Spinner, TextField, Label, Input, TextArea } from '@heroui/react';
import { SelectField, BLOOD_GROUP_OPTIONS, WEIGHT_UNIT_OPTIONS, RELATIONSHIP_OPTIONS } from '@/components/ui/select-field';
import {
    updateProfile,
    type UserPreferences,
    type UserPlan
} from '@/app/actions/profile';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { MealTimingSettings, type MealTimes } from '@/components/profile/meal-timing-settings';
import { useRouter } from 'next/navigation';

interface ProfileClientProps {
    initialProfile: UserPreferences | null;
    initialPlan: UserPlan | null;
}

export function ProfileClient({ initialProfile, initialPlan }: ProfileClientProps) {
    const { user, signOut } = useAuth();
    const router = useRouter(); // To refresh page or navigate
    const [preferences, setPreferences] = useState<UserPreferences | null>(initialProfile);
    const [activePlan, setActivePlan] = useState<UserPlan | null>(initialPlan);

    // Use initial data to set state directly
    // All form fields (profile + preferences combined)
    const [fullName, setFullName] = useState(initialProfile?.full_name || '');
    const [dateOfBirth, setDateOfBirth] = useState(initialProfile?.date_of_birth ? new Date(initialProfile.date_of_birth).toISOString().split('T')[0] : '');
    const [phone, setPhone] = useState(initialProfile?.phone || '');
    const [bloodGroup, setBloodGroup] = useState(initialProfile?.blood_group || '');
    const [allergies, setAllergies] = useState(initialProfile?.allergies || '');
    const [medicalNotes, setMedicalNotes] = useState(initialProfile?.medical_notes || '');
    const [currentCondition, setCurrentCondition] = useState(initialProfile?.current_condition || '');
    const [emergencyContactName, setEmergencyContactName] = useState(initialProfile?.emergency_contact_name || '');
    const [emergencyContactPhone, setEmergencyContactPhone] = useState(initialProfile?.emergency_contact_phone || '');
    const [emergencyContactRelationship, setEmergencyContactRelationship] = useState(initialProfile?.emergency_contact_relationship || '');

    const [preferredUnit, setPreferredUnit] = useState<string>(initialProfile?.preferred_unit || 'kg');
    const [heightCm, setHeightCm] = useState(initialProfile?.height_cm?.toString() || '');
    const [goalWeight, setGoalWeight] = useState(initialProfile?.goal_weight?.toString() || '');
    const [goalWeightUnit, setGoalWeightUnit] = useState<string>(initialProfile?.goal_weight_unit || 'kg');
    const [glassSizeMl, setGlassSizeMl] = useState(initialProfile?.glass_size_ml?.toString() || '250');

    // Calculate initial daily water target (handle legacy ML values)
    const getInitialWaterTarget = () => {
        const rawTarget = initialProfile?.daily_water_target;
        if (!rawTarget) return '8';

        // If target is unrealistically high for a glass count (e.g. > 50), assume it's in ML
        if (rawTarget > 50) {
            const glassSize = initialProfile?.glass_size_ml || 250;
            return Math.ceil(rawTarget / glassSize).toString();
        }

        return rawTarget.toString();
    };

    const [dailyWaterTarget, setDailyWaterTarget] = useState(getInitialWaterTarget());

    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    const handleSave = async () => {
        if (!user) return;

        setIsSaving(true);
        setSaveMessage('');

        try {
            const dataToSave: Partial<UserPreferences> = {
                // Profile fields
                full_name: fullName || undefined,
                date_of_birth: dateOfBirth ? new Date(dateOfBirth) : undefined,
                phone: phone || undefined,
                blood_group: bloodGroup || undefined,
                allergies: allergies || undefined,
                medical_notes: medicalNotes || undefined,
                current_condition: currentCondition || undefined,
                emergency_contact_name: emergencyContactName || undefined,
                emergency_contact_phone: emergencyContactPhone || undefined,
                emergency_contact_relationship: emergencyContactRelationship || undefined,
                // Preference fields
                preferred_unit: preferredUnit,
                height_cm: heightCm ? parseFloat(heightCm) : undefined,
                goal_weight: goalWeight ? parseFloat(goalWeight) : undefined,
                goal_weight_unit: goalWeightUnit,
                daily_water_target: parseInt(dailyWaterTarget) || 8,
                glass_size_ml: parseInt(glassSizeMl) || 250,
            };

            console.log('Saving preferences:', dataToSave);

            // Save all data to user_preferences table (profile + preferences combined)
            const result = await updateProfile(user.id, dataToSave);

            console.log('Save result:', result);

            if (result.success) {
                setSaveMessage('Profile saved successfully!');
                setPreferences(prev => prev ? { ...prev, ...dataToSave } as UserPreferences : null);
                router.refresh();
                setTimeout(() => setSaveMessage(''), 3000);
            } else {
                setSaveMessage(`Failed to save profile: ${result.error || 'Unknown error'}`);
                console.error('Save error:', result.error);
            }
        } catch (error) {
            console.error('Save exception:', error);
            setSaveMessage('An error occurred');
        } finally {
            setIsSaving(false);
        }
    };

    const handleMealTimingSave = async (mealTimes: MealTimes) => {
        if (!user) return;

        try {
            const mealTimingData: Partial<UserPreferences> = {
                breakfast_time: mealTimes.breakfast_time,
                snack1_time: mealTimes.snack1_time,
                lunch_time: mealTimes.lunch_time,
                snack2_time: mealTimes.snack2_time,
                dinner_time: mealTimes.dinner_time,
                timezone: mealTimes.timezone,
                theme: mealTimes.theme || 'dark',
                meal_times_configured: true,
            };

            const result = await updateProfile(user.id, mealTimingData);

            if (result.success) {
                setPreferences(prev => prev ? { ...prev, ...mealTimingData } as UserPreferences : null);
                router.refresh();
            } else {
                throw new Error(result.error || 'Failed to save meal timing settings');
            }
        } catch (error) {
            console.error('Failed to save meal timing settings:', error);
            throw error; // Re-throw so the component can handle the error
        }
    };

    return (
        <>
            <div className="mb-3 md:mb-6">
                <h1 className="text-xl font-bold md:text-2xl">Profile & Medical Record</h1>
                <p className="text-xs text-default-500 mt-0.5 md:text-sm md:mt-1">Manage your personal and medical information</p>
            </div>

            {/* Active Plan Card */}
            {activePlan && (
                <Card className="p-3 mb-3 bg-blue-500/10 border border-blue-500/20 md:p-6 md:mb-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-blue-500">Active Plan</h3>
                            <p className="text-xl font-bold mt-2">{activePlan.planName}</p>
                            <p className="text-sm text-default-500 mt-1">
                                {new Date(activePlan.startDate).toLocaleDateString()} - {new Date(activePlan.endDate).toLocaleDateString()}
                            </p>
                            {activePlan.planNotes && (
                                <p className="text-sm text-default-400 mt-2">{activePlan.planNotes}</p>
                            )}
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-default-500">Days Remaining</div>
                            <div className="text-2xl font-bold text-blue-500">
                                {Math.max(0, Math.ceil((new Date(activePlan.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Personal Information */}
            <Card className="p-3 mb-3 md:p-6 md:mb-6">
                <h2 className="text-base font-semibold mb-3 md:text-xl md:mb-4">Personal Information</h2>
                <div className="space-y-3 md:space-y-4">
                    <TextField value={fullName} onChange={setFullName} isDisabled={isSaving}>
                        <Label>Full Name</Label>
                        <Input type="text" placeholder="John Doe" />
                    </TextField>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextField value={dateOfBirth} onChange={setDateOfBirth} isDisabled={isSaving}>
                            <Label>Date of Birth</Label>
                            <Input type="date" />
                        </TextField>

                        <TextField value={phone} onChange={setPhone} isDisabled={isSaving}>
                            <Label>Phone Number</Label>
                            <Input type="tel" placeholder="+1 234 567 8900" />
                        </TextField>
                    </div>

                </div>
            </Card>

            {/* Preferences */}
            <Card className="p-3 mb-3 md:p-6 md:mb-6">
                <h2 className="text-base font-semibold mb-3 md:text-xl md:mb-4">Preferences</h2>
                <div className="space-y-3 md:space-y-4">
                    <div>
                        <Label>Theme</Label>
                        <div className="mt-2">
                            <ThemeToggle />
                        </div>
                        <p className="text-xs text-default-500 mt-2">Choose your preferred color theme</p>
                    </div>

                    <SelectField
                        label="Preferred Weight Unit"
                        placeholder="Select unit"
                        options={WEIGHT_UNIT_OPTIONS}
                        value={preferredUnit}
                        onChange={(value) => setPreferredUnit(value as 'kg' | 'lbs')}
                        isDisabled={isSaving}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextField value={heightCm} onChange={setHeightCm} isDisabled={isSaving}>
                            <Label>Height (cm)</Label>
                            <Input type="number" placeholder="170" step="0.1" />
                        </TextField>

                        <div className="space-y-3">
                            <TextField value={goalWeight} onChange={setGoalWeight} isDisabled={isSaving}>
                                <Label>Goal Weight</Label>
                                <Input type="number" placeholder="70" step="0.1" />
                            </TextField>
                            <SelectField
                                label="Goal Weight Unit"
                                placeholder="Select unit"
                                options={[
                                    { key: 'kg', label: 'kg', value: 'kg' },
                                    { key: 'lbs', label: 'lbs', value: 'lbs' }
                                ]}
                                value={goalWeightUnit}
                                onChange={(value) => setGoalWeightUnit(value as 'kg' | 'lbs')}
                                isDisabled={isSaving}
                            />
                        </div>
                    </div>

                    {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextField value={dailyWaterTarget} onChange={setDailyWaterTarget} isDisabled={isSaving}>
                            <Label>Daily Water Target (glasses)</Label>
                            <Input type="number" placeholder="8" min="1" max="20" />
                        </TextField>

                        <TextField value={glassSizeMl} onChange={setGlassSizeMl} isDisabled={isSaving}>
                            <Label>Glass Size (ml)</Label>
                            <Input type="number" placeholder="250" step="50" />
                        </TextField>
                    </div> */}
                </div>
            </Card>

            {/* Meal Timing Settings */}
            <div className="mb-3 md:mb-6">
                <MealTimingSettings
                    userId={user?.id || ''}
                    initialMealTimes={preferences ? {
                        breakfast_time: preferences.breakfast_time || '08:00',
                        snack1_time: preferences.snack1_time || '10:30',
                        lunch_time: preferences.lunch_time || '13:00',
                        snack2_time: preferences.snack2_time || '16:00',
                        dinner_time: preferences.dinner_time || '19:00',
                        timezone: preferences.timezone || 'Asia/Kolkata',
                        theme: (preferences.theme as "dark" | "light" | "system") || 'dark',
                    } : null}
                    onSave={handleMealTimingSave}
                />
            </div>

            {/* Medical Information */}
            <Card className="p-3 mb-3 md:p-6 md:mb-6">
                <h2 className="text-base font-semibold mb-3 md:text-xl md:mb-4">Medical Information</h2>
                <div className="space-y-3 md:space-y-4">
                    <SelectField
                        label="Blood Group"
                        placeholder="Select blood group"
                        options={BLOOD_GROUP_OPTIONS}
                        value={bloodGroup}
                        onChange={setBloodGroup}
                        isDisabled={isSaving}
                    />

                    <TextField value={allergies} onChange={setAllergies} isDisabled={isSaving}>
                        <Label>Allergies</Label>
                        <TextArea placeholder="List any allergies (e.g., peanuts, shellfish, medications)" rows={2} />
                    </TextField>

                    <TextField value={currentCondition} onChange={setCurrentCondition} isDisabled={isSaving}>
                        <Label>Current Condition / Physique</Label>
                        <TextArea placeholder="Describe your current physical condition or fitness level" rows={2} />
                    </TextField>

                    <TextField value={medicalNotes} onChange={setMedicalNotes} isDisabled={isSaving}>
                        <Label>Medical Notes</Label>
                        <TextArea placeholder="Any other medical information, conditions, or notes" rows={3} />
                    </TextField>
                </div>
            </Card>

            {/* Emergency Contact */}
            <Card className="p-3 mb-3 md:p-6 md:mb-6">
                <h2 className="text-base font-semibold mb-3 md:text-xl md:mb-4">Emergency Contact</h2>
                <div className="space-y-3 md:space-y-4">
                    <TextField value={emergencyContactName} onChange={setEmergencyContactName} isDisabled={isSaving}>
                        <Label>Contact Name</Label>
                        <Input type="text" placeholder="Jane Doe" />
                    </TextField>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextField value={emergencyContactPhone} onChange={setEmergencyContactPhone} isDisabled={isSaving}>
                            <Label>Contact Phone</Label>
                            <Input type="tel" placeholder="+1 234 567 8900" />
                        </TextField>

                        <SelectField
                            label="Relationship"
                            placeholder="Select relationship"
                            options={RELATIONSHIP_OPTIONS}
                            value={emergencyContactRelationship}
                            onChange={setEmergencyContactRelationship}
                            isDisabled={isSaving}
                        />
                    </div>
                </div>
            </Card>

            {/* Save Button */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <Button
                    variant="primary"
                    size="lg"
                    onPress={handleSave}
                    isDisabled={isSaving}
                    className="min-w-[200px]"
                >
                    {isSaving ? 'Saving...' : 'Save Profile'}
                </Button>

                {saveMessage && (
                    <div className={`text-sm ${saveMessage.includes('success') ? 'text-green-500' : 'text-red-500'}`}>
                        {saveMessage}
                    </div>
                )}
            </div>

            {/* Logout Button */}
            <Card className="p-3 mt-6 border border-red-500/20 bg-red-500/5 md:p-6">
                <h2 className="text-base font-semibold mb-2 md:text-xl">Account Actions</h2>
                <p className="text-sm text-default-500 mb-4">Sign out of your account</p>
                <Button
                    variant="danger"
                    size="lg"
                    onPress={signOut}
                    className="w-full md:w-auto md:min-w-[200px]"
                >
                    Sign Out
                </Button>
            </Card>
        </>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, Button } from '@heroui/react';
import { Smile, Meh, Frown, Heart, Zap, Battery, AlertCircle } from 'lucide-react';
import { getTodayWellnessCheckIn, saveWellnessCheckIn, type WellnessCheckIn } from '@/app/actions/wellness';
import { toast } from 'sonner';

interface WellnessCheckInProps {
  userId: string;
}

const FEELING_OPTIONS = [
  { value: 5, icon: Smile, label: 'Great', color: 'text-green-500' },
  { value: 4, icon: Smile, label: 'Good', color: 'text-green-400' },
  { value: 3, icon: Meh, label: 'Okay', color: 'text-yellow-500' },
  { value: 2, icon: Frown, label: 'Not Great', color: 'text-orange-500' },
  { value: 1, icon: Frown, label: 'Poor', color: 'text-red-500' },
];

const SYMPTOMS = [
  { key: 'feeling_bloated', label: 'Bloated', icon: '🎈' },
  { key: 'feeling_low_energy', label: 'Low Energy', icon: '🔋' },
  { key: 'feeling_hungry', label: 'Hungry', icon: '🍽️' },
  { key: 'feeling_nauseous', label: 'Nauseous', icon: '🤢' },
  { key: 'feeling_headache', label: 'Headache', icon: '🤕' },
  { key: 'feeling_cramps', label: 'Cramps', icon: '💢' },
];

const POSITIVE_FEELINGS = [
  { key: 'feeling_energized', label: 'Energized', icon: '⚡' },
  { key: 'feeling_satisfied', label: 'Satisfied', icon: '😊' },
  { key: 'feeling_strong', label: 'Strong', icon: '💪' },
];

export function WellnessCheckIn({ userId }: WellnessCheckInProps) {
  const [checkIn, setCheckIn] = useState<Partial<WellnessCheckIn>>({
    feeling_bloated: false,
    feeling_low_energy: false,
    feeling_hungry: false,
    feeling_nauseous: false,
    feeling_headache: false,
    feeling_cramps: false,
    feeling_energized: false,
    feeling_satisfied: false,
    feeling_strong: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTodayCheckIn();
  }, [userId]);

  const loadTodayCheckIn = async () => {
    setIsLoading(true);
    const result = await getTodayWellnessCheckIn(userId);
    if (result.success && result.checkIn) {
      setCheckIn(result.checkIn);
    }
    setIsLoading(false);
  };

  const handleFeelingSelect = async (value: number) => {
    const newCheckIn = { ...checkIn, overall_feeling: value };
    setCheckIn(newCheckIn);
    await saveCheckIn(newCheckIn);
  };

  const toggleSymptom = async (key: string) => {
    const newCheckIn = { ...checkIn, [key]: !checkIn[key as keyof WellnessCheckIn] };
    setCheckIn(newCheckIn);
    await saveCheckIn(newCheckIn);
  };

  const saveCheckIn = async (data: Partial<WellnessCheckIn>) => {
    setIsSaving(true);
    const result = await saveWellnessCheckIn(userId, data);
    if (result.success) {
      toast.success('Wellness check-in saved! 💚');
    } else {
      toast.error('Failed to save check-in');
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <Card className="p-3 mb-3 md:p-6 md:mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-default-200 rounded w-1/3 mb-3"></div>
          <div className="h-4 bg-default-200 rounded w-2/3"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 mb-3 md:p-6 md:mb-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold mb-1 md:text-xl">How Are You Feeling Today?</h2>
        <p className="text-xs text-default-500 md:text-sm">
          Track your daily wellness to understand your body better
        </p>
      </div>

      {/* Overall Feeling */}
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2 md:text-base">Overall Feeling</h3>
        <div className="flex gap-2 justify-between">
          {FEELING_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = checkIn.overall_feeling === option.value;
            return (
              <button
                key={option.value}
                onClick={() => handleFeelingSelect(option.value)}
                disabled={isSaving}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all flex-1 ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-default-200 hover:border-default-300'
                }`}
              >
                <Icon className={`w-6 h-6 md:w-8 md:h-8 ${isSelected ? 'text-primary' : option.color}`} />
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Symptoms */}
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2 md:text-base flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Any Discomfort?
        </h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {SYMPTOMS.map((symptom) => {
            const isSelected = checkIn[symptom.key as keyof WellnessCheckIn] as boolean;
            return (
              <button
                key={symptom.key}
                onClick={() => toggleSymptom(symptom.key)}
                disabled={isSaving}
                className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-default-200 hover:border-default-300'
                }`}
              >
                <span className="text-lg">{symptom.icon}</span>
                <span className="text-xs font-medium md:text-sm">{symptom.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Positive Feelings */}
      <div>
        <h3 className="text-sm font-medium mb-2 md:text-base flex items-center gap-2">
          <Heart className="w-4 h-4 text-pink-500" />
          Feeling Good?
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {POSITIVE_FEELINGS.map((feeling) => {
            const isSelected = checkIn[feeling.key as keyof WellnessCheckIn] as boolean;
            return (
              <button
                key={feeling.key}
                onClick={() => toggleSymptom(feeling.key)}
                disabled={isSaving}
                className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-default-200 hover:border-default-300'
                }`}
              >
                <span className="text-lg">{feeling.icon}</span>
                <span className="text-xs font-medium md:text-sm">{feeling.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {isSaving && (
        <div className="mt-3 text-xs text-center text-default-500">
          Saving...
        </div>
      )}
    </Card>
  );
}

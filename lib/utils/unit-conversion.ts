/**
 * Unit Conversion Utilities
 * 
 * IMPORTANT: All conversions use precise constants to prevent calculation errors
 * 
 * Strategy:
 * - Store weight in the unit the user entered (preserves original data)
 * - Convert to kg for calculations (BMI, comparisons, etc.)
 * - Display in user's preferred unit
 */

// Conversion constants
export const LBS_TO_KG = 0.45359237; // Official conversion factor
export const KG_TO_LBS = 2.20462262; // Official conversion factor

/**
 * Convert weight to kilograms (for calculations)
 */
export function toKg(weight: number, unit: 'kg' | 'lbs'): number {
  if (unit === 'kg') return weight;
  return weight * LBS_TO_KG;
}

/**
 * Convert weight to pounds
 */
export function toLbs(weight: number, unit: 'kg' | 'lbs'): number {
  if (unit === 'lbs') return weight;
  return weight * KG_TO_LBS;
}

/**
 * Convert weight to target unit
 */
export function convertWeight(
  weight: number,
  fromUnit: 'kg' | 'lbs',
  toUnit: 'kg' | 'lbs'
): number {
  if (fromUnit === toUnit) return weight;
  
  if (toUnit === 'kg') {
    return toKg(weight, fromUnit);
  } else {
    return toLbs(weight, fromUnit);
  }
}

/**
 * Format weight for display with proper precision
 */
export function formatWeight(weight: number, unit: 'kg' | 'lbs'): string {
  // kg: 1 decimal place (e.g., 70.5 kg)
  // lbs: 1 decimal place (e.g., 155.3 lbs)
  return `${weight.toFixed(1)} ${unit}`;
}

/**
 * Calculate BMI (always uses kg and cm)
 * BMI = weight(kg) / (height(m))^2
 */
export function calculateBMI(
  weight: number,
  weightUnit: 'kg' | 'lbs',
  heightCm: number
): number {
  const weightKg = toKg(weight, weightUnit);
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/**
 * Calculate weight difference (always returns in kg for consistency)
 */
export function calculateWeightDifference(
  weight1: number,
  unit1: 'kg' | 'lbs',
  weight2: number,
  unit2: 'kg' | 'lbs'
): number {
  const weight1Kg = toKg(weight1, unit1);
  const weight2Kg = toKg(weight2, unit2);
  return weight1Kg - weight2Kg;
}

/**
 * Validate weight range based on unit
 */
export function isValidWeight(weight: number, unit: 'kg' | 'lbs'): boolean {
  if (unit === 'kg') {
    return weight >= 20 && weight <= 300;
  } else {
    return weight >= 44 && weight <= 660;
  }
}

/**
 * Get weight range for validation messages
 */
export function getWeightRange(unit: 'kg' | 'lbs'): { min: number; max: number } {
  if (unit === 'kg') {
    return { min: 20, max: 300 };
  } else {
    return { min: 44, max: 660 };
  }
}

/**
 * Normalize weight array to kg for calculations (e.g., averages, trends)
 */
export function normalizeWeightsToKg(
  weights: Array<{ weight: number; unit: 'kg' | 'lbs' }>
): number[] {
  return weights.map((w) => toKg(w.weight, w.unit));
}

/**
 * Calculate average weight (returns in kg)
 */
export function calculateAverageWeight(
  weights: Array<{ weight: number; unit: 'kg' | 'lbs' }>
): number {
  if (weights.length === 0) return 0;
  
  const weightsKg = normalizeWeightsToKg(weights);
  const sum = weightsKg.reduce((acc, w) => acc + w, 0);
  return sum / weightsKg.length;
}

/**
 * Find min/max weights (returns in kg)
 */
export function findMinMaxWeights(
  weights: Array<{ weight: number; unit: 'kg' | 'lbs' }>
): { min: number; max: number } {
  if (weights.length === 0) return { min: 0, max: 0 };
  
  const weightsKg = normalizeWeightsToKg(weights);
  return {
    min: Math.min(...weightsKg),
    max: Math.max(...weightsKg),
  };
}

/**
 * Calculate progress percentage towards goal
 */
export function calculateProgressPercentage(
  currentWeight: number,
  currentUnit: 'kg' | 'lbs',
  startWeight: number,
  startUnit: 'kg' | 'lbs',
  goalWeight: number,
  goalUnit: 'kg' | 'lbs'
): number {
  const currentKg = toKg(currentWeight, currentUnit);
  const startKg = toKg(startWeight, startUnit);
  const goalKg = toKg(goalWeight, goalUnit);
  
  const totalChange = Math.abs(goalKg - startKg);
  const currentChange = Math.abs(currentKg - startKg);
  
  if (totalChange === 0) return 100;
  
  return Math.min(100, (currentChange / totalChange) * 100);
}

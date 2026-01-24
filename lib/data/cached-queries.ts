import { cache } from 'react';
import { getTodayWaterCount as _getTodayWaterCount, getWaterTarget as _getWaterTarget } from '@/app/actions/water';
import { getTodayMeals as _getTodayMeals } from '@/app/actions/meals';
import { getLatestWeightLog as _getLatestWeightLog } from '@/app/actions/weight';
import { getActiveMembership as _getActiveMembership } from '@/app/actions/memberships';

export const getTodayWaterCount = cache(_getTodayWaterCount);
export const getWaterTarget = cache(_getWaterTarget);
export const getTodayMeals = cache(_getTodayMeals);
export const getLatestWeightLog = cache(_getLatestWeightLog);
export const getActiveMembership = cache(_getActiveMembership);

import Link from 'next/link';
import { Droplet } from 'lucide-react';
import { getTodayWaterCount } from '@/lib/data/cached-queries';

export async function WaterCard({ userId }: { userId: string }) {
    const { count: waterCount } = await getTodayWaterCount(userId);

    return (
        <div className="p-3 md:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="mb-2 flex items-center justify-between md:mb-4">
                <h3 className="text-base font-semibold md:text-xl">Water Intake</h3>
                <Droplet className="h-6 w-6 text-blue-400 md:h-8 md:w-8" />
            </div>
            <div className="mb-3 md:mb-4">
                <div className="text-2xl font-bold md:text-4xl">{waterCount}</div>
                <span className="text-xs text-gray-600 dark:text-gray-400 md:text-sm">glasses today</span>
            </div>
            <Link href="/water" className="block w-full">
                <div className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-center transition-colors md:text-base">
                    Track Water
                </div>
            </Link>
        </div>
    );
}

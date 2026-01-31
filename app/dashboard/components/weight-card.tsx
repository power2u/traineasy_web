import Link from 'next/link';
import { Scale } from 'lucide-react';
import { getLatestWeightLog } from '@/lib/data/cached-queries';

export async function WeightCard({ userId }: { userId: string }) {
    const latestWeight = await getLatestWeightLog(userId);
    const latestWeightLog = latestWeight.success ? latestWeight.log : null;

    return (
        <div className="p-3 md:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="mb-2 flex items-center justify-between md:mb-4">
                <h3 className="text-base font-semibold md:text-xl">Weight</h3>
                <Scale className="h-6 w-6 text-green-400 md:h-8 md:w-8" />
            </div>
            <div className="mb-3 md:mb-4">
                {latestWeightLog ? (
                    <>
                        <div className="text-2xl font-bold md:text-4xl">
                            {latestWeightLog.weight.toFixed(1)}
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 md:text-sm">
                            {latestWeightLog.unit} • {new Date(latestWeightLog.date).toLocaleDateString()}
                        </span>
                    </>
                ) : (
                    <>
                        <div className="text-2xl font-bold md:text-4xl">--</div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 md:text-sm">no logs yet</span>
                    </>
                )}
            </div>
            <Link href="/weight" className="block w-full">
                <div className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-center transition-colors md:text-base">
                    {latestWeightLog ? 'View Progress' : 'Log Weight'}
                </div>
            </Link>
        </div>
    );
}

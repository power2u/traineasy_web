import { Card, Button, Text } from '@heroui/react';
import Link from 'next/link';
import { Scale } from 'lucide-react';
import { getLatestWeightLog } from '@/lib/data/cached-queries';

export async function WeightCard({ userId }: { userId: string }) {
    const latestWeight = await getLatestWeightLog(userId);
    const latestWeightLog = latestWeight.success ? latestWeight.log : null;

    return (
        <Card className="p-3 md:p-6">
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
                        <Text className="text-xs text-muted-foreground md:text-sm">
                            {latestWeightLog.unit} • {new Date(latestWeightLog.date).toLocaleDateString()}
                        </Text>
                    </>
                ) : (
                    <>
                        <div className="text-2xl font-bold md:text-4xl">--</div>
                        <Text className="text-xs text-muted-foreground md:text-sm">no logs yet</Text>
                    </>
                )}
            </div>
            <Link href="/weight">
                <Button variant="primary" size="sm" className="w-full md:text-base">
                    {latestWeightLog ? 'View Progress' : 'Log Weight'}
                </Button>
            </Link>
        </Card>
    );
}

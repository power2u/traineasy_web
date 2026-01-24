import { Card, Button, Text } from '@heroui/react';
import Link from 'next/link';
import { Droplet } from 'lucide-react';
import { getTodayWaterCount } from '@/lib/data/cached-queries';

export async function WaterCard({ userId }: { userId: string }) {
    const { count: waterCount } = await getTodayWaterCount(userId);

    return (
        <Card className="p-3 md:p-6">
            <div className="mb-2 flex items-center justify-between md:mb-4">
                <h3 className="text-base font-semibold md:text-xl">Water Intake</h3>
                <Droplet className="h-6 w-6 text-blue-400 md:h-8 md:w-8" />
            </div>
            <div className="mb-3 md:mb-4">
                <div className="text-2xl font-bold md:text-4xl">{waterCount}</div>
                <Text className="text-xs text-muted-foreground md:text-sm">glasses today</Text>
            </div>
            <Link href="/water">
                <Button variant="primary" size="sm" className="w-full md:text-base">
                    Track Water
                </Button>
            </Link>
        </Card>
    );
}

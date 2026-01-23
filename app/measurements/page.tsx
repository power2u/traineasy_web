import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getMeasurementsData } from '@/app/actions/measurements';
import { MeasurementType } from '@/lib/types';
import { MeasurementsClient } from './measurements-client';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function MeasurementsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/auth/login');
  }

  const userId = (session.user as any).id;

  // Get measurement type from URL or default to 'weight'
  const params = await searchParams;
  const typeParam = params?.type;
  const measurementType = (typeof typeParam === 'string' ? typeParam : 'weight') as MeasurementType;

  // Fetch all required data server-side
  const data = await getMeasurementsData(userId, measurementType, 90);

  return (
    <MeasurementsClient
      userId={userId}
      initialType={measurementType}
      data={data}
    />
  );
}

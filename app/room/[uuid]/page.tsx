import { RoomPageClient } from '@/components/RoomPageClient';

export default async function RoomPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;
  return <RoomPageClient roomId={uuid} />;
}

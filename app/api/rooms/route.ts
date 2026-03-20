import { NextResponse } from 'next/server';
import { createRoom } from '@/lib/roomStore';

export async function POST() {
  const room = createRoom();
  return NextResponse.json({ roomId: room.id });
}

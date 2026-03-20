import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { ensureRoom } from '@/lib/roomStore';
import { signToken } from '@/lib/jwt';

const schema = z.object({
  name: z.string().min(1).max(30).trim(),
  role: z.enum(['voter', 'observer']).optional(),
  participantId: z.string().uuid().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // ensureRoom recreates a lost room (server restart) – the JWT becomes the source
  // of truth for identity; the room is a fresh coordination point.
  const room = ensureRoom(id);

  const { name, role: requestedRole, participantId: existingId } = parsed.data;
  const existing = existingId ? room.participants.find(p => p.id === existingId) : null;
  const participantId = existing?.id ?? uuidv4();
  const role = existing?.role ?? (room.participants.length === 0 ? 'moderator' : (requestedRole ?? 'voter'));

  const token = signToken({ participantId, name, role, roomId: id });
  return NextResponse.json({ token, role, roomId: id });
}

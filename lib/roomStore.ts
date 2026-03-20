import { v4 as uuidv4 } from 'uuid';
import type { Room, Participant, CardSetType } from '@/types';

declare global {
  // eslint-disable-next-line no-var
  var __ppRooms: Map<string, Room> | undefined;
}

const rooms: Map<string, Room> = global.__ppRooms ?? new Map();
global.__ppRooms = rooms;

const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - new Date(room.lastActivityAt).getTime() > ROOM_TTL_MS) {
      rooms.delete(id);
    }
  }
}, 5 * 60 * 1000).unref();

function touch(room: Room): void {
  room.lastActivityAt = new Date().toISOString();
}

export function createRoom(): Room {
  const room: Room = {
    id: uuidv4(),
    cardSet: 'fibonacci',
    allowCustom: false,
    autoReveal: true,
    allowVoteChange: true,
    topic: '',
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    participants: [],
    phase: 'waiting',
    votes: {},
    timer: null,
  };
  rooms.set(room.id, room);
  return room;
}

/** Recreates a room with a known ID – used after server restart when a client
 *  reconnects with a still-valid JWT. The JWT is the source of truth for identity;
 *  the room is just a fresh coordination point. */
export function ensureRoom(id: string): Room {
  if (rooms.has(id)) return rooms.get(id)!;
  const room: Room = {
    id,
    cardSet: 'fibonacci',
    allowCustom: false,
    autoReveal: true,
    allowVoteChange: true,
    topic: '',
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    participants: [],
    phase: 'waiting',
    votes: {},
    timer: null,
  };
  rooms.set(id, room);
  return room;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id);
}

export function roomExists(id: string): boolean {
  return rooms.has(id);
}

export function addParticipant(roomId: string, participant: Participant): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const existing = room.participants.find(p => p.id === participant.id);
  if (existing) {
    existing.isOnline = true;
    existing.name = participant.name;
  } else {
    room.participants.push(participant);
  }
  touch(room);
  return room;
}

export function setParticipantOnline(roomId: string, participantId: string, isOnline: boolean): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const p = room.participants.find(p => p.id === participantId);
  if (p) p.isOnline = isOnline;
  touch(room);
  return room;
}

export function getParticipantRole(roomId: string, participantId: string) {
  return rooms.get(roomId)?.participants.find(p => p.id === participantId)?.role ?? null;
}

export function castVote(roomId: string, participantId: string, value: string): Room | null {
  const room = rooms.get(roomId);
  if (!room || room.phase !== 'voting') return null;
  const participant = room.participants.find(p => p.id === participantId);
  if (!participant || participant.role === 'observer') return null;
  if (participant.hasVoted && !room.allowVoteChange) return null;
  room.votes[participantId] = value;
  participant.hasVoted = true;
  touch(room);
  return room;
}

export function revealVotes(roomId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room || room.phase !== 'voting') return null;
  room.phase = 'revealed';
  touch(room);
  return room;
}

export function resetVotes(roomId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.phase = 'voting';
  room.timer = null;
  room.votes = {};
  room.participants.forEach(p => { p.hasVoted = false; });
  touch(room);
  return room;
}

export function setTopic(roomId: string, topic: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.topic = topic;
  touch(room);
  return room;
}

export function startVoting(roomId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.phase = 'voting';
  room.votes = {};
  room.timer = null;
  room.participants.forEach(p => { p.hasVoted = false; });
  touch(room);
  return room;
}

export function changeCardSet(roomId: string, cardSet: CardSetType): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.cardSet = cardSet;
  touch(room);
  return room;
}

export function setAllowCustom(roomId: string, value: boolean): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.allowCustom = value;
  touch(room);
  return room;
}

export function setAutoReveal(roomId: string, value: boolean): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.autoReveal = value;
  touch(room);
  return room;
}

export function setAllowVoteChange(roomId: string, value: boolean): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.allowVoteChange = value;
  touch(room);
  return room;
}

export function startTimer(roomId: string, duration: number): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.timer = { duration, startedAt: new Date().toISOString() };
  touch(room);
  return room;
}

export function transferModerator(roomId: string, fromId: string, toId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  const from = room.participants.find(p => p.id === fromId);
  const to = room.participants.find(p => p.id === toId);
  if (!from || !to) return false;
  from.role = 'voter';
  to.role = 'moderator';
  touch(room);
  return true;
}

export function claimModerator(roomId: string, participantId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  const hasActiveMod = room.participants.some(p => p.role === 'moderator' && p.isOnline);
  if (hasActiveMod) return false;
  room.participants.forEach(p => { if (p.role === 'moderator') p.role = 'voter'; });
  const p = room.participants.find(p => p.id === participantId);
  if (!p) return false;
  p.role = 'moderator';
  touch(room);
  return true;
}

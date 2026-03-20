import { create } from 'zustand';
import type { Room, JwtPayload, Participant } from '@/types';

interface RoomStore {
  room: Room | null;
  me: JwtPayload | null;
  connected: boolean;
  timerRemaining: number | null;
  setRoom: (room: Room) => void;
  patchRoom: (patch: Partial<Room>) => void;
  upsertParticipant: (p: Participant) => void;
  setMe: (me: JwtPayload) => void;
  updateMyRole: (role: JwtPayload['role']) => void;
  setConnected: (v: boolean) => void;
  setTimerRemaining: (v: number | null) => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  me: null,
  connected: false,
  timerRemaining: null,

  setRoom: (room) => set({ room }),

  patchRoom: (patch) =>
    set((s) => ({ room: s.room ? { ...s.room, ...patch } : null })),

  upsertParticipant: (p) =>
    set((s) => {
      if (!s.room) return {};
      const exists = s.room.participants.some(e => e.id === p.id);
      const participants = exists
        ? s.room.participants.map(e => (e.id === p.id ? p : e))
        : [...s.room.participants, p];
      return { room: { ...s.room, participants } };
    }),

  setMe: (me) => set({ me }),
  updateMyRole: (role) => set((s) => (s.me ? { me: { ...s.me, role } } : {})),
  setConnected: (connected) => set({ connected }),
  setTimerRemaining: (timerRemaining) => set({ timerRemaining }),
}));

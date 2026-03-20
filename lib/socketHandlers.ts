import type { Server as SocketIOServer } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, JwtPayload } from '@/types';
import { verifyToken, signToken } from './jwt';
import * as store from './roomStore';

type IO = SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

declare global {
  // eslint-disable-next-line no-var
  var __ppTimers: Map<string, ReturnType<typeof setInterval>> | undefined;
}
const roomTimers: Map<string, ReturnType<typeof setInterval>> =
  global.__ppTimers ?? new Map();
global.__ppTimers = roomTimers;

function clearRoomTimer(roomId: string) {
  const t = roomTimers.get(roomId);
  if (t) { clearInterval(t); roomTimers.delete(roomId); }
}

export function setupSocketHandlers(io: IO) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string;
      if (!token) throw new Error('No token');
      const payload = verifyToken(token);
      (socket.data as { participant: JwtPayload }).participant = payload;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { roomId, participantId, name, role } =
      (socket.data as { participant: JwtPayload }).participant;

    socket.join(roomId);

    // Auto-recreate room if it was lost (e.g. server restart).
    // The JWT is the source of truth for identity and role – the room is just
    // a fresh coordination point that gets rebuilt from connecting clients.
    store.ensureRoom(roomId);

    const room = store.addParticipant(roomId, {
      id: participantId,
      name,
      role,
      isOnline: true,
      hasVoted: false,
    })!;

    socket.emit('room:state', room);
    socket.to(roomId).emit('participant:joined', room.participants.find(p => p.id === participantId)!);

    const isMod = () => store.getParticipantRole(roomId, participantId) === 'moderator';

    // ── Voting ────────────────────────────────────────────────────────────
    socket.on('vote:cast', (value) => {
      const updated = store.castVote(roomId, participantId, value);
      if (!updated) return;
      io.to(roomId).emit('participant:voted', participantId);

      if (updated.autoReveal) {
        const onlineVoters = updated.participants.filter(p => p.role !== 'observer' && p.isOnline);
        if (onlineVoters.length > 0 && onlineVoters.every(p => p.hasVoted)) {
          const revealed = store.revealVotes(roomId);
          if (revealed) {
            clearRoomTimer(roomId);
            io.to(roomId).emit('votes:revealed', revealed.votes);
            io.to(roomId).emit('room:update', { phase: 'revealed', participants: revealed.participants });
          }
        }
      }
    });

    socket.on('vote:reveal', () => {
      if (!isMod()) return;
      const updated = store.revealVotes(roomId);
      if (!updated) return;
      clearRoomTimer(roomId);
      io.to(roomId).emit('votes:revealed', updated.votes);
      io.to(roomId).emit('room:update', { phase: 'revealed', participants: updated.participants });
    });

    socket.on('vote:reset', () => {
      if (!isMod()) return;
      const updated = store.resetVotes(roomId);
      if (!updated) return;
      clearRoomTimer(roomId);
      io.to(roomId).emit('votes:reset');
      io.to(roomId).emit('room:update', {
        phase: 'voting',
        votes: {},
        participants: updated.participants,
      });
    });

    // ── Topic ─────────────────────────────────────────────────────────────
    socket.on('topic:set', (topic) => {
      if (!isMod()) return;
      const updated = store.setTopic(roomId, topic);
      if (updated) io.to(roomId).emit('room:update', { topic: updated.topic });
    });

    // ── Settings ──────────────────────────────────────────────────────────
    socket.on('cardset:change', (cardSet) => {
      if (!isMod()) return;
      const updated = store.changeCardSet(roomId, cardSet);
      if (updated) io.to(roomId).emit('room:update', { cardSet: updated.cardSet });
    });

    socket.on('allowcustom:set', (value) => {
      if (!isMod()) return;
      const updated = store.setAllowCustom(roomId, value);
      if (updated) io.to(roomId).emit('room:update', { allowCustom: updated.allowCustom });
    });

    socket.on('autoreveal:set', (value) => {
      if (!isMod()) return;
      const updated = store.setAutoReveal(roomId, value);
      if (updated) io.to(roomId).emit('room:update', { autoReveal: updated.autoReveal });
    });

    socket.on('votechange:set', (value) => {
      if (!isMod()) return;
      const updated = store.setAllowVoteChange(roomId, value);
      if (updated) io.to(roomId).emit('room:update', { allowVoteChange: updated.allowVoteChange });
    });

    socket.on('timer:start', (duration) => {
      if (!isMod()) return;
      const updated = store.startTimer(roomId, duration);
      if (!updated) return;
      clearRoomTimer(roomId);
      io.to(roomId).emit('room:update', { timer: updated.timer });

      let remaining = duration;
      const interval = setInterval(() => {
        remaining -= 1;
        io.to(roomId).emit('timer:tick', remaining);
        if (remaining <= 0) {
          clearRoomTimer(roomId);
          const revealed = store.revealVotes(roomId);
          if (revealed) {
            io.to(roomId).emit('votes:revealed', revealed.votes);
            io.to(roomId).emit('room:update', { phase: 'revealed', participants: revealed.participants });
          }
        }
      }, 1000);
      roomTimers.set(roomId, interval);
    });

    // ── Roles ─────────────────────────────────────────────────────────────
    socket.on('role:transfer', (targetId) => {
      if (!isMod()) return;
      if (!store.transferModerator(roomId, participantId, targetId)) return;
      const updated = store.getRoom(roomId);
      if (!updated) return;
      io.to(roomId).emit('room:update', { participants: updated.participants });
      const newMod = updated.participants.find(p => p.id === targetId);
      if (newMod) {
        const newToken = signToken({ participantId: targetId, name: newMod.name, role: 'moderator', roomId });
        for (const [, s] of io.sockets.sockets) {
          const data = s.data as { participant?: JwtPayload };
          if (data.participant?.participantId === targetId) {
            s.emit('token:updated', newToken);
            break;
          }
        }
      }
    });

    socket.on('moderator:claim', () => {
      if (!store.claimModerator(roomId, participantId)) {
        socket.emit('error', { code: 'MODERATOR_ACTIVE', message: 'Moderator is still active' });
        return;
      }
      const updated = store.getRoom(roomId);
      if (!updated) return;
      io.to(roomId).emit('room:update', { participants: updated.participants });
      const newToken = signToken({ participantId, name, role: 'moderator', roomId });
      socket.emit('token:updated', newToken);
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      store.setParticipantOnline(roomId, participantId, false);
      const updated = store.getRoom(roomId);
      if (updated) {
        io.to(roomId).emit('participant:left', participantId);
        io.to(roomId).emit('room:update', { participants: updated.participants });
      }
    });
  });
}

'use client';
import { useEffect, useRef } from 'react';
import { decodeToken } from '@/lib/jwtClient';
import { getSocket, destroySocket } from '@/lib/socketClient';
import { useRoomStore } from '@/store/useRoomStore';
import { ParticipantGrid } from './ParticipantGrid';
import { CardDeck } from './CardDeck';
import { VoteResults } from './VoteResults';
import { RoomHeader } from './RoomHeader';
import type { Room } from '@/types';

interface Props {
  roomId: string;
  token: string;
  onTokenUpdate: (token: string) => void;
  onLeave: () => void;
}

export function PokerRoom({ roomId, token, onTokenUpdate, onLeave }: Props) {
  const me = decodeToken(token);
  const { setRoom, patchRoom, upsertParticipant, setMe, updateMyRole,
    setConnected, setTimerRemaining } = useRoomStore();
  const room = useRoomStore(s => s.room);
  const connected = useRoomStore(s => s.connected);
  const timerRemaining = useRoomStore(s => s.timerRemaining);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  useEffect(() => {
    if (!me) return;
    setMe(me);

    const socket = getSocket();
    socket.auth = { token: tokenRef.current };
    socket.connect();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('room:state', (r: Room) => { setRoom(r); setTimerRemaining(null); });

    socket.on('room:update', (patch) => {
      patchRoom(patch);
      if (patch.participants) {
        const me_ = decodeToken(tokenRef.current);
        if (me_) {
          const updated = patch.participants.find(p => p.id === me_.participantId);
          if (updated) updateMyRole(updated.role);
        }
      }
    });

    socket.on('participant:joined', (p) => upsertParticipant(p));

    socket.on('participant:left', (id) => {
      const r = useRoomStore.getState().room;
      if (!r) return;
      patchRoom({ participants: r.participants.map(p => p.id === id ? { ...p, isOnline: false } : p) });
    });

    socket.on('participant:voted', (id) => {
      const r = useRoomStore.getState().room;
      if (!r) return;
      patchRoom({ participants: r.participants.map(p => p.id === id ? { ...p, hasVoted: true } : p) });
    });

    socket.on('votes:revealed', (votes) => {
      setTimerRemaining(null);
      patchRoom({ votes, phase: 'revealed' });
    });

    socket.on('votes:reset', () => setTimerRemaining(null));
    socket.on('timer:tick', (remaining) => setTimerRemaining(remaining));

    socket.on('token:updated', (newToken) => {
      onTokenUpdate(newToken);
      tokenRef.current = newToken;
      socket.auth = { token: newToken };
    });

    socket.on('error', (err) => console.error('Socket error:', err));

    return () => { destroySocket(); setConnected(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  if (!room || !me) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const myParticipant = room.participants.find(p => p.id === me.participantId);
  const isMod = myParticipant?.role === 'moderator';
  // Treat as observer when participant entry is not yet in the room state (defensive)
  const isObserver = myParticipant ? myParticipant.role === 'observer' : true;
  const myRole = myParticipant?.role ?? 'observer';
  const socket = getSocket();

  return (
    <div className="min-h-screen flex flex-col">
      <RoomHeader
        roomId={roomId}
        connected={connected}
        isMod={isMod}
        myRole={myRole}
        cardSet={room.cardSet}
        allowCustom={room.allowCustom}
        autoReveal={room.autoReveal}
        allowVoteChange={room.allowVoteChange}
        topic={room.topic}
        timerRemaining={timerRemaining}
        phase={room.phase}
        onCardSetChange={(cs) => socket.emit('cardset:change', cs)}
        onAllowCustomChange={(v) => socket.emit('allowcustom:set', v)}
        onAutoRevealChange={(v) => socket.emit('autoreveal:set', v)}
        onAllowVoteChangeChange={(v) => socket.emit('votechange:set', v)}
        onTimerStart={(d) => socket.emit('timer:start', d)}
        onTopicChange={(t) => socket.emit('topic:set', t)}
        onStartVoting={() => socket.emit('vote:reset')}
        onChangeRole={onLeave}
      />

      <main className="flex-1 flex flex-col p-4 gap-4 max-w-4xl mx-auto w-full">
        <ParticipantGrid
          participants={room.participants}
          votes={room.phase === 'revealed' ? room.votes : {}}
          phase={room.phase}
          myId={me.participantId}
          isMod={isMod}
          onTransferMod={(id) => socket.emit('role:transfer', id)}
          onClaimMod={() => socket.emit('moderator:claim')}
        />

        {room.phase === 'revealed' ? (
          <VoteResults
            votes={room.votes}
            participants={room.participants}
            isMod={isMod}
            onReset={() => socket.emit('vote:reset')}
          />
        ) : room.phase === 'voting' && !isObserver ? (
          <CardDeck
            cardSet={room.cardSet}
            allowCustom={room.allowCustom}
            allowVoteChange={room.allowVoteChange}
            hasVoted={myParticipant?.hasVoted ?? false}
            isMod={isMod}
            onVote={(val) => socket.emit('vote:cast', val)}
            onReveal={() => socket.emit('vote:reveal')}
          />
        ) : room.phase === 'waiting' && isMod ? (
          <div className="text-center py-8">
            <button
              onClick={() => socket.emit('vote:reset')}
              className="px-8 py-4 bg-brand-500 hover:bg-brand-400 text-white font-semibold text-lg rounded-2xl transition-colors"
            >
              ▶ Start Voting
            </button>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            Waiting for the moderator to start voting…
          </div>
        )}
      </main>
    </div>
  );
}

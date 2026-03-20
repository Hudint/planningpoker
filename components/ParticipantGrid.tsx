'use client';
import type { Participant, RoomPhase } from '@/types';

interface Props {
  participants: Participant[];
  votes: Record<string, string>;
  phase: RoomPhase;
  myId: string;
  isMod: boolean;
  onTransferMod: (id: string) => void;
  onClaimMod: () => void;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function ParticipantGrid({
  participants, votes, phase, myId, isMod, onTransferMod, onClaimMod,
}: Props) {
  const hasOfflineMod = participants.some(p => p.role === 'moderator' && !p.isOnline);
  const hasOnlineMod = participants.some(p => p.role === 'moderator' && p.isOnline);

  return (
    <div className="bg-navy-900 rounded-2xl p-5 border border-navy-800 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-navy-400">
          Participants ({participants.filter(p => p.isOnline).length} online)
        </p>
        {hasOfflineMod && !hasOnlineMod && (
          <button
            onClick={onClaimMod}
            className="text-xs px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
          >
            Claim Moderator
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {participants.map(p => {
          const vote = votes[p.id];
          const isMe = p.id === myId;
          const isRevealed = phase === 'revealed';

          return (
            <div
              key={p.id}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl min-w-[80px] border transition-all
                ${isMe ? 'border-brand-500 bg-brand-500/10' : 'border-navy-700 bg-navy-800'}
                ${!p.isOnline ? 'opacity-40' : ''}
              `}
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                ${p.role === 'moderator' ? 'bg-amber-600' : p.role === 'observer' ? 'bg-navy-600' : 'bg-brand-500'}
              `}>
                {initials(p.name)}
              </div>

              {/* Card face */}
              <div className={`w-12 h-16 rounded-lg flex items-center justify-center text-lg font-bold border-2 transition-all
                ${isRevealed && vote
                  ? 'bg-white text-navy-900 border-white'
                  : p.hasVoted && !isRevealed
                  ? 'bg-brand-500 border-brand-400 text-white'
                  : 'bg-navy-700 border-navy-600 text-navy-500'}
              `}>
                {isRevealed ? (vote ?? '–') : p.hasVoted ? '✓' : '?'}
              </div>

              {/* Name + role */}
              <div className="text-center">
                <p className="text-xs font-medium truncate max-w-[72px]">
                  {p.name}{isMe && ' (you)'}
                </p>
                {p.role === 'moderator' && (
                  <span className="text-[10px] text-amber-400">mod</span>
                )}
                {p.role === 'observer' && (
                  <span className="text-[10px] text-navy-500">observer</span>
                )}
              </div>

              {/* Transfer mod button */}
              {isMod && !isMe && p.role !== 'moderator' && p.isOnline && (
                <button
                  onClick={() => onTransferMod(p.id)}
                  className="text-[10px] text-navy-400 hover:text-amber-400 transition-colors"
                  title="Make moderator"
                >
                  ⭐ Make mod
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

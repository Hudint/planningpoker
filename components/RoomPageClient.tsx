'use client';
import { useEffect, useState, useCallback } from 'react';
import { decodeToken } from '@/lib/jwtClient';
import { NameModal } from './NameModal';
import { PokerRoom } from './PokerRoom';

const TOKEN_KEY = (roomId: string) => `pp_token_${roomId}`;

export function RoomPageClient({ roomId }: { roomId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Read token from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY(roomId));
    if (stored && decodeToken(stored)) {
      setToken(stored);
    }
    setReady(true);
  }, [roomId]);

  const handleJoined = useCallback((newToken: string) => {
    localStorage.setItem(TOKEN_KEY(roomId), newToken);
    setToken(newToken);
  }, [roomId]);

  const handleTokenUpdate = useCallback((newToken: string) => {
    localStorage.setItem(TOKEN_KEY(roomId), newToken);
    setToken(newToken);
  }, [roomId]);

  const handleLeave = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY(roomId));
    setToken(null);
  }, [roomId]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token) {
    return <NameModal roomId={roomId} onJoined={handleJoined} />;
  }

  return (
    <PokerRoom
      roomId={roomId}
      token={token}
      onTokenUpdate={handleTokenUpdate}
      onLeave={handleLeave}
    />
  );
}

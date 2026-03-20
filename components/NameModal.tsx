'use client';
import { useState } from 'react';
import type { Role } from '@/types';

interface Props {
  roomId: string;
  onJoined: (token: string) => void;
}

export function NameModal({ roomId, onJoined }: Props) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Extract<Role, 'voter' | 'observer'>>('voter');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), role }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Room not found or expired.');
        return;
      }
      const { token } = await res.json();
      onJoined(token);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-navy-900 rounded-2xl p-8 space-y-6 border border-navy-800">
        <div className="text-center">
          <div className="text-4xl mb-3">🃏</div>
          <h2 className="text-xl font-bold">Join Room</h2>
          <p className="text-navy-400 text-sm mt-1 font-mono break-all">{roomId}</p>
        </div>

        <form onSubmit={join} className="space-y-4">
          <div>
            <label className="block text-sm text-navy-400 mb-1">Your name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Alice"
              maxLength={30}
              className="w-full px-4 py-3 bg-navy-800 border border-navy-700 rounded-xl text-white placeholder-navy-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm text-navy-400 mb-2">Join as</label>
            <div className="flex gap-2">
              {(['voter', 'observer'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    role === r
                      ? 'bg-brand-500 text-white'
                      : 'bg-navy-800 text-navy-400 hover:bg-navy-700'
                  }`}
                >
                  {r === 'voter' ? '🗳 Voter' : '👁 Observer'}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-3 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? 'Joining…' : 'Join Room'}
          </button>
        </form>
      </div>
    </div>
  );
}

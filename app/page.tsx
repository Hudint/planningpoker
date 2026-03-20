'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [joinId, setJoinId] = useState('');

  const createRoom = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      const { roomId } = await res.json();
      router.push(`/room/${roomId}`);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const id = joinId.trim().split('/').pop(); // accept full URL or just ID
    if (id) router.push(`/room/${id}`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <div className="text-7xl mb-6 select-none">🃏</div>
          <h1 className="text-4xl font-bold tracking-tight">Planning Poker</h1>
          <p className="mt-3 text-navy-400">Estimate stories together, in real-time.</p>
        </div>

        <button
          onClick={createRoom}
          disabled={loading}
          className="w-full py-4 bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-white font-semibold text-lg rounded-2xl transition-colors cursor-pointer"
        >
          {loading ? 'Creating…' : '＋  New Room'}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-navy-800" />
          <span className="text-navy-500 text-sm">or join existing</span>
          <div className="flex-1 h-px bg-navy-800" />
        </div>

        <form onSubmit={joinRoom} className="flex gap-2">
          <input
            value={joinId}
            onChange={e => setJoinId(e.target.value)}
            placeholder="Paste room link or ID…"
            className="flex-1 px-4 py-3 bg-navy-900 border border-navy-700 rounded-xl text-white placeholder-navy-500 focus:outline-none focus:border-brand-500 text-sm"
          />
          <button
            type="submit"
            className="px-5 py-3 bg-navy-800 hover:bg-navy-700 text-white rounded-xl transition-colors cursor-pointer"
          >
            Join
          </button>
        </form>
      </div>
    </main>
  );
}

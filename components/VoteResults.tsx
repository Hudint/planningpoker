'use client';
import { useMemo } from 'react';
import type { Participant } from '@/types';

interface Props {
  votes: Record<string, string>;
  participants: Participant[];
  isMod: boolean;
  onReset: () => void;
}

function parseNumeric(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

export function VoteResults({ votes, participants, isMod, onReset }: Props) {
  const stats = useMemo(() => {
    const values = Object.values(votes);
    const numeric = values.map(parseNumeric).filter((n): n is number => n !== null);
    const avg = numeric.length
      ? Math.round((numeric.reduce((a, b) => a + b, 0) / numeric.length) * 10) / 10
      : null;
    const sorted = [...numeric].sort((a, b) => a - b);
    const median = sorted.length
      ? sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)]
      : null;
    const freq: Record<string, number> = {};
    values.forEach(v => { freq[v] = (freq[v] ?? 0) + 1; });
    const majority = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const consensus = new Set(values).size === 1 && values.length > 0;
    return { avg, median, majority, consensus, count: values.length };
  }, [votes]);

  const getName = (id: string) => participants.find(p => p.id === id)?.name ?? 'Unknown';

  return (
    <div className="bg-navy-900 rounded-2xl p-5 border border-navy-800 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">
          {stats.consensus ? '🎉 Consensus!' : '📊 Results'}
        </h3>
        <span className="text-sm text-navy-400">{stats.count} votes</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Average', value: stats.avg },
          { label: 'Median', value: stats.median },
          { label: 'Most common', value: stats.majority },
        ].map(({ label, value }) => (
          <div key={label} className="bg-navy-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-brand-400">{value ?? '–'}</p>
            <p className="text-xs text-navy-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {Object.entries(votes).map(([id, vote]) => (
          <div key={id} className="flex items-center justify-between text-sm">
            <span className="text-navy-300">{getName(id)}</span>
            <span className="font-bold px-3 py-1 bg-navy-800 rounded-lg">{vote}</span>
          </div>
        ))}
      </div>

      {isMod && (
        <button
          onClick={onReset}
          className="w-full py-3 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl transition-colors cursor-pointer"
        >
          ↺ New Round
        </button>
      )}
    </div>
  );
}

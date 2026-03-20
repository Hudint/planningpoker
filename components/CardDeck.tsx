'use client';
import { useState } from 'react';
import { CARD_SETS, CARD_SET_LABELS, type CardSetType } from '@/types';

interface Props {
  cardSet: CardSetType;
  allowCustom: boolean;
  allowVoteChange: boolean;
  hasVoted: boolean;
  onVote: (value: string) => void;
  isMod: boolean;
  onReveal: () => void;
}

export function CardDeck({ cardSet, allowCustom, allowVoteChange, hasVoted, onVote, isMod, onReveal }: Props) {
  const [freetextValue, setFreetextValue] = useState('');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const handleVote = (value: string) => {
    if (hasVoted && !allowVoteChange) return;
    setSelectedCard(value);
    onVote(value);
  };

  if (cardSet === 'freetext') {
    const locked = hasVoted && !allowVoteChange;
    return (
      <div className="bg-navy-900 rounded-2xl p-5 border border-navy-800 space-y-3">
        <p className="text-sm text-navy-400">Enter your estimate ({CARD_SET_LABELS.freetext})</p>
        <div className="flex gap-2">
          <input
            value={freetextValue}
            onChange={e => setFreetextValue(e.target.value)}
            disabled={locked}
            placeholder="e.g. 2.5d, 3 PT, ~4h"
            className="flex-1 px-4 py-3 bg-navy-800 border border-navy-700 rounded-xl text-white placeholder-navy-500 focus:outline-none focus:border-brand-500 disabled:opacity-50"
            onKeyDown={e => {
              if (e.key === 'Enter' && freetextValue.trim()) handleVote(freetextValue.trim());
            }}
          />
          <button
            onClick={() => { if (freetextValue.trim()) handleVote(freetextValue.trim()); }}
            disabled={!freetextValue.trim() || locked}
            className="px-5 py-3 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white rounded-xl transition-colors font-medium"
          >
            {hasVoted ? (allowVoteChange ? 'Change' : '✓ Locked') : 'Submit'}
          </button>
        </div>
        {hasVoted && (
          <p className="text-sm text-brand-400">
            {allowVoteChange ? '✓ Vote submitted – you can still change it' : '✓ Vote locked in – waiting for others…'}
          </p>
        )}
        {isMod && (
          <button
            onClick={onReveal}
            className="w-full py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-xl text-sm transition-colors"
          >
            Reveal Cards
          </button>
        )}
      </div>
    );
  }

  const cards = CARD_SETS[cardSet];
  const locked = hasVoted && !allowVoteChange;

  return (
    <div className="bg-navy-900 rounded-2xl p-5 border border-navy-800 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-navy-400">Pick a card</p>
        {hasVoted && (
          <p className="text-sm text-brand-400">
            {allowVoteChange ? '✓ Vote submitted – you can still change it' : '✓ Vote locked in'}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {cards.map((card) => (
          <button
            key={card}
            onClick={() => handleVote(card)}
            disabled={locked}
            className={`
              w-14 h-20 rounded-xl font-bold text-lg transition-all border-2
              ${locked
                ? 'bg-brand-500/20 border-brand-500/50 text-brand-300 cursor-default opacity-60'
                : selectedCard === card
                  ? 'bg-brand-500 border-brand-400 text-white scale-105 cursor-pointer'
                  : 'bg-navy-800 border-navy-700 text-white hover:bg-navy-700 hover:border-brand-500 hover:scale-105 cursor-pointer'}
            `}
          >
            {card}
          </button>
        ))}
      </div>

      {/* Custom input alongside preset deck */}
      {allowCustom && !locked && (
        <div className="border-t border-navy-800 pt-4 space-y-2">
          <p className="text-xs text-navy-500">Or enter a custom value</p>
          <div className="flex gap-2">
            <input
              value={freetextValue}
              onChange={e => setFreetextValue(e.target.value)}
              placeholder="e.g. 2.5d, 3 PT"
              className="flex-1 px-3 py-2 bg-navy-800 border border-navy-700 rounded-xl text-white text-sm placeholder-navy-500 focus:outline-none focus:border-brand-500"
              onKeyDown={e => {
                if (e.key === 'Enter' && freetextValue.trim()) handleVote(freetextValue.trim());
              }}
            />
            <button
              onClick={() => { if (freetextValue.trim()) handleVote(freetextValue.trim()); }}
              disabled={!freetextValue.trim()}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {isMod && (
        <button
          onClick={onReveal}
          className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm transition-colors cursor-pointer"
        >
          Reveal Cards
        </button>
      )}
    </div>
  );
}

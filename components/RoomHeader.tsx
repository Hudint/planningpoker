'use client';
import { useState } from 'react';
import { CARD_SET_LABELS, type CardSetType, type RoomPhase } from '@/types';

interface Props {
  roomId: string;
  connected: boolean;
  isMod: boolean;
  cardSet: CardSetType;
  allowCustom: boolean;
  autoReveal: boolean;
  allowVoteChange: boolean;
  topic: string;
  timerRemaining: number | null;
  phase: RoomPhase;
  onCardSetChange: (cs: CardSetType) => void;
  onAllowCustomChange: (v: boolean) => void;
  onAutoRevealChange: (v: boolean) => void;
  onAllowVoteChangeChange: (v: boolean) => void;
  onTimerStart: (seconds: number) => void;
  onTopicChange: (topic: string) => void;
  onStartVoting: () => void;
}

const TIMER_OPTIONS = [30, 60, 90, 120];

export function RoomHeader({
  roomId, connected, isMod, cardSet, allowCustom, autoReveal, allowVoteChange, topic, timerRemaining,
  phase, onCardSetChange, onAllowCustomChange, onAutoRevealChange, onAllowVoteChangeChange, onTimerStart, onTopicChange,
}: Props) {
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingTopic, setEditingTopic] = useState(false);
  const [topicDraft, setTopicDraft] = useState('');

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimer = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const submitTopic = () => {
    onTopicChange(topicDraft.trim());
    setEditingTopic(false);
  };

  return (
    <header className="border-b border-navy-800 bg-navy-950 px-4 py-3 space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-lg select-none">🃏</span>
        <span className="font-semibold text-navy-200 hidden sm:block">Planning Poker</span>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <code className="text-xs text-navy-500 font-mono truncate hidden md:block">{roomId}</code>
          <button
            onClick={copyLink}
            className="text-xs px-3 py-1.5 bg-navy-800 hover:bg-navy-700 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
          >
            {copied ? '✓ Copied!' : '🔗 Copy link'}
          </button>
        </div>

        {timerRemaining !== null && (
          <div className={`font-mono font-bold text-lg tabular-nums flex-shrink-0 ${
            timerRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-brand-300'
          }`}>
            ⏱ {formatTimer(timerRemaining)}
          </div>
        )}

        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? 'bg-green-500' : 'bg-red-500'}`}
          title={connected ? 'Connected' : 'Disconnected'}
        />

        {isMod && (
          <div className="relative">
            <button
              onClick={() => setShowSettings(v => !v)}
              className="text-navy-400 hover:text-white transition-colors px-2 py-1 cursor-pointer"
              title="Settings"
            >
              ⚙
            </button>
            {showSettings && (
              <div className="absolute right-0 top-9 bg-navy-800 border border-navy-700 rounded-xl p-4 w-64 shadow-xl z-50 space-y-4">
                <div>
                  <p className="text-xs text-navy-400 mb-2 font-medium uppercase tracking-wider">Card Set</p>
                  <div className="grid grid-cols-2 gap-1">
                    {(Object.keys(CARD_SET_LABELS) as CardSetType[]).map(cs => (
                      <button
                        key={cs}
                        onClick={() => { onCardSetChange(cs); }}
                        className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          cardSet === cs ? 'bg-brand-500 text-white' : 'bg-navy-700 text-navy-300 hover:bg-navy-600'
                        }`}
                      >
                        {CARD_SET_LABELS[cs]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Allow custom input alongside preset deck */}
                {cardSet !== 'freetext' && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-navy-300 font-medium">Allow custom input</p>
                      <p className="text-xs text-navy-500">Voters can type any value</p>
                    </div>
                    <button
                      onClick={() => onAllowCustomChange(!allowCustom)}
                      className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                        allowCustom ? 'bg-brand-500' : 'bg-navy-600'
                      }`}
                      role="switch"
                      aria-checked={allowCustom}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        allowCustom ? 'left-5' : 'left-1'
                      }`} />
                    </button>
                  </div>
                )}

                {/* Auto-reveal when all voted */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-navy-300 font-medium">Auto-reveal</p>
                    <p className="text-xs text-navy-500">Reveal when all have voted</p>
                  </div>
                  <button
                    onClick={() => onAutoRevealChange(!autoReveal)}
                    className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                      autoReveal ? 'bg-brand-500' : 'bg-navy-600'
                    }`}
                    role="switch"
                    aria-checked={autoReveal}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      autoReveal ? 'left-5' : 'left-1'
                    }`} />
                  </button>
                </div>

                {/* Allow vote change */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-navy-300 font-medium">Allow vote change</p>
                    <p className="text-xs text-navy-500">Voters can update their answer</p>
                  </div>
                  <button
                    onClick={() => onAllowVoteChangeChange(!allowVoteChange)}
                    className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                      allowVoteChange ? 'bg-brand-500' : 'bg-navy-600'
                    }`}
                    role="switch"
                    aria-checked={allowVoteChange}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      allowVoteChange ? 'left-5' : 'left-1'
                    }`} />
                  </button>
                </div>
                {phase === 'voting' && (
                  <div>
                    <p className="text-xs text-navy-400 mb-2 font-medium uppercase tracking-wider">Timer</p>
                    <div className="flex gap-1 flex-wrap">
                      {TIMER_OPTIONS.map(s => (
                        <button
                          key={s}
                          onClick={() => { onTimerStart(s); setShowSettings(false); }}
                          className="py-1.5 px-3 bg-navy-700 hover:bg-navy-600 rounded-lg text-xs text-navy-300 transition-colors cursor-pointer"
                        >
                          {s}s
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Topic bar */}
      <div className="flex items-center gap-2 text-sm">
        {editingTopic ? (
          <form onSubmit={e => { e.preventDefault(); submitTopic(); }} className="flex gap-2 flex-1">
            <input
              autoFocus
              value={topicDraft}
              onChange={e => setTopicDraft(e.target.value)}
              placeholder="What are we estimating? (optional)"
              className="flex-1 px-3 py-1.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white placeholder-navy-500 focus:outline-none focus:border-brand-400"
            />
            <button type="submit" className="px-3 py-1.5 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-xs cursor-pointer">Set</button>
            <button type="button" onClick={() => setEditingTopic(false)} className="px-3 py-1.5 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-xs cursor-pointer">Cancel</button>
          </form>
        ) : (
          <>
            {topic ? (
              <span className="text-navy-300">
                <span className="text-navy-500 text-xs mr-1">Topic:</span>
                <strong>{topic}</strong>
              </span>
            ) : (
              <span className="text-navy-600 text-xs italic">No topic set</span>
            )}
            {isMod && (
              <button
                onClick={() => { setTopicDraft(topic); setEditingTopic(true); }}
                className="text-xs text-navy-500 hover:text-brand-300 transition-colors cursor-pointer"
              >
                {topic ? 'edit' : '+ set topic'}
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
}

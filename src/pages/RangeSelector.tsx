/**
 * RangeSelector — 169-hand matrix for selecting hero/villain ranges.
 * Pairs on diagonal, suited above, offsuit below.
 */

import React from 'react';

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

interface RangeSelectorProps {
  title?: string;
  selectedHands: Set<string>;
  onHandToggle: (hand: string, selected: boolean) => void;
  preset?: string;
  onPresetSelect?: (name: string) => void;
}

const getHandColor = (hand: string, selected: boolean): string => {
  if (!selected) return 'bg-white/[0.03]';
  const pairs = ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22'];
  if (pairs.includes(hand)) return 'bg-cyan-500/30';
  if (hand.endsWith('s')) return 'bg-cyan-500/15';
  return 'bg-cyan-500/8';
};

const RangeSelector: React.FC<RangeSelectorProps> = React.memo(({
  selectedHands,
  onHandToggle,
}) => (
  <div className="overflow-x-auto">
    <div className="grid" style={{ gridTemplateColumns: `24px repeat(13, 1fr)` }}>
      <div className="h-5 sm:h-6" />
      {RANKS.map(r => (
        <div key={r} className="h-5 sm:h-6 flex items-center justify-center text-[8px] sm:text-[9px] font-bold text-text-secondary/40">{r}</div>
      ))}
      {RANKS.map((r1, i) => (
        <React.Fragment key={r1}>
          <div className="h-5 sm:h-6 flex items-center justify-center text-[8px] sm:text-[9px] font-bold text-text-secondary/40">{r1}</div>
          {RANKS.map((r2, j) => {
            const isPair = i === j;
            const isSuited = i < j;
            const hiRank = RANKS[Math.min(i, j)];
            const loRank = RANKS[Math.max(i, j)];
            const label = isPair ? `${r1}${r2}` : isSuited ? `${hiRank}${loRank}s` : `${hiRank}${loRank}o`;
            const isSelected = selectedHands.has(label);
            return (
              <button
                key={`${i}-${j}`}
                onClick={() => onHandToggle(label, !isSelected)}
                className={`h-5 sm:h-6 rounded-[2px] text-[7px] sm:text-[8px] font-bold transition-all border border-white/[0.03] hover:border-white/20 ${getHandColor(label, isSelected)}`}
                title={label}
              >
                {label}
              </button>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  </div>
));

RangeSelector.displayName = 'RangeSelector';
export { RangeSelector };

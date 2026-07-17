/**
 * SolverPage — Interactive GTO Solver
 *
 * Standalone page for running the Discounted CFR solver with full
 * board/hand/range selection and strategy display.
 */

import React, { useState, useCallback } from 'react';
import { Brain, Info, Play, AlertCircle, CheckCircle, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { solve, getStrategyForHand } from '../engine/gto-solver/solver';
import { cardIndexToString, stringToCardIndex } from '../engine/gto-solver/equity';
import type { CardIndex } from '../engine/gto-solver/types';
import { RangeSelector } from '../components/RangeSelector';

// ── Constants ──
const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUITS = ['c', 'd', 'h', 's'];
const ALL_CARDS: { label: string; index: number }[] = [];
for (let s = 0; s < 4; s++) {
  for (let r = 0; r < 13; r++) {
    ALL_CARDS.push({ label: `${RANKS[r]}${SUITS[s]}`, index: s * 13 + r });
  }
}

// All 169 hand types
const HAND_TYPES: string[] = [];
for (let i = 0; i < 13; i++) {
  for (let j = 0; j < 13; j++) {
    const isPair = i === j;
    const isSuited = i < j;
    const hi = RANKS[Math.min(i, j)];
    const lo = RANKS[Math.max(i, j)];
    HAND_TYPES.push(isPair ? `${hi}${lo}` : isSuited ? `${hi}${lo}s` : `${hi}${lo}o`);
  }
}

// ── Preset ranges ──
const PRESET_RANGES: Record<string, Set<string>> = {
  '100%': new Set(HAND_TYPES),
  'UTR (top 20%)': new Set(['AA','KK','QQ','JJ','TT','99','88','AKs','AQs','AJs','ATs','KQs','KJs','KTs','QJs','JTs','AKo','AQo','AJo','KQo']),
  'Open (top 40%)': new Set(['AA','KK','QQ','JJ','TT','99','88','77','66','AKs','AQs','ATs','KQs','KJs','KTs','QJs','JTs','T9s','A9s','KTo','QTo','JTo','AJo','KQo','AKo','AQo','ATo','KJo','QJo','ATo','KTo']),
  'Wide (top 60%)': new Set(['AA','KK','QQ','JJ','TT','99','88','77','66','55','AKs','AQs','ATs','KQs','KJs','KTs','QJs','JTs','T9s','98s','A9s','A8s','KTo','QTo','JTo','T9o','AJo','KQo','AKo','AQo','ATo','KJo','QJo','ATo','KTo','JTo','A9o','K9o','Q9o']),
};

const STRATEGY_ACTIONS = ['CHECK', 'BET_0_5', 'BET_1', 'RAISE_2', 'FOLD', 'CALL'];
const ACTION_LABELS: Record<string, string> = {
  CHECK: 'Check',
  BET_0_5: 'Bet 1/2 pot',
  BET_1: 'Bet pot',
  RAISE_2: 'Raise 2x',
  FOLD: 'Fold',
  CALL: 'Call',
};

// Progress bar color by action type
const getActionBarColor = (action: string): string => {
  const isAggressive = action === 'BET_0_5' || action === 'BET_1' || action === 'RAISE_2';
  const isFold = action === 'FOLD';
  if (isAggressive) return 'bg-emerald-500';
  if (isFold) return 'bg-amber-500';
  return 'bg-cyan-500';
};

// ── PlayingCard sub-component ──
const SUIT_SYMBOLS: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };

interface PlayingCardProps {
  label: string;
  disabled?: boolean;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

const PlayingCard: React.FC<PlayingCardProps> = React.memo(({ label, disabled, selected, onClick, size = 'sm' }) => {
  const rankChar = label.slice(0, -1);
  const suitChar = label.slice(-1);
  const suitSymbol = SUIT_SYMBOLS[suitChar] || suitChar;
  const displayRank = rankChar === 'T' ? '10' : rankChar;
  const isRed = suitChar === 'h' || suitChar === 'd';
  const suitColor = isRed ? '#ef4444' : '#1e293b';

  const dims = size === 'sm'
    ? { w: 'w-8', h: 'h-12', rank: 'text-[9px]', suit: 'text-sm' }
    : { w: 'w-10', h: 'h-14', rank: 'text-[10px]', suit: 'text-base' };

  const stateClasses = disabled
    ? 'opacity-30 cursor-not-allowed'
    : selected
      ? 'border-gold shadow-[0_0_8px_rgba(212,175,55,0.4)] scale-110 z-10'
      : 'border-gray-200 hover:border-gold/50 hover:shadow-md cursor-pointer';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${dims.w} ${dims.h} bg-white rounded-lg border shadow flex flex-col items-center justify-between p-0.5 transition-all ${stateClasses}`}
      aria-pressed={selected}
    >
      <div className={`${dims.rank} font-bold leading-none`} style={{ color: suitColor }}>
        {displayRank}<span className="text-[0.5em]">{suitSymbol}</span>
      </div>
      <div className={`${dims.suit} leading-none`} style={{ color: suitColor }}>{suitSymbol}</div>
      <div className={`${dims.rank} font-bold leading-none rotate-180`} style={{ color: suitColor }}>
        {displayRank}<span className="text-[0.5em]">{suitSymbol}</span>
      </div>
    </button>
  );
});
PlayingCard.displayName = 'PlayingCard';

// ── SummaryCardRow sub-component ──
const SummaryCardRow: React.FC<{ cards: { label: string }[]; emptyLabel: string }> = ({ cards, emptyLabel }) => (
  <div className="flex items-center gap-1.5">
    {cards.length === 0 ? (
      <span className="text-[10px] text-text-secondary/30 italic">{emptyLabel}</span>
    ) : (
      cards.map((c, i) => (
        <PlayingCard key={i} label={c.label} size="md" />
      ))
    )}
  </div>
);

// ── Component ──
const SolverPage: React.FC = React.memo(() => {
  // Board cards (3-5)
  const [boardCards, setBoardCards] = useState<CardIndex[]>([]);
  const [heroHand, setHeroHand] = useState<CardIndex[]>([]);
  const [showVillain, setShowVillain] = useState(false);
  const [villainHand, setVillainHand] = useState<CardIndex[]>([]);

  // Ranges
  const [heroRange, setHeroRange] = useState<Set<string>>(PRESET_RANGES['UTR (top 20%)']);
  const [villainRange, setVillainRange] = useState<Set<string>>(PRESET_RANGES['UTR (top 20%)']);
  const [heroPreset, setHeroPreset] = useState('');
  const [villainPreset, setVillainPreset] = useState('');

  // Solver state
  const [iterations, setIterations] = useState(200);
  const [result, setResult] = useState<{ result: ReturnType<typeof solve>; handStrategy: Map<string, number>; time: number } | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const boardCardsFiltered = boardCards.filter(c => c !== undefined);
  const heroCardsFiltered = heroHand.filter(c => c !== undefined);
  const villainCardsFiltered = showVillain ? villainHand.filter(c => c !== undefined) : [];

  // Cards as labels for display
  const boardLabels = boardCardsFiltered.map(idx => ALL_CARDS.find(c => c.index === idx)!).filter(Boolean);
  const heroLabels = heroCardsFiltered.map(idx => ALL_CARDS.find(c => c.index === idx)!).filter(Boolean);
  const villainLabels = villainCardsFiltered.map(idx => ALL_CARDS.find(c => c.index === idx)!).filter(Boolean);

  // Build disabled set for card pickers
  const isCardDisabled = useCallback((cardIdx: number, context: 'board' | 'hero' | 'villain'): boolean => {
    if (context === 'board') return false;
    if (boardCardsFiltered.includes(cardIdx)) return true;
    if (context === 'villain' && heroCardsFiltered.includes(cardIdx)) return true;
    return false;
  }, [boardCardsFiltered, heroCardsFiltered]);

  const isCardSelected = useCallback((cardIdx: number, context: 'board' | 'hero' | 'villain'): boolean => {
    if (context === 'board') return boardCardsFiltered.includes(cardIdx);
    if (context === 'hero') return heroCardsFiltered.includes(cardIdx);
    return villainCardsFiltered.includes(cardIdx);
  }, [boardCardsFiltered, heroCardsFiltered, villainCardsFiltered]);

  const handleBoardToggle = useCallback((cardIdx: number) => {
    setBoardCards(prev => {
      if (prev.includes(cardIdx)) return prev.filter(c => c !== cardIdx);
      if (prev.length >= 5) return prev;
      return [...prev, cardIdx];
    });
    setError(null);
    setResult(null);
  }, []);

  const handleHeroHandToggle = useCallback((cardIdx: number) => {
    setHeroHand(prev => {
      if (prev.includes(cardIdx)) return prev.filter(c => c !== cardIdx);
      if (prev.length >= 2) return prev;
      return [...prev, cardIdx];
    });
    setError(null);
    setResult(null);
  }, []);

  const handleVillainHandToggle = useCallback((cardIdx: number) => {
    setVillainHand(prev => {
      if (prev.includes(cardIdx)) return prev.filter(c => c !== cardIdx);
      if (prev.length >= 2) return prev;
      return [...prev, cardIdx];
    });
    setError(null);
    setResult(null);
  }, []);

  const applyHeroPreset = useCallback((name: string) => {
    const rng = PRESET_RANGES[name];
    if (rng) { setHeroRange(rng); setHeroPreset(name); }
    else if (name === 'Custom') setHeroPreset('');
  }, []);

  const applyVillainPreset = useCallback((name: string) => {
    const rng = PRESET_RANGES[name];
    if (rng) { setVillainRange(rng); setVillainPreset(name); }
    else if (name === 'Custom') setVillainPreset('');
  }, []);

  const handleSolve = useCallback(async () => {
    setError(null);
    setResult(null);

    if (boardCardsFiltered.length < 3) {
      setError('Board needs at least 3 cards (flop).');
      return;
    }
    if (heroCardsFiltered.length < 2) {
      setError('Select 2 hero hole cards.');
      return;
    }
    if (heroRange.size === 0) {
      setError('Hero range is empty.');
      return;
    }

    setIsSolving(true);

    try {
      // Convert ranges to indices
      const heroIndices: number[] = [];
      const villainIndices: number[] = [];
      for (const ht of HAND_TYPES) {
        if (heroRange.has(ht)) heroIndices.push(HAND_TYPES.indexOf(ht));
        if (villainRange.has(ht)) villainIndices.push(HAND_TYPES.indexOf(ht));
      }

      if (heroIndices.length === 0) throw new Error('Hero range converted to 0 hands.');
      if (villainIndices.length === 0) throw new Error('Villain range converted to 0 hands.');

      const solveResult = solve(
        boardCardsFiltered as CardIndex[],
        heroIndices,
        villainIndices,
        { iterations, stackSize: 100, potSize: 2 },
      );

      const handStrategy = getStrategyForHand(solveResult, heroCardsFiltered as CardIndex[], boardCardsFiltered as CardIndex[]);
      setResult({ result: solveResult, handStrategy, time: solveResult.solveTimeMs });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Solver failed.');
    } finally {
      setIsSolving(false);
    }
  }, [boardCardsFiltered, heroCardsFiltered, heroRange, villainRange, iterations]);

  const handleReset = useCallback(() => {
    setBoardCards([]);
    setHeroHand([]);
    setVillainHand([]);
    setShowVillain(false);
    setHeroRange(PRESET_RANGES['UTR (top 20%)']);
    setVillainRange(PRESET_RANGES['UTR (top 20%)']);
    setHeroPreset('');
    setVillainPreset('');
    setResult(null);
    setError(null);
  }, []);

  // Convert strategy map to hero/villain split
  const heroStrategy = result ? Array.from(result.handStrategy.entries()).filter(([k]) => k.startsWith('0_')) : [];
  const villainStrategy = result ? Array.from(result.handStrategy.entries()).filter(([k]) => k.startsWith('1_')) : [];

  // ── Progress bar sub-component ──
  const StrategyBar: React.FC<{ action: string; prob: number }> = ({ action, prob }) => {
    const pct = (prob * 100).toFixed(1);
    const barColor = getActionBarColor(action);
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-text-secondary/60 font-semibold w-[72px] shrink-0 text-right">
          {ACTION_LABELS[action] || action}
        </span>
        <div className="flex-1 h-5 bg-white/[0.04] rounded-full overflow-hidden border border-white/5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.max(Number(pct), 1)}%` }}
          />
        </div>
        <span className="text-[10px] font-mono font-bold text-text-primary w-[42px] shrink-0 text-right">
          {pct}%
        </span>
      </div>
    );
  };

  // Strategy group sub-component
  const StrategyGroup: React.FC<{ title: string; strategies: [string, number][]; accentClass: string }> = ({ title, strategies, accentClass }) => {
    if (strategies.length === 0) return null;
    return (
      <div className="mb-4">
        <h4 className={`text-[10px] uppercase tracking-wider font-bold mb-2 ${accentClass}`}>{title}</h4>
        <div className="space-y-1.5">
          {strategies.map(([key, prob]) => {
            const action = key.includes('_') ? key.slice(key.indexOf('_') + 1) : key;
            return <StrategyBar key={key} action={action} prob={prob} />;
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
          <Brain size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-black">GTO Solver</h2>
          <p className="text-xs text-text-secondary/50">Discounted CFR — Game Theory Optimal Strategy</p>
        </div>
      </div>

      {/* Selected cards summary bar */}
      {(boardLabels.length > 0 || heroLabels.length > 0) && (
        <div className="card border-gold/10 bg-gold/[0.03]">
          <div className="flex flex-wrap items-start gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-text-secondary/40 uppercase tracking-wider font-bold">Board ({boardLabels.length})</span>
              <SummaryCardRow cards={boardLabels} emptyLabel="No board cards" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-text-secondary/40 uppercase tracking-wider font-bold">Hero</span>
              <SummaryCardRow cards={heroLabels} emptyLabel="No hero cards" />
            </div>
            {showVillain && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary/40 uppercase tracking-wider font-bold">Villain</span>
                <SummaryCardRow cards={villainLabels} emptyLabel="Not set" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* How to Use */}
      <div className="card border-blue-500/15 bg-blue-500/[0.04]">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-blue-400" />
            <h3 className="font-bold text-sm text-text-primary">How to Use the GTO Solver</h3>
          </div>
          <p className="text-xs text-text-secondary/60 leading-relaxed">
            The solver computes a Game Theory Optimal (GTO) strategy using Discounted Counterfactual Regret Minimization (DCFR).
            It tells you the mathematically optimal mix of actions (check, bet, raise, fold, call) for your hand against a known range,
            assuming both players play optimally. This is for <strong className="text-text-primary">educational purposes</strong> —
            real solvers like PioSolver or GTO+ use millions of iterations and full tree traversal.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase tracking-wider font-bold text-cyan-400">Step-by-Step</h4>
              <ol className="space-y-2 text-xs text-text-secondary/70 list-decimal list-inside">
                <li>
                  <strong className="text-text-primary">Board:</strong> Click cards to build the community cards. Start with 3 for a flop, add 1 more for turn, 2 for river.
                  The solver calculates strategy for each street independently based on the board state.
                </li>
                <li>
                  <strong className="text-text-primary">Hero Hand:</strong> Select your 2 hole cards. This is the specific hand the solver will analyze.
                  The strategy shown is for this exact hand combination against the villain's range.
                </li>
                <li>
                  <strong className="text-text-primary">Ranges:</strong> Define what hands your opponent could have (villain range) and what hands you play (hero range).
                  Presets give you common opening/calling ranges. The matrix shows all 169 starting hand types — pairs on the diagonal, suited hands above, offsuit below.
                </li>
                <li>
                  <strong className="text-text-primary">Iterations:</strong> Controls solver accuracy. 200 is fast and decent for learning. 500-1000 gives more precise results but takes longer.
                  More iterations = lower exploitability (closer to true GTO).
                </li>
                <li>
                  <strong className="text-text-primary">Solve:</strong> Runs the algorithm and displays the strategy breakdown for both players.
                  The results show the probability of each action at each decision point.
                </li>
              </ol>
            </div>
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase tracking-wider font-bold text-gold">Understanding Results</h4>
              <div className="space-y-2 text-xs text-text-secondary/70">
                <div>
                  <strong className="text-text-primary">Exploitability:</strong> How far from perfect GTO the solution is. Lower is better — 0 means perfectly optimal.
                  Expect higher values with fewer iterations or complex board textures.
                </div>
                <div>
                  <strong className="text-text-primary">Hero/Villain Strategy:</strong> Each action (Check, Bet, Raise, Fold, Call) shows the percentage of time you should play it.
                  A balanced GTO strategy often mixes actions — e.g., bet 60% of the time and check 40%.
                </div>
                <div>
                  <strong className="text-text-primary">Strategy Bars:</strong> Green bars are value/aggressive actions (bets, raises). Cyan are passive (checks, calls). Amber are folds.
                  The bar length represents the frequency of that action in your optimal mix.
                </div>
                <div>
                  <strong className="text-text-primary">Villain Hand:</strong> Optional — you can select specific villain hole cards to see head-to-head strategy.
                  Most real-world situations use ranges, not exact cards.
                </div>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-white/5">
            <h4 className="text-[10px] uppercase tracking-wider font-bold text-text-secondary/50 mb-2">Quick Tips</h4>
            <ul className="space-y-1 text-[11px] text-text-secondary/60">
              <li>• Try AQs on a K-7-2 rainbow board to see how polarized your betting range should be</li>
              <li>• Compare preflop open ranges (UTR vs Open vs Wide) to see how position affects strategy</li>
              <li>• Higher iterations give smoother strategy distributions — use 500+ for serious study</li>
              <li>• The solver works best with clear range definitions. Vague ranges produce less meaningful results</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Board Selection */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Eye size={14} className="text-cyan-400" /> Board Cards ({boardCardsFiltered.length}/5)
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-secondary/30">Community cards dealt during the hand</span>
            <button onClick={() => setBoardCards([])} className="text-[10px] text-text-secondary/40 hover:text-text-primary transition-colors">
              Clear
            </button>
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-1.5">
          {ALL_CARDS.map(c => {
            const isDisabled = isCardDisabled(c.index, 'board');
            const isSelected = isCardSelected(c.index, 'board');
            return (
              <PlayingCard
                key={c.index}
                label={c.label}
                disabled={isDisabled}
                selected={isSelected}
                onClick={() => handleBoardToggle(c.index)}
              />
            );
          })}
        </div>
      </div>

      {/* Hero Hand */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Eye size={14} className="text-gold" /> Hero Hand ({heroCardsFiltered.length}/2)
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-secondary/30">Your 2 private hole cards</span>
            <button onClick={() => setHeroHand([])} className="text-[10px] text-text-secondary/40 hover:text-text-primary transition-colors">
              Clear
            </button>
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-1.5">
          {ALL_CARDS.map(c => {
            const isDisabled = isCardDisabled(c.index, 'hero');
            const isSelected = isCardSelected(c.index, 'hero');
            return (
              <PlayingCard
                key={c.index}
                label={c.label}
                disabled={isDisabled}
                selected={isSelected}
                onClick={() => handleHeroHandToggle(c.index)}
              />
            );
          })}
        </div>
      </div>

      {/* Villain Hand (toggleable) */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            {showVillain ? <Eye size={14} className="text-purple-400" /> : <EyeOff size={14} className="text-text-secondary/40" />}
            Villain Hand ({villainCardsFiltered.length}/2)
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowVillain(!showVillain)}
              className="text-[10px] text-text-secondary/40 hover:text-text-primary transition-colors"
            >
              {showVillain ? 'Hide' : 'Show'}
            </button>
            <button
              onClick={() => setVillainHand([])}
              disabled={!showVillain}
              className="text-[10px] text-text-secondary/40 hover:text-text-primary transition-colors disabled:opacity-30"
            >
              Clear
            </button>
          </div>
        </div>
        {showVillain && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-1.5">
            {ALL_CARDS.map(c => {
              const isDisabled = isCardDisabled(c.index, 'villain');
              const isSelected = isCardSelected(c.index, 'villain');
              return (
                <PlayingCard
                  key={c.index}
                  label={c.label}
                  disabled={isDisabled}
                  selected={isSelected}
                  onClick={() => handleVillainHandToggle(c.index)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Ranges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-sm text-cyan-400">Hero Range</h3>
            <span className="text-[10px] text-text-secondary/30">{heroRange.size} hands selected</span>
          </div>
          <p className="text-[10px] text-text-secondary/40 mb-3">Your complete playing range for this position. Presets cover common open-raising frequencies.</p>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {Object.keys(PRESET_RANGES).map(name => (
              <button
                key={name}
                onClick={() => applyHeroPreset(name)}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all border ${
                  heroPreset === name
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                    : 'bg-white/5 border-white/10 text-text-secondary/50 hover:border-white/20'
                }`}
              >
                {name}
              </button>
            ))}
            <button
              onClick={() => applyHeroPreset('Custom')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all border ${
                !heroPreset ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300' : 'bg-white/5 border-white/10 text-text-secondary/50 hover:border-white/20'
              }`}
            >
              Custom
            </button>
          </div>
          <RangeSelector
            title=""
            selectedHands={heroRange}
            onHandToggle={(hand, sel) => {
              setHeroRange(prev => { const n = new Set(prev); sel ? n.add(hand) : n.delete(hand); return n; });
            }}
            preset={heroPreset}
            onPresetSelect={applyHeroPreset}
          />
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-sm text-purple-400">Villain Range</h3>
            <span className="text-[10px] text-text-secondary/30">{villainRange.size} hands selected</span>
          </div>
          <p className="text-[10px] text-text-secondary/40 mb-3">What hands your opponent could have. In practice, you estimate ranges based on their position and tendencies.</p>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {Object.keys(PRESET_RANGES).map(name => (
              <button
                key={name}
                onClick={() => applyVillainPreset(name)}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all border ${
                  villainPreset === name
                    ? 'bg-purple-500/20 border-purple-400/50 text-purple-300'
                    : 'bg-white/5 border-white/10 text-text-secondary/50 hover:border-white/20'
                }`}
              >
                {name}
              </button>
            ))}
            <button
              onClick={() => applyVillainPreset('Custom')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all border ${
                !villainPreset ? 'bg-purple-500/20 border-purple-400/50 text-purple-300' : 'bg-white/5 border-white/10 text-text-secondary/50 hover:border-white/20'
              }`}
            >
              Custom
            </button>
          </div>
          <RangeSelector
            title=""
            selectedHands={villainRange}
            onHandToggle={(hand, sel) => {
              setVillainRange(prev => { const n = new Set(prev); sel ? n.add(hand) : n.delete(hand); return n; });
            }}
            preset={villainPreset}
            onPresetSelect={applyVillainPreset}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="card flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <label className="text-xs text-text-secondary/60 font-semibold block mb-1">
            Iterations: <span className="text-cyan-400 font-mono">{iterations}</span>
          </label>
          <p className="text-[10px] text-text-secondary/40 mb-2">More = more accurate but slower. 200 for quick checks, 500+ for serious study.</p>
          <input
            type="range" min={50} max={1000} step={50} value={iterations}
            onChange={e => setIterations(Number(e.target.value))}
            className="w-full slider-cyan"
            style={{ '--slider-pct': `${((iterations - 50) / 950) * 100}%` } as React.CSSProperties}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSolve}
            disabled={isSolving || boardCardsFiltered.length < 3 || heroCardsFiltered.length < 2}
            className="btn-primary flex items-center gap-1.5 text-xs px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSolving ? <RotateCcw size={14} className="animate-spin" /> : <Play size={14} />}
            {isSolving ? 'Solving...' : 'Solve'}
          </button>
          <button onClick={handleReset} className="btn-ghost flex items-center gap-1.5 text-xs px-3 py-2">
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="card border-cyan-500/20 bg-cyan-500/[0.03]">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={14} className="text-green-400" />
              <h3 className="font-bold text-sm text-cyan-400">Solution Complete</h3>
              <span className="text-[10px] text-text-secondary/40 ml-auto">
                {result.time}ms · {result.result.iterations} iter · Expl: {result.result.exploitability.toFixed(4)}
              </span>
            </div>
            <p className="text-[10px] text-text-secondary/50 mb-3">
              This is the optimal strategy mix for the selected hand on this board against the defined ranges.
              Percentages show how often each action should be played in equilibrium.
            </p>
            <div className="text-xs text-text-secondary/60 mb-4">
              Board: <span className="font-mono text-text-primary">{boardCardsFiltered.map(cardIndexToString).join(' ')}</span>
              {heroCardsFiltered.length > 0 && (
                <> · Hero: <span className="font-mono text-gold">{heroCardsFiltered.map(cardIndexToString).join('')}</span></>
              )}
            </div>

            {heroStrategy.length === 0 && villainStrategy.length === 0 && (
              <p className="text-xs text-text-secondary/50">No strategy data available for this hand/board combination.</p>
            )}

            <StrategyGroup title="Hero Strategy" strategies={heroStrategy} accentClass="text-cyan-400" />
            <StrategyGroup title="Villain Strategy" strategies={villainStrategy} accentClass="text-purple-400" />
          </div>
        </div>
      )}
    </div>
  );
});

SolverPage.displayName = 'SolverPage';
export default SolverPage;

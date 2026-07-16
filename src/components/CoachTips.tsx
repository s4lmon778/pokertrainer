import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { Lightbulb, X, ChevronRight, Filter, ThumbsUp, ThumbsDown, History, Clock, RotateCcw } from 'lucide-react';

// ── Context-aware poker tips with categories ──

type TipCategory = 'strategy' | 'math' | 'psychology' | 'bankroll' | 'general';
type TipContext = 'any' | 'preflop' | 'flop' | 'turn' | 'river' | 'bluff' | 'value' | 'position';
type TipImportance = 'low' | 'medium' | 'high';

interface CoachTip {
  id: string;
  text: string;
  context: TipContext;
  category: TipCategory;
  importance: TipImportance;
  weight: number;
}

interface TipHistoryEntry {
  tipId: string;
  text: string;
  category: TipCategory;
  importance: TipImportance;
  shownAt: number;
  feedback?: 'up' | 'down';
}

const COACH_TIPS: CoachTip[] = [
  // ── STRATEGY TIPS ──
  // Position
  { id: 'strat-pos-1', text: 'Play tighter in early position — you have more players acting after you.', context: 'position', category: 'strategy', importance: 'high', weight: 3 },
  { id: 'strat-pos-2', text: 'Late position is powerful — steal blinds more often from the button.', context: 'position', category: 'strategy', importance: 'medium', weight: 2 },
  { id: 'strat-pos-3', text: 'Bluff frequency should decrease in early position and increase on the button.', context: 'position', category: 'strategy', importance: 'medium', weight: 2 },
  // Preflop
  { id: 'strat-pre-1', text: 'Premium hands (AA, KK, QQ, AKs) should almost always be raised preflop.', context: 'preflop', category: 'strategy', importance: 'high', weight: 3 },
  { id: 'strat-pre-2', text: 'Suited connectors like 78s play well in multi-way pots — call small raises with them.', context: 'preflop', category: 'strategy', importance: 'medium', weight: 2 },
  { id: 'strat-pre-3', text: 'In early position, fold weak aces (A2–A9 offsuit) — they\'re easily dominated.', context: 'preflop', category: 'strategy', importance: 'medium', weight: 2 },
  { id: 'strat-pre-4', text: '3-betting preflop narrows the field and defines your opponent\'s hand range.', context: 'preflop', category: 'strategy', importance: 'medium', weight: 2 },
  { id: 'strat-pre-5', text: 'Your opening raise size should be consistent — 2.5x–3x BB regardless of hand strength.', context: 'preflop', category: 'strategy', importance: 'medium', weight: 2 },
  // Flop
  { id: 'strat-flop-1', text: 'On a wet flop (connected, suited), bet larger to charge draws.', context: 'flop', category: 'strategy', importance: 'high', weight: 3 },
  { id: 'strat-flop-2', text: 'A dry flop (rainbow, unconnected) favors the preflop raiser — continuation bet often.', context: 'flop', category: 'strategy', importance: 'medium', weight: 2 },
  { id: 'strat-flop-3', text: 'Check-raising can be powerful, but save it for strong hands or credible bluffs.', context: 'flop', category: 'strategy', importance: 'medium', weight: 2 },
  { id: 'strat-flop-4', text: 'On paired boards, your opponent is less likely to have trips — c-bet smaller.', context: 'flop', category: 'strategy', importance: 'low', weight: 1 },
  // Turn
  { id: 'strat-turn-1', text: 'The turn is where pots grow — bet sizing should reflect your hand strength.', context: 'turn', category: 'strategy', importance: 'medium', weight: 2 },
  { id: 'strat-turn-2', text: 'If a draw completes on the turn, slow down with one-pair hands.', context: 'turn', category: 'strategy', importance: 'medium', weight: 2 },
  { id: 'strat-turn-3', text: 'Double barreling the turn shows real strength — use it selectively.', context: 'turn', category: 'strategy', importance: 'low', weight: 1 },
  // River
  { id: 'strat-river-1', text: 'River decisions are final — take your time and think through their range.', context: 'river', category: 'strategy', importance: 'high', weight: 3 },
  { id: 'strat-river-2', text: 'On the river, bluff only when the board texture supports a credible story.', context: 'river', category: 'strategy', importance: 'medium', weight: 2 },
  { id: 'strat-river-3', text: 'Thin value betting on the river separates good players from great ones.', context: 'river', category: 'strategy', importance: 'low', weight: 1 },
  { id: 'strat-river-4', text: 'Polarize your river bets — either very strong or a bluff. Medium hands check back.', context: 'river', category: 'strategy', importance: 'medium', weight: 2 },
  // Bluff
  { id: 'strat-bluff-1', text: 'The best bluff cards are those that complete obvious draws — your story must make sense.', context: 'bluff', category: 'strategy', importance: 'medium', weight: 2 },
  { id: 'strat-bluff-2', text: 'Don\'t bluff into multiple opponents — the chance someone has a hand increases.', context: 'bluff', category: 'strategy', importance: 'medium', weight: 2 },
  { id: 'strat-bluff-3', text: 'Semi-bluffs (betting with a draw) are profitable because you can win now or later.', context: 'bluff', category: 'strategy', importance: 'medium', weight: 2 },
  // Value
  { id: 'strat-val-1', text: 'Bet for value when you think worse hands will call — size based on what they\'ll pay.', context: 'value', category: 'strategy', importance: 'medium', weight: 2 },
  { id: 'strat-val-2', text: 'Don\'t slow-play monsters on wet boards — protect your equity.', context: 'value', category: 'strategy', importance: 'medium', weight: 2 },
  { id: 'strat-val-3', text: 'Extract maximum value from fish — they call too wide, so bet your strong hands big.', context: 'value', category: 'strategy', importance: 'low', weight: 1 },

  // ── MATH TIPS ──
  { id: 'math-1', text: 'Pot odds: if pot is $100 and opponent bets $50, you need 25% equity to break even.', context: 'any', category: 'math', importance: 'high', weight: 3 },
  { id: 'math-2', text: 'The rule of 2 and 4: multiply outs by 2 (one card) or 4 (two cards) for win %.', context: 'any', category: 'math', importance: 'high', weight: 3 },
  { id: 'math-3', text: 'A flush draw has 9 outs — about 36% to hit by the river with two cards to come.', context: 'flop', category: 'math', importance: 'medium', weight: 2 },
  { id: 'math-4', text: 'An open-ended straight draw has 8 outs — about 32% to hit by the river.', context: 'flop', category: 'math', importance: 'medium', weight: 2 },
  { id: 'math-5', text: 'Implied odds: consider how much more you can win if you hit your draw.', context: 'any', category: 'math', importance: 'medium', weight: 2 },
  { id: 'math-6', text: 'A gutshot straight draw has only 4 outs — about 16% by the river. Fold to big bets.', context: 'flop', category: 'math', importance: 'medium', weight: 2 },
  { id: 'math-7', text: 'Expected Value (EV) = (Win% × Pot) − (Lose% × Bet). Positive EV = profitable long term.', context: 'any', category: 'math', importance: 'medium', weight: 2 },
  { id: 'math-8', text: 'You need at least 33% equity against their calling range for a pot-sized bluff to break even.', context: 'any', category: 'math', importance: 'low', weight: 1 },
  { id: 'math-9', text: 'Minimum defense frequency: if opponent risks X to win Y, defend at least Y/(X+Y) of your range.', context: 'any', category: 'math', importance: 'low', weight: 1 },

  // ── PSYCHOLOGY TIPS ──
  { id: 'psych-1', text: 'Avoid tilt — recognize when emotions affect your decisions and take a break.', context: 'any', category: 'psychology', importance: 'high', weight: 3 },
  { id: 'psych-2', text: 'Your table image matters. If you\'ve been folding a lot, your bluffs get more respect.', context: 'any', category: 'psychology', importance: 'medium', weight: 2 },
  { id: 'psych-3', text: 'Don\'t be results-oriented — a good fold that would have won is still a good fold.', context: 'any', category: 'psychology', importance: 'medium', weight: 2 },
  { id: 'psych-4', text: 'Opponents on tilt play looser and more aggressively — adjust by tightening up.', context: 'any', category: 'psychology', importance: 'medium', weight: 2 },
  { id: 'psych-5', text: 'The "sunk cost" fallacy: chips already in the pot are gone. Decide based on future EV.', context: 'any', category: 'psychology', importance: 'medium', weight: 2 },
  { id: 'psych-6', text: 'Confidence is key — hesitation at the table signals weakness to observant opponents.', context: 'any', category: 'psychology', importance: 'low', weight: 1 },
  { id: 'psych-7', text: 'Winning players fold more than losing players. Discipline > aggression in the long run.', context: 'any', category: 'psychology', importance: 'medium', weight: 2 },
  { id: 'psych-8', text: 'After a big loss, take a few seconds to reset. The next hand is independent.', context: 'any', category: 'psychology', importance: 'low', weight: 1 },

  // ── BANKROLL MANAGEMENT TIPS ──
  { id: 'bank-1', text: 'Never risk more than 5% of your bankroll on a single hand. Variance is real.', context: 'any', category: 'bankroll', importance: 'high', weight: 3 },
  { id: 'bank-2', text: 'For cash games, keep at least 20–30 buy-ins in your bankroll to survive downswings.', context: 'any', category: 'bankroll', importance: 'medium', weight: 2 },
  { id: 'bank-3', text: 'Move down in stakes if your bankroll drops below 20 buy-ins — protect your funds.', context: 'any', category: 'bankroll', importance: 'medium', weight: 2 },
  { id: 'bank-4', text: 'Track your win rate over at least 10,000 hands before judging your skill level.', context: 'any', category: 'bankroll', importance: 'medium', weight: 2 },
  { id: 'bank-5', text: 'Set stop-loss limits: quit for the day if you lose 3 buy-ins. Tomorrow is another day.', context: 'any', category: 'bankroll', importance: 'medium', weight: 2 },
  { id: 'bank-6', text: 'Your bankroll is your tool — without it, you can\'t play. Protect it above all else.', context: 'any', category: 'bankroll', importance: 'low', weight: 1 },

  // ── GENERAL TIPS ──
  { id: 'gen-1', text: 'Think in ranges, not specific hands — what could your opponent have here?', context: 'any', category: 'general', importance: 'high', weight: 3 },
  { id: 'gen-2', text: 'Consider your opponent\'s position — players in late position have wider ranges.', context: 'any', category: 'general', importance: 'medium', weight: 2 },
  { id: 'gen-3', text: 'Fold equity is real value — sometimes the best hand is the one you don\'t show.', context: 'any', category: 'general', importance: 'medium', weight: 2 },
  { id: 'gen-4', text: 'Mix up your play — predictability is a leak. Sometimes raise with marginal hands.', context: 'any', category: 'general', importance: 'low', weight: 1 },
  { id: 'gen-5', text: 'Take notes on your own play. Reviewing mistakes is the fastest way to improve.', context: 'any', category: 'general', importance: 'low', weight: 1 },
  { id: 'gen-6', text: 'Remember: poker is a long-term game. One hand doesn\'t define your session.', context: 'any', category: 'general', importance: 'low', weight: 1 },
  { id: 'gen-7', text: 'Track your opponents\' tendencies — are they tight, loose, aggressive, or passive?', context: 'any', category: 'general', importance: 'medium', weight: 2 },
];

const CATEGORY_COLORS: Record<TipCategory, string> = {
  strategy: 'text-gold border-gold/30 bg-gold/10',
  math: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
  psychology: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  bankroll: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
  general: 'text-text-secondary/70 border-white/20 bg-white/5',
};

const CATEGORY_LABELS: Record<TipCategory, string> = {
  strategy: 'Strategy',
  math: 'Math',
  psychology: 'Psychology',
  bankroll: 'Bankroll',
  general: 'General',
};

// ── LocalStorage keys ──
const STORAGE_KEY_ENABLED = 'pokertrainer-coach-tips-enabled';
const STORAGE_KEY_DISMISSED = 'pokertrainer-coach-tips-dismissed';
const STORAGE_KEY_CATEGORY = 'pokertrainer-coach-tips-category';
const STORAGE_KEY_FREQUENCY = 'pokertrainer-coach-tips-frequency';
const STORAGE_KEY_HISTORY = 'pokertrainer-coach-tips-history';
const STORAGE_KEY_FEEDBACK = 'pokertrainer-coach-tips-feedback';

type TipFrequency = 30000 | 60000 | 120000;
const FREQUENCY_OPTIONS: { value: TipFrequency; label: string }[] = [
  { value: 30000, label: 'Every 30s' },
  { value: 60000, label: 'Every 60s' },
  { value: 120000, label: 'Every 2min' },
];
const TIP_DISPLAY_MS = 10000;
const MAX_HISTORY = 30;

const CoachTips: React.FC = React.memo(() => {
  const gameState = useGameStore(s => s.gameState);
  const isPlaying = useGameStore(s => s.isPlaying);
  const stats = useGameStore(s => s.stats);
  const gameHistory = useGameStore(s => s.gameHistory);

  const [enabled, setEnabled] = useState<boolean>(() => {
    try { const v = localStorage.getItem(STORAGE_KEY_ENABLED); return v !== null ? v === 'true' : true; }
    catch { return true; }
  });
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try { const v = localStorage.getItem(STORAGE_KEY_DISMISSED); return v ? new Set(JSON.parse(v)) : new Set(); }
    catch { return new Set(); }
  });
  const [activeCategory, setActiveCategory] = useState<TipCategory | 'all'>(() => {
    try { const v = localStorage.getItem(STORAGE_KEY_CATEGORY); return (v as TipCategory | 'all') || 'all'; }
    catch { return 'all'; }
  });
  const [frequency, setFrequency] = useState<TipFrequency>(() => {
    try { const v = localStorage.getItem(STORAGE_KEY_FREQUENCY); const n = parseInt(v || ''); return (n === 30000 || n === 60000 || n === 120000) ? n : 60000; }
    catch { return 60000; }
  });
  const [tipHistory, setTipHistory] = useState<TipHistoryEntry[]>(() => {
    try { const v = localStorage.getItem(STORAGE_KEY_HISTORY); return v ? JSON.parse(v) : []; }
    catch { return []; }
  });
  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'up' | 'down'>>(() => {
    try { const v = localStorage.getItem(STORAGE_KEY_FEEDBACK); return v ? JSON.parse(v) : {}; }
    catch { return {}; }
  });
  const [currentTip, setCurrentTip] = useState<CoachTip | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const foldStreakRef = useRef(0);

  // Detect recent player behavior
  const recentBehavior = useMemo(() => {
    const recent = gameHistory.slice(-5);
    const folds = recent.filter(h => h.botResult < 0).length;
    const wins = recent.filter(h => h.botResult > 0).length;
    return {
      foldingALot: folds >= 3 && recent.length >= 3,
      winningStreak: wins >= 3 && recent.length >= 3,
      losingStreak: folds >= 3 && recent.length >= 3,
      highFoldPct: stats.totalHands > 10 && (stats.totalFolds / Math.max(1, stats.totalBets + stats.totalCalls + stats.totalFolds)) > 0.6,
    };
  }, [gameHistory, stats]);

  // Persist preferences
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_ENABLED, String(enabled)); } catch { /* noop */ }
  }, [enabled]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_DISMISSED, JSON.stringify([...dismissedIds])); } catch { /* noop */ }
  }, [dismissedIds]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_CATEGORY, activeCategory); } catch { /* noop */ }
  }, [activeCategory]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_FREQUENCY, String(frequency)); } catch { /* noop */ }
  }, [frequency]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(tipHistory.slice(-MAX_HISTORY))); } catch { /* noop */ }
  }, [tipHistory]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_FEEDBACK, JSON.stringify(feedbackMap)); } catch { /* noop */ }
  }, [feedbackMap]);

  // Reset dismissed set size cap (keep last 50)
  useEffect(() => {
    if (dismissedIds.size > 50) {
      const arr = [...dismissedIds];
      setDismissedIds(new Set(arr.slice(arr.length - 50)));
    }
  }, [dismissedIds]);

  // Pick a context-aware tip
  const pickTip = useCallback(() => {
    const phase = gameState?.currentPhase || 'preflop';
    const phaseContext: TipContext = phase === 'preflop' ? 'preflop' :
      phase === 'flop' ? 'flop' :
      phase === 'turn' ? 'turn' :
      phase === 'river' ? 'river' : 'any';

    // Filter by active category
    let pool = activeCategory === 'all'
      ? COACH_TIPS
      : COACH_TIPS.filter(t => t.category === activeCategory);

    // Remove permanently dismissed tips
    pool = pool.filter(t => !dismissedIds.has(t.id));

    // If all tips in category are dismissed, show from any category
    if (pool.length === 0) {
      pool = COACH_TIPS.filter(t => !dismissedIds.has(t.id));
    }
    if (pool.length === 0) {
      // All tips dismissed — reset
      setDismissedIds(new Set());
      pool = [...COACH_TIPS];
    }

    // Score tips by context, importance, and behavior match
    const scored = pool.map(tip => {
      let score = tip.weight;
      // Importance bonus
      if (tip.importance === 'high') score += 3;
      else if (tip.importance === 'medium') score += 1;
      // Phase match
      if (tip.context === phaseContext) score += 5;
      if (tip.context === 'any') score += 1;
      // Behavior match
      if (recentBehavior.foldingALot && (tip.context === 'preflop' || tip.category === 'strategy')) score += 3;
      if (recentBehavior.losingStreak && tip.category === 'psychology') score += 4;
      if (recentBehavior.winningStreak && tip.category === 'bankroll') score += 2;
      if (recentBehavior.highFoldPct && tip.context === 'preflop') score += 3;
      // Add jitter to avoid always showing same tip
      score += Math.random() * 1.5;
      return { tip, score };
    });

    // Weighted random selection
    const total = scored.reduce((s, { score }) => s + score, 0);
    let rand = Math.random() * total;
    for (const { tip, score } of scored) {
      rand -= score;
      if (rand <= 0) return tip;
    }
    return pool[0];
  }, [gameState?.currentPhase, activeCategory, dismissedIds, recentBehavior]);

  // Record tip in history when shown
  const recordHistory = useCallback((tip: CoachTip) => {
    setTipHistory(prev => {
      const entry: TipHistoryEntry = {
        tipId: tip.id, text: tip.text, category: tip.category,
        importance: tip.importance, shownAt: Date.now(),
      };
      return [...prev, entry].slice(-MAX_HISTORY);
    });
  }, []);

  // Rotate tips while playing
  useEffect(() => {
    if (!enabled || !isPlaying) {
      setVisible(false);
      setCurrentTip(null);
      return;
    }
    if (dismissed) return;

    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const showTip = () => {
      const tip = pickTip();
      setCurrentTip(tip);
      setVisible(true);
      recordHistory(tip);
      hideTimer = setTimeout(() => setVisible(false), TIP_DISPLAY_MS);
    };

    // First tip after 2s
    const showTimer = setTimeout(() => showTip(), 2000);

    // Rotate based on frequency setting
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        if (hideTimer) clearTimeout(hideTimer);
        showTip();
      }, 2000);
    }, frequency);

    return () => {
      clearTimeout(showTimer);
      clearInterval(interval);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [enabled, isPlaying, dismissed, pickTip, frequency, recordHistory]);

  // Reset dismissed when hand changes
  useEffect(() => {
    setDismissed(false);
  }, [gameState?.handNumber]);

  const dismissPermanent = useCallback(() => {
    if (currentTip) {
      setDismissedIds(prev => new Set([...prev, currentTip.id]));
    }
    setVisible(false);
    setDismissed(true);
  }, [currentTip]);

  const showNext = useCallback(() => {
    setVisible(false);
    setDismissed(false);
  }, []);

  const submitFeedback = useCallback((type: 'up' | 'down') => {
    if (!currentTip) return;
    setFeedbackMap(prev => ({ ...prev, [currentTip.id]: type }));
    // Also update last history entry
    setTipHistory(prev => {
      const copy = [...prev];
      if (copy.length > 0) {
        copy[copy.length - 1] = { ...copy[copy.length - 1], feedback: type };
        return copy.slice(-MAX_HISTORY);
      }
      return copy;
    });
    setVisible(false);
    setDismissed(true);
  }, [currentTip]);

  if (!enabled || !currentTip) return null;

  const catColor = CATEGORY_COLORS[currentTip.category];
  const catLabel = CATEGORY_LABELS[currentTip.category];
  const impColor = currentTip.importance === 'high' ? 'text-gold' : currentTip.importance === 'medium' ? 'text-text-secondary/60' : 'text-text-secondary/40';
  const impLabel = currentTip.importance === 'high' ? '★ High' : currentTip.importance === 'medium' ? 'Medium' : 'Low';

  return (
    <>
      {/* Tip toast */}
      <div className="fixed bottom-4 right-4 z-[90] flex items-center gap-2">
        {visible && (
          <div className="animate-slide-up bg-surface-elevated border border-white/10 rounded-xl px-4 py-2.5 shadow-xl flex items-start gap-3 max-w-[360px] backdrop-blur-xl">
            <Lightbulb size={16} className="text-gold shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-xs text-gold font-bold">Coach Tip</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${catColor}`}>
                  {catLabel}
                </span>
                <span className={`text-[9px] ${impColor}`} title={`Importance: ${impLabel}`}>
                  {impLabel}
                </span>
              </div>
              <p className="text-xs text-text-secondary/80 leading-relaxed">{currentTip.text}</p>
              {/* Special behavior callout */}
              {recentBehavior.foldingALot && currentTip.category === 'strategy' && (
                <p className="text-[10px] text-amber-400/70 mt-1 italic">Noticed you're folding often — here's a strategy tip.</p>
              )}
              {recentBehavior.losingStreak && currentTip.category === 'psychology' && (
                <p className="text-[10px] text-purple-400/70 mt-1 italic">Tough run. Keep a clear head.</p>
              )}
              {/* Feedback buttons */}
              <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-white/5">
                <span className="text-[9px] text-text-secondary/30">Was this helpful?</span>
                <button
                  onClick={() => submitFeedback('up')}
                  className={`p-1 rounded transition-colors ${feedbackMap[currentTip.id] === 'up' ? 'text-accent-green bg-accent-green/10' : 'text-text-secondary/30 hover:text-accent-green hover:bg-accent-green/10'}`}
                  aria-label="Thumbs up - helpful"
                  title="Helpful"
                >
                  <ThumbsUp size={12} />
                </button>
                <button
                  onClick={() => submitFeedback('down')}
                  className={`p-1 rounded transition-colors ${feedbackMap[currentTip.id] === 'down' ? 'text-accent-red bg-accent-red/10' : 'text-text-secondary/30 hover:text-accent-red hover:bg-accent-red/10'}`}
                  aria-label="Thumbs down - not helpful"
                  title="Not helpful"
                >
                  <ThumbsDown size={12} />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button
                onClick={dismissPermanent}
                className="text-text-secondary/30 hover:text-accent-red/70 transition-colors"
                aria-label="Permanently dismiss this tip"
                title="Never show this tip again"
              >
                <X size={14} />
              </button>
              <button
                onClick={showNext}
                className="text-text-secondary/30 hover:text-text-secondary/70 transition-colors"
                aria-label="Next tip"
                title="Show next tip"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Control buttons */}
        <div className="flex flex-col gap-1.5">
          {/* Category filter button */}
          <div className="relative">
            <button
              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              aria-label={`Filter tips by category (current: ${activeCategory === 'all' ? 'All' : CATEGORY_LABELS[activeCategory]})`}
              className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all border ${
                activeCategory !== 'all'
                  ? 'bg-surface-elevated text-gold border-gold/50'
                  : 'bg-surface-elevated text-text-secondary/40 border-white/10 hover:text-text-secondary/70'
              }`}
              title={`Category: ${activeCategory === 'all' ? 'All' : CATEGORY_LABELS[activeCategory]}`}
            >
              <Filter size={14} />
            </button>
            {showCategoryMenu && (
              <div className="absolute bottom-full right-0 mb-1 bg-surface-elevated border border-white/10 rounded-xl p-1.5 shadow-xl z-[100] min-w-[160px]">
                <div className="text-[9px] text-text-secondary/30 uppercase tracking-wider font-bold px-2 py-0.5 mb-0.5">Category</div>
                {(['all', 'strategy', 'math', 'psychology', 'bankroll', 'general'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(cat); setShowCategoryMenu(false); }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
                      activeCategory === cat
                        ? 'bg-gold/10 text-gold'
                        : 'text-text-secondary/70 hover:text-text-primary hover:bg-white/5'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${cat === 'all' ? 'bg-gold' : ''}`} />
                    {cat === 'all' ? 'All Categories' : CATEGORY_LABELS[cat]}
                  </button>
                ))}
                <div className="border-t border-white/5 my-1" />
                <div className="text-[9px] text-text-secondary/30 uppercase tracking-wider font-bold px-2 py-0.5 mb-0.5">Frequency</div>
                {FREQUENCY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setFrequency(opt.value); setShowCategoryMenu(false); }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
                      frequency === opt.value
                        ? 'bg-cyan-500/10 text-cyan-400'
                        : 'text-text-secondary/70 hover:text-text-primary hover:bg-white/5'
                    }`}
                  >
                    <Clock size={11} />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* History button */}
          <div className="relative">
            <button
              onClick={() => setShowHistory(!showHistory)}
              aria-label="Tip history"
              className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all border ${
                showHistory
                  ? 'bg-surface-elevated text-gold border-gold/50'
                  : 'bg-surface-elevated text-text-secondary/40 border-white/10 hover:text-text-secondary/70'
              }`}
              title="Tip history"
            >
              <History size={14} />
            </button>
            {showHistory && (
              <div className="absolute bottom-full right-0 mb-1 bg-surface-elevated border border-white/10 rounded-xl p-2 shadow-xl z-[100] w-[280px] max-h-[260px] overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-text-secondary/40 uppercase tracking-wider font-bold">Recent Tips</span>
                  <button
                    onClick={() => { setTipHistory([]); }}
                    className="text-[9px] text-text-secondary/30 hover:text-accent-red transition-colors flex items-center gap-1"
                    title="Clear history"
                  >
                    <RotateCcw size={10} /> Clear
                  </button>
                </div>
                {tipHistory.length === 0 ? (
                  <p className="text-[10px] text-text-secondary/30 text-center py-4">No tips shown yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {[...tipHistory].reverse().slice(0, 10).map((entry, i) => (
                      <div key={`${entry.tipId}-${i}`} className="bg-white/[0.03] rounded-lg px-2.5 py-1.5 border border-white/5">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${CATEGORY_COLORS[entry.category]}`}>
                            {CATEGORY_LABELS[entry.category]}
                          </span>
                          <span className={`text-[8px] ${entry.importance === 'high' ? 'text-gold' : 'text-text-secondary/40'}`}>
                            {entry.importance === 'high' ? '★' : entry.importance === 'medium' ? '·' : ''}
                          </span>
                          {entry.feedback === 'up' && <ThumbsUp size={10} className="text-accent-green" />}
                          {entry.feedback === 'down' && <ThumbsDown size={10} className="text-accent-red" />}
                          <span className="text-[8px] text-text-secondary/30 ml-auto">
                            {new Date(entry.shownAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-secondary/70 leading-relaxed line-clamp-2">{entry.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Toggle button */}
          <button
            onClick={() => setEnabled(e => !e)}
            aria-label={enabled ? 'Disable coach tips' : 'Enable coach tips'}
            className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all border ${
              enabled
                ? 'bg-gold text-black border-gold'
                : 'bg-surface-elevated text-text-secondary/40 border-white/10 hover:text-text-secondary/70'
            }`}
            title={enabled ? 'Coach tips on' : 'Coach tips off'}
          >
            <Lightbulb size={16} />
          </button>
        </div>
      </div>

      {/* Click-outside handler for menus */}
      {(showCategoryMenu || showHistory) && (
        <div
          className="fixed inset-0 z-[99]"
          onClick={() => { setShowCategoryMenu(false); setShowHistory(false); }}
          aria-hidden="true"
        />
      )}
    </>
  );
});

CoachTips.displayName = 'CoachTips';

export default CoachTips;

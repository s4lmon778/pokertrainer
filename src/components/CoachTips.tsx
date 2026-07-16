import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { Lightbulb, X, ChevronRight, ChevronLeft } from 'lucide-react';

// ── Context-aware poker tips ──

interface CoachTip {
  id: string;
  text: string;
  context: 'any' | 'preflop' | 'flop' | 'turn' | 'river' | 'bluff' | 'value' | 'position' | 'general';
  weight: number; // Higher = more likely to show
}

const COACH_TIPS: CoachTip[] = [
  // Position tips
  { id: 'pos-1', text: 'Play tighter in early position — you have more players acting after you.', context: 'position', weight: 3 },
  { id: 'pos-2', text: 'Late position is powerful — you can steal blinds more often from the button.', context: 'position', weight: 2 },
  { id: 'pos-3', text: 'Bluff frequency should decrease in early position and increase on the button.', context: 'position', weight: 2 },

  // Preflop tips
  { id: 'pre-1', text: 'Premium hands (AA, KK, QQ, AKs) should almost always be raised preflop.', context: 'preflop', weight: 3 },
  { id: 'pre-2', text: 'Suited connectors like 78s play well in multi-way pots — call small raises with them.', context: 'preflop', weight: 2 },
  { id: 'pre-3', text: 'In early position, fold weak aces (A2–A9 offsuit) — they\'re easily dominated.', context: 'preflop', weight: 2 },
  { id: 'pre-4', text: '3-betting preflop narrows the field and defines your opponent\'s hand range.', context: 'preflop', weight: 2 },

  // Postflop tips
  { id: 'flop-1', text: 'On a wet flop (connected, suited), bet larger to charge draws.', context: 'flop', weight: 3 },
  { id: 'flop-2', text: 'A dry flop (rainbow, unconnected) favors the preflop raiser — continuation bet often.', context: 'flop', weight: 2 },
  { id: 'flop-3', text: 'Check-raising can be a powerful move, but save it for strong hands or credible bluffs.', context: 'flop', weight: 2 },

  // Turn tips
  { id: 'turn-1', text: 'The turn is where pots grow — bet sizing should reflect your hand strength.', context: 'turn', weight: 2 },
  { id: 'turn-2', text: 'If a draw completes on the turn, slow down with one-pair hands.', context: 'turn', weight: 2 },

  // River tips
  { id: 'river-1', text: 'River decisions are final — take your time and think through their range.', context: 'river', weight: 3 },
  { id: 'river-2', text: 'On the river, bluff only when the board texture supports a credible story.', context: 'river', weight: 2 },
  { id: 'river-3', text: 'Thin value betting on the river separates good players from great ones.', context: 'river', weight: 1 },

  // Bluff tips
  { id: 'bluff-1', text: 'The best bluff cards are those that complete obvious draws — your story must make sense.', context: 'bluff', weight: 2 },
  { id: 'bluff-2', text: 'Don\'t bluff into multiple opponents — the chance someone has a hand increases.', context: 'bluff', weight: 2 },
  { id: 'bluff-3', text: 'Semi-bluffs (betting with a draw) are profitable because you can win now or later.', context: 'bluff', weight: 2 },

  // Value tips
  { id: 'value-1', text: 'Bet for value when you think worse hands will call — size based on what they\'ll pay.', context: 'value', weight: 2 },
  { id: 'value-2', text: 'Don\'t slow-play monsters on wet boards — protect your equity.', context: 'value', weight: 2 },

  // General tips
  { id: 'gen-1', text: 'Pot odds matter more than hand strength in late stages — know your math.', context: 'general', weight: 3 },
  { id: 'gen-2', text: 'Track your opponents\' tendencies — are they tight, loose, aggressive, or passive?', context: 'general', weight: 2 },
  { id: 'gen-3', text: 'Bankroll management: never risk more than 5% of your stack on marginal hands.', context: 'general', weight: 2 },
  { id: 'gen-4', text: 'Take notes on your own play. Reviewing mistakes is the fastest way to improve.', context: 'general', weight: 1 },
  { id: 'gen-5', text: 'Tilt is real — if you\'re frustrated, take a break. Clear minds make better decisions.', context: 'general', weight: 1 },
  { id: 'gen-6', text: 'Remember: poker is a long-term game. One hand doesn\'t define your session.', context: 'general', weight: 1 },

  // Any context tips
  { id: 'any-1', text: 'Think in ranges, not specific hands — what could your opponent have here?', context: 'any', weight: 3 },
  { id: 'any-2', text: 'Consider your opponent\'s position — players in late position have wider ranges.', context: 'any', weight: 2 },
  { id: 'any-3', text: 'Fold equity is real value — sometimes the best hand to have is the one you don\'t show.', context: 'any', weight: 2 },
  { id: 'any-4', text: 'Mix up your play — predictability is a leak. Sometimes raise with marginal hands.', context: 'any', weight: 1 },
];

const STORAGE_KEY = 'pokertrainer-coach-tips-enabled';
const TIP_INTERVAL_MS = 45000; // Show a new tip every 45 seconds
const TIP_DISPLAY_MS = 10000;  // Each tip stays visible for 10 seconds

const CoachTips: React.FC = React.memo(() => {
  const gameState = useGameStore(s => s.gameState);
  const isPlaying = useGameStore(s => s.isPlaying);

  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored !== null ? stored === 'true' : true; // Default: enabled
    } catch {
      return true;
    }
  });
  const [currentTip, setCurrentTip] = useState<CoachTip | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  // Persist preference
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(enabled)); } catch { /* noop */ }
  }, [enabled]);

  // Pick a context-aware random tip
  const pickTip = useCallback(() => {
    const phase = gameState?.currentPhase || 'preflop';
    const phaseContext = phase === 'preflop' ? 'preflop' :
      phase === 'flop' ? 'flop' :
      phase === 'turn' ? 'turn' :
      phase === 'river' ? 'river' : 'any';

    // Weight tips by context match
    const scored = COACH_TIPS.map(tip => {
      let score = tip.weight;
      if (tip.context === phaseContext) score += 5;
      if (tip.context === 'any' || tip.context === 'general') score += 1;
      return { tip, score };
    });

    // Weighted random selection
    const total = scored.reduce((s, { score }) => s + score, 0);
    let rand = Math.random() * total;
    for (const { tip, score } of scored) {
      rand -= score;
      if (rand <= 0) return tip;
    }
    return COACH_TIPS[0];
  }, [gameState?.currentPhase]);

  // Rotate tips while playing
  useEffect(() => {
    if (!enabled || !isPlaying) {
      setVisible(false);
      setCurrentTip(null);
      return;
    }

    if (dismissed) return;

    const showTip = () => {
      const tip = pickTip();
      setCurrentTip(tip);
      setVisible(true);
      setTipIndex(i => i + 1);

      // Auto-hide after display duration
      const hideTimer = setTimeout(() => {
        setVisible(false);
      }, TIP_DISPLAY_MS);

      return hideTimer;
    };

    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const showTimer = setTimeout(() => {
      hideTimer = showTip();
    }, 2000); // First tip after 2s delay

    // Rotate every TIP_INTERVAL_MS
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        hideTimer = showTip();
      }, 2000); // 2s gap between tips
    }, TIP_INTERVAL_MS);

    return () => {
      clearTimeout(showTimer);
      clearInterval(interval);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [enabled, isPlaying, dismissed, pickTip, tipIndex]);

  // Reset dismissed when game state changes
  useEffect(() => {
    setDismissed(false);
  }, [gameState?.handNumber]);

  const dismiss = useCallback(() => {
    setVisible(false);
    setDismissed(true);
  }, []);

  const showNext = useCallback(() => {
    setVisible(false);
    setDismissed(false);
  }, []);

  if (!enabled || !currentTip) return null;

  return (
    <>
      {/* Toggle button */}
      <div className="fixed bottom-4 right-4 z-[90] flex items-center gap-2">
        {/* Tip toast */}
        {visible && (
          <div className="animate-slide-up bg-surface-elevated border border-gold/20 rounded-xl px-4 py-2.5 shadow-xl flex items-start gap-3 max-w-[320px] backdrop-blur-xl">
            <Lightbulb size={16} className="text-gold shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gold font-bold mb-0.5">Coach Tip</div>
              <p className="text-xs text-text-secondary/80 leading-relaxed">{currentTip.text}</p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={dismiss} className="text-text-secondary/30 hover:text-text-secondary/70 transition-colors" aria-label="Dismiss tip">
                <X size={14} />
              </button>
              <button onClick={showNext} className="text-text-secondary/30 hover:text-text-secondary/70 transition-colors" aria-label="Next tip">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

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
    </>
  );
});

CoachTips.displayName = 'CoachTips';

export default CoachTips;

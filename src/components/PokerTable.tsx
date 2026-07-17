import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Card as CardType } from '../types/card';
import { Trophy, Sparkles, Coins, X } from 'lucide-react';

// ── Suit symbols & colors ──

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
};
const SUIT_COLORS: Record<string, string> = {
  hearts: '#ef4444', diamonds: '#f97316', clubs: '#1e293b', spades: '#0f172a',
};

// ── Static style objects (module-level to prevent recreation) ──
const WOOD_GRAIN_STYLE: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.15) 100%)',
  border: '3px solid rgba(255,255,255,0.04)',
  borderRadius: 'inherit',
  margin: '2px',
};

const CARD_HIGHLIGHT_STYLE: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(0,0,0,0.05) 100%)',
};

const SPOTLIGHT_STYLE: React.CSSProperties = {
  background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
};

// ── CardDisplay — premium playing card with hover flip ──

interface CardDisplayProps {
  card: CardType;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  dealDelay?: number;
  flipIn?: boolean;
}

const CardDisplay: React.FC<CardDisplayProps> = React.memo(({
  card, faceDown = false, size = 'md', className = '', dealDelay = 0, flipIn = false,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-12 md:w-9 md:h-14 text-[9px] md:text-[10px]',
    md: 'w-10 h-16 md:w-12 md:h-[4.5rem] text-[10px] md:text-xs',
    lg: 'w-14 h-20 md:w-16 md:h-24 text-xs md:text-sm',
  };

  const animClass = flipIn ? 'animate-deal-flip' : 'animate-deal-stagger';
  const delayStyle = dealDelay > 0 ? { animationDelay: `${dealDelay}ms` } : {};

  const suitSymbol = SUIT_SYMBOLS[card.suit] || '';
  const suitColor = SUIT_COLORS[card.suit] || '#000';

  if (faceDown) {
    return (
      <div
        className={`${sizeClasses[size]} cursor-default ${animClass} ${className}`}
        style={delayStyle}
      >
        {/* Card back — flat, no 3D flip */}
        <div className="w-full h-full card-back-design rounded-xl border-2 border-indigo-400/30 shadow-card flex items-center justify-center overflow-hidden relative">
          {/* Center diamond */}
          <div className="w-7 h-7 md:w-8 md:h-8 rotate-45 border-2 border-indigo-300/25 rounded-sm flex items-center justify-center bg-indigo-800/30">
            <div className="-rotate-45 text-indigo-300/50 text-base md:text-lg font-serif">♠</div>
          </div>
          {/* Corner accents */}
          <div className="absolute top-1 left-1 text-indigo-300/20 text-[7px]">♠</div>
          <div className="absolute bottom-1 right-1 text-indigo-300/20 text-[7px] rotate-180">♠</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} cursor-default ${animClass} ${className}`}
      style={delayStyle}
    >
      {/* Card front — flat, no 3D flip */}
      <div className="w-full h-full bg-white rounded-xl border border-gray-200/70 shadow-card flex flex-col items-center justify-between p-[3px] md:p-1 relative overflow-hidden">
        {/* Top-left rank+suit */}
        <div className="self-start font-bold leading-tight" style={{ color: suitColor }}>
          {card.rank}
          <span className="text-[0.5em] ml-[1px] align-super">{suitSymbol}</span>
        </div>
        {/* Center pip — big suit */}
        <div className="text-lg md:text-xl leading-none" style={{ color: suitColor }}>
          {suitSymbol}
        </div>
        {/* Bottom-right rank+suit (upside down) */}
        <div className="self-end font-bold leading-tight rotate-180" style={{ color: suitColor }}>
          {card.rank}
          <span className="text-[0.5em] ml-[1px] align-super">{suitSymbol}</span>
        </div>
        {/* Inner highlight */}
        <div className="absolute inset-0 rounded-xl pointer-events-none" style={CARD_HIGHLIGHT_STYLE} />
      </div>
    </div>
  );
});

CardDisplay.displayName = 'CardDisplay';

// ── Chip Stack Visual ──

interface ChipStackProps {
  amount: number;
  size?: 'sm' | 'md';
}

const chipColors = ['chip-gold', 'chip-blue', 'chip-red', 'chip-green', 'chip-black'];
const chipValues = [100, 50, 25, 10, 5];

const ChipStack: React.FC<ChipStackProps> = React.memo(({ amount, size = 'md' }) => {
  const dims = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';

  // Determine which chip to show (highest denom that fits)
  const chipIdx = chipValues.findIndex(v => amount >= v);
  const displayChip = chipIdx >= 0 ? chipColors[chipIdx] : chipColors[chipColors.length - 1];

  // Stack layers for visual depth
  const stackLayers = Math.min(5, Math.max(1, Math.ceil(amount / 100)));

  return (
    <div className="relative inline-flex flex-col items-center" title={`$${amount}`}>
      {/* Stacked chips behind */}
      {Array.from({ length: stackLayers - 1 }, (_, i) => (
        <div key={i}
          className={`${dims} poker-chip ${displayChip} absolute`}
          style={{ bottom: `${(i + 1) * 3}px`, zIndex: -i - 1, opacity: Math.max(0.25, 0.7 - i * 0.12) }}
        />
      ))}
      {/* Top chip */}
      <div className={`${dims} poker-chip ${displayChip} relative z-10`}>
        <span className="text-[10px] font-black text-white/90 drop-shadow-sm">
          ${amount}
        </span>
      </div>
    </div>
  );
});

ChipStack.displayName = 'ChipStack';

// ── Pot display with pulsing ──

const PotDisplay: React.FC<{
  pot: number;
  sidePots: { amount: number; eligiblePlayerIds: string[] }[];
}> = React.memo(({ pot, sidePots }) => {
  const [pulse, setPulse] = useState(false);
  const prevPotRef = React.useRef(pot);

  useEffect(() => {
    if (pot > prevPotRef.current) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 400);
      prevPotRef.current = pot;
      return () => clearTimeout(t);
    }
    prevPotRef.current = pot;
  }, [pot]);

  return (
    <div className="absolute top-[28%] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-0.5">
      {/* Chip stacks around pot */}
      <div className="flex items-center gap-2">
        <div className="flex -space-x-3">
          {pot > 0 && <ChipStack amount={pot} size="sm" />}
        </div>
        <div className={`bg-black/40 backdrop-blur-md rounded-full px-5 py-1.5 border border-white/10 ${pulse ? 'animate-pot-pulse' : ''}`}>
          <span className="text-gold font-bold text-sm flex items-center gap-1">
            <Coins size={12} className="text-gold/70" />
            ${pot.toLocaleString()}
          </span>
        </div>
      </div>
      {sidePots.length > 0 && sidePots.map((sp, i) => (
        <div key={i}
          className="bg-black/30 backdrop-blur-md rounded-full px-3 py-0.5 border border-amber-500/20 animate-fade-in"
          style={{ animationDelay: `${(i + 1) * 100}ms` }}>
          <span className="text-amber-400/80 font-bold text-[10px]">Side ${sp.amount.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
});

PotDisplay.displayName = 'PotDisplay';

// ── Action Badge (floating, temporary) ──

interface ActionBadgeProps {
  action: string;
  amount?: number;
  isAllIn?: boolean;
}

const ActionBadge: React.FC<ActionBadgeProps> = React.memo(({ action, amount, isAllIn }) => {
  const badgeClass = isAllIn ? 'badge-allin' :
    action === 'fold' ? 'badge-fold' :
    action === 'check' ? 'badge-check' :
    action === 'call' ? 'badge-call' :
    action === 'raise' ? 'badge-raise' :
    'badge-check';

  const label = isAllIn ? 'ALL IN!' :
    action === 'raise' && amount ? `Raise $${amount}` :
    action.charAt(0).toUpperCase() + action.slice(1);

  return (
    <div className={`action-badge ${badgeClass}`}>
      {label}
    </div>
  );
});

ActionBadge.displayName = 'ActionBadge';

// ── Winner celebration with confetti burst ──

const confettiColors = ['#d4af37', '#f0d060', '#22c55e', '#3b82f6', '#ef4444', '#eab308', '#06b6d4', '#f97316', '#8b5cf6', '#ec4899'];
const confettiShapes = ['rounded-full', 'rounded-sm', 'rounded-full'];

const WinnerOverlay: React.FC<{
  winnerName: string;
  isHuman: boolean;
  handDesc: string;
  pot: number;
  onClose?: () => void;
}> = React.memo(({ winnerName, isHuman, handDesc, pot, onClose }) => {
  const particles = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: 30 + Math.random() * 40,
      color: confettiColors[i % confettiColors.length],
      delay: Math.random() * 0.8,
      size: 3 + Math.random() * 7,
      drift: (Math.random() - 0.5) * 80,
      rotation: Math.random() * 720,
      shape: confettiShapes[i % 3],
    })), []);

  const edgeParticles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i + 100,
      originX: i < 10 ? 0 : 100,
      originY: 20 + Math.random() * 60,
      color: confettiColors[(i + 5) % confettiColors.length],
      delay: 0.2 + Math.random() * 0.5,
      size: 2 + Math.random() * 4,
      angle: i < 10 ? 30 + Math.random() * 40 : -30 - Math.random() * 40,
      distance: 80 + Math.random() * 150,
    })), []);

  return (
    <div className="absolute top-[35%] left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      {/* Center confetti fall */}
      {particles.map(p => (
        <div key={p.id}
          className={`absolute ${p.shape} pointer-events-none`}
          style={{
            left: `${p.x}%`,
            width: `${p.size}px`,
            height: `${p.size * (p.shape === 'rounded-sm' ? 0.5 : 1)}px`,
            backgroundColor: p.color,
            animation: `confettiFall 2.5s ease-in forwards`,
            animationDelay: `${p.delay}s`,
            '--drift': `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}

      {/* Edge burst particles */}
      {edgeParticles.map(p => (
        <div key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${p.originX}%`,
            top: `${p.originY}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animation: `confettiBurst 1.5s ease-out forwards`,
            animationDelay: `${p.delay}s`,
            '--bx': `${Math.cos(p.angle * Math.PI / 180) * p.distance}px`,
            '--by': `${Math.sin(p.angle * Math.PI / 180) * p.distance - 100}px`,
          } as React.CSSProperties}
        />
      ))}

      {/* Trophy card */}
      <div className="animate-celebrate pointer-events-auto relative">
        <div className="bg-black/70 backdrop-blur-xl rounded-2xl border-2 border-gold/50 px-6 py-4 text-center space-y-1.5 relative overflow-hidden shadow-gold-xl">
          {/* Shimmer background */}
          <div className="absolute inset-0 bg-winner-shimmer pointer-events-none" />

          {/* Spotlight effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full pointer-events-none"
            style={SPOTLIGHT_STYLE} />

          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors border border-white/10"
              aria-label="Dismiss winner overlay"
            >
              <X size={12} className="text-white/60" />
            </button>
          )}

          <Trophy size={40} className="text-gold mx-auto relative z-10 drop-shadow-lg" />
          <div className="relative z-10">
            <div className="text-2xl font-black text-gold drop-shadow-md">
              {isHuman ? '🎉 You Win!' : `🏆 ${winnerName} Wins!`}
            </div>
            <div className="text-sm text-text-secondary font-medium mt-1">
              {handDesc}
            </div>
          </div>
          <div className="text-3xl font-black font-mono text-gold relative z-10 drop-shadow-md">
            +${pot}
          </div>
          <div className="text-xs text-text-secondary/50 relative z-10 flex items-center justify-center gap-1">
            <Sparkles size={12} className="text-gold" />
            Pot awarded
          </div>
        </div>
      </div>
    </div>
  );
});

WinnerOverlay.displayName = 'WinnerOverlay';

// ── Player badge — enhanced with action indicators ──

const PlayerBadge: React.FC<{
  playerName: string;
  chips: number;
  bet: number;
  folded: boolean;
  isAllIn: boolean;
  isActive: boolean;
  isWinner: boolean;
  isTrainingBot: boolean;
  isHuman: boolean;
  roleBadge: { label: string; color: string; ring: string } | null;
  acted: boolean;
  hand: CardType[];
  showCards: boolean;
  lastAction?: string;
  dealOffset?: number;
}> = React.memo(({
  playerName, chips, bet, folded, isAllIn, isActive, isWinner,
  isTrainingBot, isHuman, roleBadge, acted, hand, showCards, lastAction, dealOffset = 0,
}) => {
  // Determine active indicator style
  const activeRing = isActive
    ? 'ring-2 ring-gold/80 animate-pulse-active shadow-[0_0_20px_rgba(212,175,55,0.4)]'
    : '';

  const borderColor = isWinner
    ? 'border-gold bg-surface-elevated shadow-[0_0_32px_rgba(212,175,55,0.5)] animate-winner-glow'
    : isActive
    ? 'border-gold bg-surface-elevated shadow-[0_4px_24px_-4px_rgba(212,175,55,0.4)]'
    : isTrainingBot
    ? 'border-accent-cyan/50 bg-surface-elevated'
    : acted
    ? 'border-gold/30 bg-surface-elevated'
    : 'border-white/10 bg-surface-elevated';

  return (
    <div className="flex flex-col items-center relative">
      {/* Winner glow ring */}
      {isWinner && (
        <div className="absolute -inset-3 rounded-2xl ring-4 ring-gold/50 animate-pulse-glow pointer-events-none z-0" />
      )}

      {/* Player panel */}
      <div className={`rounded-2xl border-2 p-2.5 min-w-[130px] relative z-10 transition-all duration-300 ${borderColor} ${activeRing} ${folded ? 'opacity-40' : ''} ${showCards && hand.length > 0 ? 'pb-1' : ''}`}>
        {/* Active indicator — bigger and more visible */}
        {isActive && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30">
            <div className="bg-gradient-to-r from-amber-400 via-gold to-amber-600 text-black text-[10px] font-black px-4 py-1 rounded-full shadow-lg whitespace-nowrap animate-pulse-glow-fast border border-gold/50">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                {isHuman ? 'YOUR TURN' : isTrainingBot ? 'T-BOT TURN' : 'THINKING...'}
              </span>
            </div>
            {/* Pulsing ring beneath */}
            <div className="absolute inset-0 rounded-full animate-pulse-active pointer-events-none" />
          </div>
        )}

        {/* Acted checkmark */}
        {acted && !folded && (
          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-surface-elevated flex items-center justify-center ${isTrainingBot ? 'bg-accent-cyan' : 'bg-accent-green'}`}>
            <span className="text-[8px] text-white font-bold">✓</span>
          </div>
        )}

        {/* Role badge (D/SB/BB) */}
        {roleBadge && (
          <div className={`absolute -top-2 -right-2 text-[10px] font-black px-2 py-0.5 rounded-full ring-2 ring-surface-elevated shadow-md z-20 ${roleBadge.color} ${roleBadge.ring}`}>
            {roleBadge.label}
          </div>
        )}

        {/* Action badge (floating) */}
        {lastAction && !folded && (
          <div className="absolute -top-1 right-1/2 translate-x-1/2 -translate-y-full z-40">
            <ActionBadge action={lastAction} isAllIn={isAllIn} amount={bet} />
          </div>
        )}

        {/* Avatar + Name */}
        <div className="flex items-center gap-2 pt-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-inner ${
            folded ? 'bg-gray-600' :
            isTrainingBot ? 'bg-gradient-to-br from-cyan-400 to-cyan-600 text-white' :
            isHuman ? 'bg-gradient-to-br from-gold-light via-gold to-gold-dark text-black' :
            'bg-gradient-to-br from-gray-400 to-gray-600 text-white'
          }`}>
            {isHuman ? 'Y' : playerName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm">{isHuman ? 'You' : playerName}</span>
              {isTrainingBot && (
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold uppercase border border-cyan-500/30">TRAIN</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-mono font-semibold ${isTrainingBot ? 'text-cyan-400' : 'text-gold'}`}>
                ${chips}
              </span>
              {chips > 0 && <ChipStack amount={Math.max(1, chips)} size="sm" />}
            </div>
          </div>
        </div>

        {/* Bet indicator */}
        {bet > 0 && (
          <div className="mt-1.5 text-center text-[11px] text-accent-yellow font-mono font-semibold bg-black/20 rounded-full px-2 py-0.5 animate-chip-appear border border-amber-500/10">
            Bet: ${bet}
          </div>
        )}

        {/* Folded / All-In / Busted */}
        {folded && <div className="mt-1 text-center text-[11px] text-text-secondary/50 font-semibold uppercase tracking-wider">Folded</div>}
        {!folded && chips === 0 && (
          <div className="mt-1 text-center text-[11px] text-accent-red font-bold uppercase tracking-wider animate-pulse">
            {hand.length > 0 ? 'ALL IN' : 'BUST'}
          </div>
        )}

        {/* Cards — inside panel, below avatar */}
        {showCards && hand.length > 0 && (
          <div className="flex gap-0.5 mt-2 justify-center">
            {hand.map((card, i) => (
              <CardDisplay key={card.id} card={card} size="sm" dealDelay={i * 80} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

PlayerBadge.displayName = 'PlayerBadge';

// ── Chip fly animation (pot collection animation) ──

interface ChipFlyProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  delay: number;
}

const ChipFly: React.FC<ChipFlyProps> = React.memo(({ fromX, fromY, toX, toY, color, delay }) => (
  <div
    className="absolute w-3 h-3 rounded-full pointer-events-none z-50"
    style={{
      left: `${fromX}%`,
      top: `${fromY}%`,
      backgroundColor: color,
      boxShadow: `0 0 6px ${color}`,
      animation: `chipFly 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) both`,
      animationDelay: `${delay}s`,
      '--fly-x': `${(toX - fromX) * 0.3}px`,
      '--fly-y': '-60px',
      '--fly-x-end': `${(toX - fromX) * 0.8}px`,
      '--fly-y-end': '-130px',
    } as React.CSSProperties}
  />
));

ChipFly.displayName = 'ChipFly';

// ── Main PokerTable ──

const PokerTable: React.FC = React.memo(() => {
  const gameState = useGameStore(s => s.gameState);
  const showRiskOverlay = useGameStore(s => s.showRiskOverlay);
  const autoPlayMode = useGameStore(s => s.autoPlayMode);
  const gamePhase = useGameStore(s => s.gamePhase);
  const showCardsAtEnd = useGameStore(s => s.showCardsAtEnd);
  const [handKey, setHandKey] = useState(0);
  const [winnerDismissed, setWinnerDismissed] = useState(false);
  const prevHandRef = React.useRef(gameState?.handNumber ?? 0);

  // Track hand changes for animation reset
  useEffect(() => {
    if (gameState && gameState.handNumber !== prevHandRef.current) {
      setHandKey(k => k + 1);
      setWinnerDismissed(false);
      prevHandRef.current = gameState.handNumber;
    }
  }, [gameState?.handNumber]);

  const getPlayerPosition = useMemo(() => (index: number, total: number) => {
    const startAngle = -Math.PI * 0.55;
    const endAngle = Math.PI * 0.55;
    const angle = startAngle + (index / Math.max(total - 1, 1)) * (endAngle - startAngle);
    return {
      x: 50 + 40 * Math.cos(angle - Math.PI / 2),
      y: 50 + 38 * Math.sin(angle - Math.PI / 2),
    };
  }, []);

  // Memoize derived values to avoid recomputation each render
  const allBots = useMemo(() => gameState?.players.filter(p => p.isBot) ?? [], [gameState?.players]);
  const tBot = useMemo(() => allBots.find(p => p.isTrainingBot) ?? null, [allBots]);
  const arcBots = useMemo(() => autoPlayMode ? allBots.filter(p => !p.isTrainingBot) : allBots, [autoPlayMode, allBots]);
  const humanPlayer = useMemo(() => gameState?.players.find(p => !p.isBot) ?? null, [gameState?.players]);
  const humanIdx = useMemo(() => gameState?.players.findIndex(p => !p.isBot) ?? -1, [gameState?.players]);

  const showHuman = !autoPlayMode;
  const isActivePlayer = showHuman && humanPlayer && gameState ? gameState.players[gameState.currentPlayerIndex]?.id === humanPlayer.id : false;

  const winnerPlayer = useMemo(() =>
    gameState?.gameOver && gameState.winner
      ? gameState.players.find(p => p.id === gameState.winner!.playerId) ?? null
      : null,
  [gameState?.gameOver, gameState?.winner, gameState?.players]);
  const isHumanWinner = winnerPlayer?.id === 'human';

  const getRoleBadge = useCallback((playerIdx: number) => {
    if (!gameState) return null;
    if (playerIdx === gameState.dealerPosition) return { label: 'D', color: 'bg-white text-black', ring: 'ring-white/30' };
    if (playerIdx === gameState.sbPosition) return { label: 'SB', color: 'bg-blue-500 text-white', ring: 'ring-blue-400/50' };
    if (playerIdx === gameState.bbPosition) return { label: 'BB', color: 'bg-red-500 text-white', ring: 'ring-red-400/50' };
    return null;
  }, [gameState?.dealerPosition, gameState?.sbPosition, gameState?.bbPosition]);

  // Track previous community card count for staggered deal animation
  const prevCommunityCountRef = useRef(0);

  useEffect(() => {
    if (gameState) prevCommunityCountRef.current = gameState.communityCards.length;
  }, [gameState?.communityCards.length]);

  // Community card deal delays — staggered per card, only new cards animate
  const communityDelays = useMemo(() => {
    if (!gameState) return [];
    const prevCount = prevCommunityCountRef.current;
    return gameState.communityCards.map((_, i) => {
      if (i < prevCount) return 0;
      const offset = prevCount === 0 ? 0 : 1;
      return (i - prevCount + offset) * 120;
    });
  }, [gameState?.communityCards.length, handKey]);

  // Empty community card slots (memoized to avoid Array.from recreation)
  const emptySlots = useMemo(() => {
    if (!gameState) return [];
    return Array.from({ length: Math.max(0, 5 - gameState.communityCards.length) }, (_, i) => i);
  }, [gameState?.communityCards.length]);

  if (!gameState) return null;

  // Table container style (stable reference)
  const tableStyle: React.CSSProperties = { aspectRatio: '16/9', maxHeight: 'min(690px, 55dvh)', minWidth: '320px' };

  return (
    <div className="relative w-full mx-auto" style={tableStyle} role="region" aria-label="Poker table">
      {/* ── Table ── */}
      <div className="absolute inset-0 rounded-[42%] bg-wood-rail border-[10px] border-[#2a1f15] shadow-table overflow-hidden">
        {/* Wood rail grain overlay */}
        <div className="absolute inset-0 rounded-[42%] pointer-events-none wood-grain" />
        {/* Wood rail inner highlight */}
        <div className="absolute inset-0 rounded-[42%] pointer-events-none" style={WOOD_GRAIN_STYLE} />

        {/* Felt base */}
        <div className="absolute inset-3 rounded-[38%] bg-felt-gradient" />

        {/* Felt noise texture overlay */}
        <div className="absolute inset-3 rounded-[38%] bg-table-texture opacity-30" />

        {/* Felt noise (SVG filter) */}
        <div className="absolute inset-3 rounded-[38%] felt-overlay opacity-60" />

        {/* Felt shine / light reflection */}
        <div className="absolute inset-3 rounded-[38%] bg-felt-shine" />

        {/* ── Community cards with staggered deal animation ── */}
        <div className="absolute top-[44%] left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {gameState.communityCards.map((card, i) => (
            <CardDisplay
              key={card.id}
              card={card}
              size="lg"
              dealDelay={communityDelays[i] || 0}
              flipIn
            />
          ))}
          {emptySlots.map((i) => (
            <div key={`empty-${i}`}
              className="w-14 h-20 md:w-16 md:h-24 rounded-xl border border-dashed border-white/[0.04] bg-white/[0.015]"
              style={{ opacity: 0.3 + i * 0.1 }} />
          ))}
        </div>

        {/* ── Dealer button chip on felt ── */}
        {(() => {
          const dealerIdx = gameState.dealerPosition;
          const players = gameState.players;
          if (dealerIdx < 0 || dealerIdx >= players.length) return null;
          const humanIdx2 = players.findIndex(p => !p.isBot);
          const isDealerHuman = dealerIdx === humanIdx2;
          const arcBotList = players.filter(p => p.isBot);
          // Find dealer's position among arc bots (if dealer is a bot)
          const arcIndex = arcBotList.findIndex(p => players.indexOf(p) === dealerIdx);
          const dealerPos = isDealerHuman || arcIndex < 0
            ? { x: 50, y: 85 } // human seat: bottom center
            : getPlayerPosition(arcIndex, arcBotList.length);
          return (
            <div
              className="absolute z-15 transition-all duration-500"
              style={{
                left: `${dealerPos.x}%`,
                top: `${Math.max(8, dealerPos.y - 5)}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white shadow-lg border-[2.5px] border-gray-300 flex items-center justify-center animate-fade-in">
                <span className="text-[9px] sm:text-[10px] font-black text-black leading-none">D</span>
              </div>
            </div>
          );
        })()}

        {/* ── Pot + Side Pots ── */}
        <PotDisplay pot={gameState.pot} sidePots={gameState.sidePots} />

        {/* ── Phase badge ── */}
        {showRiskOverlay && (
          <div className="absolute top-[8%] left-1/2 -translate-x-1/2 z-10">
            <div className="bg-black/30 backdrop-blur-md rounded-lg px-3 py-1 border border-white/10 text-center">
              <span className="text-[9px] text-text-secondary/50 uppercase tracking-[0.15em] font-bold">{gamePhase}</span>
            </div>
          </div>
        )}

        {/* ── Last action ── */}
        {gameState.lastAction && (
          <div className="absolute bottom-[28%] left-1/2 -translate-x-1/2 z-10">
            <div className="bg-black/50 backdrop-blur-md rounded-full px-4 py-1 border border-white/10 animate-slide-up">
              <span className="text-text-secondary/70 text-xs font-medium">{gameState.lastAction}</span>
            </div>
          </div>
        )}

        {/* ── Winner overlay ── */}
        {winnerPlayer && !winnerDismissed && (
          <WinnerOverlay
            winnerName={winnerPlayer.name}
            isHuman={isHumanWinner || false}
            handDesc={gameState.winner?.hand.description || ''}
            pot={gameState.pot}
            onClose={() => setWinnerDismissed(true)}
          />
        )}

        {/* ── Chips-flying-to-winner animation on game over ── */}
        {gameState.gameOver && winnerPlayer && (
          <div className="absolute inset-0 pointer-events-none z-45 overflow-hidden">
            {arcBots.map((bot, idx) => {
              const pos = getPlayerPosition(idx, arcBots.length);
              return (
                <ChipFly
                  key={bot.id}
                  fromX={pos.x}
                  fromY={pos.y}
                  toX={50}
                  toY={95}
                  color="#d4af37"
                  delay={0.3 + idx * 0.12}
                />
              );
            })}
          </div>
        )}

        {/* ── Human player / T-Bot — bottom edge ── */}
        <div className="absolute -bottom-[3%] left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
          {showHuman && humanPlayer && (
            <PlayerBadge
              playerName="You"
              chips={humanPlayer.chips}
              bet={humanPlayer.bet}
              folded={humanPlayer.folded}
              isAllIn={humanPlayer.chips === 0 && !humanPlayer.folded}
              isActive={isActivePlayer || false}
              isWinner={isHumanWinner || false}
              isTrainingBot={false}
              isHuman={true}
              roleBadge={getRoleBadge(humanIdx)}
              acted={humanPlayer.actedThisRound || false}
              hand={humanPlayer.hand}
              showCards={true}
            />
          )}

          {autoPlayMode && tBot && (
            <PlayerBadge
              playerName={tBot.name}
              chips={tBot.chips}
              bet={tBot.bet}
              folded={tBot.folded}
              isAllIn={tBot.chips === 0 && !tBot.folded}
              isActive={gameState.players[gameState.currentPlayerIndex]?.id === tBot.id && !gameState.gameOver}
              isWinner={gameState.gameOver && gameState.winner?.playerId === tBot.id || false}
              isTrainingBot={true}
              isHuman={false}
              roleBadge={getRoleBadge(tBot.position)}
              acted={tBot.actedThisRound || false}
              hand={tBot.hand}
              showCards={true}
            />
          )}
        </div>

        {/* ── Bot players in arc ── */}
        {arcBots.map((player, idx) => {
          const pos = getPlayerPosition(idx, arcBots.length);
          const isTraining = player.isTrainingBot === true;
          const isCurrent = gameState.players[gameState.currentPlayerIndex]?.id === player.id && !gameState.gameOver;
          const isWinnerBot = gameState.gameOver && gameState.winner?.playerId === player.id;

          // Extract last action from gameState.lastAction for this player
          let playerAction: string | undefined;
          if (gameState.lastAction && gameState.lastAction.startsWith(player.name)) {
            const parts = gameState.lastAction.split(' ');
            if (parts.length > 1) {
              const act = parts[1].toLowerCase();
              if (['folds', 'fold', 'checks', 'check', 'calls', 'call', 'raises', 'raise', 'all-in'].includes(act)) {
                playerAction = act === 'folds' ? 'fold' : act === 'checks' ? 'check' : act === 'calls' ? 'call' : act === 'raises' ? 'raise' : act;
              }
            }
          }

          return (
            <div key={player.id}
              className="absolute z-25 transition-all duration-300 flex flex-col items-center gap-0.5"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}>
              <PlayerBadge
                playerName={player.name}
                chips={player.chips}
                bet={player.bet}
                folded={player.folded}
                isAllIn={player.chips === 0 && !player.folded}
                isActive={isCurrent || false}
                isWinner={isWinnerBot || false}
                isTrainingBot={isTraining || false}
                isHuman={false}
                roleBadge={getRoleBadge(player.position)}
                acted={player.actedThisRound || false}
                hand={player.hand}
                showCards={!!(gameState.gameOver && (showCardsAtEnd || player.isAllIn))}
                lastAction={playerAction}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

PokerTable.displayName = 'PokerTable';

export default PokerTable;

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { computeActionWinRates, winRateTextClass } from '../utils/equity';
import { X, Check, DollarSign, TrendingUp, Zap, Loader2 } from 'lucide-react';

const PlayerControls: React.FC = () => {
  const gameState = useGameStore(s => s.gameState);
  const playerAct = useGameStore(s => s.playerAct);
  const nextHand = useGameStore(s => s.nextHand);
  const isPlaying = useGameStore(s => s.isPlaying);
  const autoPlayMode = useGameStore(s => s.autoPlayMode);
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [isActing, setIsActing] = useState(false);

  const addLog = useCallback((msg: string) => {
    setActionLog(prev => [msg, ...prev].slice(0, 3));
  }, []);

  const humanPlayer = useMemo(() => gameState?.players.find(p => !p.isBot), [gameState]);

  // Initialize raiseAmount when toCall changes (reset slider to min raise each round)
  useEffect(() => {
    if (!gameState || !humanPlayer) return;
    const tc = gameState.currentBet - humanPlayer.bet;
    if (tc > 0) {
      setRaiseAmount(tc * 2);
    } else {
      setRaiseAmount(0);
    }
  }, [gameState?.currentBet, humanPlayer?.bet, gameState?.handNumber]);

  const actionWinRates = useMemo(() => {
    if (!gameState) return { fold: 0, checkCall: 0, raise: 0, allIn: 0 };
    const human = gameState.players.find(p => !p.isBot);
    if (!human || human.folded) return { fold: 0, checkCall: 0, raise: 0, allIn: 0 };
    const opponents = gameState.players.filter(p => p.isBot && !p.folded && p.chips > 0).length;
    return computeActionWinRates(human, gameState.communityCards, gameState.currentPhase, gameState.currentBet, gameState.pot, opponents);
  }, [gameState]);

  const isMyTurn = useMemo(() => {
    if (!gameState || !humanPlayer) return false;
    return gameState.players[gameState.currentPlayerIndex]?.id === humanPlayer.id;
  }, [gameState, humanPlayer]);

  const toCall = useMemo(() => {
    if (!gameState || !humanPlayer) return 0;
    return gameState.currentBet - humanPlayer.bet;
  }, [gameState, humanPlayer]);

  const canCheck = toCall === 0;
  const canCall = toCall > 0 && humanPlayer ? humanPlayer.chips >= toCall : false;
  const canRaise = humanPlayer ? humanPlayer.chips > toCall : false;

  // Wrap player actions with loading state
  const doAction = useCallback((action: 'fold' | 'check' | 'call' | 'raise', amount?: number, logMsg?: string) => {
    if (isActing) return;
    setIsActing(true);
    playerAct(action, amount);
    if (logMsg) addLog(logMsg);
    // Reset after short delay for visual feedback
    setTimeout(() => setIsActing(false), 300);
  }, [isActing, playerAct, addLog]);

  useEffect(() => {
    if (!gameState || gameState.gameOver) return;
    const handler = (e: KeyboardEvent) => {
      if (!isPlaying || !humanPlayer || humanPlayer.folded) return;
      if (gameState.players[gameState.currentPlayerIndex]?.id !== humanPlayer.id) return;
      if (isActing) return;

      switch (e.key.toLowerCase()) {
        case 'f': doAction('fold', undefined, 'Folded'); break;
        case 'c': doAction('call', undefined, 'Called'); break;
        case 'x': doAction('check', undefined, 'Checked'); break;
        case 'r': { const tc = gameState.currentBet - humanPlayer.bet; doAction('raise', Math.min(tc * 2, humanPlayer.chips), 'Raised'); break; }
        case 'a': doAction('raise', humanPlayer.chips + humanPlayer.bet, 'ALL IN!'); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState, isPlaying, humanPlayer, doAction, isActing]);

  if (!gameState) return null;

  // ── Auto-play mode banner ──
  if (autoPlayMode) {
    return (
      <div className="glass p-2 text-center animate-fade-in">
        <div className="flex items-center justify-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          <span className="text-cyan-400 font-bold">Auto-Play Active</span>
          <span className="text-text-secondary/50 text-xs">T-Bot playing as you</span>
        </div>
      </div>
    );
  }

  // ── Game over: Next Hand button ──
  if (gameState.gameOver) {
    return (
      <div className="flex justify-center mt-5">
        <button onClick={nextHand} className="btn-primary flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-black shadow-gold-xl animate-pop-in">
          <TrendingUp size={18} /> Next Hand
        </button>
      </div>
    );
  }

  return (
    <div className="glass p-2.5 animate-fade-in">
      {/* Status row */}
      <div className="flex items-center justify-between mb-2">
        {/* Left: turn + chips */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 ${isMyTurn ? 'text-gold' : 'text-text-secondary/50'}`}>
            <div className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-gold animate-pulse' : 'bg-text-secondary/30'}`} />
            <span className="text-xs font-bold">
              {isMyTurn ? (isActing ? 'Acting...' : 'Your Turn') : 'Waiting'}
            </span>
            {isMyTurn && !isActing && (
              <Loader2 size={12} className="text-gold animate-spin hidden" />
            )}
          </div>
          <span className="text-text-secondary/60 text-[10px] font-mono font-semibold bg-white/5 rounded-full px-2 py-0.5 border border-white/5">
            Chips ${humanPlayer?.chips ?? 0}
          </span>
        </div>
        {/* Right: bet + win rate */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-text-secondary/50 uppercase tracking-wider font-bold">To Call</div>
            <div className="text-accent-yellow text-lg font-mono font-black">
              {toCall > 0 ? `$${toCall}` : '$0'}
            </div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="text-right">
            <div className="text-[10px] text-text-secondary/50 uppercase tracking-wider font-bold">Win Rate</div>
            <div className={`text-lg font-black font-mono ${winRateTextClass(actionWinRates.checkCall)}`}>
              {actionWinRates.checkCall.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap items-center">
        {/* Fold */}
        <button
          onClick={() => doAction('fold', undefined, 'Folded')}
          disabled={!!humanPlayer?.folded || !isMyTurn || isActing}
          className="btn-danger flex items-center gap-1.5"
        >
          {isActing ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
          Fold <span className="text-[10px] text-white/40 font-mono ml-1">F</span>
          <span className="text-[10px] text-white/30 font-mono ml-0.5">0%</span>
        </button>

        {/* Check / Call */}
        {canCheck ? (
          <button
            onClick={() => doAction('check', undefined, 'Checked')}
            disabled={!isMyTurn || isActing}
            className="btn-secondary flex items-center gap-1.5"
          >
            {isActing ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            Check <span className="text-[10px] text-text-secondary/40 font-mono ml-1">X</span>
            <span className={`text-[11px] font-black ml-1 ${winRateTextClass(actionWinRates.checkCall)}`}>
              {actionWinRates.checkCall.toFixed(0)}%
            </span>
          </button>
        ) : canCall ? (
          <button
            onClick={() => doAction('call', undefined, 'Called')}
            disabled={!isMyTurn || isActing}
            className="btn-call flex items-center gap-1.5"
          >
            {isActing ? <Loader2 size={15} className="animate-spin" /> : <DollarSign size={15} />}
            Call ${toCall} <span className="text-[10px] text-accent-blue/50 font-mono ml-1">C</span>
            <span className={`text-[11px] font-black ml-1 ${winRateTextClass(actionWinRates.checkCall)}`}>
              {actionWinRates.checkCall.toFixed(0)}%
            </span>
          </button>
        ) : null}

        {/* Raise button */}
        {canRaise && isMyTurn && (
          <button
            onClick={() => doAction('raise', raiseAmount || toCall * 2, `Raised $${(raiseAmount || toCall * 2).toLocaleString()}`)}
            disabled={!isMyTurn || isActing}
            className="btn-primary flex items-center gap-1.5"
          >
            {isActing ? <Loader2 size={15} className="animate-spin text-black" /> : <TrendingUp size={15} />}
            Raise <span className="text-[10px] text-black/40 font-mono ml-1">R</span>
            <span className="text-[11px] font-black ml-1 text-black/70">{actionWinRates.raise.toFixed(0)}%</span>
          </button>
        )}

        {/* All In */}
        {canRaise && isMyTurn && (
          <button
            onClick={() => doAction('raise', (humanPlayer?.chips ?? 0) + (humanPlayer?.bet ?? 0), 'ALL IN!')}
            disabled={!isMyTurn || isActing}
            className="btn-allin flex items-center gap-1.5"
          >
            {isActing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            All In <span className="text-[10px] text-white/40 font-mono ml-1">A</span>
            <span className="text-[11px] font-black ml-1 text-white/80">{actionWinRates.allIn.toFixed(0)}%</span>
          </button>
        )}
      </div>

      {/* Raise slider */}
      {canRaise && isMyTurn && (() => {
        const sliderMin = toCall * 2;
        const sliderMax = (humanPlayer?.chips ?? 0) + (humanPlayer?.bet ?? 0);
        const sliderStep = Math.max(5, gameState.minRaise);
        const sliderValue = raiseAmount || sliderMin;

        // Hide slider if min >= max (all-in only)
        if (sliderMin >= sliderMax) return null;

        return (
          <div className="mt-2 w-full">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-text-secondary/50 uppercase tracking-wider font-semibold">Raise Amount</span>
              <span className="text-gold font-mono font-bold text-xs">${sliderValue.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={sliderStep}
              value={sliderValue}
              onInput={e => setRaiseAmount(parseInt((e.target as HTMLInputElement).value) || 0)}
              onChange={e => setRaiseAmount(parseInt(e.target.value) || 0)}
              className="slider-gold"
              style={{ '--slider-pct': `${((sliderValue - sliderMin) / (sliderMax - sliderMin)) * 100}%` } as React.CSSProperties}
            />
            <div className="flex justify-between text-xs mt-0.5">
              <span className="text-text-secondary/40 font-mono">Min: ${sliderMin.toLocaleString()}</span>
              <span className="text-text-secondary/40 font-mono">Max: ${sliderMax.toLocaleString()}</span>
            </div>
          </div>
        );
      })()}

      {/* Quick raise + Action log */}
      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
        {canRaise && isMyTurn && (
          <div className="flex gap-1.5">
            {[0.5, 1, 2, 3].map(mult => {
              const minRaise = toCall * 2;
              const chipTotal = (humanPlayer?.chips ?? 0) + (humanPlayer?.bet ?? 0);
              return (
                <button key={mult} onClick={() => setRaiseAmount(Math.min(minRaise * mult, chipTotal))}
                  className="text-[11px] px-2.5 py-1 bg-white/5 rounded-lg border border-white/10 text-text-secondary/60 hover:border-gold/40 hover:text-gold transition-all font-mono font-bold active:scale-95">
                  {mult}x
                </button>
              );
            })}
            <button onClick={() => {
              const chipTotal = (humanPlayer?.chips ?? 0) + (humanPlayer?.bet ?? 0);
              setRaiseAmount(Math.min(gameState.pot + toCall, chipTotal));
            }}
              className="text-[11px] px-2.5 py-1 bg-white/5 rounded-lg border border-white/10 text-text-secondary/60 hover:border-gold/40 hover:text-gold transition-all font-mono font-bold active:scale-95">
              Pot
            </button>
          </div>
        )}

        {actionLog.length > 0 && (
          <div className="flex gap-1.5">
            {actionLog.map((log, i) => (
              <span key={i} className="text-[10px] text-text-secondary/50 bg-white/5 rounded-full px-2.5 py-0.5 font-medium border border-white/5 animate-fade-in">
                {log}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerControls;

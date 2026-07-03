import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { evaluateHand } from '../utils/handEvaluator';
import { X, Check, DollarSign, TrendingUp, Zap, Target } from 'lucide-react';

const PlayerControls: React.FC = () => {
  const gameState = useGameStore(s => s.gameState);
  const playerAct = useGameStore(s => s.playerAct);
  const nextHand = useGameStore(s => s.nextHand);
  const isPlaying = useGameStore(s => s.isPlaying);
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [actionLog, setActionLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setActionLog(prev => [msg, ...prev].slice(0, 3));
  }, []);

  const actionWinRates = useMemo(() => {
    if (!gameState) return { fold: 0, checkCall: 0, raise: 0, allIn: 0 };
    const human = gameState.players.find(p => !p.isBot);
    if (!human || human.folded) return { fold: 0, checkCall: 0, raise: 0, allIn: 0 };

    const handEval = evaluateHand(human.hand, gameState.communityCards);
    const strengthPct = Math.min(100, Math.max(0, (handEval.score / 9500000) * 100));
    const cardsSeen = human.hand.length + gameState.communityCards.length;
    const uncertaintyFactor = Math.max(0, (7 - cardsSeen) / 7);
    const rawEquity = strengthPct / 100;
    const equity = Math.min(0.95, Math.max(0.05, rawEquity * (1 - uncertaintyFactor * 0.4) + (0.15 * uncertaintyFactor)));
    const phaseMultiplier: Record<string, number> = { preflop: 0.7, flop: 0.85, turn: 0.92, river: 1.0 };
    const phaseEquity = equity * (phaseMultiplier[gameState.currentPhase] || 0.7);
    const toCall = gameState.currentBet - human.bet;
    const foldEquityBonus = toCall > 0 ? Math.min(15, (toCall / Math.max(1, gameState.pot)) * 25) : 0;

    return {
      fold: 0,
      checkCall: phaseEquity * 100,
      raise: Math.min(95, phaseEquity * 100 + foldEquityBonus),
      allIn: Math.min(95, phaseEquity * 100 + foldEquityBonus * 2.5),
    };
  }, [gameState]);

  useEffect(() => {
    if (!gameState || gameState.gameOver) return;
    const handler = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      const human = gameState.players.find(p => !p.isBot);
      if (!human || human.folded) return;
      if (gameState.players[gameState.currentPlayerIndex]?.id !== human.id) return;

      switch (e.key.toLowerCase()) {
        case 'f': playerAct('fold'); addLog('Folded'); break;
        case 'c': playerAct('call'); addLog('Called'); break;
        case 'x': playerAct('check'); addLog('Checked'); break;
        case 'r': { const tc = gameState.currentBet - human.bet; playerAct('raise', Math.min(tc * 2, human.chips)); addLog('Raised'); break; }
        case 'a': playerAct('raise', human.chips + human.bet); addLog('ALL IN!'); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState, isPlaying, playerAct, addLog]);

  if (!gameState) return null;

  if (gameState.gameOver) {
    return (
      <div className="flex justify-center mt-1">
        <button onClick={nextHand} className="btn-primary flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-black shadow-gold-xl">
          <TrendingUp size={18} /> Next Hand
        </button>
      </div>
    );
  }

  const humanPlayer = gameState.players.find(p => !p.isBot)!;
  const toCall = gameState.currentBet - humanPlayer.bet;
  const canCheck = toCall === 0;
  const canCall = toCall > 0 && humanPlayer.chips >= toCall;
  const canRaise = humanPlayer.chips > toCall;
  const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === humanPlayer.id;

  const handleRaiseChange = (e: React.ChangeEvent<HTMLInputElement>) => setRaiseAmount(parseInt(e.target.value) || 0);
  const handleAllIn = () => { playerAct('raise', humanPlayer.chips + humanPlayer.bet); addLog('ALL IN!'); };
  const handleQuickRaise = (mult: number) => setRaiseAmount(Math.min(toCall * 2 * mult, humanPlayer.chips));
  const handlePotRaise = () => setRaiseAmount(Math.min(gameState.pot + toCall, humanPlayer.chips));

  const winColor = (pct: number) => pct >= 55 ? 'text-accent-green' : pct >= 30 ? 'text-accent-yellow' : 'text-accent-red';
  const winBg = (pct: number) => pct >= 55 ? 'bg-accent-green/15 border-accent-green/30' : pct >= 30 ? 'bg-accent-yellow/15 border-accent-yellow/30' : 'bg-accent-red/15 border-accent-red/30';

  return (
    <div className="glass p-4 mt-1 animate-fade-in">
      {/* Status row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          {/* Turn indicator */}
          <div className={`flex items-center gap-2 ${isMyTurn ? 'text-gold' : 'text-text-secondary/50'}`}>
            <div className={`w-2.5 h-2.5 rounded-full ${isMyTurn ? 'bg-gold animate-pulse-glow-fast shadow-[0_0_8px_rgba(212,175,55,0.6)]' : 'bg-text-secondary/30'}`} />
            <span className="text-sm font-bold">{isMyTurn ? 'Your Turn' : 'Waiting'}</span>
          </div>
          {/* Chips */}
          <span className="text-text-secondary text-xs font-mono font-bold bg-white/5 rounded-full px-3 py-1 border border-white/5">${humanPlayer.chips}</span>
          {/* Live hand win rate */}
          <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${winBg(actionWinRates.checkCall)}`}>
            <Target size={11} />
            <span className={winColor(actionWinRates.checkCall)}>{actionWinRates.checkCall.toFixed(0)}%</span>
          </div>
        </div>
        {toCall > 0 && (
          <span className="text-accent-yellow text-xs font-mono font-black bg-accent-yellow/10 rounded-full px-3 py-1 border border-accent-yellow/20">
            To call: ${toCall}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap items-end">
        {/* Fold */}
        <button
          onClick={() => { playerAct('fold'); addLog('Folded'); }}
          disabled={humanPlayer.folded || !isMyTurn}
          className="btn-danger flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <X size={15} /> Fold <span className="text-[10px] text-white/40 font-mono ml-1">F</span>
          <span className="text-[10px] text-white/30 font-mono ml-0.5">0%</span>
        </button>

        {/* Check / Call */}
        {canCheck ? (
          <button
            onClick={() => { playerAct('check'); addLog('Checked'); }}
            disabled={!isMyTurn}
            className="btn-secondary flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Check size={15} /> Check <span className="text-[10px] text-text-secondary/40 font-mono ml-1">X</span>
            <span className={`text-[11px] font-black ml-1 ${winColor(actionWinRates.checkCall)}`}>{actionWinRates.checkCall.toFixed(0)}%</span>
          </button>
        ) : canCall ? (
          <button
            onClick={() => { playerAct('call'); addLog('Called'); }}
            disabled={!isMyTurn}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-accent-blue/15 border border-accent-blue/30 text-accent-blue font-bold rounded-xl transition-all duration-200 hover:bg-accent-blue/25 hover:border-accent-blue/50 hover:shadow-[0_4px_16px_-4px_rgba(59,130,246,0.4)] active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <DollarSign size={15} /> Call ${toCall} <span className="text-[10px] text-accent-blue/50 font-mono ml-1">C</span>
            <span className={`text-[11px] font-black ml-1 ${winColor(actionWinRates.checkCall)}`}>{actionWinRates.checkCall.toFixed(0)}%</span>
          </button>
        ) : null}

        {/* Raise */}
        {canRaise && isMyTurn && (
          <div className="flex flex-col gap-1.5 min-w-[130px]">
            <button
              onClick={() => { playerAct('raise', raiseAmount || toCall * 2); addLog(`Raised $${raiseAmount || toCall * 2}`); }}
              className="btn-primary flex items-center gap-1.5"
            >
              <TrendingUp size={15} /> Raise <span className="text-[10px] text-black/40 font-mono ml-1">R</span>
              <span className="text-[11px] font-black ml-1 text-black/70">{actionWinRates.raise.toFixed(0)}%</span>
            </button>
            <input
              type="range" min={toCall * 2} max={humanPlayer.chips + humanPlayer.bet} step={5}
              value={raiseAmount || toCall * 2} onChange={handleRaiseChange}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-gold [&::-webkit-slider-thumb]:shadow-gold-sm [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-gold-dark"
            />
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary/60 font-mono font-bold">${raiseAmount || toCall * 2}</span>
              <span className="text-text-secondary/40 font-mono">~{actionWinRates.raise.toFixed(0)}% win</span>
            </div>
          </div>
        )}

        {/* All In */}
        {canRaise && isMyTurn && (
          <button
            onClick={handleAllIn}
            className="px-4 py-2.5 rounded-xl text-sm font-black bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red hover:shadow-[0_4px_20px_-4px_rgba(239,68,68,0.6)] transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Zap size={14} /> All In <span className="text-[10px] text-white/40 font-mono ml-1">A</span>
            <span className="text-[11px] font-black ml-1 text-white/80">{actionWinRates.allIn.toFixed(0)}%</span>
          </button>
        )}
      </div>

      {/* Quick raise + Action log */}
      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
        {canRaise && isMyTurn && (
          <div className="flex gap-1.5">
            {[0.5, 1, 2, 3].map(mult => (
              <button key={mult} onClick={() => handleQuickRaise(mult)}
                className="text-[11px] px-2.5 py-1 bg-white/5 rounded-lg border border-white/10 text-text-secondary/60 hover:border-gold/40 hover:text-gold transition-all font-mono font-bold">
                {mult}x
              </button>
            ))}
            <button onClick={handlePotRaise}
              className="text-[11px] px-2.5 py-1 bg-white/5 rounded-lg border border-white/10 text-text-secondary/60 hover:border-gold/40 hover:text-gold transition-all font-mono font-bold">
              Pot
            </button>
          </div>
        )}

        {actionLog.length > 0 && (
          <div className="flex gap-1.5">
            {actionLog.map((log, i) => (
              <span key={i} className="text-[10px] text-text-secondary/50 bg-white/5 rounded-full px-2.5 py-0.5 font-medium border border-white/5">
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

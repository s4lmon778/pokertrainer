import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { evaluateHand } from '../utils/handEvaluator';
import { X, Check, DollarSign, TrendingUp, Zap, Target } from 'lucide-react';

const PlayerControls: React.FC = () => {
  const gameState = useGameStore(s => s.gameState);
  const playerAct = useGameStore(s => s.playerAct);
  const nextHand = useGameStore(s => s.nextHand);
  const isPlaying = useGameStore(s => s.isPlaying);
  const autoPlayMode = useGameStore(s => s.autoPlayMode);
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [actionLog, setActionLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setActionLog(prev => [msg, ...prev].slice(0, 3));
  }, []);

  const actionWinRates = useMemo(() => {
    if (!gameState) return { fold: 0, checkCall: 0, raise: 0, allIn: 0 };
    const human = gameState.players.find(p => !p.isBot);
    if (!human || human.folded) return { fold: 0, checkCall: 0, raise: 0, allIn: 0 };

    const communityCount = gameState.communityCards.length;
    const activeOpponents = gameState.players.filter(p => p.isBot && !p.folded && p.chips > 0).length;
    const opponentPenalty = activeOpponents > 1 ? Math.min(0.35, (activeOpponents - 1) * 0.11) : 0;

    let rawEquity: number;
    if (communityCount === 0 && human.hand.length >= 2) {
      // Preflop heuristics — evaluateHand returns score 0 for < 5 cards
      const isPair = human.hand[0].rank === human.hand[1].rank;
      const suited = human.hand[0].suit === human.hand[1].suit;
      const rankValues = human.hand.map(c => {
        const r = c.rank;
        if (r === 'A') return 14; if (r === 'K') return 13; if (r === 'Q') return 12; if (r === 'J') return 11;
        return parseInt(r);
      });
      const high = Math.max(...rankValues);
      const low = Math.min(...rankValues);
      const gap = high - low;

      let equity = 0.35;
      if (isPair) { equity = 0.45 + (high / 14) * 0.15; }
      else {
        equity = 0.25 + ((high + low) / 28) * 0.25;
        if (suited) equity += 0.04;
        if (gap <= 2) equity += 0.03;
        if (high >= 13) equity += 0.03;
      }
      rawEquity = Math.min(0.95, Math.max(0.05, equity * (1 - opponentPenalty)));
    } else {
      const handEval = evaluateHand(human.hand, gameState.communityCards);
      const strengthPct = Math.min(100, Math.max(0, (handEval.score / 9500000) * 100));
      rawEquity = Math.min(0.95, Math.max(0.05, (strengthPct / 100) * (1 - opponentPenalty)));
    }

    const phaseMultiplier: Record<string, number> = { preflop: 0.75, flop: 0.88, turn: 0.94, river: 1.0 };
    const phaseEquity = rawEquity * (phaseMultiplier[gameState.currentPhase] || 0.75);

    const toCall = gameState.currentBet - human.bet;
    const potSize = Math.max(1, gameState.pot);
    const betRatio = toCall > 0 ? toCall / (potSize + toCall) : 0;
    const foldEquityBonus = toCall > 0 ? Math.min(12, betRatio * 30) : 0;

    return {
      fold: 0,
      checkCall: phaseEquity * 100,
      raise: Math.min(95, phaseEquity * 100 + foldEquityBonus),
      allIn: Math.min(95, phaseEquity * 100 + foldEquityBonus * 3),
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
    <div className="glass p-2.5 animate-fade-in">
      {/* Status row */}
      <div className="flex items-center justify-between mb-2">
        {/* Left: turn + chips */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 ${isMyTurn ? 'text-gold' : 'text-text-secondary/50'}`}>
            <div className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-gold animate-pulse' : 'bg-text-secondary/30'}`} />
            <span className="text-xs font-bold">{isMyTurn ? 'Your Turn' : 'Waiting'}</span>
          </div>
          <span className="text-text-secondary/60 text-[10px] font-mono font-semibold bg-white/5 rounded-full px-2 py-0.5 border border-white/5">Chips ${humanPlayer.chips}</span>
        </div>
        {/* Right: bet + win rate */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-text-secondary/50 uppercase tracking-wider font-bold">To Call</div>
            <div className="text-accent-yellow text-lg font-mono font-black">{toCall > 0 ? `$${toCall}` : '$0'}</div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="text-right">
            <div className="text-[10px] text-text-secondary/50 uppercase tracking-wider font-bold">Win Rate</div>
            <div className={`text-lg font-black font-mono ${winColor(actionWinRates.checkCall)}`}>{actionWinRates.checkCall.toFixed(0)}%</div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap items-center">
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

        {/* Raise button - inline with others */}
        {canRaise && isMyTurn && (
          <button
            onClick={() => { playerAct('raise', raiseAmount || toCall * 2); addLog(`Raised $${raiseAmount || toCall * 2}`); }}
            className="btn-primary flex items-center gap-1.5"
          >
            <TrendingUp size={15} /> Raise <span className="text-[10px] text-black/40 font-mono ml-1">R</span>
            <span className="text-[11px] font-black ml-1 text-black/70">{actionWinRates.raise.toFixed(0)}%</span>
          </button>
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

      {/* Raise slider - below buttons */}
      {canRaise && isMyTurn && (
        <div className="mt-2 w-[40%] min-w-[140px]">
          <input
            type="range" min={toCall * 2} max={humanPlayer.chips + humanPlayer.bet} step={5}
            value={raiseAmount || toCall * 2} onChange={handleRaiseChange}
            className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-gold"
          />
          <div className="flex justify-between text-xs mt-0.5">
            <span className="text-text-secondary/60 font-mono font-bold">${raiseAmount || toCall * 2}</span>
            <span className="text-text-secondary/40 font-mono">~{actionWinRates.raise.toFixed(0)}%</span>
          </div>
        </div>
      )}

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

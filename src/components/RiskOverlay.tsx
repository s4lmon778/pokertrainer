import React from 'react';
import { useGameStore } from '../store/gameStore';
import { computeEquity, computeActionWinRates, winRateTextClass } from '../utils/equity';
import { evaluateHand } from '../utils/handEvaluator';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';
import { Percent, Target, TrendingUp, Shield } from 'lucide-react';

const RiskOverlay: React.FC = React.memo(() => {
  const gameState = useGameStore(s => s.gameState);
  const showRiskOverlay = useGameStore(s => s.showRiskOverlay);

  if (!showRiskOverlay || !gameState) return null;

  const humanPlayer = gameState.players.find(p => !p.isBot);
  if (!humanPlayer || humanPlayer.folded) return null;

  const activeOpponents = gameState.players.filter(p => p.isBot && !p.folded && p.chips > 0).length;
  const rawEquity = computeEquity(humanPlayer, gameState.communityCards, gameState.currentPhase, activeOpponents);
  const equityPct = rawEquity * 100;

  const handEval = evaluateHand(humanPlayer.hand, gameState.communityCards);
  const strengthPercent = Math.min(100, Math.max(0, (handEval.score / 9_500_000) * 100));

  const toCall = gameState.currentBet - humanPlayer.bet;
  const potOdds = toCall > 0 ? (toCall / (gameState.pot + toCall)) * 100 : 0;
  const expectedValue = (rawEquity * (gameState.pot + toCall)) - ((1 - rawEquity) * toCall);

  const actionRates = computeActionWinRates(humanPlayer, gameState.communityCards, gameState.currentPhase, gameState.currentBet, gameState.pot, activeOpponents);

  const barColor = (pct: number) => pct >= 60 ? '#22c55e' : pct >= 35 ? '#d4af37' : '#ef4444';

  const barData = [
    { name: 'You', value: strengthPercent, color: '#d4af37' },
    { name: 'Avg', value: 35, color: '#64748b' },
    { name: 'Top', value: 65, color: '#ef4444' },
  ];

  return (
    <div className="space-y-1.5 animate-fade-in lg:sticky lg:top-16">
      {/* Win Rate */}
      <div className="card-premium text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Percent size={14} className="text-gold" />
          <span className="text-[11px] text-text-secondary/60 uppercase tracking-wider font-bold">Win Rate</span>
        </div>
        <div className={`text-4xl font-black font-mono ${winRateTextClass(equityPct)}`}>
          {equityPct.toFixed(1)}<span className="text-xl">%</span>
        </div>
        <div className="text-xs font-semibold text-text-secondary/60 mt-0.5">{handEval.description}</div>
        <div className="w-full bg-white/5 rounded-full h-2.5 mt-2 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${equityPct}%`, backgroundColor: barColor(equityPct) }} />
        </div>
        <div className="flex justify-between text-[10px] text-text-secondary/40 font-mono mt-0.5 px-1">
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </div>

      {/* Per Action */}
      <div className="card-premium">
        <div className="flex items-center gap-1.5 mb-2">
          <Target size={14} className="text-gold" />
          <span className="text-[11px] font-bold text-text-secondary/60 uppercase tracking-wider">Per Action</span>
        </div>
        <div className="space-y-1">
          {[
            { action: 'Fold', pct: 0, muted: true },
            { action: toCall > 0 ? 'Call' : 'Check', pct: equityPct },
            { action: 'Raise', pct: actionRates.raise },
            { action: 'All-In', pct: actionRates.allIn },
          ].map(row => (
            <div key={row.action} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.03]">
              <span className={`text-sm font-semibold ${row.muted ? 'text-text-secondary/30' : 'text-text-secondary/70'}`}>{row.action}</span>
              <span className={`text-sm font-black font-mono ${row.muted ? 'text-text-secondary/20' : winRateTextClass(row.pct)}`}>
                {row.pct.toFixed(row.pct === 0 ? 0 : 1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* EV */}
      <div className="card-premium">
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp size={14} className={expectedValue >= 0 ? 'text-accent-green' : 'text-accent-red'} />
          <span className="text-[11px] font-bold text-text-secondary/60 uppercase tracking-wider">EV</span>
        </div>
        <div className={`text-2xl font-black font-mono ${expectedValue >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
          {expectedValue >= 0 ? '+' : ''}${expectedValue.toFixed(2)}
        </div>
        <div className="space-y-1.5 mt-2">
          <div className="flex justify-between text-xs">
            <span className="text-text-secondary/50">Pot Odds</span>
            <span className="font-mono font-bold text-text-secondary/70">{potOdds.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-secondary/50">Verdict</span>
            <span className={`font-bold ${expectedValue >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {expectedValue >= 0 ? 'Profitable' : 'Consider Fold'}
            </span>
          </div>
        </div>
      </div>

      {/* vs Range */}
      <div className="card-premium">
        <div className="flex items-center gap-1.5 mb-2">
          <Shield size={14} className="text-accent-blue" />
          <span className="text-[11px] font-bold text-text-secondary/60 uppercase tracking-wider">vs Range</span>
        </div>
        <ResponsiveContainer width="100%" height={70}>
          <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 0 }}>
            <Bar dataKey="value" radius={[0, 2, 2, 0]} barSize={10}>
              {barData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-between mt-1 text-[10px] text-text-secondary/40 font-medium">
          {barData.map(d => <span key={d.name}>{d.name}</span>)}
        </div>
        <div className="text-center text-[10px] text-text-secondary/40 mt-0.5 font-mono">
          Score: {handEval.score.toLocaleString()} · {humanPlayer.hand.length + gameState.communityCards.length}/7 cards · {activeOpponents} opp
        </div>
      </div>
    </div>
  );
});

RiskOverlay.displayName = 'RiskOverlay';

export default RiskOverlay;

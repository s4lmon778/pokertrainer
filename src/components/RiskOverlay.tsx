import React from 'react';
import { useGameStore } from '../store/gameStore';
import { evaluateHand } from '../utils/handEvaluator';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';
import { Percent, Target, TrendingUp, Shield } from 'lucide-react';

const RiskOverlay: React.FC = () => {
  const gameState = useGameStore(s => s.gameState);
  const showRiskOverlay = useGameStore(s => s.showRiskOverlay);

  if (!showRiskOverlay || !gameState) return null;

  const humanPlayer = gameState.players.find(p => !p.isBot);
  if (!humanPlayer || humanPlayer.folded) return null;

  const handEval = evaluateHand(humanPlayer.hand, gameState.communityCards);
  const strengthPercent = Math.min(100, Math.max(0, (handEval.score / 9500000) * 100));

  const activeOpponents = gameState.players.filter(p => p.isBot && !p.folded && p.chips > 0).length;
  const cardsSeen = humanPlayer.hand.length + gameState.communityCards.length;
  const communityCount = gameState.communityCards.length;
  const opponentPenalty = activeOpponents > 1 ? Math.min(0.3, (activeOpponents - 1) * 0.1) : 0;

  let equity: number;
  if (communityCount === 0) {
    const isPair = humanPlayer.hand.length >= 2 && humanPlayer.hand[0].rank === humanPlayer.hand[1].rank;
    const suited = humanPlayer.hand.length >= 2 && humanPlayer.hand[0].suit === humanPlayer.hand[1].suit;
    let preflopEquity = 0.35;
    if (isPair) preflopEquity += 0.08;
    if (suited) preflopEquity += 0.03;
    preflopEquity *= (1 - opponentPenalty);
    equity = Math.min(0.95, Math.max(0.05, preflopEquity));
  } else {
    equity = Math.min(0.95, Math.max(0.05, (strengthPercent / 100) * (1 - opponentPenalty)));
  }

  const toCall = gameState.currentBet - humanPlayer.bet;
  const potOdds = toCall > 0 ? (toCall / (gameState.pot + toCall)) * 100 : 0;
  const expectedValue = (equity * (gameState.pot + toCall)) - ((1 - equity) * toCall);
  const equityPct = equity * 100;
  const raisePct = Math.min(95, equityPct + 5);
  const allInPct = Math.min(95, equityPct + 10);

  const winColor = (pct: number) => pct >= 55 ? 'text-accent-green' : pct >= 30 ? 'text-accent-yellow' : 'text-accent-red';
  const barColor = (pct: number) => pct >= 60 ? '#22c55e' : pct >= 35 ? '#d4af37' : '#ef4444';

  const barData = [
    { name: 'You', value: strengthPercent, color: '#d4af37' },
    { name: 'Avg', value: 35, color: '#64748b' },
    { name: 'Top', value: 65, color: '#ef4444' },
  ];

  return (
    <div className="space-y-2 animate-fade-in lg:sticky lg:top-20">
      {/* Win Rate */}
      <div className="card-premium text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Percent size={14} className="text-gold" />
          <span className="text-[10px] text-text-secondary/50 uppercase tracking-wider font-bold">Win Rate</span>
        </div>
        <div className={`text-4xl font-black font-mono ${winColor(equityPct)}`}>
          {equityPct.toFixed(1)}<span className="text-lg">%</span>
        </div>
        <div className="text-[11px] font-bold text-text-secondary/60 mt-0.5">{handEval.description}</div>
        <div className="w-full bg-white/5 rounded-full h-2 mt-2 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${equityPct}%`, backgroundColor: barColor(equityPct) }} />
        </div>
        <div className="flex justify-between text-[9px] text-text-secondary/30 font-mono mt-0.5 px-1">
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </div>

      {/* Per Action */}
      <div className="card-premium">
        <div className="flex items-center gap-1.5 mb-2">
          <Target size={14} className="text-gold" />
          <span className="text-[10px] font-bold text-text-secondary/50 uppercase tracking-wider">Per Action</span>
        </div>
        <div className="space-y-1.5">
          {[
            { action: 'Fold', pct: 0, muted: true },
            { action: toCall > 0 ? 'Call' : 'Check', pct: equityPct },
            { action: 'Raise', pct: raisePct },
            { action: 'All-In', pct: allInPct },
          ].map(row => (
            <div key={row.action} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.03]">
              <span className={`text-xs font-semibold ${row.muted ? 'text-text-secondary/30' : 'text-text-secondary/70'}`}>{row.action}</span>
              <span className={`text-xs font-black font-mono ${row.muted ? 'text-text-secondary/20' : winColor(row.pct)}`}>
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
          <span className="text-[10px] font-bold text-text-secondary/50 uppercase tracking-wider">EV</span>
        </div>
        <div className={`text-2xl font-black font-mono ${expectedValue >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
          {expectedValue >= 0 ? '+' : ''}${expectedValue.toFixed(2)}
        </div>
        <div className="space-y-1 mt-2">
          <div className="flex justify-between text-[10px]">
            <span className="text-text-secondary/40">Pot Odds</span>
            <span className="font-mono font-bold text-text-secondary/60">{potOdds.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-text-secondary/40">Verdict</span>
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
          <span className="text-[10px] font-bold text-text-secondary/50 uppercase tracking-wider">vs Range</span>
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
        <div className="flex justify-between mt-1 text-[9px] text-text-secondary/30">
          {barData.map(d => <span key={d.name}>{d.name}</span>)}
        </div>
        <div className="text-center text-[10px] text-text-secondary/30 mt-0.5 font-mono">
          Score: {handEval.score.toLocaleString()} · {cardsSeen}/7 cards · {activeOpponents} opp
        </div>
      </div>
    </div>
  );
};

export default RiskOverlay;

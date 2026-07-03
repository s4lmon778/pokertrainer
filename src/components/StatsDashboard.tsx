import React from 'react';
import { useGameStore } from '../store/gameStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Trophy, TrendingUp, DollarSign, Activity, BarChart3, Target, Brain, User, FlaskConical } from 'lucide-react';

const StatsDashboard: React.FC = () => {
  const stats = useGameStore(s => s.stats);
  const tbotStats = useGameStore(s => s.tbotStats);
  const currentBankroll = useGameStore(s => s.currentBankroll);
  const startingBankroll = useGameStore(s => s.startingBankroll);
  const botEvaluations = useGameStore(s => s.botEvaluations);

  const bankrollData = stats.bankrollHistory.map((value, index) => ({
    hand: index + 1,
    bankroll: value,
  }));

  const pieData = [
    { name: 'Wins', value: stats.totalWon, color: '#22c55e' },
    { name: 'Losses', value: stats.totalLost, color: '#ef4444' },
  ];

  const tbotPieData = [
    { name: 'Wins', value: tbotStats.handsWon, color: '#06b6d4' },
    { name: 'Losses', value: tbotStats.handsLost, color: '#ef4444' },
  ];

  const totalDecisions = botEvaluations.length;
  const correctDecisions = botEvaluations.filter(e => e.isCorrect).length;
  const accuracy = totalDecisions > 0 ? (correctDecisions / totalDecisions) * 100 : 0;

  const accuracyByPhase = Object.entries(stats.accuracyByPhase).map(([phase, data]) => ({
    phase: phase.charAt(0).toUpperCase() + phase.slice(1),
    accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
    total: data.total,
  }));

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Player Summary */}
      <div className="card-premium">
        <div className="flex items-center gap-2 mb-3">
          <User size={16} className="text-gold" />
          <span className="font-bold text-sm">Your Stats</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white/[0.03] rounded-xl p-3 text-center">
            <div className="text-[10px] text-text-secondary/50 uppercase tracking-wider font-semibold mb-1">Hands</div>
            <div className="text-xl font-black">{stats.totalHands}</div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3 text-center">
            <div className="text-[10px] text-text-secondary/50 uppercase tracking-wider font-semibold mb-1">Win Rate</div>
            <div className={`text-xl font-black ${stats.winRate >= 50 ? 'text-accent-green' : 'text-accent-red'}`}>{stats.winRate.toFixed(1)}%</div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3 text-center">
            <div className="text-[10px] text-text-secondary/50 uppercase tracking-wider font-semibold mb-1">Bankroll</div>
            <div className={`text-xl font-black font-mono ${currentBankroll >= startingBankroll ? 'text-accent-green' : 'text-accent-red'}`}>${currentBankroll}</div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3 text-center">
            <div className="text-[10px] text-text-secondary/50 uppercase tracking-wider font-semibold mb-1">ROI</div>
            <div className={`text-xl font-black ${stats.roi >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>{stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%</div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3 text-center">
            <div className="text-[10px] text-text-secondary/50 uppercase tracking-wider font-semibold mb-1">P/L</div>
            <div className={`text-xl font-black font-mono ${currentBankroll - startingBankroll >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {currentBankroll - startingBankroll >= 0 ? '+' : ''}${currentBankroll - startingBankroll}
            </div>
          </div>
        </div>
      </div>

      {/* T-Bot Summary */}
      <div className="card-premium border-cyan-500/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
            <FlaskConical size={12} className="text-white" />
          </div>
          <span className="font-bold text-sm text-cyan-400">T-Bot Stats</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white/[0.03] rounded-xl p-3 text-center">
            <div className="text-[10px] text-text-secondary/50 uppercase tracking-wider font-semibold mb-1">Hands</div>
            <div className="text-xl font-black text-cyan-400">{tbotStats.handsPlayed}</div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3 text-center">
            <div className="text-[10px] text-text-secondary/50 uppercase tracking-wider font-semibold mb-1">Win Rate</div>
            <div className={`text-xl font-black ${tbotStats.winRate >= 50 ? 'text-accent-green' : 'text-accent-red'}`}>{tbotStats.winRate.toFixed(1)}%</div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3 text-center">
            <div className="text-[10px] text-text-secondary/50 uppercase tracking-wider font-semibold mb-1">Wins</div>
            <div className="text-xl font-black text-cyan-400">{tbotStats.handsWon}</div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3 text-center">
            <div className="text-[10px] text-text-secondary/50 uppercase tracking-wider font-semibold mb-1">Losses</div>
            <div className="text-xl font-black text-accent-red">{tbotStats.handsLost}</div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3 text-center">
            <div className="text-[10px] text-text-secondary/50 uppercase tracking-wider font-semibold mb-1">Profit</div>
            <div className={`text-xl font-black font-mono ${tbotStats.totalProfit >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {tbotStats.totalProfit >= 0 ? '+' : ''}${tbotStats.totalProfit}
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Win/Loss - Player */}
        <div className="card-premium">
          <div className="flex items-center gap-2 mb-3">
            <User size={14} className="text-gold" />
            <span className="text-sm font-bold">Your Win/Loss</span>
          </div>
          {stats.totalWon + stats.totalLost > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value">
                    {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 text-xs">
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-accent-green" /> {stats.totalWon} Wins</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-accent-red" /> {stats.totalLost} Losses</span>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-text-secondary text-sm">No games played</div>
          )}
        </div>

        {/* Win/Loss - T-Bot */}
        <div className="card-premium">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center">
              <FlaskConical size={10} className="text-white" />
            </div>
            <span className="text-sm font-bold">T-Bot Win/Loss</span>
          </div>
          {tbotStats.handsWon + tbotStats.handsLost > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={tbotPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value">
                    {tbotPieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 text-xs">
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-accent-cyan" /> {tbotStats.handsWon} Wins</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-accent-red" /> {tbotStats.handsLost} Losses</span>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-text-secondary text-sm">No T-Bot games yet</div>
          )}
        </div>
      </div>

      {/* Bankroll History */}
      <div className="card-premium">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={16} className="text-gold" />
          <span className="font-bold text-sm">Your Bankroll History</span>
        </div>
        {bankrollData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={bankrollData}>
              <XAxis dataKey="hand" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: '8px' }} labelStyle={{ color: '#94a3b8' }} />
              <Line type="monotone" dataKey="bankroll" stroke="#d4af37" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#d4af37' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-6 text-text-secondary text-sm">No data yet - play some hands!</div>
        )}
      </div>

      {/* Accuracy by Phase */}
      <div className="card-premium">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={16} className="text-gold" />
          <span className="font-bold text-sm">Accuracy by Phase</span>
        </div>
        {accuracyByPhase.some(p => p.total > 0) ? (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={accuracyByPhase}>
              <XAxis dataKey="phase" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: '8px' }} labelStyle={{ color: '#94a3b8' }} />
              <Bar dataKey="accuracy" fill="#d4af37" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-6 text-text-secondary text-sm">No decisions recorded yet</div>
        )}
      </div>

      {/* Detailed Stats */}
      <div className="card-premium">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-gold" />
          <span className="font-bold text-sm">Detailed Statistics</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-text-secondary/50">Biggest Win</div><div className="text-accent-green font-mono font-bold">${stats.biggestWin}</div></div>
          <div><div className="text-xs text-text-secondary/50">Biggest Loss</div><div className="text-accent-red font-mono font-bold">-${Math.abs(stats.biggestLoss)}</div></div>
          <div><div className="text-xs text-text-secondary/50">Avg Pot Size</div><div className="font-mono font-bold">${stats.avgPotSize.toFixed(0)}</div></div>
          <div><div className="text-xs text-text-secondary/50">Hands Played</div><div className="font-mono font-bold">{stats.totalHands}</div></div>
          <div><div className="text-xs text-text-secondary/50">Total Bets</div><div className="font-mono font-bold">{stats.totalBets}</div></div>
          <div><div className="text-xs text-text-secondary/50">Total Calls</div><div className="font-mono font-bold">{stats.totalCalls}</div></div>
          <div><div className="text-xs text-text-secondary/50">Total Folds</div><div className="font-mono font-bold">{stats.totalFolds}</div></div>
          <div><div className="text-xs text-text-secondary/50">Accuracy</div><div className="font-mono font-bold">{totalDecisions > 0 ? `${accuracy.toFixed(0)}%` : '-'}</div></div>
        </div>
      </div>
    </div>
  );
};

export default StatsDashboard;

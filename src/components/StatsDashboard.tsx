import React from 'react';
import { useGameStore } from '../store/gameStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Trophy, TrendingUp, AlertCircle, Activity, DollarSign, BarChart3, Target, Brain } from 'lucide-react';

const StatsDashboard: React.FC = () => {
  const stats = useGameStore(s => s.stats);
  const currentBankroll = useGameStore(s => s.currentBankroll);
  const botEvaluations = useGameStore(s => s.botEvaluations);

  const bankrollData = stats.bankrollHistory.map((value, index) => ({
    hand: index + 1,
    bankroll: value,
  }));

  const pieData = [
    { name: 'Wins', value: stats.totalWon, color: '#22c55e' },
    { name: 'Losses', value: stats.totalLost, color: '#ef4444' },
  ];

  // Calculate overall accuracy from bot evaluations
  const totalDecisions = botEvaluations.length;
  const correctDecisions = botEvaluations.filter(e => e.isCorrect).length;
  const accuracy = totalDecisions > 0 ? (correctDecisions / totalDecisions) * 100 : 0;

  // Accuracy by phase
  const accuracyByPhase = Object.entries(stats.accuracyByPhase).map(([phase, data]) => ({
    phase: phase.charAt(0).toUpperCase() + phase.slice(1),
    accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
    total: data.total,
  }));

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={16} className="text-gold" />
            <span className="text-xs text-text-secondary">Hands</span>
          </div>
          <div className="text-xl font-bold">{stats.totalHands}</div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-accent-green" />
            <span className="text-xs text-text-secondary">Win Rate</span>
          </div>
          <div className={`text-xl font-bold ${stats.winRate >= 50 ? 'text-accent-green' : 'text-accent-red'}`}>
            {stats.winRate.toFixed(1)}%
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-gold" />
            <span className="text-xs text-text-secondary">Bankroll</span>
          </div>
          <div className={`text-xl font-bold ${currentBankroll >= 1000 ? 'text-accent-green' : 'text-accent-red'}`}>
            ${currentBankroll}
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={16} className="text-accent-blue" />
            <span className="text-xs text-text-secondary">ROI</span>
          </div>
          <div className={`text-xl font-bold ${stats.roi >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-gold" />
            <span className="text-xs text-text-secondary">Accuracy</span>
          </div>
          <div className={`text-xl font-bold ${accuracy >= 60 ? 'text-accent-green' : accuracy >= 40 ? 'text-accent-yellow' : 'text-accent-red'}`}>
            {totalDecisions > 0 ? `${accuracy.toFixed(0)}%` : '—'}
          </div>
        </div>
      </div>

      {/* Bankroll Chart */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={16} className="text-gold" />
          <span className="font-medium">Bankroll History</span>
        </div>
        {bankrollData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={bankrollData}>
              <XAxis dataKey="hand" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: '8px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line
                type="monotone"
                dataKey="bankroll"
                stroke="#d4af37"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#d4af37' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-text-secondary text-sm">
            No data yet — play some hands!
          </div>
        )}
      </div>

      {/* Win/Loss + Accuracy Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} className="text-accent-blue" />
            <span className="font-medium">Win/Loss Ratio</span>
          </div>
          {stats.totalWon + stats.totalLost > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 rounded-full bg-accent-green" />
                  <span>{stats.totalWon} Wins</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 rounded-full bg-accent-red" />
                  <span>{stats.totalLost} Losses</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-text-secondary text-sm">No games played</div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={16} className="text-gold" />
            <span className="font-medium">Accuracy by Phase</span>
          </div>
          {accuracyByPhase.some(p => p.total > 0) ? (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={accuracyByPhase}>
                <XAxis dataKey="phase" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Bar dataKey="accuracy" fill="#d4af37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-4 text-text-secondary text-sm">No decisions recorded yet</div>
          )}
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-gold" />
          <span className="font-medium">Detailed Statistics</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-text-secondary text-xs">Biggest Win</div>
            <div className="text-accent-green font-mono">${stats.biggestWin}</div>
          </div>
          <div>
            <div className="text-text-secondary text-xs">Biggest Loss</div>
            <div className="text-accent-red font-mono">-${Math.abs(stats.biggestLoss)}</div>
          </div>
          <div>
            <div className="text-text-secondary text-xs">Avg Pot Size</div>
            <div className="font-mono">${stats.avgPotSize.toFixed(0)}</div>
          </div>
          <div>
            <div className="text-text-secondary text-xs">Bot Sessions</div>
            <div className="font-mono">{stats.botSessions}</div>
          </div>
          <div>
            <div className="text-text-secondary text-xs">Total Bets</div>
            <div className="font-mono">{stats.totalBets}</div>
          </div>
          <div>
            <div className="text-text-secondary text-xs">Total Calls</div>
            <div className="font-mono">{stats.totalCalls}</div>
          </div>
          <div>
            <div className="text-text-secondary text-xs">Total Folds</div>
            <div className="font-mono">{stats.totalFolds}</div>
          </div>
          <div>
            <div className="text-text-secondary text-xs">Bot Win Rate</div>
            <div className="font-mono text-accent-blue">
              {stats.botSessions > 0 ? ((stats.botWins / stats.botSessions) * 100).toFixed(1) : '—'}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsDashboard;

import React, { useState, useMemo, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { Filter, TrendingUp, TrendingDown, DollarSign, Hash, Clock, Users, ChevronRight } from 'lucide-react';

type FilterType = 'all' | 'win' | 'loss';

const GameHistory: React.FC = React.memo(() => {
  const gameHistory = useGameStore(s => s.gameHistory);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortField, setSortField] = useState<'handNumber' | 'potSize' | 'botResult'>('handNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedHand, setExpandedHand] = useState<number | null>(null);

  const toggleSort = useCallback((field: typeof sortField) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return prev;
      }
      setSortDir('desc');
      return field;
    });
  }, []);

  const filteredHistory = useMemo(() => {
    let entries = [...gameHistory];
    if (filter === 'win') entries = entries.filter(e => e.botResult > 0);
    if (filter === 'loss') entries = entries.filter(e => e.botResult < 0);

    entries.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const cmp = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return entries;
  }, [gameHistory, filter, sortField, sortDir]);

  const summary = useMemo(() => {
    const total = gameHistory.length;
    const wins = gameHistory.filter(e => e.botResult > 0).length;
    const losses = gameHistory.filter(e => e.botResult < 0).length;
    const totalProfit = gameHistory.reduce((sum, e) => sum + e.botResult, 0);
    const totalPots = gameHistory.reduce((sum, e) => sum + e.potSize, 0);
    const avgPot = total > 0 ? totalPots / total : 0;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
    return { total, wins, losses, totalProfit, avgPot, winRate };
  }, [gameHistory]);

  if (gameHistory.length === 0) {
    return (
      <div className="text-center py-6 text-text-secondary/50 text-sm">
        No hands played yet. Start a game to see history.
      </div>
    );
  }

  const SortHeader: React.FC<{ field: typeof sortField; label: string; icon?: React.ReactNode }> = ({ field, label, icon }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 text-[10px] text-text-secondary/50 uppercase tracking-wider font-semibold hover:text-text-secondary transition-colors group"
    >
      {icon}
      {label}
      {sortField === field && (
        <span className="text-gold text-[8px] ml-0.5">{sortDir === 'asc' ? '▲' : '▼'}</span>
      )}
    </button>
  );

  // Color-coded row class
  const getRowClass = (entry: { botResult: number }) => {
    if (entry.botResult > 0) return 'row-win';
    if (entry.botResult < 0) return 'row-loss';
    return '';
  };

  // Result indicator dot
  const ResultDot: React.FC<{ result: number }> = ({ result }) => {
    if (result > 0) return <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" title="Win" />;
    if (result < 0) return <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" title="Loss" />;
    return <div className="w-2 h-2 rounded-full bg-gray-500" title="Break even" />;
  };

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center gap-3 flex-wrap text-xs bg-white/[0.03] rounded-xl p-3 border border-white/5">
        <div className="flex items-center gap-1.5 text-text-secondary/60">
          <Hash size={12} />
          <span className="font-mono font-bold text-text-primary">{summary.total}</span>
          <span className="text-text-secondary/40">hands</span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500/60" />
          <span className="font-mono font-bold text-accent-green">{summary.wins}</span>
          <span className="text-text-secondary/40">wins</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500/60" />
          <span className="font-mono font-bold text-accent-red">{summary.losses}</span>
          <span className="text-text-secondary/40">losses</span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex items-center gap-1.5 text-text-secondary/60">
          <TrendingUp size={12} className={summary.totalProfit >= 0 ? 'text-accent-green' : 'text-accent-red'} />
          <span className={`font-mono font-bold ${summary.totalProfit >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {summary.totalProfit >= 0 ? '+' : ''}{summary.totalProfit}
          </span>
          <span className="text-text-secondary/40">profit</span>
        </div>
        <div className="flex items-center gap-1.5 text-text-secondary/60">
          <DollarSign size={12} className="opacity-50" />
          <span className="font-mono text-text-secondary/70">${summary.avgPot.toFixed(0)}</span>
          <span className="text-text-secondary/40">avg pot</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`font-mono font-bold ${parseFloat(summary.winRate) >= 50 ? 'text-accent-green' : 'text-accent-red'}`}>
            {summary.winRate}%
          </span>
          <span className="text-text-secondary/40">win rate</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-0.5 border border-white/5 w-fit">
        {([
          { value: 'all' as FilterType, label: 'All', count: summary.total },
          { value: 'win' as FilterType, label: 'Wins', count: summary.wins },
          { value: 'loss' as FilterType, label: 'Losses', count: summary.losses },
        ]).map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filter === f.value
                ? 'bg-gold text-black'
                : 'text-text-secondary/60 hover:text-text-primary'
            }`}
          >
            {f.label}
            <span className={`text-[10px] ${filter === f.value ? 'text-black/50' : 'text-text-secondary/30'}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* History table */}
      <div className="overflow-x-auto -mx-1">
        <table className="history-table w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="w-8"></th>
              <th><SortHeader field="handNumber" label="#" icon={<Hash size={10} />} /></th>
              <th>Winner</th>
              <th>Hand</th>
              <th><SortHeader field="potSize" label="Pot" icon={<DollarSign size={10} />} /></th>
              <th><SortHeader field="botResult" label="Result" /></th>
              <th>Players</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.map((entry) => {
              const rowClass = getRowClass(entry);
              const isExpanded = expandedHand === entry.handNumber;
              return (
                <React.Fragment key={entry.handNumber}>
                  <tr
                    className={`${rowClass} cursor-pointer transition-colors`}
                    onClick={() => setExpandedHand(isExpanded ? null : entry.handNumber)}
                  >
                    <td className="text-center">
                      <ResultDot result={entry.botResult} />
                    </td>
                    <td className="font-mono font-bold text-xs">
                      <button
                        className="text-gold hover:text-gold-light transition-colors flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedHand(isExpanded ? null : entry.handNumber);
                        }}
                      >
                        #{entry.handNumber}
                        <ChevronRight size={10} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    </td>
                    <td>
                      <span className={`text-xs font-semibold ${
                        entry.winner === 'You'
                          ? 'text-gold'
                          : entry.winner === 'T-Bot'
                          ? 'text-cyan-400'
                          : 'text-text-secondary/70'
                      }`}>
                        {entry.winner}
                      </span>
                    </td>
                    <td className="text-xs text-text-secondary/60 max-w-[120px] truncate" title={entry.winningHand}>
                      {entry.winningHand || '-'}
                    </td>
                    <td className="font-mono text-xs text-text-primary font-semibold">${entry.potSize}</td>
                    <td>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                        entry.botResult > 0
                          ? 'text-green-400 bg-green-500/10 border border-green-500/20'
                          : entry.botResult < 0
                          ? 'text-red-400 bg-red-500/10 border border-red-500/20'
                          : 'text-text-secondary/50'
                      }`}>
                        {entry.botResult > 0 ? '+' : ''}{entry.botResult}
                      </span>
                    </td>
                    <td className="text-xs text-text-secondary/40">{entry.numPlayers}p</td>
                  </tr>
                  {/* Expanded detail row */}
                  {isExpanded && (
                    <tr className={rowClass}>
                      <td colSpan={8} className="border-t-0 pt-0 pb-3">
                        <div className="bg-white/[0.02] rounded-lg p-3 mx-2 border border-white/5 animate-fade-in">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-text-secondary/40">Winner</span>
                              <div className="font-semibold text-text-primary mt-0.5">{entry.winner}</div>
                            </div>
                            <div>
                              <span className="text-text-secondary/40">Winning Hand</span>
                              <div className="font-semibold text-gold mt-0.5">{entry.winningHand || '-'}</div>
                            </div>
                            <div>
                              <span className="text-text-secondary/40">Pot Size</span>
                              <div className="font-mono font-bold text-text-primary mt-0.5">${entry.potSize}</div>
                            </div>
                            <div>
                              <span className="text-text-secondary/40">Your Result</span>
                              <div className={`font-mono font-bold mt-0.5 ${entry.botResult >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                                {entry.botResult >= 0 ? '+' : ''}{entry.botResult}
                              </div>
                            </div>
                            <div>
                              <span className="text-text-secondary/40">Players</span>
                              <div className="font-semibold text-text-primary/70 mt-0.5">{entry.numPlayers}</div>
                            </div>
                            <div>
                              <span className="text-text-secondary/40">Duration</span>
                              <div className="font-semibold text-text-primary/70 mt-0.5 flex items-center gap-1">
                                <Clock size={10} />
                                {entry.duration > 0 ? `${(entry.duration / 1000).toFixed(1)}s` : '-'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredHistory.length === 0 && (
        <div className="text-center py-4 text-text-secondary/40 text-xs">
          No entries match the selected filter.
        </div>
      )}
    </div>
  );
});

GameHistory.displayName = 'GameHistory';

export default GameHistory;

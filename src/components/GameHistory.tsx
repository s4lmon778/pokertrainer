import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { TrendingUp, DollarSign, Hash, Clock, ChevronRight, Search, Download, Filter, ArrowUpDown, FileText, BarChart3, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';

type FilterType = 'all' | 'win' | 'loss';
type SortField = 'handNumber' | 'potSize' | 'botResult' | 'winner' | 'numPlayers';

// ── Module-level helpers (avoid recreation each render) ──

const getRowClass = (entry: { botResult: number }) => {
  if (entry.botResult > 0) return 'row-win';
  if (entry.botResult < 0) return 'row-loss';
  return '';
};

const ResultDot: React.FC<{ result: number }> = React.memo(({ result }) => {
  if (result > 0) return <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" title="Win" />;
  if (result < 0) return <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" title="Loss" />;
  return <div className="w-2 h-2 rounded-full bg-gray-500" title="Break even" />;
});

ResultDot.displayName = 'ResultDot';

interface SortHeaderProps {
  field: SortField;
  label: string;
  icon?: React.ReactNode;
  sortField: SortField;
  sortDir: 'asc' | 'desc';
  onToggle: (field: SortField) => void;
}

const SortHeader: React.FC<SortHeaderProps> = React.memo(({ field, label, icon, sortField, sortDir, onToggle }) => {
  const handleClick = useCallback(() => onToggle(field), [onToggle, field]);
  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1 text-[10px] text-text-secondary/50 uppercase tracking-wider font-semibold hover:text-text-secondary transition-colors group"
    >
      {icon}
      {label}
      {sortField === field && (
        <span className="text-gold text-[8px] ml-0.5">{sortDir === 'asc' ? '▲' : '▼'}</span>
      )}
    </button>
  );
});

SortHeader.displayName = 'SortHeader';

const GameHistory: React.FC = React.memo(() => {
  const gameHistory = useGameStore(s => s.gameHistory);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortField, setSortField] = useState<SortField>('handNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedHand, setExpandedHand] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Pagination
  const PAGE_SIZE = 50;
  const [currentPage, setCurrentPage] = useState(1);

  const toggleSort = useCallback((field: SortField) => {
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

    // Search by hand pattern or winner name
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      entries = entries.filter(e =>
        e.winner.toLowerCase().includes(q) ||
        e.winningHand.toLowerCase().includes(q) ||
        String(e.handNumber).includes(q) ||
        String(e.potSize).includes(q) ||
        String(e.numPlayers).includes(q)
      );
    }

    entries.sort((a, b) => {
      let aVal: string | number = (a as any)[sortField] ?? '';
      let bVal: string | number = (b as any)[sortField] ?? '';

      // String comparison for winner field
      if (sortField === 'winner') {
        aVal = (a.winner || '').toLowerCase();
        bVal = (b.winner || '').toLowerCase();
        const cmp = (aVal as string) > (bVal as string) ? 1 : (aVal as string) < (bVal as string) ? -1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      }

      const cmp = (aVal as number) > (bVal as number) ? 1 : (aVal as number) < (bVal as number) ? -1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return entries;
  }, [gameHistory, filter, sortField, sortDir, searchQuery]);

  // Reset to page 1 when filtered results change
  useEffect(() => { setCurrentPage(1); }, [filteredHistory.length]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // CSV export
  const exportHistoryCSV = useCallback(() => {
    const headers = ['Hand #', 'Winner', 'Winning Hand', 'Pot Size', 'Result', 'Players', 'Position', 'Hand Category'];
    const rows = filteredHistory.map(e => [
      String(e.handNumber),
      e.winner,
      e.winningHand,
      `$${e.potSize}`,
      `${e.botResult >= 0 ? '+' : ''}${e.botResult}`,
      String(e.numPlayers),
      e.humanPosition || '',
      e.humanHandCategory || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pokertrainer-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [filteredHistory]);

  // PGN export (Poker Game Notation)
  const exportHistoryPGN = useCallback(() => {
    const lines: string[] = [];
    const now = new Date().toISOString();
    lines.push(`[Event "PokerTrainer Session"]`);
    lines.push(`[Site "PokerTrainer"]`);
    lines.push(`[Date "${now.slice(0, 10)}"]`);
    lines.push(`[Time "${now.slice(11, 19)}"]`);
    lines.push(`[Game "Texas Hold'em No Limit"]`);
    lines.push(`[Hands "${filteredHistory.length}"]`);
    lines.push('');

    filteredHistory.forEach(e => {
      const resultLabel = e.botResult > 0 ? '+$' + e.botResult : e.botResult < 0 ? '-$' + Math.abs(e.botResult) : 'breakeven';
      lines.push(`[Hand "${e.handNumber}"]`);
      lines.push(`[Hand-Pot "$${e.potSize}"]`);
      lines.push(`[Hand-Winner "${e.winner}"]`);
      lines.push(`[Hand-Hand "${e.winningHand}"]`);
      lines.push(`[Hand-Result "${resultLabel}"]`);
      if (e.humanPosition) lines.push(`[Hand-Position "${e.humanPosition}"]`);
      if (e.humanHandCategory) lines.push(`[Hand-Category "${e.humanHandCategory}"]`);
      lines.push('');
    });

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pokertrainer-history-${new Date().toISOString().slice(0, 10)}.pgn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [filteredHistory]);

  // Session summary text
  const sessionSummary = useMemo(() => {
    const total = gameHistory.length;
    if (total === 0) return '';
    const wins = gameHistory.filter(e => e.botResult > 0).length;
    const losses = gameHistory.filter(e => e.botResult < 0).length;
    const totalProfit = gameHistory.reduce((s, e) => s + e.botResult, 0);
    const totalPots = gameHistory.reduce((s, e) => s + e.potSize, 0);
    const avgPot = total > 0 ? totalPots / total : 0;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0';
    const biggestWin = Math.max(0, ...gameHistory.map(e => e.botResult));
    const biggestLoss = Math.min(0, ...gameHistory.map(e => e.botResult));

    const lines = [
      '═══════════════════════════════════',
      '  POKERTRAINER SESSION SUMMARY',
      '═══════════════════════════════════',
      `  Date: ${new Date().toLocaleDateString()}`,
      `  Total Hands: ${total}`,
      `  Wins: ${wins}  |  Losses: ${losses}  |  Win Rate: ${winRate}%`,
      `  Total Profit: ${totalProfit >= 0 ? '+' : ''}$${totalProfit}`,
      `  Biggest Win: +$${biggestWin}  |  Biggest Loss: -$${Math.abs(biggestLoss)}`,
      `  Avg Pot Size: $${avgPot.toFixed(0)}`,
      '───────────────────────────────────',
    ];

    // Per-position breakdown if available
    const posEntries = gameHistory.filter(e => e.humanPosition);
    if (posEntries.length > 0) {
      lines.push('  Position Breakdown:');
      const posMap: Record<string, { hands: number; profit: number }> = {};
      posEntries.forEach(e => {
        const p = e.humanPosition || '?';
        if (!posMap[p]) posMap[p] = { hands: 0, profit: 0 };
        posMap[p].hands++;
        posMap[p].profit += e.botResult;
      });
      Object.entries(posMap)
        .sort(([, a], [, b]) => b.profit - a.profit)
        .forEach(([pos, d]) => {
          const wr = d.hands > 0 ? ((posEntries.filter(e => e.botResult > 0 && e.humanPosition === pos).length / d.hands) * 100).toFixed(0) : '0';
          lines.push(`    ${pos}: ${d.hands}h, ${wr}% WR, ${d.profit >= 0 ? '+' : ''}$${d.profit}`);
        });
    }

    lines.push('═══════════════════════════════════');
    return lines.join('\n');
  }, [gameHistory]);

  const copySessionSummary = useCallback(() => {
    navigator.clipboard.writeText(sessionSummary).then(() => {
      setShowExportMenu(false);
    }).catch(() => { /* noop */ });
  }, [sessionSummary]);

  // Compare two hands (simple diff view)
  const [compareA, setCompareA] = useState<number | null>(null);
  const [compareB, setCompareB] = useState<number | null>(null);

  const toggleCompare = useCallback((handNum: number) => {
    if (compareA === handNum) { setCompareA(null); return; }
    if (compareB === handNum) { setCompareB(null); return; }
    if (compareA === null) { setCompareA(handNum); return; }
    if (compareB === null) { setCompareB(handNum); return; }
    setCompareA(handNum); setCompareB(null); // Replace oldest
  }, [compareA, compareB]);

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

      {/* Search + Filter + Export */}
      <div className="flex gap-2 flex-wrap items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[140px] max-w-[240px]">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary/30" />
          <input
            type="text"
            placeholder="Search hands..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:border-gold/50 transition-colors"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-0.5 border border-white/5">
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

        {/* Export button */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-text-secondary/50 hover:text-gold hover:border-gold/30 transition-all"
          >
            <Download size={12} />
            <span className="hidden sm:inline">CSV</span>
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 bg-surface-elevated border border-white/10 rounded-xl p-1.5 shadow-xl z-50 min-w-[200px]">
              <button onClick={exportHistoryCSV} className="w-full text-left px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors flex items-center gap-2">
                <Download size={12} /> Export CSV (.csv)
              </button>
              <button onClick={exportHistoryPGN} className="w-full text-left px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors flex items-center gap-2">
                <FileText size={12} /> Export PGN (.pgn)
              </button>
              {sessionSummary && (
                <button onClick={copySessionSummary} className="w-full text-left px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors flex items-center gap-2">
                  <BarChart3 size={12} /> Copy Session Summary
                </button>
              )}
              <div className="border-t border-white/5 my-1" />
              <button onClick={() => { setFilter('all'); setSearchQuery(''); setShowExportMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors">
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comparison mode indicator */}
      {(compareA || compareB) && (
        <div className="flex items-center gap-2 text-[10px] text-text-secondary/50 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-1.5">
          <ArrowUpDown size={12} className="text-amber-400" />
          <span>Compare: </span>
          {compareA && <span className="font-mono text-gold font-bold">#{compareA}</span>}
          {compareA && compareB && <span className="text-text-secondary/30">vs</span>}
          {compareB && <span className="font-mono text-cyan-400 font-bold">#{compareB}</span>}
          {(!compareA || !compareB) && <span className="text-text-secondary/30">(select a second hand to compare)</span>}
          <button onClick={() => { setCompareA(null); setCompareB(null); }} className="ml-auto text-text-secondary/30 hover:text-accent-red transition-colors">Clear</button>
        </div>
      )}

      {/* Hand comparison diff panel */}
      {compareA && compareB && (() => {
        const handA = gameHistory.find(h => h.handNumber === compareA);
        const handB = gameHistory.find(h => h.handNumber === compareB);
        if (!handA || !handB) return null;
        const fields: { label: string; key: keyof typeof handA; format?: (v: any) => string }[] = [
          { label: 'Winner', key: 'winner' },
          { label: 'Winning Hand', key: 'winningHand' },
          { label: 'Pot Size', key: 'potSize', format: (v: number) => `$${v}` },
          { label: 'Net Result', key: 'botResult', format: (v: number) => `${v >= 0 ? '+' : ''}$${v}` },
          { label: 'Players', key: 'numPlayers', format: (v: number) => `${v}p` },
          { label: 'Position', key: 'humanPosition', format: (v: string) => v || '—' },
          { label: 'Hand Category', key: 'humanHandCategory', format: (v: string) => v || '—' },
        ];
        return (
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 animate-fade-in">
            <div className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1.5">
              <ArrowUpDown size={12} /> Hand Comparison
            </div>
            <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1.5 text-xs">
              <div /> {/* header spacer */}
              <div className="font-bold text-gold text-center">#{compareA}</div>
              <div className="font-bold text-cyan-400 text-center">#{compareB}</div>
              {fields.map(f => {
                const va = (handA as any)[f.key] ?? '—';
                const vb = (handB as any)[f.key] ?? '—';
                const fa = f.format ? f.format(va) : String(va);
                const fb = f.format ? f.format(vb) : String(vb);
                const isDifferent = fa !== fb;
                return (
                  <React.Fragment key={f.key}>
                    <span className="text-text-secondary/40 font-semibold">{f.label}</span>
                    <span className={`text-center font-mono ${isDifferent ? 'bg-gold/10 rounded px-1' : ''}`}>{fa}</span>
                    <span className={`text-center font-mono ${isDifferent ? 'bg-cyan-400/10 rounded px-1' : ''}`}>{fb}</span>
                  </React.Fragment>
                );
              })}
              {/* Win/Loss comparison */}
              <span className="text-text-secondary/40 font-semibold">Outcome</span>
              <span className={`text-center font-bold ${handA.botResult > 0 ? 'text-accent-green' : handA.botResult < 0 ? 'text-accent-red' : 'text-text-secondary/50'}`}>
                {handA.botResult > 0 ? 'WIN' : handA.botResult < 0 ? 'LOSS' : 'EVEN'}
              </span>
              <span className={`text-center font-bold ${handB.botResult > 0 ? 'text-accent-green' : handB.botResult < 0 ? 'text-accent-red' : 'text-text-secondary/50'}`}>
                {handB.botResult > 0 ? 'WIN' : handB.botResult < 0 ? 'LOSS' : 'EVEN'}
              </span>
            </div>
          </div>
        );
      })()}

      {/* History table */}
      <div className="overflow-x-auto -mx-1">
        <table className="history-table w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="w-8"></th>
              <th className="w-6"></th>
              <th><SortHeader field="handNumber" label="#" icon={<Hash size={10} />} sortField={sortField} sortDir={sortDir} onToggle={toggleSort} /></th>
              <th><SortHeader field="winner" label="Winner" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} /></th>
              <th>Hand</th>
              <th><SortHeader field="potSize" label="Pot" icon={<DollarSign size={10} />} sortField={sortField} sortDir={sortDir} onToggle={toggleSort} /></th>
              <th><SortHeader field="botResult" label="Result" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} /></th>
              <th><SortHeader field="numPlayers" label="Pl." sortField={sortField} sortDir={sortDir} onToggle={toggleSort} /></th>
            </tr>
          </thead>
          <tbody>
            {paginatedHistory.map((entry) => {
              const rowClass = getRowClass(entry);
              const isExpanded = expandedHand === entry.handNumber;
              return (
                <React.Fragment key={entry.handNumber}>
                  <tr
                    className={`${rowClass} cursor-pointer transition-colors`}
                    onClick={() => setExpandedHand(isExpanded ? null : entry.handNumber)}
                  >
                    <td className="text-center" onClick={e => e.stopPropagation()}>
                      <ResultDot result={entry.botResult} />
                    </td>
                    <td className="text-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => toggleCompare(entry.handNumber)}
                        className={`w-4 h-4 rounded border transition-all ${
                          compareA === entry.handNumber || compareB === entry.handNumber
                            ? 'bg-gold border-gold'
                            : 'border-white/20 hover:border-gold/50'
                        }`}
                        title="Select to compare"
                        aria-label={`Compare hand #${entry.handNumber}`}
                      />
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

      {/* Pagination */}
      {filteredHistory.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2 px-1 py-2">
          <span className="text-[10px] text-text-secondary/40">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredHistory.length)} of {filteredHistory.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary/50 hover:text-text-primary hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Previous page"
            >
              <ChevronLeft size={12} />
            </button>
            {(() => {
              const pages: (number | string)[] = [];
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                pages.push(1);
                if (currentPage > 3) pages.push('…');
                const start = Math.max(2, currentPage - 1);
                const end = Math.min(totalPages - 1, currentPage + 1);
                for (let i = start; i <= end; i++) pages.push(i);
                if (currentPage < totalPages - 2) pages.push('…');
                pages.push(totalPages);
              }
              return pages.map((p, i) =>
                typeof p === 'string' ? (
                  <span key={`e${i}`} className="w-7 text-center text-text-secondary/30 text-xs">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      p === currentPage
                        ? 'bg-gold text-black shadow-md'
                        : 'bg-white/5 border border-white/10 text-text-secondary/50 hover:text-text-primary hover:border-white/20'
                    }`}
                  >
                    {p}
                  </button>
                )
              );
            })()}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary/50 hover:text-text-primary hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Next page"
            >
              <ChevronRightIcon size={12} />
            </button>
          </div>
        </div>
      )}

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

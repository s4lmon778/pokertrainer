import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Play, Pause, RefreshCw, TrendingUp, TrendingDown, Circle } from 'lucide-react';

/** Status shape returned by the multi_table Tauri command. */
interface TableStatus {
  table_id: string;
  client: string;
  stakes: string;
  status: string; // "idle" | "playing" | "paused" | "error"
  last_action_time: number;
  hands_played: number;
  profit_loss: number;
}

/** Demo table config for starting sessions. */
const DEMO_TABLES = [
  { table_id: 'table-1', client: 'WinPoker', stakes: '$1/$2', strategy: 'gto' },
  { table_id: 'table-2', client: 'PokerStars', stakes: '$0.50/$1', strategy: 'exploitative' },
];

const STATUS_BADGE: Record<string, string> = {
  idle: 'badge badge-idle',
  playing: 'badge badge-playing',
  paused: 'badge badge-paused',
  error: 'badge badge-error',
};

/** Multi-table dashboard showing active table sessions, status, and profit/loss. */
const TableDashboard: React.FC = () => {
  const [tables, setTables] = useState<TableStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  /** Pull latest table statuses from the Rust backend. */
  const refreshStatus = useCallback(async () => {
    setError(null);
    try {
      const statuses: TableStatus[] = await invoke('get_table_status');
      setTables(statuses);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  /** Start demo tables. */
  const handleStart = useCallback(async () => {
    setError(null);
    try {
      await invoke('start_multi_table', { tables: DEMO_TABLES });
      await refreshStatus();
    } catch (err) {
      setError(String(err));
    }
  }, [refreshStatus]);

  /** Pause all tables. */
  const handlePauseAll = useCallback(async () => {
    setError(null);
    try {
      await invoke('pause_all_tables');
      await refreshStatus();
    } catch (err) {
      setError(String(err));
    }
  }, [refreshStatus]);

  // Refresh on mount
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const totalPL = tables.reduce((sum, t) => sum + t.profit_loss, 0);
  const totalHands = tables.reduce((sum, t) => sum + t.hands_played, 0);
  const isAnyPositive = totalPL >= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Multi-Table Dashboard</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Monitor and control multiple poker tables simultaneously.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-primary" onClick={handleStart}>
            <Play size={14} /> Start Tables
          </button>
          <button className="btn-secondary" onClick={handlePauseAll}>
            <Pause size={14} /> Pause All
          </button>
          <button className="btn-secondary" onClick={refreshStatus}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: '0.5rem',
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#ef4444', fontSize: '0.8125rem',
        }}>
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <div style={{
          background: 'var(--bg-surface)', borderRadius: '0.75rem',
          border: '1px solid var(--border)', padding: '1rem',
        }}>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Tables
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>
            {tables.filter(t => t.status === 'playing').length} / {tables.length}
          </p>
        </div>
        <div style={{
          background: 'var(--bg-surface)', borderRadius: '0.75rem',
          border: '1px solid var(--border)', padding: '1rem',
        }}>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Hands
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>
            {totalHands.toLocaleString()}
          </p>
        </div>
        <div style={{
          background: 'var(--bg-surface)', borderRadius: '0.75rem',
          border: isAnyPositive ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.2)',
          padding: '1rem',
        }}>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total P&amp;L
          </p>
          <p style={{
            fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem',
            color: isAnyPositive ? '#22c55e' : '#ef4444',
          }}>
            {totalPL >= 0 ? '+' : ''}{totalPL.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Table grid */}
      {tables.length === 0 ? (
        <div style={{
          background: 'var(--bg-surface)', borderRadius: '0.75rem',
          border: '1px solid var(--border)', padding: '3rem',
          textAlign: 'center', color: 'var(--text-secondary)',
        }}>
          <p style={{ fontSize: '0.875rem' }}>No active tables.</p>
          <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
            Click "Start Tables" to launch multi-table sessions.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {tables.map(table => {
            const isPositive = table.profit_loss >= 0;
            return (
              <div key={table.table_id} style={{
                background: 'var(--bg-surface)', borderRadius: '0.75rem',
                border: '1px solid var(--border)', padding: '1rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>{table.table_id}</h4>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      {table.client} · {table.stakes}
                    </p>
                  </div>
                  <span className={STATUS_BADGE[table.status] ?? 'badge badge-idle'}>
                    <Circle size={6} style={{ display: 'inline', marginRight: 4, verticalAlign: 1 }} />
                    {table.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <p style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Hands</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{table.hands_played}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>P&amp;L</p>
                    <p style={{
                      fontSize: '0.875rem', fontWeight: 600,
                      color: isPositive ? '#22c55e' : '#ef4444',
                    }}>
                      {isPositive ? <TrendingUp size={12} style={{ display: 'inline', marginRight: 2 }} /> :
                       <TrendingDown size={12} style={{ display: 'inline', marginRight: 2 }} />}
                      {table.profit_loss >= 0 ? '+' : ''}{table.profit_loss.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TableDashboard;

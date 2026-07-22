import React, { useState, useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  Monitor, MousePointer, Keyboard, Table2, History, Settings,
  Play, Square, Pause, RefreshCw, TrendingUp, TrendingDown,
  Circle, Sliders, Search, Bug, Zap,
} from 'lucide-react';

// ── Types ──

interface TableWindow {
  hwnd: number; title: string; x: number; y: number;
  width: number; height: number; is_active: boolean;
}

interface BotTableStatus {
  table_id: string; title: string; status: string;
  hands_played: number; profit_loss: number;
  current_state: string; win_rate: number; started_at: number;
}

interface BotConfig {
  skill_level: number; aggression: number; bluff_frequency: number;
  min_reaction_ms: number; max_reaction_ms: number;
  auto_fold_weak: boolean; max_tables: number;
}

type Tab = 'dashboard' | 'tables' | 'capture' | 'settings';

// ── App ──

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [botTables, setBotTables] = useState<BotTableStatus[]>([]);
  const [detectedWindows, setDetectedWindows] = useState<TableWindow[]>([]);
  const [config, setConfig] = useState<BotConfig>({
    skill_level: 50, aggression: 0.55, bluff_frequency: 0.12,
    min_reaction_ms: 800, max_reaction_ms: 3000,
    auto_fold_weak: true, max_tables: 4,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load config on mount
  useEffect(() => {
    invoke<BotConfig>('get_bot_config').then(setConfig).catch(() => {});
  }, []);

  // Listen for bot-status events from Rust
  useEffect(() => {
    const unlisten = listen<{ tables: BotTableStatus[] }>('bot-status', (event) => {
      setBotTables(event.payload.tables);
    });
    return () => { unlisten.then(f => f()); };
  }, []);

  // Poll bot status every 2s; scan windows every 5s (less frequent)
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const tables: BotTableStatus[] = await invoke('get_bot_status');
        setBotTables(tables);
        setIsRunning(tables.some(t => t.status === 'running'));
      } catch { /* ignore */ }
    };
    const pollWindows = async () => {
      try {
        const windows: TableWindow[] = await invoke('find_poker_tables');
        setDetectedWindows(windows);
      } catch { /* ignore */ }
    };
    pollStatus();
    pollWindows();
    const statusInt = setInterval(pollStatus, 2000);
    const winInt = setInterval(pollWindows, 5000);
    pollRef.current = statusInt;
    return () => { clearInterval(statusInt); clearInterval(winInt); };
  }, []);

  const handleStart = useCallback(async () => {
    setStartError(null);
    setIsStarting(true);
    try {
      const windows: TableWindow[] = await invoke('find_poker_tables');
      if (windows.length === 0) {
        setStartError('No PokerStars tables detected. Open a table first, then try again.');
        setIsStarting(false);
        return;
      }
      await invoke('start_bot', { windows });
    } catch (e) {
      setStartError(String(e));
    } finally {
      setIsStarting(false);
    }
  }, []);

  const handleStop = useCallback(async () => {
    try { await invoke('stop_bot'); } catch { /* ignore */ }
  }, []);

  const handlePause = useCallback(async () => {
    const anyRunning = botTables.some(t => t.status === 'running');
    try {
      if (anyRunning) await invoke('pause_bot');
      else await invoke('resume_bot');
    } catch { /* ignore */ }
  }, [botTables]);

  const handleConfigChange = useCallback(async (partial: Partial<BotConfig>) => {
    const next = { ...config, ...partial };
    setConfig(next);
    try { await invoke('update_bot_config', { config: next }); } catch { /* ignore */ }
  }, [config]);

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ size?: number | string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Monitor },
    { id: 'tables', label: 'Tables', icon: Table2 },
    { id: 'capture', label: 'Capture', icon: Search },
    { id: 'settings', label: 'Settings', icon: Sliders },
  ];

  const totalPL = botTables.reduce((s, t) => s + t.profit_loss, 0);
  const totalHands = botTables.reduce((s, t) => s + t.hands_played, 0);
  const runningCount = botTables.filter(t => t.status === 'running').length;
  const anyRunning = botTables.some(t => t.status === 'running');
  const isPLPositive = totalPL >= 0;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">♠ PokerBot</h1>
          <p className="sidebar-version">Desktop v1.1.0</p>
        </div>
        <nav className="sidebar-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`sidebar-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className={`indicator ${anyRunning ? 'running' : 'stopped'}`} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {anyRunning ? `${runningCount} table(s)` : 'Stopped'}
          </span>
        </div>
      </aside>

      <main className="main-content">
        {activeTab === 'dashboard' && (
          <DashboardPanel
            tables={botTables}
            totalPL={totalPL}
            totalHands={totalHands}
            runningCount={runningCount}
            isPLPositive={isPLPositive}
            onStart={handleStart}
            onStop={handleStop}
            onPause={handlePause}
            isRunning={anyRunning}
            isStarting={isStarting}
            startError={startError}
            onDismissError={() => setStartError(null)}
          />
        )}
        {activeTab === 'tables' && (
          <TablesPanel
            detectedWindows={detectedWindows}
            botTables={botTables}
            onRefreshWindows={async () => {
              try {
                const w: TableWindow[] = await invoke('find_poker_tables');
                setDetectedWindows(w);
              } catch { /* ignore */ }
            }}
          />
        )}
        {activeTab === 'capture' && <CapturePanel />}
        {activeTab === 'settings' && (
          <SettingsPanel config={config} onChange={handleConfigChange} />
        )}
      </main>
    </div>
  );
};

// ── Dashboard Panel ──

interface DashboardProps {
  tables: BotTableStatus[];
  totalPL: number; totalHands: number;
  runningCount: number; isPLPositive: boolean;
  onStart: () => void; onStop: () => void; onPause: () => void;
  isRunning: boolean;
  isStarting: boolean;
  startError: string | null;
  onDismissError: () => void;
}

const DashboardPanel: React.FC<DashboardProps> = ({
  tables, totalPL, totalHands, runningCount, isPLPositive,
  onStart, onStop, onPause, isRunning,
  isStarting, startError, onDismissError,
}) => (
  <div className="panel">
    <div className="panel-header">
      <div>
        <h2 className="panel-title">Bot Dashboard</h2>
        <p className="panel-subtitle">Real-time bot status and performance across all tables.</p>
      </div>
      <div className="panel-actions">
        <button className={`btn ${!isRunning ? 'btn-primary' : 'btn-secondary'}`}
          onClick={isRunning ? onStop : onStart}
          disabled={isStarting}>
          {isStarting ? <>⏳ Starting...</> : isRunning ? <Square size={14} /> : <Play size={14} />}
          {isStarting ? ' Scanning...' : isRunning ? 'Stop All' : 'Start Bot'}
        </button>
        {isRunning && (
          <button className="btn btn-secondary" onClick={onPause}>
            <Pause size={14} /> Pause/Resume
          </button>
        )}
      </div>
    </div>

    {/* Summary cards */}
    <div className="summary-grid">
      <SummaryCard label="Active Tables" value={`${runningCount} / ${tables.length}`} />
      <SummaryCard label="Total Hands" value={totalHands.toLocaleString()} />
      <SummaryCard
        label="Total P&L"
        value={`${isPLPositive ? '+' : ''}${totalPL.toFixed(2)}`}
        color={isPLPositive ? '#22c55e' : '#ef4444'}
      />
      <SummaryCard
        label="Avg Win Rate"
        value={totalHands > 0 ? `${(totalPL / totalHands * 100).toFixed(2)} bb/100` : '—'}
      />
    </div>

    {/* Error banner */}
    {startError && (
      <div className="error-banner">
        <span>{startError}</span>
        <button className="error-dismiss" onClick={onDismissError}>×</button>
      </div>
    )}

    {/* Table cards */}
    {tables.length === 0 ? (
      <div className="empty-state">
        <p>No active tables.</p>
        <p className="empty-sub">Click "Start Bot" after opening PokerStars table windows.</p>
      </div>
    ) : (
      <div className="table-grid">
        {tables.map(t => {
          const isPos = t.profit_loss >= 0;
          return (
            <div key={t.table_id} className="table-card">
              <div className="table-card-header">
                <div>
                  <h4>{t.table_id.length > 20 ? t.table_id.slice(0, 20) + '…' : t.table_id}</h4>
                  <span className="table-stakes">PokerStars</span>
                </div>
                <span className={`badge badge-${t.status}`}>
                  <Circle size={6} /> {t.status}
                </span>
              </div>
              <div className="table-card-body">
                <TableStat label="Hands" value={t.hands_played.toString()} />
                <TableStat label="P&L" value={`${isPos ? '+' : ''}${t.profit_loss.toFixed(2)}`} color={isPos ? '#22c55e' : '#ef4444'} />
                <TableStat label="Win Rate" value={`${t.win_rate.toFixed(1)} bb/100`} />
                <TableStat label="State" value={t.current_state} />
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

const SummaryCard: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div className="summary-card" style={color ? { borderColor: `${color}33` } : {}}>
    <p className="summary-label">{label}</p>
    <p className="summary-value" style={color ? { color } : {}}>{value}</p>
  </div>
);

const TableStat: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div className="table-stat">
    <p className="table-stat-label">{label}</p>
    <p className="table-stat-value" style={color ? { color } : {}}>{value}</p>
  </div>
);

// ── Tables Panel ──

const TablesPanel: React.FC<{
  detectedWindows: TableWindow[];
  botTables: BotTableStatus[];
  onRefreshWindows: () => void;
}> = ({ detectedWindows, botTables, onRefreshWindows }) => {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const handleStartSelected = useCallback(async () => {
    const wins = detectedWindows.filter((_, i) => selected.has(i));
    if (wins.length === 0) return;
    try { await invoke('start_bot', { windows: wins }); } catch { /* ignore */ }
  }, [detectedWindows, selected]);

  const toggle = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelected(next);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Table Manager</h2>
          <p className="panel-subtitle">Detect and manage PokerStars table windows.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={onRefreshWindows}>
            <Search size={14} /> Scan Windows
          </button>
          <button className="btn btn-primary" onClick={handleStartSelected} disabled={selected.size === 0}>
            <Play size={14} /> Start Selected
          </button>
        </div>
      </div>

      {detectedWindows.length === 0 ? (
        <div className="empty-state">
          <p>No PokerStars tables detected.</p>
          <p className="empty-sub">Open PokerStars table windows, then click "Scan Windows".</p>
        </div>
      ) : (
        <div className="window-grid">
          {detectedWindows.map((w, i) => {
            const isBot = botTables.some(t => t.table_id === w.title);
            return (
              <div
                key={i}
                className={`window-card ${selected.has(i) ? 'selected' : ''} ${isBot ? 'bot-running' : ''}`}
                onClick={() => toggle(i)}
              >
                <div className="window-card-header">
                  <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} />
                  <span className={`badge badge-${isBot ? 'playing' : 'idle'}`}>
                    {isBot ? 'Running' : 'Idle'}
                  </span>
                </div>
                <p className="window-title">{w.title}</p>
                <p className="window-dims">{w.width}×{w.height} @ ({w.x},{w.y})</p>
              </div>
            );
          })}
        </div>
      )}

      {botTables.length > 0 && (
        <>
          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>
            Running Sessions
          </h3>
          <div className="session-list">
            {botTables.map(t => (
              <div key={t.table_id} className="session-row">
                <span className={`badge badge-${t.status}`}>{t.status}</span>
                <span className="session-name">{t.title}</span>
                <span className="session-hands">{t.hands_played} hands</span>
                <span className="session-pl" style={{ color: t.profit_loss >= 0 ? '#22c55e' : '#ef4444' }}>
                  {t.profit_loss >= 0 ? '+' : ''}${t.profit_loss.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── Capture Panel ──

const CapturePanel: React.FC = () => {
  const [screenData, setScreenData] = useState<string | null>(null);
  const [tableRegion, setTableRegion] = useState<string | null>(null);

  const handleCapture = useCallback(async () => {
    try {
      const data: string = await invoke('capture_screen');
      setScreenData(data);
      const region: object = await invoke('detect_table_region', { screenData: data });
      setTableRegion(JSON.stringify(region, null, 2));
    } catch (e) { console.error(e); }
  }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Screen Capture</h2>
          <p className="panel-subtitle">Manual screen capture and table detection for testing.</p>
        </div>
        <button className="btn btn-primary" onClick={handleCapture}>
          <Monitor size={14} /> Capture Screen
        </button>
      </div>

      <div className="capture-grid">
        <div className="preview-card">
          <h3 className="card-label"><Monitor size={14} /> Screen Preview</h3>
          {screenData ? (
            <div className="preview-container">
              <img src={`data:image/png;base64,${screenData}`} alt="Screen" className="preview-img" />
            </div>
          ) : (
            <div className="preview-placeholder">Click "Capture Screen" to begin</div>
          )}
        </div>
        <div className="region-card">
          <h3 className="card-label"><Search size={14} /> Detected Table</h3>
          {tableRegion ? (
            <pre className="region-json">{tableRegion}</pre>
          ) : (
            <p className="region-empty">No table detected yet.</p>
          )}
        </div>
      </div>

      <div className="action-card">
        <h3 className="card-label"><MousePointer size={14} /> Quick Actions</h3>
        <div className="action-buttons">
          {['fold', 'call', 'raise', 'all-in'].map(a => (
            <button key={a} className="btn btn-secondary" onClick={() => invoke('execute_poker_action', { action: a, amount: 0, client: 'PokerStars' })}>
              <MousePointer size={14} /> {a}
            </button>
          ))}
          <button className="btn btn-secondary" onClick={() => invoke('type_keys', { keys: ['Enter'] })}>
            <Keyboard size={14} /> Enter
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Settings Panel ──

const SettingsPanel: React.FC<{
  config: BotConfig;
  onChange: (partial: Partial<BotConfig>) => void;
}> = ({ config, onChange }) => (
  <div className="panel">
    <div className="panel-header">
      <div>
        <h2 className="panel-title">Settings</h2>
        <p className="panel-subtitle">Configure bot behavior and automation parameters.</p>
      </div>
    </div>

    <div className="settings-grid">
      <div className="settings-section">
        <h3 className="section-title">Skill & Strategy</h3>
        <SliderSetting label="Skill Level" value={config.skill_level} min={1} max={100} step={1}
          onChange={v => onChange({ skill_level: v })} />
        <SliderSetting label="Aggression" value={config.aggression} min={0} max={1} step={0.05}
          onChange={v => onChange({ aggression: v })} />
        <SliderSetting label="Bluff Frequency" value={config.bluff_frequency} min={0} max={0.5} step={0.01}
          onChange={v => onChange({ bluff_frequency: v })} />
      </div>

      <div className="settings-section">
        <h3 className="section-title">Humanization</h3>
        <SliderSetting label="Min Reaction (ms)" value={config.min_reaction_ms} min={200} max={3000} step={100}
          onChange={v => onChange({ min_reaction_ms: v })} />
        <SliderSetting label="Max Reaction (ms)" value={config.max_reaction_ms} min={500} max={5000} step={100}
          onChange={v => onChange({ max_reaction_ms: v })} />
      </div>

      <div className="settings-section">
        <h3 className="section-title">Misc</h3>
        <label className="checkbox-row">
          <input type="checkbox" checked={config.auto_fold_weak}
            onChange={e => onChange({ auto_fold_weak: e.target.checked })} />
          <span>Auto-fold weak hands</span>
        </label>
      </div>
    </div>
  </div>
);

const SliderSetting: React.FC<{
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, onChange }) => (
  <div className="slider-row">
    <div className="slider-label">
      <span>{label}</span>
      <span className="slider-value">{value}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))} className="slider-input" />
  </div>
);

export default App;

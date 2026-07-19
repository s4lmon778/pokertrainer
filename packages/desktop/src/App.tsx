import React, { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Camera, MousePointer, Keyboard, Play, Pause, Circle,
  Table2, History, Settings, Crosshair, Monitor,
} from 'lucide-react';
import TableDashboard from './components/TableDashboard';
import SessionViewer from './components/SessionViewer';

type Tab = 'capture' | 'tables' | 'sessions' | 'settings';

/** Top-level desktop application shell. */
const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('capture');
  const [screenData, setScreenData] = useState<string | null>(null);
  const [tableRegion, setTableRegion] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  /** Capture screen and detect table region. */
  const handleCaptureScreen = useCallback(async () => {
    setCaptureError(null);
    try {
      const data: string = await invoke('capture_screen');
      setScreenData(data);
      const region: object = await invoke('detect_table_region', { screenData: data });
      setTableRegion(JSON.stringify(region, null, 2));
    } catch (err) {
      setCaptureError(String(err));
    }
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ size?: number | string }> }[] = [
    { id: 'capture', label: 'Screen Capture', icon: Camera },
    { id: 'tables', label: 'Tables', icon: Table2 },
    { id: 'sessions', label: 'Sessions', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: 'var(--bg-surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: '1rem 0', flexShrink: 0,
      }}>
        <div style={{ padding: '0 1rem 1rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--gold)' }}>
            ♠ PokerTrainer
          </h1>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Desktop v1.0.0
          </p>
        </div>
        <nav style={{ flex: 1 }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  width: '100%', padding: '0.625rem 1rem',
                  fontSize: '0.8125rem', fontWeight: 500,
                  color: isActive ? 'var(--gold)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--gold-dim)' : 'transparent',
                  border: 'none', borderLeft: isActive ? '3px solid var(--gold)' : '3px solid transparent',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.1s',
                }}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
        {activeTab === 'capture' && (
          <ScreenCapturePanel
            screenData={screenData}
            tableRegion={tableRegion}
            error={captureError}
            onCapture={handleCaptureScreen}
          />
        )}
        {activeTab === 'tables' && <TableDashboard />}
        {activeTab === 'sessions' && <SessionViewer />}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>
    </div>
  );
};

// ── Screen Capture Panel ──

interface ScreenCapturePanelProps {
  screenData: string | null;
  tableRegion: string | null;
  error: string | null;
  onCapture: () => void;
}

const ScreenCapturePanel: React.FC<ScreenCapturePanelProps> = ({
  screenData, tableRegion, error, onCapture,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Screen Capture</h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4 }}>
          Capture the poker client window and detect table elements.
        </p>
      </div>
      <button className="btn-primary" onClick={onCapture}>
        <Camera size={16} />
        Capture Screen
      </button>
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

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      {/* Preview */}
      <div style={{
        background: 'var(--bg-surface)', borderRadius: '0.75rem',
        border: '1px solid var(--border)', padding: '1rem',
      }}>
        <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <Monitor size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
          Screen Preview
        </h3>
        {screenData ? (
          <div style={{
            aspectRatio: '16/10', background: '#000', borderRadius: '0.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <img
              src={`data:image/png;base64,${screenData}`}
              alt="Screen capture"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </div>
        ) : (
          <div style={{
            aspectRatio: '16/10', background: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', fontSize: '0.8125rem',
          }}>
            Click "Capture Screen" to begin
          </div>
        )}
      </div>

      {/* Table Detection */}
      <div style={{
        background: 'var(--bg-surface)', borderRadius: '0.75rem',
        border: '1px solid var(--border)', padding: '1rem',
      }}>
        <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <Crosshair size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
          Detected Table
        </h3>
        {tableRegion ? (
          <pre style={{
            fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-primary)',
            background: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem', padding: '0.75rem',
            overflow: 'auto', maxHeight: 320, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {tableRegion}
          </pre>
        ) : (
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            No table detected yet. Capture the screen to detect poker table elements.
          </p>
        )}
      </div>
    </div>

    {/* Quick actions */}
    <div style={{
      background: 'var(--bg-surface)', borderRadius: '0.75rem',
      border: '1px solid var(--border)', padding: '1rem',
    }}>
      <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Quick Actions
      </h3>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button className="btn-secondary" onClick={() => invoke('execute_poker_action', { action: 'fold', amount: 0, client: 'WinPoker' })}>
          <MousePointer size={14} /> Fold
        </button>
        <button className="btn-secondary" onClick={() => invoke('execute_poker_action', { action: 'call', amount: 0, client: 'WinPoker' })}>
          <MousePointer size={14} /> Call
        </button>
        <button className="btn-secondary" onClick={() => invoke('execute_poker_action', { action: 'raise', amount: 0, client: 'WinPoker' })}>
          <MousePointer size={14} /> Raise
        </button>
        <button className="btn-secondary" onClick={() => invoke('execute_poker_action', { action: 'all-in', amount: 0, client: 'WinPoker' })}>
          <MousePointer size={14} /> All-In
        </button>
        <button className="btn-secondary" onClick={() => invoke('type_keys', { keys: ['Enter'] })}>
          <Keyboard size={14} /> Type Enter
        </button>
      </div>
    </div>
  </div>
);

// ── Settings Panel ──

const SettingsPanel: React.FC = () => (
  <div>
    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Settings</h2>
    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
      Configure desktop automation settings.
    </p>

    <div style={{
      background: 'var(--bg-surface)', borderRadius: '0.75rem',
      border: '1px solid var(--border)', padding: '1.5rem',
    }}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>Input Settings</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8125rem' }}>Natural Mouse Movement</span>
          <input type="checkbox" defaultChecked style={{ accentColor: 'var(--gold)' }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8125rem' }}>Anti-Detection Jitter</span>
          <input type="checkbox" defaultChecked style={{ accentColor: 'var(--gold)' }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8125rem' }}>Auto-Start on Table Detection</span>
          <input type="checkbox" style={{ accentColor: 'var(--gold)' }} />
        </label>
      </div>
    </div>
  </div>
);

export default App;

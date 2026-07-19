import React, { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Video, Square, Save, Download, AlertCircle,
  XCircle, ChevronRight,
} from 'lucide-react';

/** Shape of a recorded hand returned from the Rust backend. */
interface RecordedHand {
  hand_id: string;
  table_id: string;
  stakes: string;
  hole_cards: string[];
  community_cards: string[];
  actions: { player: string; action: string; amount: number; timestamp_ms: number }[];
  result: number;
  mistakes: string[];
  gto_comparison: string | null;
}

/** Shape of the recording session envelope. */
interface SessionData {
  session_id: string;
  started_at: number;
  hands: RecordedHand[];
}

/** Session viewer — record, review, and export hand histories. */
const SessionViewer: React.FC = () => {
  const [sessionId, setSessionId] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [expandedHand, setExpandedHand] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Start a new recording session. */
  const handleStart = useCallback(async () => {
    setError(null);
    const id = sessionId.trim() || `session-${Date.now()}`;
    setSessionId(id);
    try {
      await invoke('start_recording', { sessionId: id });
      setIsRecording(true);
      setSessionData(null);
    } catch (err) {
      setError(String(err));
    }
  }, [sessionId]);

  /** Stop recording and load the session data. */
  const handleStop = useCallback(async () => {
    setError(null);
    try {
      const json: string = await invoke('stop_recording');
      const parsed: SessionData = JSON.parse(json);
      setSessionData(parsed);
      setIsRecording(false);
      setExpandedHand(null);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  /** Record a demo hand for testing. */
  const handleRecordDemoHand = useCallback(async () => {
    setError(null);
    const demoHand: RecordedHand = {
      hand_id: `hand-${Date.now()}`,
      table_id: 'table-1',
      stakes: '$1/$2',
      hole_cards: ['Ah', 'Kh'],
      community_cards: ['Qh', 'Jh', '3c', '2d', '10h'],
      actions: [
        { player: 'Hero', action: 'raise', amount: 6.0, timestamp_ms: Date.now() },
        { player: 'Villain', action: 'call', amount: 6.0, timestamp_ms: Date.now() + 2000 },
        { player: 'Hero', action: 'bet', amount: 10.0, timestamp_ms: Date.now() + 5000 },
        { player: 'Villain', action: 'fold', amount: 0, timestamp_ms: Date.now() + 8000 },
      ],
      result: 8.0,
      mistakes: [],
      gto_comparison: null,
    };
    try {
      await invoke('record_hand', { handData: JSON.stringify(demoHand) });
    } catch (err) {
      setError(String(err));
    }
  }, []);

  /** Export session as a downloadable JSON file. */
  const handleExport = useCallback(() => {
    if (!sessionData) return;
    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionData.session_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sessionData]);

  const totalPL = sessionData?.hands.reduce((s, h) => s + h.result, 0) ?? 0;
  const mistakeCount = sessionData?.hands.reduce((s, h) => s + h.mistakes.length, 0) ?? 0;
  const isAnyPositive = totalPL >= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Session Recorder</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Record, review, and export poker hand histories with mistake annotations and GTO comparisons.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!isRecording ? (
            <>
              <input
                type="text"
                value={sessionId}
                onChange={e => setSessionId(e.target.value)}
                placeholder="Session ID (optional)"
                style={{
                  padding: '0.375rem 0.75rem', fontSize: '0.8125rem',
                  background: 'var(--bg-surface)', color: 'var(--text-primary)',
                  border: '1px solid var(--border)', borderRadius: '0.375rem',
                  outline: 'none', width: 180,
                }}
              />
              <button className="btn-primary" onClick={handleStart}>
                <Video size={14} /> Start Recording
              </button>
            </>
          ) : (
            <>
              <button className="btn-secondary" onClick={handleRecordDemoHand}>
                <Save size={14} /> Record Demo Hand
              </button>
              <button className="btn-danger" onClick={handleStop}>
                <Square size={14} /> Stop Recording
              </button>
            </>
          )}
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

      {isRecording && (
        <div style={{
          background: 'var(--bg-surface)', borderRadius: '0.75rem',
          border: '1px solid rgba(34, 197, 94, 0.2)', padding: '1rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: '#22c55e', animation: 'pulse 1.5s infinite',
          }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#22c55e' }}>
            Recording session: {sessionId}
          </span>
        </div>
      )}

      {/* Session summary */}
      {sessionData && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <SummaryCard label="Session" value={sessionData.session_id} />
            <SummaryCard label="Hands Recorded" value={String(sessionData.hands.length)} />
            <SummaryCard
              label="Total P&amp;L"
              value={`${totalPL >= 0 ? '+' : ''}${totalPL.toFixed(2)}`}
              accent={isAnyPositive ? '#22c55e' : '#ef4444'}
            />
            <SummaryCard
              label="Mistakes"
              value={String(mistakeCount)}
              accent={mistakeCount > 0 ? '#f59e0b' : undefined}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" onClick={handleExport}>
              <Download size={14} /> Export Session
            </button>
          </div>

          {/* Hand list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Recorded Hands</h3>
            {sessionData.hands.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                No hands recorded yet.
              </p>
            ) : (
              sessionData.hands.map(hand => {
                const isExpanded = expandedHand === hand.hand_id;
                return (
                  <div key={hand.hand_id} style={{
                    background: 'var(--bg-surface)', borderRadius: '0.75rem',
                    border: '1px solid var(--border)',
                  }}>
                    <button
                      onClick={() => setExpandedHand(isExpanded ? null : hand.hand_id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '0.75rem 1rem',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: 'var(--text-primary)', fontSize: '0.8125rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <ChevronRight
                          size={14}
                          style={{
                            transition: 'transform 0.15s',
                            transform: isExpanded ? 'rotate(90deg)' : undefined,
                            color: 'var(--text-secondary)',
                          }}
                        />
                        <span style={{ fontWeight: 600 }}>{hand.hand_id}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{hand.stakes}</span>
                        <span style={{
                          fontWeight: 600,
                          color: hand.result >= 0 ? '#22c55e' : '#ef4444',
                        }}>
                          {hand.result >= 0 ? '+' : ''}{hand.result.toFixed(2)}
                        </span>
                        {hand.mistakes.length > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#f59e0b', fontSize: '0.6875rem' }}>
                            <AlertCircle size={12} /> {hand.mistakes.length} mistake{hand.mistakes.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                        {hand.hole_cards.join(' ')}
                      </span>
                    </button>

                    {isExpanded && (
                      <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid var(--border)' }}>
                        {/* Cards */}
                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem' }}>
                          <div>
                            <p style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>
                              Hole Cards
                            </p>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{hand.hole_cards.join(' ')}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>
                              Community
                            </p>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                              {hand.community_cards.length > 0 ? hand.community_cards.join(' ') : '—'}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ marginTop: '0.75rem' }}>
                          <p style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>
                            Action Sequence
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {hand.actions.map((a, i) => (
                              <div key={i} style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{i + 1}.</span>{' '}
                                {a.player}: {a.action}{a.amount > 0 ? ` $${a.amount.toFixed(2)}` : ''}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Mistakes */}
                        {hand.mistakes.length > 0 && (
                          <div style={{ marginTop: '0.75rem' }}>
                            <p style={{ fontSize: '0.625rem', color: '#f59e0b', textTransform: 'uppercase', marginBottom: 4 }}>
                              Mistakes
                            </p>
                            {hand.mistakes.map((m, i) => (
                              <div key={i} style={{
                                fontSize: '0.75rem', color: '#f59e0b',
                                display: 'flex', alignItems: 'flex-start', gap: 4,
                              }}>
                                <XCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                                {m}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* GTO comparison */}
                        {hand.gto_comparison && (
                          <div style={{ marginTop: '0.75rem' }}>
                            <p style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>
                              GTO Comparison
                            </p>
                            <pre style={{
                              fontSize: '0.6875rem', fontFamily: 'monospace',
                              background: 'rgba(0,0,0,0.2)', borderRadius: '0.375rem',
                              padding: '0.5rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                            }}>
                              {hand.gto_comparison}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ── Small Helper ──

interface SummaryCardProps {
  label: string;
  value: string;
  accent?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, accent }) => (
  <div style={{
    background: 'var(--bg-surface)', borderRadius: '0.75rem',
    border: '1px solid var(--border)', padding: '1rem',
  }}>
    <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}
    </p>
    <p style={{
      fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem',
      color: accent ?? 'var(--text-primary)',
    }}>
      {value}
    </p>
  </div>
);

export default SessionViewer;

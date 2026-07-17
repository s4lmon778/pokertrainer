import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import type { BotPersonality, BotSettings } from '../utils/botEngine';
import { Zap, Shield, AlertTriangle, RefreshCw, Plus, Minus, Bot, FlaskConical, Users, Wrench, ChevronDown, ChevronUp, Upload, Download, Sliders, Eye, Save, FolderOpen, CheckCircle, Database, FileJson, Lightbulb } from 'lucide-react';
import { exportData, importData, type ImportResult, restoreAutoBackup, getAutoBackupAge, checkStorageUsage } from '../utils/backup';

// ── Slider sub-component (module-level to avoid recreation) ──

const SliderControl: React.FC<{
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  colorClass?: string;
  onChange: (value: number) => void;
}> = React.memo(({ label, icon, value, min, max, step = 1, unit = '%', colorClass = 'slider-cyan', onChange }) => {
  const pct = ((value - min) / (max - min)) * 100;
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  }, [onChange]);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-secondary flex items-center gap-1">{icon}{label}</span>
        <span className="text-cyan-400 font-mono text-xs font-bold">{value.toFixed(0)}{unit}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className={colorClass}
          style={{ '--slider-pct': `${pct}%` } as React.CSSProperties}
        />
        <div className="flex justify-between px-[2px] mt-0.5">
          <span className="text-[9px] text-text-secondary/30 font-mono">{min}{unit}</span>
          <span className="text-[9px] text-text-secondary/30 font-mono">{max}{unit}</span>
        </div>
      </div>
    </div>
  );
});

SliderControl.displayName = 'SliderControl';

const SettingsPanel: React.FC = React.memo(() => {
  const trainingBotSettings = useGameStore(s => s.trainingBotSettings);
  const botSettings = useGameStore(s => s.botSettings);
  const updateTrainingBotSettings = useGameStore(s => s.updateTrainingBotSettings);
  const setTrainingPersonality = useGameStore(s => s.setTrainingPersonality);
  const setOpponentPersonality = useGameStore(s => s.setOpponentPersonality);
  const setTableSize = useGameStore(s => s.setTableSize);
  const setBuyIn = useGameStore(s => s.setBuyIn);
  const startingBankroll = useGameStore(s => s.startingBankroll);
  const setStartingBankroll = useGameStore(s => s.setStartingBankroll);
  const resetStats = useGameStore(s => s.resetStats);
  const showCardsAtEnd = useGameStore(s => s.showCardsAtEnd);
  const toggleShowCardsAtEnd = useGameStore(s => s.toggleShowCardsAtEnd);
  const opponentPersonality = useGameStore(s => s.opponentPersonality);
  const tableSize = useGameStore(s => s.tableSize);
  const buyIn = useGameStore(s => s.buyIn);
  const autoPlaySpeed = useGameStore(s => s.autoPlaySpeed);
  const setAutoPlaySpeed = useGameStore(s => s.setAutoPlaySpeed);
  const trainingPersonality = trainingBotSettings.personality;

  // ── Coach Tips Settings ──
  const COACH_TIPS_ENABLED_KEY = 'pokertrainer-coach-tips-enabled';
  const COACH_TIPS_CATEGORY_KEY = 'pokertrainer-coach-tips-category';
  const COACH_TIPS_FREQ_KEY = 'pokertrainer-coach-tips-frequency';
  const [coachTipsEnabled, setCoachTipsEnabledState] = useState<boolean>(() => {
    try { const v = localStorage.getItem(COACH_TIPS_ENABLED_KEY); return v !== null ? v === 'true' : true; }
    catch { return true; }
  });
  const [coachTipsCategory, setCoachTipsCategoryState] = useState<string>(() => {
    try { const v = localStorage.getItem(COACH_TIPS_CATEGORY_KEY); return v || 'all'; }
    catch { return 'all'; }
  });
  const [coachTipsFrequency, setCoachTipsFrequencyState] = useState<number>(() => {
    try { const v = localStorage.getItem(COACH_TIPS_FREQ_KEY); const n = parseInt(v || ''); return (n === 30000 || n === 60000 || n === 120000) ? n : 60000; }
    catch { return 60000; }
  });

  const setCoachTipsEnabled = useCallback((val: boolean) => {
    setCoachTipsEnabledState(val);
    try { localStorage.setItem(COACH_TIPS_ENABLED_KEY, String(val)); } catch { /* noop */ }
  }, []);

  const setCoachTipsCategory = useCallback((val: string) => {
    setCoachTipsCategoryState(val);
    try { localStorage.setItem(COACH_TIPS_CATEGORY_KEY, val); } catch { /* noop */ }
  }, []);

  const setCoachTipsFrequency = useCallback((val: number) => {
    setCoachTipsFrequencyState(val);
    try { localStorage.setItem(COACH_TIPS_FREQ_KEY, String(val)); } catch { /* noop */ }
  }, []);

  const [numBots, setNumBots] = useState(Math.max(1, tableSize - 1));

  useEffect(() => {
    setNumBots(Math.max(1, tableSize - 1));
  }, [tableSize]);

  const handleNumBotsChange = (delta: number) => {
    const newCount = numBots + delta;
    if (newCount < 2) return;
    if (newCount > 8) return;
    setNumBots(newCount);
    setTableSize(newCount + 1);
  };

  const personalities: { value: BotPersonality; label: string; desc: string; color: string }[] = [
    { value: 'tight-aggressive', label: 'TAG', desc: 'Tight but aggressive when strong', color: 'from-green-500 to-emerald-600' },
    { value: 'loose-aggressive', label: 'LAG', desc: 'Loose and unpredictable', color: 'from-red-500 to-orange-600' },
    { value: 'tight-passive', label: 'TP', desc: 'Cautious, calls often', color: 'from-blue-500 to-indigo-600' },
    { value: 'balanced', label: 'Balanced', desc: 'Mixed approach', color: 'from-purple-500 to-violet-600' },
  ];

  const handleTrainingChange = useCallback((key: keyof BotSettings, value: number | string) => {
    updateTrainingBotSettings({ [key]: value as never });
  }, [updateTrainingBotSettings]);

  return (
    <div className="space-y-4">
      {/* Table Setup */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-gold" />
          <span className="font-bold text-sm">Table Setup</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block font-semibold">Bots (1 Training + opponents)</label>
            <div className="flex items-center gap-1.5">
              <button onClick={() => handleNumBotsChange(-1)} disabled={numBots <= 2}
                className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:border-gold hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:text-text-primary transition-all">
                <Minus size={14} />
              </button>
              <span className="text-lg font-bold text-gold font-mono w-8 text-center">{numBots}</span>
              <button onClick={() => handleNumBotsChange(1)} disabled={numBots >= 8}
                className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:border-gold hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:text-text-primary transition-all">
                <Plus size={14} />
              </button>
              <span className="text-[10px] text-text-secondary/50 font-mono">({numBots + 1}p)</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block font-semibold">Buy-In</label>
            <select value={buyIn} onChange={e => setBuyIn(parseInt(e.target.value))} className="input-field">
              {[25, 50, 100, 200, 500, 1000].map(n => (<option key={n} value={n}>${n}</option>))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block font-semibold">Starting Bankroll</label>
            <select value={startingBankroll} onChange={e => setStartingBankroll(parseInt(e.target.value))} className="input-field">
              {[100, 250, 500, 1000, 2000, 5000].map(n => (<option key={n} value={n}>${n}</option>))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block font-semibold">Auto-Play Speed</label>
            <select value={autoPlaySpeed} onChange={e => setAutoPlaySpeed(parseInt(e.target.value))} className="input-field">
              <option value={150}>Very Fast (150ms)</option>
              <option value={400}>Normal (400ms)</option>
              <option value={800}>Slow (800ms)</option>
              <option value={1500}>Very Slow (1.5s)</option>
            </select>
          </div>
          <div className="flex items-end justify-between pb-2">
            <div>
              <label className="text-xs text-text-secondary font-semibold block mb-1">Reveal bot cards at end</label>
              <span className="text-[10px] text-text-secondary/40">{showCardsAtEnd ? 'Cards shown at showdown' : 'Cards hidden'}</span>
            </div>
            <button onClick={toggleShowCardsAtEnd}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${showCardsAtEnd ? 'bg-gold' : 'bg-surface-border'}`}
              aria-label={showCardsAtEnd ? 'Hide cards at end' : 'Show cards at end'}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${showCardsAtEnd ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ===== COACH TIPS SETTINGS ===== */}
      <div className="card border-cyan-500/20 bg-gradient-to-br from-cyan-950/10 to-surface-elevated">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={16} className="text-gold" />
          <span className="font-bold text-sm">Coach Tips</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold uppercase">Toast</span>
        </div>
        <p className="text-xs text-text-secondary mb-3">
          Configure the coaching tips popup that appears at the bottom-right of the table.
        </p>
        <div className="space-y-3">
          {/* Enable/Disable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold">Enable Coach Tips</div>
              <div className="text-[10px] text-text-secondary/40">{coachTipsEnabled ? 'Tips will appear during gameplay' : 'Tips are disabled'}</div>
            </div>
            <button
              onClick={() => setCoachTipsEnabled(!coachTipsEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${coachTipsEnabled ? 'bg-gold' : 'bg-surface-border'}`}
              aria-label={coachTipsEnabled ? 'Disable coach tips' : 'Enable coach tips'}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${coachTipsEnabled ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Category filter */}
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block font-semibold">Tip Category</label>
            <div className="grid grid-cols-3 gap-1">
              {(['all', 'strategy', 'math', 'psychology', 'bankroll', 'general'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCoachTipsCategory(cat)}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                    coachTipsCategory === cat
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40'
                      : 'bg-white/5 text-text-secondary/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Display frequency */}
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block font-semibold">Display Frequency</label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { value: 30000, label: '30s' },
                { value: 60000, label: '60s' },
                { value: 120000, label: '2min' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setCoachTipsFrequency(opt.value)}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                    coachTipsFrequency === opt.value
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40'
                      : 'bg-white/5 text-text-secondary/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== TRAINING BOT + OPPONENT BOTS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ===== TRAINING BOT ===== */}
      <div className="card border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-surface-elevated">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
            <FlaskConical size={12} className="text-white" />
          </div>
          <span className="font-bold text-sm text-cyan-400">Training Bot</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold uppercase">T-Bot</span>
        </div>
        <p className="text-xs text-text-secondary mb-3">
          This is your bot. Adjust its settings, test it on the table, track its performance.
        </p>

        {/* Personality Presets */}
        <div className="mb-3">
          <label className="text-xs text-text-secondary mb-1.5 block font-semibold">Personality Preset</label>
          <div className="grid grid-cols-2 gap-1.5">
            {personalities.map(p => (
              <button
                key={p.value}
                onClick={() => setTrainingPersonality(p.value)}
                className={`p-2 rounded-xl border text-left transition-all ${
                  trainingPersonality === p.value
                    ? 'border-cyan-400 bg-cyan-400/10 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : 'border-surface-border hover:border-surface-elevated hover:bg-white/[0.03]'
                }`}
              >
                <div className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-gradient-to-r ${p.color} mb-0.5`}>
                  {p.label}
                </div>
                <div className="text-[10px] text-text-secondary">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Presets (GTO / Exploitative / Mixed) */}
        <div className="mb-3">
          <label className="text-xs text-text-secondary mb-1.5 block font-semibold flex items-center gap-1">
            <Sliders size={12} className="text-cyan-400" /> Quick Presets
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {([
              {
                key: 'gto', label: 'GTO', desc: 'Game Theory Optimal',
                settings: { aggressionFactor: 0.55, bluffFrequency: 0.12, mistakeRate: 0.01, reactionTimeMin: 0.3, reactionTimeMax: 1.5, tightLoose: 0.45, riskTolerance: 0.5, continuationBetFreq: 0.6, checkRaiseFreq: 0.06, floatFreq: 0.12, tankFreq: 0.08, snapFreq: 0.25, humanizationLevel: 0.15, positionAwareness: 0.9, stackSizeAwareness: 0.8 },
                color: 'border-blue-400/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400',
              },
              {
                key: 'exploit', label: 'Exploit', desc: 'Exploitative play',
                settings: { aggressionFactor: 0.80, bluffFrequency: 0.22, mistakeRate: 0.03, reactionTimeMin: 0.5, reactionTimeMax: 2.5, tightLoose: 0.55, riskTolerance: 0.7, continuationBetFreq: 0.75, checkRaiseFreq: 0.10, floatFreq: 0.20, tankFreq: 0.15, snapFreq: 0.15, humanizationLevel: 0.2, positionAwareness: 0.8, stackSizeAwareness: 0.7 },
                color: 'border-red-400/40 bg-red-500/10 hover:bg-red-500/20 text-red-400',
              },
              {
                key: 'mixed', label: 'Mixed', desc: 'Balanced hybrid',
                settings: { aggressionFactor: 0.65, bluffFrequency: 0.15, mistakeRate: 0.02, reactionTimeMin: 0.4, reactionTimeMax: 2.0, tightLoose: 0.50, riskTolerance: 0.55, continuationBetFreq: 0.65, checkRaiseFreq: 0.08, floatFreq: 0.15, tankFreq: 0.10, snapFreq: 0.20, humanizationLevel: 0.3, positionAwareness: 0.7, stackSizeAwareness: 0.6 },
                color: 'border-purple-400/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400',
              },
              {
                key: 'nit', label: 'Rock', desc: 'Ultra-tight',
                settings: { aggressionFactor: 0.30, bluffFrequency: 0.05, mistakeRate: 0.01, reactionTimeMin: 0.8, reactionTimeMax: 4.0, tightLoose: 0.20, riskTolerance: 0.2, continuationBetFreq: 0.30, checkRaiseFreq: 0.05, floatFreq: 0.05, tankFreq: 0.20, snapFreq: 0.05, humanizationLevel: 0.1, positionAwareness: 0.6, stackSizeAwareness: 0.5 },
                color: 'border-green-400/40 bg-green-500/10 hover:bg-green-500/20 text-green-400',
              },
              {
                key: 'maniac', label: 'Maniac', desc: 'Wild aggression',
                settings: { aggressionFactor: 0.95, bluffFrequency: 0.28, mistakeRate: 0.08, reactionTimeMin: 0.2, reactionTimeMax: 1.0, tightLoose: 0.85, riskTolerance: 0.9, continuationBetFreq: 0.90, checkRaiseFreq: 0.15, floatFreq: 0.30, tankFreq: 0.05, snapFreq: 0.35, humanizationLevel: 0.5, positionAwareness: 0.4, stackSizeAwareness: 0.3 },
                color: 'border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400',
              },
            ] as const).map(p => (
              <button
                key={p.key}
                onClick={() => {
                  updateTrainingBotSettings(p.settings);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${p.color}`}
                title={p.desc}
              >
                <Eye size={10} /> {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Experience Level Presets */}
        <div className="mb-3">
          <label className="text-xs text-text-secondary mb-1.5 block font-semibold flex items-center gap-1">
            <Sliders size={12} className="text-gold" /> Experience Level
          </label>
          <p className="text-[10px] text-text-secondary/40 mb-1.5">Configure your training bot for different skill levels and play styles.</p>
          <div className="flex gap-1.5 flex-wrap">
            {([
              {
                key: 'beginner', label: 'Beginner', desc: 'Tight, passive, low bluff',
                settings: { aggressionFactor: 0.30, bluffFrequency: 0.05, mistakeRate: 0.06, reactionTimeMin: 0.6, reactionTimeMax: 4.0, personality: 'tight-passive' as BotPersonality, tightLoose: 0.25, riskTolerance: 0.15, continuationBetFreq: 0.25, checkRaiseFreq: 0.03, floatFreq: 0.05, tankFreq: 0.15, snapFreq: 0.05, humanizationLevel: 0.5, positionAwareness: 0.3, stackSizeAwareness: 0.2 },
                color: 'border-green-400/40 bg-green-500/10 hover:bg-green-500/20 text-green-400',
                active: trainingPersonality === 'tight-passive' && trainingBotSettings.bluffFrequency < 0.08,
              },
              {
                key: 'intermediate', label: 'Intermediate', desc: 'Balanced play',
                settings: { aggressionFactor: 0.50, bluffFrequency: 0.10, mistakeRate: 0.03, reactionTimeMin: 0.4, reactionTimeMax: 2.5, personality: 'balanced' as BotPersonality, tightLoose: 0.45, riskTolerance: 0.45, continuationBetFreq: 0.55, checkRaiseFreq: 0.07, floatFreq: 0.12, tankFreq: 0.10, snapFreq: 0.20, humanizationLevel: 0.35, positionAwareness: 0.6, stackSizeAwareness: 0.5 },
                color: 'border-blue-400/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400',
                active: trainingPersonality === 'balanced' && trainingBotSettings.aggressionFactor > 0.4 && trainingBotSettings.aggressionFactor < 0.7,
              },
              {
                key: 'advanced', label: 'Advanced', desc: 'Loose, aggressive, high bluff',
                settings: { aggressionFactor: 0.80, bluffFrequency: 0.22, mistakeRate: 0.02, reactionTimeMin: 0.2, reactionTimeMax: 1.5, personality: 'loose-aggressive' as BotPersonality, tightLoose: 0.65, riskTolerance: 0.75, continuationBetFreq: 0.70, checkRaiseFreq: 0.10, floatFreq: 0.20, tankFreq: 0.08, snapFreq: 0.25, humanizationLevel: 0.2, positionAwareness: 0.85, stackSizeAwareness: 0.7 },
                color: 'border-red-400/40 bg-red-500/10 hover:bg-red-500/20 text-red-400',
                active: trainingPersonality === 'loose-aggressive' && trainingBotSettings.aggressionFactor > 0.7,
              },
              {
                key: 'gto', label: 'GTO', desc: 'Game theory optimal',
                settings: { aggressionFactor: 0.55, bluffFrequency: 0.10, mistakeRate: 0.01, reactionTimeMin: 0.3, reactionTimeMax: 1.5, personality: 'balanced' as BotPersonality, tightLoose: 0.45, riskTolerance: 0.5, continuationBetFreq: 0.60, checkRaiseFreq: 0.06, floatFreq: 0.12, tankFreq: 0.08, snapFreq: 0.25, humanizationLevel: 0.1, positionAwareness: 0.95, stackSizeAwareness: 0.85 },
                color: 'border-purple-400/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400',
                active: trainingPersonality === 'balanced' && trainingBotSettings.mistakeRate < 0.02,
              },
              {
                key: 'exploitative', label: 'Exploit', desc: 'Adaptive, high bluff',
                settings: { aggressionFactor: 0.90, bluffFrequency: 0.25, mistakeRate: 0.03, reactionTimeMin: 0.3, reactionTimeMax: 2.0, personality: 'loose-aggressive' as BotPersonality, tightLoose: 0.60, riskTolerance: 0.80, continuationBetFreq: 0.80, checkRaiseFreq: 0.12, floatFreq: 0.25, tankFreq: 0.12, snapFreq: 0.18, humanizationLevel: 0.25, positionAwareness: 0.8, stackSizeAwareness: 0.65 },
                color: 'border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400',
                active: trainingPersonality === 'loose-aggressive' && trainingBotSettings.bluffFrequency > 0.20,
              },
            ] as const).map(p => (
              <button
                key={p.key}
                onClick={() => {
                  updateTrainingBotSettings(p.settings);
                  if (p.settings.personality) setTrainingPersonality(p.settings.personality);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${p.color} ${p.active ? 'ring-1 ring-gold/50' : ''}`}
                title={p.desc}
              >
                <Eye size={10} /> {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Training Bot Sliders */}
        <div className="space-y-3">
          <SliderControl
            label="Aggression"
            icon={<Zap size={12} className="text-accent-yellow" />}
            value={trainingBotSettings.aggressionFactor * 100}
            min={0} max={100}
            onChange={v => handleTrainingChange('aggressionFactor', v / 100)}
          />
          <SliderControl
            label="Bluff Freq"
            icon={<Shield size={12} className="text-accent-blue" />}
            value={trainingBotSettings.bluffFrequency * 100}
            min={0} max={30}
            onChange={v => handleTrainingChange('bluffFrequency', v / 100)}
          />
          <SliderControl
            label="Mistake Rate"
            icon={<AlertTriangle size={12} className="text-accent-red" />}
            value={trainingBotSettings.mistakeRate * 100}
            min={0} max={10}
            onChange={v => handleTrainingChange('mistakeRate', v / 100)}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-text-secondary font-semibold block mb-1">Min Reaction (s)</label>
              <input type="number" min={0.1} max={5} step={0.1} value={trainingBotSettings.reactionTimeMin}
                onChange={e => handleTrainingChange('reactionTimeMin', parseFloat(e.target.value) || 0.5)}
                className="input-field text-sm" />
            </div>
            <div>
              <label className="text-xs text-text-secondary font-semibold block mb-1">Max Reaction (s)</label>
              <input type="number" min={0.5} max={10} step={0.1} value={trainingBotSettings.reactionTimeMax}
                onChange={e => handleTrainingChange('reactionTimeMax', parseFloat(e.target.value) || 3)}
                className="input-field text-sm" />
            </div>
          </div>

          {/* ── Extended Parameters ── */}
          <div className="pt-2 border-t border-white/5">
            <label className="text-[10px] text-text-secondary/40 uppercase tracking-wider font-bold block mb-2 flex items-center gap-1">
              <Sliders size={10} /> Extended Parameters
            </label>
            <div className="space-y-2.5">
              <SliderControl
                label="Tight/Loose"
                icon={<FlaskConical size={12} className="text-cyan-400" />}
                value={trainingBotSettings.tightLoose * 100}
                min={10} max={90}
                onChange={v => handleTrainingChange('tightLoose', v / 100)}
                colorClass="slider-cyan"
              />
              <SliderControl
                label="Risk Tolerance"
                icon={<Zap size={12} className="text-accent-yellow" />}
                value={trainingBotSettings.riskTolerance * 100}
                min={0} max={100}
                onChange={v => handleTrainingChange('riskTolerance', v / 100)}
                colorClass="slider-amber"
              />
              <SliderControl
                label="C-Bet Freq"
                icon={<Bot size={12} className="text-green-400" />}
                value={trainingBotSettings.continuationBetFreq * 100}
                min={0} max={100}
                onChange={v => handleTrainingChange('continuationBetFreq', v / 100)}
                colorClass="slider-green"
              />
              <SliderControl
                label="Check-Raise Freq"
                icon={<Shield size={12} className="text-purple-400" />}
                value={trainingBotSettings.checkRaiseFreq * 100}
                min={0} max={20}
                onChange={v => handleTrainingChange('checkRaiseFreq', v / 100)}
                colorClass="slider-purple"
              />
              <SliderControl
                label="Float Freq"
                icon={<Eye size={12} className="text-blue-400" />}
                value={trainingBotSettings.floatFreq * 100}
                min={0} max={40}
                onChange={v => handleTrainingChange('floatFreq', v / 100)}
                colorClass="slider-blue"
              />
              <SliderControl
                label="Tank Freq"
                icon={<AlertTriangle size={12} className="text-orange-400" />}
                value={trainingBotSettings.tankFreq * 100}
                min={0} max={50}
                onChange={v => handleTrainingChange('tankFreq', v / 100)}
                colorClass="slider-orange"
              />
              <SliderControl
                label="Snap Freq"
                icon={<Zap size={12} className="text-yellow-400" />}
                value={trainingBotSettings.snapFreq * 100}
                min={0} max={50}
                onChange={v => handleTrainingChange('snapFreq', v / 100)}
                colorClass="slider-yellow"
              />
              <SliderControl
                label="Humanization"
                icon={<FlaskConical size={12} className="text-pink-400" />}
                value={trainingBotSettings.humanizationLevel * 100}
                min={0} max={100}
                onChange={v => handleTrainingChange('humanizationLevel', v / 100)}
                colorClass="slider-pink"
              />
              <SliderControl
                label="Position Awareness"
                icon={<Users size={12} className="text-teal-400" />}
                value={trainingBotSettings.positionAwareness * 100}
                min={0} max={100}
                onChange={v => handleTrainingChange('positionAwareness', v / 100)}
                colorClass="slider-teal"
              />
              <SliderControl
                label="Stack Awareness"
                icon={<Bot size={12} className="text-indigo-400" />}
                value={trainingBotSettings.stackSizeAwareness * 100}
                min={0} max={100}
                onChange={v => handleTrainingChange('stackSizeAwareness', v / 100)}
                colorClass="slider-indigo"
              />
            </div>
          </div>
        </div>

        {/* Behavior Preview */}
        <div className="mt-3 pt-3 border-t border-white/5">
          <label className="text-[10px] text-text-secondary/40 uppercase tracking-wider font-bold block mb-1.5 flex items-center gap-1">
            <Eye size={10} /> Behavior Preview
          </label>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            {[
              { label: 'Style', value: trainingBotSettings.aggressionFactor > 0.7 ? 'Aggressive' : trainingBotSettings.aggressionFactor < 0.4 ? 'Passive' : 'Balanced', color: trainingBotSettings.aggressionFactor > 0.7 ? 'text-red-400' : trainingBotSettings.aggressionFactor < 0.4 ? 'text-blue-400' : 'text-cyan-400' },
              { label: 'Bluffing', value: trainingBotSettings.bluffFrequency > 0.18 ? 'Frequent' : trainingBotSettings.bluffFrequency > 0.08 ? 'Moderate' : 'Rare', color: trainingBotSettings.bluffFrequency > 0.18 ? 'text-amber-400' : trainingBotSettings.bluffFrequency > 0.08 ? 'text-gold' : 'text-green-400' },
              { label: 'Accuracy', value: trainingBotSettings.mistakeRate > 0.05 ? 'Low' : trainingBotSettings.mistakeRate > 0.02 ? 'Medium' : 'High', color: trainingBotSettings.mistakeRate < 0.03 ? 'text-green-400' : trainingBotSettings.mistakeRate < 0.06 ? 'text-gold' : 'text-red-400' },
              { label: 'Speed', value: (trainingBotSettings.reactionTimeMin + trainingBotSettings.reactionTimeMax) / 2 < 1.5 ? 'Fast' : (trainingBotSettings.reactionTimeMin + trainingBotSettings.reactionTimeMax) / 2 < 3 ? 'Normal' : 'Slow', color: (trainingBotSettings.reactionTimeMin + trainingBotSettings.reactionTimeMax) / 2 < 1.5 ? 'text-cyan-400' : 'text-text-secondary/60' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between bg-white/[0.02] rounded-lg px-2 py-1.5 border border-white/5">
                <span className="text-text-secondary/50">{row.label}</span>
                <span className={`font-bold ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== OPPONENT BOTS ===== */}
      <div className="card">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-gold rounded-full flex items-center justify-center">
            <Bot size={12} className="text-black" />
          </div>
          <span className="font-bold text-sm">Opponent Bots</span>
          <span className="text-[10px] text-text-secondary">({numBots - 1} opponents)</span>
        </div>
        <p className="text-xs text-text-secondary mb-3">
          These are the AI opponents your training bot plays against. Choose a personality preset.
        </p>

        <div className="mb-3">
          <label className="text-xs text-text-secondary mb-1.5 block font-semibold">Opponent Personality</label>
          <div className="grid grid-cols-2 gap-1.5">
            {personalities.map(p => (
              <button
                key={p.value}
                onClick={() => setOpponentPersonality(p.value)}
                className={`p-2 rounded-xl border text-left transition-all ${
                  opponentPersonality === p.value
                    ? 'border-gold bg-gold/10 shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                    : 'border-surface-border hover:border-surface-elevated hover:bg-white/[0.03]'
                }`}
              >
                <div className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-gradient-to-r ${p.color} mb-0.5`}>
                  {p.label}
                </div>
                <div className="text-[10px] text-text-secondary">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Opponent read-only stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
            <div className="text-[10px] text-text-secondary/50 mb-1 font-semibold">Aggression</div>
            <div className="text-gold font-mono text-sm font-bold">{(botSettings.aggressionFactor * 100).toFixed(0)}%</div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
            <div className="text-[10px] text-text-secondary/50 mb-1 font-semibold">Bluff</div>
            <div className="text-gold font-mono text-sm font-bold">{(botSettings.bluffFrequency * 100).toFixed(0)}%</div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
            <div className="text-[10px] text-text-secondary/50 mb-1 font-semibold">Mistakes</div>
            <div className="text-gold font-mono text-sm font-bold">{(botSettings.mistakeRate * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>
      </div>

      {/* ===== TRAINING BOT ADVANCED CONFIG (STUBBED) ===== */}
      <AdvancedBotConfig />

      {/* Export / Import / Backup Settings */}
      <div className="card">
        <div className="flex items-center gap-2 mb-2">
          <Sliders size={16} className="text-gold" />
          <span className="font-bold text-sm">Export / Import / Backup</span>
        </div>
        <p className="text-xs text-text-secondary mb-3">
          Save your current configuration as a JSON file, load a previously saved configuration, or backup/restore settings in your browser.
        </p>
        <div className="flex gap-2 flex-wrap">
          <ExportSettingsButton />
          <ImportSettingsButton />
          <BackupSettingsButton />
          <RestoreSettingsButton />
        </div>
      </div>

      {/* Game Data Export / Import */}
      <div className="card">
        <div className="flex items-center gap-2 mb-2">
          <Database size={16} className="text-accent-cyan" />
          <span className="font-bold text-sm">Game Data Backup</span>
        </div>
        <p className="text-xs text-text-secondary mb-3">
          Export all your game data (stats, history, bankroll) as a JSON backup file. Import a previous backup to restore your progress.
        </p>
        <div className="flex gap-2 flex-wrap mb-3">
          <GameDataExportButton />
          <GameDataImportButton />
        </div>
        <AutoBackupInfo />
      </div>

      {/* Reset */}
      <button onClick={resetStats}
        className="btn-ghost w-full flex items-center justify-center gap-2 text-accent-red border-accent-red/30 hover:bg-accent-red/10 hover:text-accent-red hover:border-accent-red/50">
        <RefreshCw size={14} /> Reset All Statistics
      </button>
    </div>
  );
});

SettingsPanel.displayName = 'SettingsPanel';

// ── Advanced Training Bot Configuration (Stubbed for future development) ──

interface BotParamDef {
  key: string;
  label: string;
  description: string;
  range: string;
  default: string;
  unit?: string;
  category: 'core' | 'behavior' | 'timing' | 'advanced';
}

const FUTURE_BOT_PARAMS: BotParamDef[] = [
  // Core parameters
  { key: 'skillLevel', label: 'Skill Level', description: 'Overall bot playing strength from beginner to expert', range: '1–100', default: '50', unit: '/100', category: 'core' },
  { key: 'gtoVsExploitative', label: 'GTO vs Exploitative Ratio', description: 'Balance between game-theory-optimal and exploitative play', range: '0–100', default: '60', unit: '% GTO', category: 'core' },
  { key: 'aggressionFactor', label: 'Aggression Factor', description: 'How aggressively the bot bets and raises (already partially implemented)', range: '0.0–3.0', default: '1.5', unit: 'x', category: 'core' },
  { key: 'bluffFrequency', label: 'Bluff Frequency', description: 'How often the bot bluffs in neutral spots (already partially implemented)', range: '0–30', default: '8', unit: '%', category: 'core' },

  // Behavior parameters
  { key: 'tightLoose', label: 'Tight/Loose Tendency', description: 'Preflop hand selection range width', range: '0–100', default: '50', unit: '/100', category: 'behavior' },
  { key: 'riskTolerance', label: 'Risk Tolerance', description: 'Willingness to put chips at risk in marginal spots', range: '0–100', default: '40', unit: '/100', category: 'behavior' },
  { key: 'foldToThreeBet', label: 'Fold to 3-Bet %', description: 'How often the bot folds when facing a 3-bet', range: '0–100', default: '50', unit: '%', category: 'behavior' },
  { key: 'continuationBetFreq', label: 'C-Bet Frequency', description: 'How often the bot continuation-bets as the preflop raiser', range: '0–100', default: '65', unit: '%', category: 'behavior' },
  { key: 'checkRaiseFreq', label: 'Check-Raise Frequency', description: 'How often the bot check-raises', range: '0–30', default: '8', unit: '%', category: 'behavior' },
  { key: 'floatFreq', label: 'Float Frequency', description: 'How often the bot calls a c-bet to bluff later streets', range: '0–40', default: '15', unit: '%', category: 'behavior' },

  // Timing parameters
  { key: 'reactionTimeMin', label: 'Min Reaction Time', description: 'Minimum delay before bot acts (already partially implemented)', range: '0.1–5.0', default: '0.5', unit: 's', category: 'timing' },
  { key: 'reactionTimeMax', label: 'Max Reaction Time', description: 'Maximum delay before bot acts (already partially implemented)', range: '0.5–10.0', default: '3.0', unit: 's', category: 'timing' },
  { key: 'tankFrequency', label: 'Tank Frequency', description: 'How often the bot takes extra time (simulating difficult decisions)', range: '0–50', default: '10', unit: '%', category: 'timing' },
  { key: 'snapActionFrequency', label: 'Snap Action Frequency', description: 'How often the bot acts instantly', range: '0–50', default: '20', unit: '%', category: 'timing' },

  // Advanced parameters
  { key: 'humanizationLevel', label: 'Humanization Level', description: 'How much randomness/variance is injected to mimic human play patterns', range: '0–100', default: '40', unit: '/100', category: 'advanced' },
  { key: 'balanceRandomization', label: 'Balance Randomization', description: 'How much the bot randomly mixes between similar EV actions', range: '0–100', default: '25', unit: '/100', category: 'advanced' },
  { key: 'learningRate', label: 'Learning Rate', description: 'How quickly the bot adapts to opponent tendencies over a session', range: '0–100', default: '0', unit: '/100', category: 'advanced' },
  { key: 'positionAwareness', label: 'Position Awareness', description: 'How much the bot adjusts strategy based on table position', range: '0–100', default: '70', unit: '/100', category: 'advanced' },
  { key: 'stackSizeAwareness', label: 'Stack Size Awareness', description: 'How much the bot adjusts for effective stack depth', range: '0–100', default: '60', unit: '/100', category: 'advanced' },
  { key: 'icmConsideration', label: 'ICM Consideration', description: 'How tournament ICM pressure affects decisions (future tournament mode)', range: '0–100', default: '0', unit: '/100', category: 'advanced' },
];

const CATEGORY_LABELS: Record<BotParamDef['category'], string> = {
  core: 'Core Parameters',
  behavior: 'Behavior Parameters',
  timing: 'Timing Parameters',
  advanced: 'Advanced Parameters',
};

const CATEGORY_COLORS: Record<BotParamDef['category'], string> = {
  core: 'border-cyan-500/30 bg-cyan-500/5',
  behavior: 'border-amber-500/30 bg-amber-500/5',
  timing: 'border-blue-500/30 bg-blue-500/5',
  advanced: 'border-purple-500/30 bg-purple-500/5',
};

const AdvancedBotConfig: React.FC = React.memo(() => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="card border-dashed border-white/10">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <Wrench size={16} className="text-text-secondary/50" />
          <span className="font-bold text-sm text-text-secondary/70">Advanced Training Bot Config</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold uppercase border border-amber-500/20">
            TODO
          </span>
        </div>
        {isExpanded ? <ChevronUp size={16} className="text-text-secondary/50" /> : <ChevronDown size={16} className="text-text-secondary/50" />}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4 animate-fade-in">
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
            <p className="text-xs text-text-secondary/70 leading-relaxed">
              <strong className="text-amber-400">Future Feature:</strong> These parameters define the full training bot personality model.
              Currently, only <strong>Aggression</strong>, <strong>Bluff Frequency</strong>, <strong>Mistake Rate</strong>, and <strong>Reaction Time</strong>
              are implemented. The remaining parameters are documented below as integration targets for future development.
            </p>
          </div>

          {/* Integration points */}
          <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-3">
            <p className="text-[10px] text-purple-300/70 font-bold uppercase tracking-wider mb-1">Integration Points</p>
            <div className="text-xs text-text-secondary/60 space-y-1 font-mono">
              <p>• <code className="text-purple-300/80">src/utils/botEngine.ts</code> — <code>BotSettings</code> interface and <code>botDecision()</code></p>
              <p>• <code className="text-purple-300/80">src/store/gameStore.ts</code> — <code>trainingBotSettings</code> state + persistence</p>
              <p>• <code className="text-purple-300/80">src/components/SettingsPanel.tsx</code> — UI controls for each parameter</p>
            </div>
          </div>

          {/* Parameters by category */}
          {(['core', 'behavior', 'timing', 'advanced'] as BotParamDef['category'][]).map(cat => {
            const params = FUTURE_BOT_PARAMS.filter(p => p.category === cat);
            return (
              <div key={cat}>
                <h4 className="text-xs font-bold text-text-secondary/50 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${cat === 'core' ? 'bg-cyan-500' : cat === 'behavior' ? 'bg-amber-500' : cat === 'timing' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                  {CATEGORY_LABELS[cat]}
                </h4>
                <div className={`rounded-xl border ${CATEGORY_COLORS[cat]} overflow-hidden`}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left p-2 text-text-secondary/40 font-semibold">Parameter</th>
                        <th className="text-left p-2 text-text-secondary/40 font-semibold hidden sm:table-cell">Description</th>
                        <th className="text-center p-2 text-text-secondary/40 font-semibold">Range</th>
                        <th className="text-center p-2 text-text-secondary/40 font-semibold">Default</th>
                        <th className="text-center p-2 text-text-secondary/40 font-semibold w-16">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {params.map(p => {
                        const isImplemented = ['aggressionFactor', 'bluffFrequency', 'mistakeRate', 'reactionTimeMin', 'reactionTimeMax'].includes(p.key);
                        return (
                          <tr key={p.key} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                            <td className="p-2 font-semibold text-text-primary/80">{p.label}</td>
                            <td className="p-2 text-text-secondary/50 hidden sm:table-cell">{p.description}</td>
                            <td className="p-2 text-center font-mono text-text-secondary/60">{p.range}{p.unit ? ` ${p.unit}` : ''}</td>
                            <td className="p-2 text-center font-mono text-text-secondary/60">{p.default}{p.unit ? ` ${p.unit}` : ''}</td>
                            <td className="p-2 text-center">
                              {isImplemented ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 font-bold border border-green-500/20">DONE</span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">TODO</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

AdvancedBotConfig.displayName = 'AdvancedBotConfig';

// ── Export / Import Buttons ──

const ExportSettingsButton: React.FC = React.memo(() => {
  const trainingBotSettings = useGameStore(s => s.trainingBotSettings);
  const botSettings = useGameStore(s => s.botSettings);
  const opponentPersonality = useGameStore(s => s.opponentPersonality);
  const tableSize = useGameStore(s => s.tableSize);
  const buyIn = useGameStore(s => s.buyIn);
  const startingBankroll = useGameStore(s => s.startingBankroll);
  const autoPlaySpeed = useGameStore(s => s.autoPlaySpeed);

  const handleExport = useCallback(() => {
    const config = {
      version: 1,
      exportedAt: new Date().toISOString(),
      trainingBotSettings,
      opponentSettings: botSettings,
      opponentPersonality,
      tableConfig: { tableSize, buyIn, startingBankroll, autoPlaySpeed },
    };
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pokertrainer-settings-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [trainingBotSettings, botSettings, opponentPersonality, tableSize, buyIn, startingBankroll, autoPlaySpeed]);

  return (
    <button onClick={handleExport} className="btn-secondary flex items-center gap-1.5 text-xs">
      <Download size={14} /> Export Config
    </button>
  );
});
ExportSettingsButton.displayName = 'ExportSettingsButton';

const ImportSettingsButton: React.FC = React.memo(() => {
  const updateTrainingBotSettings = useGameStore(s => s.updateTrainingBotSettings);
  const updateBotSettings = useGameStore(s => s.updateBotSettings);
  const setOpponentPersonality = useGameStore(s => s.setOpponentPersonality);
  const setTableSize = useGameStore(s => s.setTableSize);
  const setBuyIn = useGameStore(s => s.setBuyIn);
  const setStartingBankroll = useGameStore(s => s.setStartingBankroll);
  const setAutoPlaySpeed = useGameStore(s => s.setAutoPlaySpeed);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const config = JSON.parse(evt.target?.result as string);
        if (!config.version || !config.trainingBotSettings) {
          throw new Error('Invalid config file format');
        }
        if (config.trainingBotSettings) {
          updateTrainingBotSettings(config.trainingBotSettings);
        }
        if (config.opponentSettings) {
          updateBotSettings(config.opponentSettings);
        }
        if (config.opponentPersonality) {
          setOpponentPersonality(config.opponentPersonality);
        }
        if (config.tableConfig) {
          const tc = config.tableConfig;
          if (tc.tableSize) setTableSize(tc.tableSize);
          if (tc.buyIn) setBuyIn(tc.buyIn);
          if (tc.startingBankroll) setStartingBankroll(tc.startingBankroll);
          if (tc.autoPlaySpeed) setAutoPlaySpeed(tc.autoPlaySpeed);
        }
        setImportStatus('success');
        setStatusMsg('Settings imported successfully!');
        setTimeout(() => setImportStatus('idle'), 3000);
      } catch (err) {
        setImportStatus('error');
        setStatusMsg('Failed to import: invalid file format');
        setTimeout(() => setImportStatus('idle'), 3000);
      }
    };
    reader.readAsText(file);
    // Reset input for re-import of same file
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [updateTrainingBotSettings, updateBotSettings, setOpponentPersonality, setTableSize, setBuyIn, setStartingBankroll, setAutoPlaySpeed]);

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
        id="import-settings-input"
        aria-label="Import settings from JSON file"
      />
      <label htmlFor="import-settings-input" className="btn-secondary flex items-center gap-1.5 text-xs cursor-pointer">
        <Upload size={14} /> Import Config
      </label>
      {importStatus !== 'idle' && (
        <span className={`text-[10px] font-semibold ${importStatus === 'success' ? 'text-green-400' : 'text-red-400'} animate-fade-in`}>
          {statusMsg}
        </span>
      )}
    </div>
  );
});
ImportSettingsButton.displayName = 'ImportSettingsButton';

// ── Backup / Restore Buttons ──

const BACKUP_KEY = 'pokertrainer-settings-backup';

const BackupSettingsButton: React.FC = React.memo(() => {
  const trainingBotSettings = useGameStore(s => s.trainingBotSettings);
  const botSettings = useGameStore(s => s.botSettings);
  const opponentPersonality = useGameStore(s => s.opponentPersonality);
  const tableSize = useGameStore(s => s.tableSize);
  const buyIn = useGameStore(s => s.buyIn);
  const startingBankroll = useGameStore(s => s.startingBankroll);
  const autoPlaySpeed = useGameStore(s => s.autoPlaySpeed);
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');

  const handleBackup = useCallback(() => {
    const config = {
      version: 1,
      backedUpAt: new Date().toISOString(),
      trainingBotSettings,
      opponentSettings: botSettings,
      opponentPersonality,
      tableConfig: { tableSize, buyIn, startingBankroll, autoPlaySpeed },
    };
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(config));
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch { /* noop */ }
  }, [trainingBotSettings, botSettings, opponentPersonality, tableSize, buyIn, startingBankroll, autoPlaySpeed]);

  return (
    <button onClick={handleBackup} className="btn-secondary flex items-center gap-1.5 text-xs">
      {status === 'saved' ? <CheckCircle size={14} className="text-accent-green" /> : <Save size={14} />}
      {status === 'saved' ? 'Saved!' : 'Backup'}
    </button>
  );
});
BackupSettingsButton.displayName = 'BackupSettingsButton';

const RestoreSettingsButton: React.FC = React.memo(() => {
  const updateTrainingBotSettings = useGameStore(s => s.updateTrainingBotSettings);
  const updateBotSettings = useGameStore(s => s.updateBotSettings);
  const setOpponentPersonality = useGameStore(s => s.setOpponentPersonality);
  const setTableSize = useGameStore(s => s.setTableSize);
  const setBuyIn = useGameStore(s => s.setBuyIn);
  const setStartingBankroll = useGameStore(s => s.setStartingBankroll);
  const setAutoPlaySpeed = useGameStore(s => s.setAutoPlaySpeed);
  const [status, setStatus] = useState<'idle' | 'restored' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  const handleRestore = useCallback(() => {
    try {
      const raw = localStorage.getItem(BACKUP_KEY);
      if (!raw) {
        setStatus('error');
        setStatusMsg('No backup found');
        setTimeout(() => setStatus('idle'), 3000);
        return;
      }
      const config = JSON.parse(raw);
      // Validate backup format
      if (!config.version || !config.trainingBotSettings) {
        throw new Error('Invalid backup format');
      }
      // Validate key settings fields
      const ts = config.trainingBotSettings;
      if (typeof ts.aggressionFactor !== 'number' || ts.aggressionFactor < 0 || ts.aggressionFactor > 1) {
        throw new Error('Invalid aggressionFactor in backup');
      }
      if (typeof ts.bluffFrequency !== 'number' || ts.bluffFrequency < 0 || ts.bluffFrequency > 1) {
        throw new Error('Invalid bluffFrequency in backup');
      }
      if (typeof ts.mistakeRate !== 'number' || ts.mistakeRate < 0 || ts.mistakeRate > 1) {
        throw new Error('Invalid mistakeRate in backup');
      }
      if (config.trainingBotSettings) updateTrainingBotSettings(config.trainingBotSettings);
      if (config.opponentSettings) updateBotSettings(config.opponentSettings);
      if (config.opponentPersonality) setOpponentPersonality(config.opponentPersonality);
      if (config.tableConfig) {
        const tc = config.tableConfig;
        if (tc.tableSize) setTableSize(tc.tableSize);
        if (tc.buyIn) setBuyIn(tc.buyIn);
        if (tc.startingBankroll) setStartingBankroll(tc.startingBankroll);
        if (tc.autoPlaySpeed) setAutoPlaySpeed(tc.autoPlaySpeed);
      }
      setStatus('restored');
      setStatusMsg('Settings restored!');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('error');
      setStatusMsg(err instanceof Error ? err.message : 'Failed to restore');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, [updateTrainingBotSettings, updateBotSettings, setOpponentPersonality, setTableSize, setBuyIn, setStartingBankroll, setAutoPlaySpeed]);

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleRestore} className="btn-secondary flex items-center gap-1.5 text-xs">
        <FolderOpen size={14} /> Restore Backup
      </button>
      {status !== 'idle' && (
        <span className={`text-[10px] font-semibold ${status === 'restored' ? 'text-green-400' : 'text-red-400'} animate-fade-in`}>
          {statusMsg}
        </span>
      )}
    </div>
  );
});
RestoreSettingsButton.displayName = 'RestoreSettingsButton';

// ── Game Data Export / Import ──

const GameDataExportButton: React.FC = React.memo(() => {
  const [status, setStatus] = useState<'idle' | 'exported'>('idle');

  const handleExport = useCallback(() => {
    const result = exportData();
    if (result) {
      setStatus('exported');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, []);

  return (
    <button onClick={handleExport} className="btn-secondary flex items-center gap-1.5 text-xs">
      {status === 'exported' ? <CheckCircle size={14} className="text-accent-green" /> : <FileJson size={14} />}
      {status === 'exported' ? 'Downloaded!' : 'Export All Data'}
    </button>
  );
});
GameDataExportButton.displayName = 'GameDataExportButton';

const GameDataImportButton: React.FC = React.memo(() => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result: ImportResult = await importData(file);
    if (result.success) {
      setStatus('success');
      setStatusMsg(`Imported! ${result.summary?.totalHands ?? 0} hands, bankroll $${result.summary?.currentBankroll ?? 0}`);
      // Reload to apply imported data
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setStatus('error');
      setStatusMsg(result.error || 'Import failed');
    }
    setTimeout(() => setStatus('idle'), 4000);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
        id="import-data-input"
        aria-label="Import game data from JSON backup file"
      />
      <label htmlFor="import-data-input" className="btn-secondary flex items-center gap-1.5 text-xs cursor-pointer">
        <Upload size={14} /> Import Data
      </label>
      {status !== 'idle' && (
        <span className={`text-[10px] font-semibold ${status === 'success' ? 'text-green-400' : 'text-red-400'} animate-fade-in`}>
          {statusMsg}
        </span>
      )}
    </div>
  );
});
GameDataImportButton.displayName = 'GameDataImportButton';

const AutoBackupInfo: React.FC = React.memo(() => {
  const backupAge = getAutoBackupAge();
  const usage = checkStorageUsage();

  const formatAge = (ms: number): string => {
    if (ms < 0) return 'No backup';
    if (ms < 60000) return 'Just now';
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  return (
    <div className="space-y-2 text-[10px]">
      <div className="flex items-center justify-between text-text-secondary/50">
        <span className="flex items-center gap-1">
          <Database size={10} />
          Auto-backup:
        </span>
        <span className={backupAge >= 0 && backupAge < 3600000 ? 'text-green-400 font-semibold' : 'text-text-secondary/40'}>
          {formatAge(backupAge)}
        </span>
      </div>
      <div className="flex items-center justify-between text-text-secondary/50">
        <span>Storage:</span>
        <span className={usage.warning ? 'text-accent-yellow font-semibold' : 'text-text-secondary/40'}>
          {usage.percentUsed.toFixed(1)}% used
          {usage.warning && ' ⚠'}
        </span>
      </div>
      {usage.warning && (
        <p className="text-accent-yellow/60 text-[9px]">
          Storage almost full. Export your data and clear old data to free space.
        </p>
      )}
    </div>
  );
});
AutoBackupInfo.displayName = 'AutoBackupInfo';

export default SettingsPanel;

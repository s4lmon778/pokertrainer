import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import type { BotPersonality, BotSettings } from '../utils/botEngine';
import { Zap, Shield, AlertTriangle, RefreshCw, Plus, Minus, Bot, FlaskConical, Users } from 'lucide-react';

const SettingsPanel: React.FC = () => {
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

  // ── Slider sub-component ──
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
  }> = ({ label, icon, value, min, max, step = 1, unit = '%', colorClass = 'slider-cyan', onChange }) => {
    const pct = ((value - min) / (max - min)) * 100;
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
            onChange={e => onChange(parseFloat(e.target.value))}
            className={colorClass}
            style={{ '--slider-pct': `${pct}%` } as React.CSSProperties}
          />
          {/* Tick marks */}
          <div className="flex justify-between px-[2px] mt-0.5">
            <span className="text-[9px] text-text-secondary/30 font-mono">{min}{unit}</span>
            <span className="text-[9px] text-text-secondary/30 font-mono">{max}{unit}</span>
          </div>
        </div>
      </div>
    );
  };

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

      {/* Reset */}
      <button onClick={resetStats}
        className="btn-ghost w-full flex items-center justify-center gap-2 text-accent-red border-accent-red/30 hover:bg-accent-red/10 hover:text-accent-red hover:border-accent-red/50">
        <RefreshCw size={14} /> Reset All Statistics
      </button>
    </div>
  );
};

export default SettingsPanel;

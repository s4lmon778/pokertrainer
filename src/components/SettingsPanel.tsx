import { useState, useEffect } from 'react';
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
    if (newCount < 2) return; // min 2 bots (1 training + 1 opponent)
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

  const handleTrainingChange = (key: keyof BotSettings, value: number | string) => {
    updateTrainingBotSettings({ [key]: value as never });
  };

  return (
    <div className="space-y-4">
      {/* Table Setup */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-gold" />
          <span className="font-medium">Table Setup</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Bots (1 Training + opponents)</label>
            <div className="flex items-center gap-1.5">
              <button onClick={() => handleNumBotsChange(-1)} disabled={numBots <= 2}
                className="w-7 h-7 rounded-lg bg-surface border border-surface-border flex items-center justify-center hover:border-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <Minus size={14} />
              </button>
              <span className="text-base font-bold text-gold font-mono w-7 text-center">{numBots}</span>
              <button onClick={() => handleNumBotsChange(1)} disabled={numBots >= 8}
                className="w-7 h-7 rounded-lg bg-surface border border-surface-border flex items-center justify-center hover:border-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <Plus size={14} />
              </button>
              <span className="text-[10px] text-text-secondary/50">({numBots + 1}p)</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Buy-In</label>
            <select value={buyIn} onChange={e => setBuyIn(parseInt(e.target.value))} className="input-field">
              {[25, 50, 100, 200, 500, 1000].map(n => (<option key={n} value={n}>${n}</option>))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Starting Bankroll</label>
            <select value={startingBankroll} onChange={e => setStartingBankroll(parseInt(e.target.value))} className="input-field">
              {[100, 250, 500, 1000, 2000, 5000].map(n => (<option key={n} value={n}>${n}</option>))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Auto-Play Speed</label>
            <select value={autoPlaySpeed} onChange={e => setAutoPlaySpeed(parseInt(e.target.value))} className="input-field">
              <option value={150}>Very Fast (150ms)</option>
              <option value={400}>Normal (400ms)</option>
              <option value={800}>Slow (800ms)</option>
              <option value={1500}>Very Slow (1.5s)</option>
            </select>
          </div>
          <div className="flex items-end justify-between pb-2">
            <label className="text-xs text-text-secondary">Reveal bot cards at end</label>
            <button onClick={toggleShowCardsAtEnd}
              className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${showCardsAtEnd ? 'bg-gold' : 'bg-surface-border'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${showCardsAtEnd ? 'left-5' : 'left-0.5'}`} />
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
          <span className="font-bold text-cyan-400">Training Bot</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold uppercase">T-Bot</span>
        </div>
        <p className="text-xs text-text-secondary mb-3">
          This is your bot. Adjust its settings, test it on the table, track its performance.
        </p>

        {/* Personality Presets */}
        <div className="mb-3">
          <label className="text-xs text-text-secondary mb-1.5 block">Personality Preset</label>
          <div className="grid grid-cols-2 gap-1.5">
            {personalities.map(p => (
              <button
                key={p.value}
                onClick={() => setTrainingPersonality(p.value)}
                className={`p-2 rounded-lg border text-left transition-all ${
                  trainingPersonality === p.value
                    ? 'border-cyan-400 bg-cyan-400/10'
                    : 'border-surface-border hover:border-surface-elevated'
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
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-text-secondary flex items-center gap-1"><Zap size={12} className="text-accent-yellow" /> Aggression</span>
              <span className="text-cyan-400 font-mono text-xs">{(trainingBotSettings.aggressionFactor * 100).toFixed(0)}%</span>
            </div>
            <input type="range" min={0} max={100} value={trainingBotSettings.aggressionFactor * 100}
              onChange={e => handleTrainingChange('aggressionFactor', parseInt(e.target.value) / 100)}
              className="w-full h-1.5 bg-surface-border rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-cyan-400 accent-cyan-400" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-text-secondary flex items-center gap-1"><Shield size={12} className="text-accent-blue" /> Bluff Freq</span>
              <span className="text-cyan-400 font-mono text-xs">{(trainingBotSettings.bluffFrequency * 100).toFixed(0)}%</span>
            </div>
            <input type="range" min={0} max={30} value={trainingBotSettings.bluffFrequency * 100}
              onChange={e => handleTrainingChange('bluffFrequency', parseInt(e.target.value) / 100)}
              className="w-full h-1.5 bg-surface-border rounded-full appearance-none cursor-pointer accent-cyan-400" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-text-secondary flex items-center gap-1"><AlertTriangle size={12} className="text-accent-red" /> Mistake Rate</span>
              <span className="text-cyan-400 font-mono text-xs">{(trainingBotSettings.mistakeRate * 100).toFixed(0)}%</span>
            </div>
            <input type="range" min={0} max={10} value={trainingBotSettings.mistakeRate * 100}
              onChange={e => handleTrainingChange('mistakeRate', parseInt(e.target.value) / 100)}
              className="w-full h-1.5 bg-surface-border rounded-full appearance-none cursor-pointer accent-cyan-400" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-text-secondary">Min Reaction (s)</label>
              <input type="number" min={0.1} max={5} step={0.1} value={trainingBotSettings.reactionTimeMin}
                onChange={e => handleTrainingChange('reactionTimeMin', parseFloat(e.target.value))}
                className="input-field mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs text-text-secondary">Max Reaction (s)</label>
              <input type="number" min={0.5} max={10} step={0.1} value={trainingBotSettings.reactionTimeMax}
                onChange={e => handleTrainingChange('reactionTimeMax', parseFloat(e.target.value))}
                className="input-field mt-1 text-sm" />
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
          <span className="font-bold">Opponent Bots</span>
          <span className="text-[10px] text-text-secondary">({numBots - 1} opponents)</span>
        </div>
        <p className="text-xs text-text-secondary mb-3">
          These are the AI opponents your training bot plays against. Choose a personality preset.
        </p>

        <div className="mb-3">
          <label className="text-xs text-text-secondary mb-1.5 block">Opponent Personality</label>
          <div className="grid grid-cols-2 gap-1.5">
            {personalities.map(p => (
              <button
                key={p.value}
                onClick={() => setOpponentPersonality(p.value)}
                className={`p-2 rounded-lg border text-left transition-all ${
                  opponentPersonality === p.value
                    ? 'border-gold bg-gold/10'
                    : 'border-surface-border hover:border-surface-elevated'
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
          <div className="bg-surface rounded-lg p-2">
            <div className="text-[10px] text-text-secondary">Aggression</div>
            <div className="text-gold font-mono text-sm font-bold">{(botSettings.aggressionFactor * 100).toFixed(0)}%</div>
          </div>
          <div className="bg-surface rounded-lg p-2">
            <div className="text-[10px] text-text-secondary">Bluff</div>
            <div className="text-gold font-mono text-sm font-bold">{(botSettings.bluffFrequency * 100).toFixed(0)}%</div>
          </div>
          <div className="bg-surface rounded-lg p-2">
            <div className="text-[10px] text-text-secondary">Mistakes</div>
            <div className="text-gold font-mono text-sm font-bold">{(botSettings.mistakeRate * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>
      </div>

      {/* Reset */}
      <button onClick={resetStats} className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
        <RefreshCw size={14} /> Reset All Statistics
      </button>
    </div>
  );
};

export default SettingsPanel;

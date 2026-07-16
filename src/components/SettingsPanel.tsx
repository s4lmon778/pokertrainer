import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import type { BotPersonality, BotSettings } from '../utils/botEngine';
import { Zap, Shield, AlertTriangle, RefreshCw, Plus, Minus, Bot, FlaskConical, Users, Wrench, ChevronDown, ChevronUp } from 'lucide-react';

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

      {/* ===== TRAINING BOT ADVANCED CONFIG (STUBBED) ===== */}
      <AdvancedBotConfig />

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

export default SettingsPanel;

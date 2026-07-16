/**
 * Training Bot Settings Component
 * 
 * UI for configuring the Training Bot's behavior.
 * All settings are saved to localStorage and persisted across sessions.
 * 
 * Future Desktop Integration:
 * - Settings will be saved as JSON config files
 * - Presets will be loadable from external files
 * - Settings will be shared with the poker engine for decision making
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { DEFAULT_TRAINING_CONFIG, TRAINING_PRESETS, type TrainingBotConfig } from '../engine/trainingBot';
import { Settings, Save, RotateCcw, Play, Sliders, TrendingUp, Brain, Shield, Zap, AlertTriangle, Users, BarChart3, Eye } from 'lucide-react';

const TrainingBotSettings: React.FC = () => {
  const trainingBotConfig = useGameStore(s => s.trainingBotConfig);
  const updateTrainingBotConfig = useGameStore(s => s.updateTrainingBotConfig);
  const [localConfig, setLocalConfig] = useState<TrainingBotConfig>(trainingBotConfig);
  const [activeTab, setActiveTab] = useState<'general' | 'aggression' | 'bluffing' | 'postflop' | 'humanization' | 'tilt' | 'adaptation'>('general');
  const [preset, setPreset] = useState<string>('balanced');

  // Sync with store
  useEffect(() => {
    setLocalConfig(trainingBotConfig);
  }, [trainingBotConfig]);

  // Save to localStorage
  const handleSave = useCallback(() => {
    localStorage.setItem('trainingBotConfig', JSON.stringify(localConfig));
    updateTrainingBotConfig(localConfig);
  }, [localConfig, updateTrainingBotConfig]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    setLocalConfig(DEFAULT_TRAINING_CONFIG);
    setPreset('balanced');
  }, []);

  // Apply preset
  const applyPreset = useCallback((presetName: string) => {
    const presetConfig = TRAINING_PRESETS[presetName];
    if (presetConfig) {
      setLocalConfig(prev => ({ ...prev, ...presetConfig }));
      setPreset(presetName);
    }
  }, []);

  // Update a single config value
  const updateConfig = useCallback(<K extends keyof TrainingBotConfig>(key: K, value: TrainingBotConfig[K]) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className="bg-surface rounded-2xl border border-white/10 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-gold" />
          <h2 className="text-xl font-bold text-text-primary">Training Bot Settings</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} className="btn-primary flex items-center gap-2">
            <Save size={16} />
            Save
          </button>
          <button onClick={handleReset} className="btn-secondary flex items-center gap-2">
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Quick Presets</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.keys(TRAINING_PRESETS).map(name => (
            <button
              key={name}
              onClick={() => applyPreset(name)}
              className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                preset === name 
                  ? 'bg-gold/20 border-gold text-gold border' 
                  : 'bg-white/5 border-white/10 text-text-secondary border hover:bg-white/10'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-white/10">
        {[
          { id: 'general', label: 'General', icon: Settings },
          { id: 'aggression', label: 'Aggression', icon: Zap },
          { id: 'bluffing', label: 'Bluffing', icon: Eye },
          { id: 'postflop', label: 'Postflop', icon: BarChart3 },
          { id: 'humanization', label: 'Humanization', icon: Users },
          { id: 'tilt', label: 'Tilt', icon: AlertTriangle },
          { id: 'adaptation', label: 'Adaptation', icon: TrendingUp },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-gold text-gold'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'general' && (
          <div className="space-y-4">
            <SettingSlider
              label="Skill Level"
              description="Overall skill level (1-100)"
              value={localConfig.skillLevel}
              min={1}
              max={100}
              onChange={(v) => updateConfig('skillLevel', v)}
            />
            <SettingSlider
              label="Starting Hand Range"
              description="How many hands the bot plays preflop (0-1)"
              value={localConfig.startingHandRange}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateConfig('startingHandRange', v)}
            />
            <SettingSlider
              label="Preflop Open Size"
              description="Multiplier for preflop raises (0.5-5.0)"
              value={localConfig.preflopOpenSize}
              min={0.5}
              max={5}
              step={0.1}
              onChange={(v) => updateConfig('preflopOpenSize', v)}
            />
          </div>
        )}

        {activeTab === 'aggression' && (
          <div className="space-y-4">
            <SettingSlider
              label="Aggression Factor"
              description="How often the bot bets/raises (0-1)"
              value={localConfig.aggression}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateConfig('aggression', v)}
            />
            <SettingSlider
              label="Continuation Bet Frequency"
              description="How often the bot c-bets when preflop aggressor (0-1)"
              value={localConfig.continuationBetFrequency}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateConfig('continuationBetFrequency', v)}
            />
            <SettingSlider
              label="3-Bet Frequency"
              description="How often the bot 3-bets preflop (0-1)"
              value={localConfig.threeBetFrequency}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateConfig('threeBetFrequency', v)}
            />
            <SettingSlider
              label="Risk Tolerance"
              description="Willingness to take risky plays (0-1)"
              value={localConfig.riskTolerance}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateConfig('riskTolerance', v)}
            />
          </div>
        )}

        {activeTab === 'bluffing' && (
          <div className="space-y-4">
            <SettingSlider
              label="Overall Bluff Frequency"
              description="Base bluff frequency (0-1)"
              value={localConfig.bluffFrequency}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateConfig('bluffFrequency', v)}
            />
            <SettingSlider
              label="River Bluff Frequency"
              description="Bluff frequency on the river (0-1)"
              value={localConfig.bluffRiverFrequency}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateConfig('bluffRiverFrequency', v)}
            />
            <SettingSlider
              label="Float Frequency"
              description="How often the bot floats (calls to bluff on later streets) (0-1)"
              value={localConfig.floatFrequency}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateConfig('floatFrequency', v)}
            />
            <SettingSlider
              label="Bluff Catch Frequency"
              description="How often the bot calls with weak hands expecting bluffs (0-1)"
              value={localConfig.bluffCatchFrequency}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateConfig('bluffCatchFrequency', v)}
            />
          </div>
        )}

        {activeTab === 'postflop' && (
          <div className="space-y-4">
            <SettingSlider
              label="Check-Raise Frequency"
              description="How often the bot check-raises (0-1)"
              value={localConfig.checkRaiseFrequency}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateConfig('checkRaiseFrequency', v)}
            />
            <SettingSlider
              label="Position Awareness"
              description="How much position influences decisions (0-1)"
              value={localConfig.positionAwareness}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateConfig('positionAwareness', v)}
            />
            <SettingSlider
              label="Position Bet Sizing"
              description="How much position influences bet sizing (0-1)"
              value={localConfig.positionBetSizing}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateConfig('positionBetSizing', v)}
            />
          </div>
        )}

        {activeTab === 'humanization' && (
          <div className="space-y-4">
            <SettingSlider
              label="Reaction Time Min (ms)"
              description="Minimum reaction time"
              value={localConfig.reactionTimeMin}
              min={200}
              max={5000}
              step={50}
              onChange={(v) => updateConfig('reactionTimeMin', v)}
            />
            <SettingSlider
              label="Reaction Time Max (ms)"
              description="Maximum reaction time"
              value={localConfig.reactionTimeMax}
              min={500}
              max={8000}
              step={50}
              onChange={(v) => updateConfig('reactionTimeMax', v)}
            />
            <SettingSlider
              label="Randomization"
              description="How much the bot varies otherwise identical decisions (0-1)"
              value={localConfig.randomization}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateConfig('randomization', v)}
            />
            <SettingToggle
              label="Simulate Thinking"
              description="Add pauses on complex decisions"
              value={localConfig.simulateThinking}
              onChange={(v) => updateConfig('simulateThinking', v)}
            />
          </div>
        )}

        {activeTab === 'tilt' && (
          <div className="space-y-4">
            <SettingSlider
              label="Tilt Threshold"
              description="Bad beats before tilt activates"
              value={localConfig.tiltThreshold}
              min={1}
              max={20}
              step={1}
              onChange={(v) => updateConfig('tiltThreshold', v)}
            />
            <SettingSlider
              label="Tilt Aggression Multiplier"
              description="How aggressive the bot gets when tilted"
              value={localConfig.tiltAggressionMultiplier}
              min={1}
              max={3}
              step={0.1}
              onChange={(v) => updateConfig('tiltAggressionMultiplier', v)}
            />
            <SettingSlider
              label="Tilt Recovery Rate"
              description="How quickly the bot recovers from tilt (0-1)"
              value={localConfig.tiltRecoveryRate}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateConfig('tiltRecoveryRate', v)}
            />
          </div>
        )}

        {activeTab === 'adaptation' && (
          <div className="space-y-4">
            <SettingSlider
              label="Adaptation Speed"
              description="How quickly the bot adapts to opponent patterns (0-1)"
              value={localConfig.adaptationSpeed}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateConfig('adaptationSpeed', v)}
            />
            <SettingSlider
              label="Observation Hands"
              description="Hands needed before adaptation begins"
              value={localConfig.observationHands}
              min={5}
              max={200}
              step={5}
              onChange={(v) => updateConfig('observationHands', v)}
            />
            <SettingSlider
              label="GTO Deviation"
              description="How much the bot deviates from GTO (0-1)"
              value={localConfig.gtoDeviation}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateConfig('gtoDeviation', v)}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-white/10">
        <p className="text-xs text-text-secondary/60">
          Settings are saved to localStorage. Changes apply to the next hand played.
          <br />
          <span className="text-gold/60">Future: Settings will be shared with the standalone Training Bot desktop app.</span>
        </p>
      </div>
    </div>
  );
};

// ── Sub-components ──

interface SettingSliderProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

const SettingSlider: React.FC<SettingSliderProps> = ({ label, description, value, min, max, step = 1, onChange }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium text-text-primary">{label}</label>
      <span className="text-sm font-mono text-gold">{typeof step === 'number' && step < 1 ? value.toFixed(2) : value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="w-full slider-gold"
    />
    <p className="text-xs text-text-secondary/60">{description}</p>
  </div>
);

interface SettingToggleProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

const SettingToggle: React.FC<SettingToggleProps> = ({ label, description, value, onChange }) => (
  <div className="flex items-center justify-between">
    <div>
      <label className="text-sm font-medium text-text-primary">{label}</label>
      <p className="text-xs text-text-secondary/60">{description}</p>
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-colors ${value ? 'bg-gold' : 'bg-white/20'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

export default TrainingBotSettings;

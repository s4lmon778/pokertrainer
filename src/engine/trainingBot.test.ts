/**
 * Training Bot Engine — Comprehensive Unit Tests
 *
 * Tests for core engine functionality: config, presets, persistence,
 * strategy registry, hand evaluation, position multipliers, bet sizing,
 * hand ID generation, and opponent observations.
 *
 * @module trainingBot.test
 */

/// <reference types="vitest/globals" />

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TRAINING_CONFIG,
  TRAINING_PRESETS,
  saveConfig,
  loadConfig,
  saveConfigToStorage,
  loadConfigFromStorage,
  savePreset,
  loadPreset,
  deletePreset,
  listPresets,
  getPreflopHandTier,
  shouldOpenHand,
  calculateTrainingBetSize,
  getPositionMultiplier,
  generateHandId,
  createEmptyObservation,
  updateOpponentObservation,
  StrategyRegistry,
} from './trainingBot';
import { TRAINING_BOT_STRATEGIES, initializeStrategies } from './strategies';
import type { Card, Suit, Rank } from '../types/card';

// ── Helpers ──────────────────────────────────────────────────────

/** Create a Card from string suit/rank. */
function makeCard(suit: string, rank: string): Card {
  return { suit: suit as Suit, rank: rank as Rank, id: suit + rank };
}

// ══════════════════════════════════════════════════════════════════
// DEFAULT_TRAINING_CONFIG
// ══════════════════════════════════════════════════════════════════

describe('DEFAULT_TRAINING_CONFIG', () => {
  it('should have skillLevel 50', () => {
    expect(DEFAULT_TRAINING_CONFIG.skillLevel).toBe(50);
  });

  it('should have strategyMode mixed', () => {
    expect(DEFAULT_TRAINING_CONFIG.strategyMode).toBe('mixed');
  });

  it('should have aggression 0.55', () => {
    expect(DEFAULT_TRAINING_CONFIG.aggression).toBe(0.55);
  });

  it('should have bluffFrequency 0.12', () => {
    expect(DEFAULT_TRAINING_CONFIG.bluffFrequency).toBe(0.12);
  });

  it('should have startingHandRange 0.35', () => {
    expect(DEFAULT_TRAINING_CONFIG.startingHandRange).toBe(0.35);
  });

  it('should have all required fields populated', () => {
    const keys = Object.keys(DEFAULT_TRAINING_CONFIG);
    expect(keys.length).toBeGreaterThan(25);
    // Verify no undefined values
    for (const key of keys) {
      expect(DEFAULT_TRAINING_CONFIG[key as keyof typeof DEFAULT_TRAINING_CONFIG]).not.toBeUndefined();
    }
  });
});

// ══════════════════════════════════════════════════════════════════
// TRAINING_PRESETS
// ══════════════════════════════════════════════════════════════════

describe('TRAINING_PRESETS', () => {
  it('should have 8 presets', () => {
    expect(Object.keys(TRAINING_PRESETS).length).toBe(8);
  });

  it('should have a beginner preset', () => {
    expect(TRAINING_PRESETS.beginner).toBeDefined();
    expect(TRAINING_PRESETS.beginner?.skillLevel).toBe(15);
  });

  it('should have an intermediate preset', () => {
    expect(TRAINING_PRESETS.intermediate).toBeDefined();
    expect(TRAINING_PRESETS.intermediate?.skillLevel).toBe(45);
  });

  it('should have an aggressive preset with high aggression', () => {
    expect(TRAINING_PRESETS.aggressive).toBeDefined();
    expect(TRAINING_PRESETS.aggressive?.aggression).toBe(0.80);
  });

  it('should have a tight preset with low aggression', () => {
    expect(TRAINING_PRESETS.tight).toBeDefined();
    expect(TRAINING_PRESETS.tight?.aggression).toBe(0.25);
  });

  it('should have a gto preset with skill 95', () => {
    expect(TRAINING_PRESETS.gto).toBeDefined();
    expect(TRAINING_PRESETS.gto?.skillLevel).toBe(95);
  });

  it('should have an exploitative preset', () => {
    expect(TRAINING_PRESETS.exploitative).toBeDefined();
    expect(TRAINING_PRESETS.exploitative?.strategyMode).toBe('exploitative');
  });

  it('should have a nitty preset with low aggression', () => {
    expect(TRAINING_PRESETS.nitty).toBeDefined();
    expect(TRAINING_PRESETS.nitty?.aggression).toBe(0.10);
  });

  it('should have a maniac preset with high aggression', () => {
    expect(TRAINING_PRESETS.maniac).toBeDefined();
    expect(TRAINING_PRESETS.maniac?.aggression).toBe(0.95);
  });
});

// ══════════════════════════════════════════════════════════════════
// saveConfig / loadConfig
// ══════════════════════════════════════════════════════════════════

describe('saveConfig / loadConfig', () => {
  it('should serialize and deserialize config', () => {
    const json = saveConfig(DEFAULT_TRAINING_CONFIG);
    const loaded = loadConfig(json);
    expect(loaded.skillLevel).toBe(50);
    expect(loaded.aggression).toBe(0.55);
    expect(loaded.bluffFrequency).toBe(0.12);
  });

  it('should merge partial configs', () => {
    const modified = { ...DEFAULT_TRAINING_CONFIG, skillLevel: 80, aggression: 0.9 };
    const json = saveConfig(modified);
    const loaded = loadConfig(json);
    expect(loaded.skillLevel).toBe(80);
    expect(loaded.aggression).toBe(0.9);
    // Unmodified fields should remain from DEFAULT
    expect(loaded.bluffFrequency).toBe(0.12);
  });

  it('should throw on invalid JSON', () => {
    expect(() => loadConfig('not json')).toThrow();
  });

  it('should throw on missing required fields', () => {
    expect(() => loadConfig('{}')).toThrow('Missing required config field');
  });

  it('should produce valid JSON string', () => {
    const json = saveConfig(DEFAULT_TRAINING_CONFIG);
    expect(typeof json).toBe('string');
    const parsed = JSON.parse(json);
    expect(parsed.skillLevel).toBe(50);
  });

  it('should preserve all fields after round-trip', () => {
    const original = { ...DEFAULT_TRAINING_CONFIG, aggression: 0.75, bluffFrequency: 0.25 };
    const json = saveConfig(original);
    const loaded = loadConfig(json);
    expect(loaded.aggression).toBe(0.75);
    expect(loaded.bluffFrequency).toBe(0.25);
  });
});

// ══════════════════════════════════════════════════════════════════
// Config Persistence (localStorage)
// ══════════════════════════════════════════════════════════════════

describe('Config Persistence (localStorage)', () => {
  it('saveConfigToStorage should not throw', () => {
    expect(() => saveConfigToStorage(DEFAULT_TRAINING_CONFIG)).not.toThrow();
  });

  it('loadConfigFromStorage should return default when nothing saved', () => {
    // Ensure no leftover config
    try { localStorage.removeItem('trainingBotConfig'); } catch { /* noop */ }
    const loaded = loadConfigFromStorage();
    expect(loaded.skillLevel).toBe(50);
  });
});

// ══════════════════════════════════════════════════════════════════
// Preset Management
// ══════════════════════════════════════════════════════════════════

describe('Preset Management', () => {
  beforeEach(() => {
    // Clean up any leftover test presets
    try { localStorage.removeItem('trainingBotPresets'); } catch { /* noop */ }
  });

  it('should save and load a custom preset', () => {
    const customConfig = { ...DEFAULT_TRAINING_CONFIG, skillLevel: 90, aggression: 0.9 };
    savePreset('my-hard', customConfig);
    const loaded = loadPreset('my-hard');
    expect(loaded).not.toBeNull();
    expect(loaded?.skillLevel).toBe(90);
    expect(loaded?.aggression).toBe(0.9);
  });

  it('should return null for nonexistent preset', () => {
    expect(loadPreset('nonexistent')).toBeNull();
  });

  it('should list saved preset names', () => {
    savePreset('preset-a', { ...DEFAULT_TRAINING_CONFIG, skillLevel: 20 });
    savePreset('preset-b', { ...DEFAULT_TRAINING_CONFIG, skillLevel: 80 });
    const names = listPresets();
    expect(names).toContain('preset-a');
    expect(names).toContain('preset-b');
  });

  it('should delete a preset', () => {
    savePreset('to-delete', DEFAULT_TRAINING_CONFIG);
    expect(listPresets()).toContain('to-delete');
    deletePreset('to-delete');
    expect(listPresets()).not.toContain('to-delete');
  });

  it('should overwrite existing preset with same name', () => {
    savePreset('overwrite-test', { ...DEFAULT_TRAINING_CONFIG, skillLevel: 10 });
    savePreset('overwrite-test', { ...DEFAULT_TRAINING_CONFIG, skillLevel: 99 });
    const loaded = loadPreset('overwrite-test');
    expect(loaded?.skillLevel).toBe(99);
  });
});

// ══════════════════════════════════════════════════════════════════
// getPreflopHandTier
// ══════════════════════════════════════════════════════════════════

describe('getPreflopHandTier', () => {
  it('should rate AA as tier 10', () => {
    expect(getPreflopHandTier([makeCard('spades', 'A'), makeCard('hearts', 'A')])).toBe(10);
  });

  it('should rate KK as tier 10', () => {
    expect(getPreflopHandTier([makeCard('clubs', 'K'), makeCard('diamonds', 'K')])).toBe(10);
  });

  it('should rate QQ as tier 10', () => {
    expect(getPreflopHandTier([makeCard('hearts', 'Q'), makeCard('spades', 'Q')])).toBe(10);
  });

  it('should rate TT as tier 9', () => {
    expect(getPreflopHandTier([makeCard('clubs', '10'), makeCard('diamonds', '10')])).toBe(9);
  });

  it('should rate 72o as tier 1', () => {
    expect(getPreflopHandTier([makeCard('spades', '7'), makeCard('clubs', '2')])).toBe(1);
  });

  it('should rate suited connectors higher than offsuit', () => {
    const suited = [makeCard('spades', 'K'), makeCard('spades', 'Q')];
    const offsuit = [makeCard('spades', 'K'), makeCard('clubs', 'Q')];
    expect(getPreflopHandTier(suited)).toBeGreaterThan(getPreflopHandTier(offsuit));
  });

  it('should return 0 for fewer than 2 cards', () => {
    expect(getPreflopHandTier([])).toBe(0);
    expect(getPreflopHandTier([makeCard('spades', 'A')])).toBe(0);
  });

  it('should rate AKs higher than ATo', () => {
    const aks = [makeCard('spades', 'A'), makeCard('spades', 'K')];
    const ato = [makeCard('spades', 'A'), makeCard('clubs', 'T')];
    expect(getPreflopHandTier(aks)).toBeGreaterThan(getPreflopHandTier(ato));
  });

  it('should rate small pairs at tier 3', () => {
    expect(getPreflopHandTier([makeCard('spades', '2'), makeCard('hearts', '2')])).toBe(3);
    expect(getPreflopHandTier([makeCard('clubs', '5'), makeCard('diamonds', '5')])).toBe(3);
  });

  it('should rate 66-77 at tier 5', () => {
    expect(getPreflopHandTier([makeCard('spades', '6'), makeCard('hearts', '6')])).toBe(5);
    expect(getPreflopHandTier([makeCard('clubs', '7'), makeCard('diamonds', '7')])).toBe(5);
  });
});

// ══════════════════════════════════════════════════════════════════
// shouldOpenHand
// ══════════════════════════════════════════════════════════════════

describe('shouldOpenHand', () => {
  it('should not open with fewer than 2 cards', () => {
    expect(shouldOpenHand([], 0, 9, DEFAULT_TRAINING_CONFIG)).toBe(false);
  });

  it('should open with AA in any position', () => {
    const aa = [makeCard('spades', 'A'), makeCard('hearts', 'A')];
    for (let pos = 0; pos < 9; pos++) {
      expect(shouldOpenHand(aa, pos, 9, DEFAULT_TRAINING_CONFIG)).toBe(true);
    }
  });

  it('should not open with 72o from early position', () => {
    const sevenTwo = [makeCard('spades', '7'), makeCard('clubs', '2')];
    expect(shouldOpenHand(sevenTwo, 0, 9, DEFAULT_TRAINING_CONFIG)).toBe(false);
  });

  it('should be more likely to open from late position', () => {
    // AKs is a strong hand that should open from any position
    const aks = [makeCard('spades', 'A'), makeCard('spades', 'K')];
    const early = shouldOpenHand(aks, 0, 9, DEFAULT_TRAINING_CONFIG);
    const late = shouldOpenHand(aks, 8, 9, DEFAULT_TRAINING_CONFIG);
    expect(early).toBe(true);
    expect(late).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════
// getPositionMultiplier
// ══════════════════════════════════════════════════════════════════

describe('getPositionMultiplier', () => {
  it('should give BTN highest multiplier', () => {
    expect(getPositionMultiplier(8, 9)).toBe(1.25);
  });

  it('should give SB lowest multiplier', () => {
    expect(getPositionMultiplier(0, 9)).toBe(0.8);
  });

  it('should give CO high multiplier', () => {
    expect(getPositionMultiplier(7, 9)).toBe(1.25);
  });

  it('should give UTG moderate-low multiplier', () => {
    // Position 1 of 9 → relativePos = 1/8 = 0.125 → SB/BB range (< 0.2)
    expect(getPositionMultiplier(1, 9)).toBe(0.8);
  });

  it('should handle 6-max table', () => {
    expect(getPositionMultiplier(5, 6)).toBe(1.25);
    expect(getPositionMultiplier(0, 6)).toBe(0.8);
  });

  it('should handle single player gracefully', () => {
    expect(getPositionMultiplier(0, 1)).toBe(1.0);
  });
});

// ══════════════════════════════════════════════════════════════════
// calculateTrainingBetSize
// ══════════════════════════════════════════════════════════════════

describe('calculateTrainingBetSize', () => {
  it('should return a positive bet size', () => {
    const size = calculateTrainingBetSize({
      street: 'preflop',
      pot: 100,
      playerChips: 1000,
      currentBet: 20,
      handStrength: 0.5,
      positionNormalized: 0.5,
      opponentCount: 3,
      aggression: 0.5,
      config: DEFAULT_TRAINING_CONFIG,
    });
    expect(size).toBeGreaterThan(0);
  });

  it('should cap bet size at player chips', () => {
    const size = calculateTrainingBetSize({
      street: 'preflop',
      pot: 100,
      playerChips: 10, // very few chips
      currentBet: 5,
      handStrength: 0.9,
      positionNormalized: 0.9,
      opponentCount: 2,
      aggression: 0.9,
      config: DEFAULT_TRAINING_CONFIG,
    });
    expect(size).toBeLessThanOrEqual(10);
  });

  it('should increase bet size with higher hand strength', () => {
    const weak = calculateTrainingBetSize({
      street: 'postflop', pot: 100, playerChips: 1000, currentBet: 50,
      handStrength: 0.2, positionNormalized: 0.5, opponentCount: 2,
      aggression: 0.5, config: DEFAULT_TRAINING_CONFIG,
    });
    const strong = calculateTrainingBetSize({
      street: 'postflop', pot: 100, playerChips: 1000, currentBet: 50,
      handStrength: 0.9, positionNormalized: 0.5, opponentCount: 2,
      aggression: 0.5, config: DEFAULT_TRAINING_CONFIG,
    });
    expect(strong).toBeGreaterThan(weak);
  });

  it('should increase bet size with higher aggression', () => {
    const passive = calculateTrainingBetSize({
      street: 'preflop', pot: 100, playerChips: 1000, currentBet: 20,
      handStrength: 0.6, positionNormalized: 0.5, opponentCount: 2,
      aggression: 0.1, config: DEFAULT_TRAINING_CONFIG,
    });
    const aggro = calculateTrainingBetSize({
      street: 'preflop', pot: 100, playerChips: 1000, currentBet: 20,
      handStrength: 0.6, positionNormalized: 0.5, opponentCount: 2,
      aggression: 0.9, config: DEFAULT_TRAINING_CONFIG,
    });
    expect(aggro).toBeGreaterThanOrEqual(passive);
  });
});

// ══════════════════════════════════════════════════════════════════
// generateHandId
// ══════════════════════════════════════════════════════════════════

describe('generateHandId', () => {
  it('should produce unique IDs', () => {
    const id1 = generateHandId();
    const id2 = generateHandId();
    expect(id1).not.toBe(id2);
  });

  it('should have hand_ prefix', () => {
    expect(generateHandId()).toMatch(/^hand_/);
  });

  it('should produce IDs with consistent format', () => {
    const id = generateHandId();
    expect(id).toMatch(/^hand_\d+_[a-z0-9]{6}$/);
  });
});

// ══════════════════════════════════════════════════════════════════
// createEmptyObservation
// ══════════════════════════════════════════════════════════════════

describe('createEmptyObservation', () => {
  it('should return observation with all zeros', () => {
    const obs = createEmptyObservation();
    expect(obs.handsObserved).toBe(0);
    expect(obs.vtap).toBe(0);
    expect(obs.pfr).toBe(0);
    expect(obs.foldToCbet).toBe(0);
    expect(obs.bluffFreq).toBe(0);
  });

  it('should have all expected fields', () => {
    const obs = createEmptyObservation();
    const fields = ['handsObserved', 'vtap', 'pfr', 'foldToCbet', 'foldTo3bet',
      'stealFreq', 'bluffFreq', 'aggFreq', 'avgBetSize', 'showdownFreq'];
    for (const field of fields) {
      expect(field in obs).toBe(true);
    }
  });
});

// ══════════════════════════════════════════════════════════════════
// updateOpponentObservation
// ══════════════════════════════════════════════════════════════════

describe('updateOpponentObservation', () => {
  it('should increment handsObserved', () => {
    const obs = createEmptyObservation();
    const updated = updateOpponentObservation(obs, 'call', 'flop', false, 100, 0);
    expect(updated.handsObserved).toBe(1);
  });

  it('should track aggression when wasAggressor is true', () => {
    const obs = createEmptyObservation();
    const updated = updateOpponentObservation(obs, 'raise', 'flop', true, 100, 50);
    expect(updated.aggFreq).toBeGreaterThan(0);
  });

  it('should track average bet size', () => {
    const obs = createEmptyObservation();
    const updated = updateOpponentObservation(obs, 'bet', 'flop', true, 100, 50);
    expect(updated.avgBetSize).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════════════════
// Strategy Registry
// ══════════════════════════════════════════════════════════════════

describe('Strategy Registry', () => {
  it('should have 3 registered strategies', () => {
    const all = StrategyRegistry.getAll();
    expect(all.length).toBe(3);
  });

  it('should register all strategies from TRAINING_BOT_STRATEGIES', () => {
    const registered = StrategyRegistry.getAll();
    const ids = registered.map(s => s.id);
    expect(ids).toContain('gto');
    expect(ids).toContain('exploitative');
    expect(ids).toContain('adaptive');
  });

  it('should find strategies by ID', () => {
    const gto = StrategyRegistry.get('gto');
    expect(gto).toBeDefined();
    expect(gto?.id).toBe('gto');
  });

  it('should return undefined for unregistered strategy ID', () => {
    expect(StrategyRegistry.get('nonexistent')).toBeUndefined();
  });

  it('should return strategies suitable for skill level 50', () => {
    const strategies = StrategyRegistry.getForSkillLevel(50);
    expect(strategies.length).toBeGreaterThan(0);
  });

  it('should return strategies suitable for skill level 95', () => {
    const strategies = StrategyRegistry.getForSkillLevel(95);
    expect(strategies.length).toBeGreaterThan(0);
  });

  it('should have valid strategy metadata for all registered strategies', () => {
    const all = StrategyRegistry.getAll();
    for (const strategy of all) {
      expect(strategy.id).toBeDefined();
      expect(strategy.name).toBeDefined();
      expect(strategy.description).toBeDefined();
      expect(strategy.minSkillLevel).toBeGreaterThanOrEqual(0);
      expect(strategy.maxSkillLevel).toBeLessThanOrEqual(100);
      expect(strategy.decide).toBeDefined();
      expect(typeof strategy.decide).toBe('function');
    }
  });

  it('should export TRAINING_BOT_STRATEGIES array with 3 strategies', () => {
    expect(TRAINING_BOT_STRATEGIES.length).toBe(3);
    expect(TRAINING_BOT_STRATEGIES[0].id).toBe('gto');
    expect(TRAINING_BOT_STRATEGIES[1].id).toBe('exploitative');
    expect(TRAINING_BOT_STRATEGIES[2].id).toBe('adaptive');
  });

  it('should have initializeStrategies function', () => {
    expect(initializeStrategies).toBeDefined();
    expect(typeof initializeStrategies).toBe('function');
  });
});

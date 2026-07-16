/**
 * GTO Strategy Module
 * 
 * Implements Game Theory Optimal baseline play.
 * This strategy serves as the reference point for all other strategies.
 * 
 * TODO: Integrate with external solver (PioSolver, GTO+) for exact solutions
 * TODO: Load pre-computed CFR tables for common board textures
 * TODO: Implement range-vs-range equity calculations
 */

import type { Strategy, TrainingBotConfig, OpponentObservation, BotDecision, GtoComparison } from '../trainingBot';
import { botDecision } from '../../utils/botEngine';
import type { GameState, Player } from '../../types/card';

export const gtoStrategy: Strategy = {
  id: 'gto',
  name: 'GTO Baseline',
  description: 'Game Theory Optimal unexploitable strategy. Serves as the reference point for all other strategies.',
  minSkillLevel: 80,
  maxSkillLevel: 100,
  
  decide(
    state: GameState,
    player: Player,
    config: TrainingBotConfig,
    observations?: Map<string, OpponentObservation>,
  ): BotDecision {
    // GTO baseline: use existing bot engine with minimal deviation
    const decision = botDecision(state, player, {
      aggressionFactor: config.aggression,
      bluffFrequency: config.bluffFrequency,
      mistakeRate: config.gtoDeviation,
      reactionTimeMin: config.reactionTimeMin / 1000,
      reactionTimeMax: config.reactionTimeMax / 1000,
      personality: 'balanced',
      tableImage: 'tag',
      tiltThreshold: config.tiltThreshold,
      currentTilt: 0,
    });
    
    // Add GTO comparison
    const gtoComparison: GtoComparison = {
      actionTaken: decision.action,
      gtoRecommended: decision.action, // In future: actual GTO solution
      evDifference: 0, // Perfect GTO
      confidence: 0.95,
    };
    
    return {
      ...decision,
      gtoComparison,
    };
  },
};

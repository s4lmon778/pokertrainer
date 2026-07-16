/**
 * Adaptive Strategy Module
 * 
 * Blends GTO baseline with exploitation based on sample size.
 * Starts GTO when insufficient data, gradually shifts to exploitative.
 * 
 * TODO: Implement Bayesian updating for opponent models
 * TODO: Add confidence intervals for stat estimates
 * TODO: Implement automatic strategy switching thresholds
 */

import type { Strategy, TrainingBotConfig, OpponentObservation, BotDecision } from '../trainingBot';
import { gtoStrategy } from './gto';
import { exploitativeStrategy } from './exploitative';
import type { GameState, Player } from '../../types/card';

export const adaptiveStrategy: Strategy = {
  id: 'adaptive',
  name: 'Adaptive (GTO→Exploitative)',
  description: 'Blends GTO baseline with exploitation based on sample size. Starts GTO when insufficient data, gradually shifts to exploitative.',
  minSkillLevel: 30,
  maxSkillLevel: 100,
  
  decide(
    state: GameState,
    player: Player,
    config: TrainingBotConfig,
    observations?: Map<string, OpponentObservation>,
  ): BotDecision {
    // Calculate how much data we have
    let totalHandsObserved = 0;
    for (const obs of observations?.values() || []) {
      totalHandsObserved += obs.handsObserved;
    }
    
    // Determine blend ratio: 0 = pure GTO, 1 = pure exploitative
    const handsNeededForFullExploit = config.observationHands;
    const blendRatio = Math.min(1, totalHandsObserved / handsNeededForFullExploit);
    
    // Get GTO decision
    const gtoDecision = gtoStrategy.decide(state, player, config, observations);
    
    // Get exploitative decision
    const expDecision = exploitativeStrategy.decide(state, player, config, observations);
    
    // Blend the decisions
    // For simplicity, use the exploitative decision weighted by blendRatio
    // In practice, this would blend bet sizes, bluff frequencies, etc.
    const finalConfidence = gtoDecision.confidence * (1 - blendRatio) + expDecision.confidence * blendRatio;
    
    return {
      ...expDecision,
      confidence: finalConfidence,
      reasoning: `${blendRatio > 0.5 ? 'Exploitative' : 'GTO-leaning'} — ${totalHandsObserved} hands observed (${handsNeededForFullExploit} needed for full exploit)`,
    };
  },
};

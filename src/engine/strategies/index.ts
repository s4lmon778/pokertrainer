/**
 * Strategy Registry Initializer
 * 
 * Registers all available strategies with the StrategyRegistry.
 * This file should be imported once at application startup.
 * 
 * To add a new strategy:
 * 1. Create the strategy module in src/engine/strategies/
 * 2. Import and register it here
 * 3. Add it to the TRAINING_BOT_STRATEGIES array
 */

import { StrategyRegistry } from '../trainingBot';
import { gtoStrategy } from './gto';
import { exploitativeStrategy } from './exploitative';
import { adaptiveStrategy } from './adaptive';

/**
 * All registered training bot strategies.
 * New strategies should be added here.
 */
export const TRAINING_BOT_STRATEGIES = [
  gtoStrategy,
  exploitativeStrategy,
  adaptiveStrategy,
] as const;

/**
 * Initialize the strategy registry.
 * Call this once at application startup.
 */
export function initializeStrategies(): void {
  for (const strategy of TRAINING_BOT_STRATEGIES) {
    StrategyRegistry.register(strategy);
  }
}

// Auto-initialize on import
initializeStrategies();

import type { Card, GameState, Player } from '../types/card';
import { cardRankValue, isSuited, isConnected } from './deck';
import { evaluateHand } from './handEvaluator';

// ── Type Definitions ──

/**
 * Bot personality archetypes that determine play style.
 *
 * - `tight-aggressive` (TAG): Plays few hands but bets/raises aggressively.
 *   High accuracy, low variance. Preferred for consistent profit.
 * - `loose-aggressive` (LAG): Plays many hands with frequent aggression.
 *   High variance, harder to read. Can win big or lose big.
 * - `tight-passive` (Nit/Rock): Plays very few hands and rarely bets.
 *   Folds often, easy to exploit by aggressive players.
 * - `balanced`: Mix of TAG and LAG — unpredictable, GTO-inspired.
 */
export type BotPersonality = 'tight-aggressive' | 'loose-aggressive' | 'tight-passive' | 'balanced';

/**
 * Configuration for bot decision-making behavior.
 *
 * All probability values are in the range 0–1.
 */
export interface BotSettings {
  /** How often the bot chooses bet/raise over check/call (0–1) */
  aggressionFactor: number;
  /** Probability of pure bluff when equity is low (0–1) */
  bluffFrequency: number;
  /** Probability of intentionally misreading hand strength (0–1) */
  mistakeRate: number;
  /** Minimum simulated reaction time in seconds */
  reactionTimeMin: number;
  /** Maximum simulated reaction time in seconds */
  reactionTimeMax: number;
  /** Current personality preset */
  personality: BotPersonality;
  /** Perceived table image that affects how opponents react */
  tableImage: 'rock' | 'tag' | 'loose' | 'maniac' | 'nit';
  /** Number of bad beats before tilt activates */
  tiltThreshold: number;
  /** Current tilt counter — increases with bad beats */
  currentTilt: number;
}

/**
 * A single decision returned by the bot engine.
 */
export interface BotDecision {
  /** The chosen action */
  action: 'fold' | 'check' | 'call' | 'raise';
  /** Raise amount (only set when action is 'raise') */
  amount?: number;
  /** Confidence in the decision (0–1, higher = more certain) */
  confidence: number;
  /** Human-readable explanation of the decision */
  reasoning: string;
  /** Simulated reaction time in seconds */
  reactionTime: number;
  /** Whether this is a bluff */
  isBluff: boolean;
}

// ── Defaults ──

const DEFAULT_SETTINGS: BotSettings = {
  aggressionFactor: 0.6,
  bluffFrequency: 0.12,
  mistakeRate: 0.02,
  reactionTimeMin: 0.5,
  reactionTimeMax: 3.0,
  personality: 'balanced',
  tableImage: 'tag',
  tiltThreshold: 5,
  currentTilt: 0,
};

// ── Factory Functions ──

/**
 * Create bot settings for the training bot based on a personality archetype.
 *
 * Training bots have more extreme settings to make their behavior more
 * distinct and educational — players can learn to identify patterns.
 *
 * Personality presets:
 * | Archetype        | Aggression | Bluff % | Mistake % | Table Image |
 * |------------------|-----------|---------|-----------|-------------|
 * | tight-aggressive | 0.75      | 15%     | 1%        | TAG         |
 * | loose-aggressive | 0.85      | 25%     | 5%        | Maniac      |
 * | tight-passive    | 0.30      | 5%      | 1%        | Nit         |
 * | balanced         | 0.55      | 12%     | 2%        | TAG         |
 */
export function createBotSettings(personality: BotPersonality): BotSettings {
  const settings = { ...DEFAULT_SETTINGS };
  settings.personality = personality;
  switch (personality) {
    case 'tight-aggressive':
      settings.aggressionFactor = 0.75;
      settings.bluffFrequency = 0.15;
      settings.mistakeRate = 0.01;
      settings.tableImage = 'tag';
      break;
    case 'loose-aggressive':
      settings.aggressionFactor = 0.85;
      settings.bluffFrequency = 0.25;
      settings.mistakeRate = 0.05;
      settings.tableImage = 'maniac';
      break;
    case 'tight-passive':
      settings.aggressionFactor = 0.30;
      settings.bluffFrequency = 0.05;
      settings.mistakeRate = 0.01;
      settings.tableImage = 'nit';
      break;
    case 'balanced':
      settings.aggressionFactor = 0.55;
      settings.bluffFrequency = 0.12;
      settings.mistakeRate = 0.02;
      settings.tableImage = 'tag';
      break;
  }
  return settings;
}

/**
 * Create settings for opponent bots (non-training bots at the table).
 *
 * Opponent settings are more moderate than training bot settings — they play
 * closer to GTO and are less predictable by design, simulating real opponents.
 * Mistake rates are slightly higher to reflect human-like play.
 */
export function createOpponentSettings(personality: BotPersonality): BotSettings {
  const settings = { ...DEFAULT_SETTINGS };
  settings.personality = personality;
  switch (personality) {
    case 'tight-aggressive':
      settings.aggressionFactor = 0.65;
      settings.bluffFrequency = 0.10;
      settings.mistakeRate = 0.03;
      break;
    case 'loose-aggressive':
      settings.aggressionFactor = 0.75;
      settings.bluffFrequency = 0.20;
      settings.mistakeRate = 0.07;
      break;
    case 'tight-passive':
      settings.aggressionFactor = 0.25;
      settings.bluffFrequency = 0.04;
      settings.mistakeRate = 0.02;
      break;
    case 'balanced':
      settings.aggressionFactor = 0.50;
      settings.bluffFrequency = 0.10;
      settings.mistakeRate = 0.04;
      break;
  }
  return settings;
}

/**
 * Evaluate preflop hand strength on a 0–10 scale.
 *
 * Considers pocket pairs, high-card combinations, suitedness, connectedness,
 * and gap size. Returns an integer tier where 10 = premium (QQ+), 1 = junk.
 *
 * TODO: Replace with a proper preflop equity lookup table for GTO accuracy.
 */
function preflopTier(holeCards: Card[]): number {
  if (holeCards.length < 2) return 0;
  const v1 = cardRankValue(holeCards[0].rank);
  const v2 = cardRankValue(holeCards[1].rank);
  const high = Math.max(v1, v2);
  const low = Math.min(v1, v2);
  const suited = isSuited(holeCards);
  const pair = v1 === v2;
  const gap = high - low;
  const connected = gap <= 2;

  // Pocket pairs
  if (pair) {
    if (high >= 12) return 10; // QQ+
    if (high >= 10) return 9;  // TT-JJ
    if (high >= 8) return 7;   // 88-99
    if (high >= 6) return 5;   // 66-77
    return 3;                   // 22-55
  }

  let tier = 0;
  // Premium unpaired
  if (high === 14 && low >= 11) tier = suited ? 9 : 8;      // AK, AQ, AJ
  if (high === 14 && low === 10) tier = suited ? 7 : 6;     // AT
  if (high === 13 && low >= 11) tier = suited ? 8 : 6;      // KQ, KJ
  if (high === 13 && low === 10) tier = suited ? 6 : 5;     // KT
  if (high === 12 && low === 11) tier = suited ? 6 : 5;     // QJ
  if (high === 12 && low === 10) tier = suited ? 5 : 4;     // QT

  // Broadway/low
  if (high >= 10 && low >= 9 && tier === 0) tier = suited ? 4 : 3;
  if (high >= 10 && tier === 0) tier = suited ? 3 : 2;

  // Suited connectors
  if (suited && connected && high >= 7 && tier < 5) tier = Math.max(tier, 4);
  if (suited && connected && high >= 5 && tier < 3) tier = Math.max(tier, 3);

  // Suited one-gappers
  if (suited && gap <= 3 && high >= 8 && tier < 3) tier = Math.max(tier, 2);

  // Fallback: high cards
  if (tier === 0) tier = suited ? 2 : 1;
  return tier;
}

// --- Position adjustment ---
// Returns a multiplier for hand strength based on position (0=SB, last=BTN)
function positionMultiplier(position: number, numPlayers: number): number {
  const relativePos = position / Math.max(1, numPlayers - 1);
  // Late position = more aggressive (wider range)
  if (relativePos >= 0.8) return 1.25;
  if (relativePos >= 0.6) return 1.10;
  if (relativePos >= 0.4) return 1.00;
  if (relativePos >= 0.2) return 0.90;
  return 0.80; // Early position = tight
}

/**
 * Calculate a realistic bet size based on street, position, hand strength,
 * opponent count, and stack depth.
 *
 * Sizing principles (heuristic, not GTO):
 * - Preflop: larger relative to pot (3–5x BB standard open)
 * - Postflop: 50–75% pot is standard; adjust by strength & opponents
 * - Late position: can bet slightly smaller (more steals, wider range)
 * - More opponents → larger sizing for protection
 * - Stronger hands → larger sizing for value extraction
 * - Deep stacks → smaller relative sizing (more playability)
 * - Shallow stacks → larger relative sizing (leverage fold equity)
 *
 * @param params.street - Current betting street
 * @param params.pot - Current pot size
 * @param params.playerChips - Betting player's remaining chips
 * @param params.currentBet - Current bet to match
 * @param params.handStrength - Normalized hand strength 0–1
 * @param params.positionNormalized - Position 0 (early) to 1 (late)
 * @param params.opponentCount - Number of active opponents
 * @param params.aggression - Bot aggression factor 0–1
 * @returns The total bet amount (what the player's bet should be after raising)
 *
 * TODO: Replace with GTO-derived sizing tables per board texture.
 * TODO: Integrate range-vs-range equity for polarized sizing on later streets.
 * TODO: Add blocker-aware sizing (e.g. larger when holding nut-blockers).
 */
function calculateBetSize(params: {
  street: string;
  pot: number;
  playerChips: number;
  currentBet: number;
  handStrength: number;
  positionNormalized: number;
  opponentCount: number;
  aggression: number;
}): number {
  const { street, pot, playerChips, currentBet, handStrength, positionNormalized, opponentCount, aggression } = params;

  // Base sizing as fraction of pot
  let potFraction: number;

  if (street === 'preflop') {
    // Preflop: sizing in terms of the big blind equivalent
    // Standard open is 2.5–4x the current bet (typically the BB)
    // Stronger hands open larger; late position can open smaller
    const baseMultiplier = 2.5 + aggression * 1.5; // 2.5–4.0x
    const strengthBonus = handStrength > 0.7 ? 0.5 : handStrength > 0.5 ? 0.25 : 0;
    const positionDiscount = positionNormalized > 0.6 ? -0.25 : 0; // LP can open smaller
    const multiplier = baseMultiplier + strengthBonus + positionDiscount;
    const openSize = currentBet * multiplier;

    // With more opponents behind, open larger to discourage calls
    const opponentBonus = Math.max(0, (opponentCount - 1) * currentBet * 0.5);

    return Math.min(currentBet + openSize + opponentBonus, playerChips);
  }

  // Postflop: fraction of pot
  // Standard: 50–75% pot
  if (handStrength > 0.80) {
    // Value: 65–90% pot depending on wetness (simplified)
    potFraction = 0.65 + aggression * 0.25;
  } else if (handStrength > 0.60) {
    // Solid: 50–70% pot
    potFraction = 0.50 + aggression * 0.20;
  } else if (handStrength > 0.40) {
    // Marginal/bluff: 40–60% pot
    potFraction = 0.40 + aggression * 0.20;
  } else {
    // Weak (continuation bet): 33–50% pot
    potFraction = 0.33 + aggression * 0.17;
  }

  // Position adjustment: late position can use smaller sizing
  if (positionNormalized > 0.7) {
    potFraction *= 0.85; // 15% smaller from late position (wider range)
  } else if (positionNormalized < 0.3) {
    potFraction *= 1.10; // 10% larger from early position (narrower, stronger range)
  }

  // Opponent count: more opponents → bet larger for protection
  if (opponentCount >= 3) {
    potFraction *= 1.20; // 20% larger vs 3+ opponents
  } else if (opponentCount === 2) {
    potFraction *= 1.08; // 8% larger vs 2 opponents
  }

  // Stack depth adjustment (SPR proxy)
  const spr = pot > 0 ? playerChips / pot : 20;
  if (spr < 2) {
    // Very shallow: bet sizes trend toward all-in
    potFraction = Math.max(potFraction, 0.75);
  } else if (spr > 10) {
    // Very deep: slightly smaller sizing for pot control
    potFraction *= 0.90;
  }

  // On later streets, sizing typically increases
  if (street === 'turn') potFraction *= 1.10;
  if (street === 'river') potFraction *= 1.25;

  const raiseAmount = Math.min(pot * potFraction, playerChips);
  return currentBet + Math.max(raiseAmount, currentBet * 1.5); // ensure raise is meaningful
}

// --- Main bot decision engine ---
export function botDecision(
  state: GameState,
  player: Player,
  settings: BotSettings = DEFAULT_SETTINGS,
): BotDecision {
  const { hand: holeCards, bet: playerBet, chips: playerChips } = player;
  const { currentBet, pot, currentPhase, players, communityCards } = state;
  const activePlayers = players.filter(p => !p.folded && p.chips > 0);
  const numActiveOpponents = activePlayers.filter(p => p.id !== player.id).length;
  const effectiveBet = currentBet - playerBet;

  // All-in — can't act
  if (playerChips <= 0) {
    return {
      action: 'check', confidence: 1,
      reasoning: 'All-in — no further action possible',
      reactionTime: 0, isBluff: false,
    };
  }

  // --- Evaluate hand strength ---
  const handEval = evaluateHand(holeCards, communityCards);
  // Normalize score to 0-1 range
  let equity: number;
  if (currentPhase === 'preflop') {
    // Preflop: use tier-based equity
    const tier = preflopTier(holeCards);
    equity = 0.15 + tier * 0.075; // 0.225 (tier 1) to 0.90 (tier 10)
  } else {
    // Postflop: use hand evaluation score
    equity = handEval.score / 9_500_000;
  }

  // --- Apply position ---
  const posMult = positionMultiplier(player.position, players.length);
  equity *= posMult;

  // --- Apply personality ---
  switch (settings.personality) {
    case 'tight-aggressive': equity *= 1.05; break;
    case 'loose-aggressive': equity *= 0.95; break;
    case 'tight-passive': equity *= 1.10; break;
    // balanced: no change
  }

  // --- Apply tilt ---
  if (settings.currentTilt > settings.tiltThreshold) {
    const tiltPenalty = (settings.currentTilt - settings.tiltThreshold) * 0.03;
    equity = Math.max(0.05, equity - tiltPenalty);
  }

  // --- Clamp equity with wider range to preserve nuance ---
  equity = Math.min(0.98, Math.max(0.03, equity));

  // --- Apply mistake rate ---
  let finalEquity = equity;
  if (Math.random() < settings.mistakeRate) {
    // Occasionally misread hand strength
    finalEquity = Math.max(0.02, Math.min(1, equity + (Math.random() - 0.5) * 0.4));
  }

  // --- Pot odds ---
  const potOdds = effectiveBet > 0 ? effectiveBet / (pot + effectiveBet) : 0;

  // --- Stack-to-pot ratio ---
  const spr = pot > 0 ? playerChips / pot : 20;

  // Computed position normalized 0-1 for sizing calculations
  const positionNormalized = players.length > 1 ? player.position / (players.length - 1) : 0.5;

  // --- Reaction time ---
  const baseTime = settings.reactionTimeMin + Math.random() * (settings.reactionTimeMax - settings.reactionTimeMin);
  const complexity = currentPhase === 'preflop' ? 0.3
    : currentPhase === 'flop' ? 0.2
    : currentPhase === 'turn' ? 0.1
    : 0.1;
  const tankTime = (finalEquity < 0.3 || finalEquity > 0.8) ? 0.4 : 0;
  const reactionTime = baseTime + complexity + tankTime;

  // --- Compute bet size using the realistic sizing function ---
  const getRaiseAmount = (strengthBonus = 0): number => {
    return calculateBetSize({
      street: currentPhase,
      pot,
      playerChips,
      currentBet,
      handStrength: finalEquity + strengthBonus,
      positionNormalized,
      opponentCount: numActiveOpponents,
      aggression: settings.aggressionFactor,
    });
  };

  // --- Decision ---
  let action: BotDecision['action'];
  let amount: number | undefined;
  let isBluff = false;
  let reasoning = '';

  // Bluff logic
  const shouldBluff = Math.random() < settings.bluffFrequency && finalEquity < 0.35 && effectiveBet > 0;
  const isRiver = currentPhase === 'river';
  const semiBluff = Math.random() < settings.bluffFrequency * 0.5 && finalEquity < 0.5 && !isRiver;

  if (shouldBluff) {
    // Pure bluff
    action = 'raise';
    amount = getRaiseAmount(-0.10); // size bluff slightly smaller
    isBluff = true;
    reasoning = `Bluffing — representing strength on ${currentPhase} (vs ${numActiveOpponents} opponent${numActiveOpponents !== 1 ? 's' : ''})`;
  } else if (semiBluff && !isRiver) {
    // Semi-bluff with draws
    action = 'raise';
    amount = getRaiseAmount(-0.05); // semi-bluff: moderate sizing
    isBluff = true;
    reasoning = `Semi-bluff — draw potential, fold equity`;
  } else if (finalEquity > 0.80) {
    // Very strong hand — value bet or trap
    if (Math.random() < settings.aggressionFactor * 1.2) {
      action = 'raise';
      if (spr < 2) {
        amount = playerChips; // Shallow stack: shove
        reasoning = `Monster hand (${handEval.description}), low SPR — shoving`;
      } else {
        amount = getRaiseAmount(0.10); // size up with strong hands
        reasoning = `Strong hand (${handEval.description}), betting for value (${numActiveOpponents} opponent${numActiveOpponents !== 1 ? 's' : ''})`;
      }
    } else {
      // Occasionally slow-play
      action = effectiveBet > 0 ? 'call' : 'check';
      reasoning = `Strong hand (${handEval.description}), slow-playing`;
    }
  } else if (finalEquity > 0.60) {
    // Good hand
    if (Math.random() < settings.aggressionFactor) {
      action = 'raise';
      amount = getRaiseAmount(0.05);
      reasoning = `Solid hand (${handEval.description}), applying pressure`;
    } else if (effectiveBet > 0 && finalEquity > potOdds) {
      action = 'call';
      reasoning = `Good hand, pot odds justify call (${(potOdds * 100).toFixed(0)}% needed, ${(finalEquity * 100).toFixed(0)}% equity)`;
    } else if (effectiveBet === 0) {
      action = Math.random() < settings.aggressionFactor ? 'raise' : 'check';
      if (action === 'raise') amount = getRaiseAmount(0.0);
      reasoning = `Good hand, ${action === 'raise' ? 'betting' : 'checking'} for pot control`;
    } else {
      action = 'call';
      reasoning = `Good hand, calling`;
    }
  } else if (finalEquity > 0.40) {
    // Marginal hand
    if (effectiveBet === 0) {
      // No bet to face
      if (Math.random() < settings.aggressionFactor * 0.6) {
        action = 'raise';
        amount = getRaiseAmount(-0.05); // c-bet: standard sizing
        reasoning = `Marginal hand, c-bet as aggressor`;
      } else {
        action = 'check';
        reasoning = 'Marginal hand, taking free card';
      }
    } else if (finalEquity > potOdds * 1.2) {
      action = 'call';
      reasoning = `Marginal hand but pot odds (${(potOdds * 100).toFixed(0)}%) favorable`;
    } else if (finalEquity > potOdds && Math.random() < 0.4) {
      action = 'call';
      reasoning = `Close decision — calling with marginal equity`;
    } else {
      action = 'fold';
      reasoning = `Marginal hand doesn't justify ${effectiveBet} to call into ${pot}`;
    }
  } else if (finalEquity > 0.25) {
    // Weak hand
    if (effectiveBet === 0) {
      action = 'check';
      reasoning = 'Weak hand, hoping for free card';
    } else if (finalEquity > potOdds * 0.8 && Math.random() < 0.25) {
      action = 'call';
      reasoning = `Weak but pot odds borderline — peeling one`;
    } else {
      action = 'fold';
      reasoning = `Weak hand (${handEval.description}), folding to ${effectiveBet}`;
    }
  } else {
    // Very weak
    if (effectiveBet === 0) {
      action = 'check';
      reasoning = 'Very weak hand, giving up';
    } else {
      action = 'fold';
      reasoning = `Very weak hand (${handEval.description}), easy fold`;
    }
  }

  // --- Bet sizing safety ---
  if (action === 'raise' && amount) {
    amount = Math.min(Math.max(amount, currentBet * 2), playerChips + playerBet);
    if (amount <= currentBet) action = effectiveBet > 0 ? 'call' : 'check';
  }

  // --- Confidence ---
  const confidence = Math.min(1, Math.max(0, Math.abs(finalEquity - 0.5) * 2));

  return {
    action, amount,
    confidence,
    reasoning,
    reactionTime,
    isBluff,
  };
}

import type { Card, GameState, Player } from '../types/card';
import { cardRankValue, isSuited, isConnected } from './deck';
import { evaluateHand } from './handEvaluator';

export type BotPersonality = 'tight-aggressive' | 'loose-aggressive' | 'tight-passive' | 'balanced';

export interface BotSettings {
  aggressionFactor: number;
  bluffFrequency: number;
  mistakeRate: number;
  reactionTimeMin: number;
  reactionTimeMax: number;
  personality: BotPersonality;
  tableImage: 'rock' | 'tag' | 'loose' | 'maniac' | 'nit';
  tiltThreshold: number;
  currentTilt: number;
}

export interface BotDecision {
  action: 'fold' | 'check' | 'call' | 'raise';
  amount?: number;
  confidence: number;
  reasoning: string;
  reactionTime: number;
  isBluff: boolean;
}

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

export function createBotSettings(personality: BotPersonality): BotSettings {
  const settings = { ...DEFAULT_SETTINGS };
  settings.personality = personality;
  switch (personality) {
    case 'tight-aggressive':
      settings.aggressionFactor = 0.75;
      settings.bluffFrequency = 0.15;
      settings.mistakeRate = 0.01;
      break;
    case 'loose-aggressive':
      settings.aggressionFactor = 0.85;
      settings.bluffFrequency = 0.2;
      settings.mistakeRate = 0.04;
      break;
    case 'tight-passive':
      settings.aggressionFactor = 0.3;
      settings.bluffFrequency = 0.05;
      settings.mistakeRate = 0.01;
      break;
    case 'balanced':
      settings.aggressionFactor = 0.55;
      settings.bluffFrequency = 0.12;
      settings.mistakeRate = 0.02;
      break;
  }
  return settings;
}

/** Simplified opponent bot settings — less adjustable, more predictable */
export function createOpponentSettings(personality: BotPersonality): BotSettings {
  const settings = { ...DEFAULT_SETTINGS };
  settings.personality = personality;
  switch (personality) {
    case 'tight-aggressive':
      settings.aggressionFactor = 0.65;
      settings.bluffFrequency = 0.1;
      settings.mistakeRate = 0.03;
      break;
    case 'loose-aggressive':
      settings.aggressionFactor = 0.75;
      settings.bluffFrequency = 0.16;
      settings.mistakeRate = 0.06;
      break;
    case 'tight-passive':
      settings.aggressionFactor = 0.25;
      settings.bluffFrequency = 0.04;
      settings.mistakeRate = 0.02;
      break;
    case 'balanced':
      settings.aggressionFactor = 0.5;
      settings.bluffFrequency = 0.1;
      settings.mistakeRate = 0.04;
      break;
  }
  return settings;
}

export function botDecision(state: GameState, player: Player, settings: BotSettings = DEFAULT_SETTINGS): BotDecision {
  const { holeCards, bet: playerBet, currentBet, pot, currentPhase, players, communityCards } = {
    holeCards: player.hand,
    bet: player.bet,
    currentBet: state.currentBet,
    pot: state.pot,
    currentPhase: state.currentPhase,
    players: state.players,
    communityCards: state.communityCards,
  };
  const effectiveBet = currentBet - playerBet;
  const isAllIn = player.chips <= 0;

  // If player is all-in, they can't act — return a neutral decision
  if (isAllIn) {
    return {
      action: 'check',
      confidence: 1,
      reasoning: 'All-in — no further action possible',
      reactionTime: 0,
      isBluff: false,
    };
  }

  const handEval = evaluateHand(holeCards, communityCards);
  const rawStrength = handEval.score / 9500000;

  let strengthBonus = 0;
  if (currentPhase === 'preflop') {
    strengthBonus = preflopStrength(holeCards, players.length);
  }

  let adjustedStrength = Math.min(1, Math.max(0, rawStrength + strengthBonus - 0.15));

  switch (settings.personality) {
    case 'tight-aggressive': adjustedStrength *= 1.1; break;
    case 'loose-aggressive': adjustedStrength *= 0.9; break;
    case 'tight-passive': adjustedStrength *= 1.15; break;
  }

  if (settings.currentTilt > settings.tiltThreshold) {
    adjustedStrength = Math.min(1, adjustedStrength + settings.currentTilt * 0.05);
  }

  const shouldMistake = Math.random() < settings.mistakeRate;
  if (shouldMistake) {
    adjustedStrength = Math.max(0, Math.min(1, adjustedStrength + (Math.random() - 0.5) * 0.3));
  }

  const baseReaction = settings.reactionTimeMin + Math.random() * (settings.reactionTimeMax - settings.reactionTimeMin);
  const complexityDelay = currentPhase === 'preflop' ? 0.3 : currentPhase === 'flop' ? 0.2 : 0.1;
  const reactionTime = baseReaction + complexityDelay + (adjustedStrength < 0.3 || adjustedStrength > 0.8 ? 0.5 : 0);

  let action: BotDecision['action'];
  let amount: number | undefined;
  let isBluff = false;
  let reasoning = '';

  const potOdds = effectiveBet / (pot + effectiveBet);
  const equity = adjustedStrength;

  const bluffChance = settings.bluffFrequency * (1 - equity) * settings.aggressionFactor;
  if (Math.random() < bluffChance && equity < 0.3 && effectiveBet > 0) {
    action = 'raise';
    amount = Math.min(currentBet * 2, player.chips);
    isBluff = true;
    reasoning = 'Bluff — weak hand, opponent likely has more';
  } else if (equity > 0.7) {
    if (Math.random() < settings.aggressionFactor) {
      action = 'raise';
      amount = Math.min(effectiveBet * (1.5 + Math.random()), player.chips);
      reasoning = `Strong hand (${handEval.description}), betting for value`;
    } else {
      action = 'call';
      reasoning = `Strong hand (${handEval.description}), controlling pot size`;
    }
  } else if (equity > 0.5) {
    action = Math.random() < settings.aggressionFactor ? 'raise' : 'call';
    amount = action === 'raise' ? Math.min(effectiveBet * 1.5, player.chips) : undefined;
    reasoning = `Medium hand (${handEval.description}), ${action === 'raise' ? 'aggressive' : 'cautious'}`;
  } else if (equity > potOdds) {
    action = 'call';
    reasoning = `Marginal hand, pot odds (${(potOdds * 100).toFixed(0)}%) justify call`;
  } else if (effectiveBet === 0) {
    action = 'check';
    reasoning = 'No bet to face, checking';
  } else if (equity > 0.25 && Math.random() < 0.3) {
    action = 'call';
    reasoning = `Weak hand but pot odds (${(potOdds * 100).toFixed(0)}%) tempting`;
  } else {
    action = 'fold';
    reasoning = `Hand (${handEval.description}) doesn't justify call of ${effectiveBet}`;
  }

  if (amount && amount > player.chips) amount = player.chips;
  const confidence = Math.abs(equity - 0.5) * 2;

  return {
    action,
    amount,
    confidence: Math.min(1, Math.max(0, confidence)),
    reasoning,
    reactionTime,
    isBluff,
  };
}

function preflopStrength(holeCards: Card[], numPlayers: number): number {
  if (holeCards.length < 2) return 0;
  const v1 = cardRankValue(holeCards[0].rank);
  const v2 = cardRankValue(holeCards[1].rank);
  const suited = isSuited(holeCards);
  const connected = isConnected(holeCards);
  const pair = v1 === v2;
  const high = Math.max(v1, v2);
  const gap = Math.abs(v1 - v2);

  let strength = 0;
  if (pair) {
    strength = (high / 14) * 0.7;
    if (high >= 10) strength += 0.2;
  } else {
    strength = ((high + Math.min(v1, v2)) / 28) * 0.5;
    if (suited) strength += 0.1;
    if (connected && gap <= 2) strength += 0.08;
    if (high >= 13) strength += 0.05;
  }
  strength *= Math.max(0.5, 1 - (numPlayers - 2) * 0.05);
  return strength - 0.15;
}

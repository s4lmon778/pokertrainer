import { describe, it, expect } from 'vitest';
import { gtoStrategy } from './gto';
import { DEFAULT_TRAINING_CONFIG } from '../trainingBot';
import type { GameState, Player, Card, Suit, Rank } from '../../types/card';

function makeCard(suit: string, rank: string): Card {
  return { suit: suit as Suit, rank: rank as Rank, id: suit + rank };
}

function makePlayer(
  hand: Card[],
  position = 0,
  chips = 1000,
  bet = 0,
): Player {
  return {
    id: 'test', name: 'Test', hand, position, chips,
    bet, folded: false, isBot: true,
    totalBetThisRound: 0, totalHandBet: 0, isAllIn: false, actedThisRound: false,
  };
}

function makeState(
  phase: 'preflop' | 'flop' | 'turn' | 'river' = 'preflop',
  oppCount = 0,
): GameState {
  return {
    currentPhase: phase as GameState['currentPhase'],
    players: [
      makePlayer([], 0),
      ...Array.from({ length: oppCount }, (_, i) => ({
        id: `opp${i}`, name: `Opp${i}`, hand: [], position: i + 1, chips: 1000,
        bet: 0, folded: false, isBot: true,
        totalBetThisRound: 0, totalHandBet: 0, isAllIn: false, actedThisRound: false,
      })) as unknown as Player[],
    ],
    currentPlayerIndex: 0,
    deck: [],
    communityCards: [],
    pot: 100,
    currentBet: 0,
    minRaise: 0,
    lastRaiseAmount: 0,
    handNumber: 1,
    dealerPosition: 0,
    sidePots: [],
    gameOver: false,
    sbPosition: 0,
    bbPosition: 1,
    preflopRaised: false,
  };
}

describe('gtoStrategy', () => {
  it('should fold weak preflop hands (72o)', () => {
    const hand = [makeCard('spades', '7'), makeCard('clubs', '2')];
    const player = makePlayer(hand, 0);
    const state = makeState('preflop', 1);
    const decision = gtoStrategy.decide(state, player, DEFAULT_TRAINING_CONFIG);
    expect(decision.action).toBe('fold');
    expect(decision.confidence).toBeGreaterThan(0);
    expect(decision.reactionTime).toBeGreaterThan(0);
  });

  it('should play strong preflop hands (AA)', () => {
    const hand = [makeCard('spades', 'A'), makeCard('hearts', 'A')];
    const player = makePlayer(hand, 3);
    const state = makeState('preflop', 4);
    const decision = gtoStrategy.decide(state, player, DEFAULT_TRAINING_CONFIG);
    expect(decision.action).not.toBe('fold');
    expect(decision.confidence).toBeGreaterThan(0.5);
    expect(decision.reactionTime).toBeGreaterThan(0);
  });

  it('should call with good pot odds', () => {
    const hand = [makeCard('spades', 'K'), makeCard('spades', 'Q')];
    const player = makePlayer(hand, 2, 1000, 0);
    // Simulate facing a small bet (good pot odds): state.currentBet > player.bet
    const state = makeState('flop', 1);
    state.currentBet = 10; // opponent bet 10, player hasn't called yet (bet=0)
    const decision = gtoStrategy.decide(state, player, DEFAULT_TRAINING_CONFIG);
    expect(decision.action).toBe('call');
  });

  it('should have valid strategy metadata', () => {
    expect(gtoStrategy.id).toBe('gto');
    expect(gtoStrategy.name).toBeDefined();
    expect(gtoStrategy.minSkillLevel).toBeGreaterThanOrEqual(0);
    expect(gtoStrategy.maxSkillLevel).toBeLessThanOrEqual(100);
  });

  it('should always include reactionTime for autonomous mode', () => {
    const hand = [makeCard('hearts', 'A'), makeCard('diamonds', 'A')];
    const player = makePlayer(hand, 0);
    const state = makeState('preflop', 1);
    const decision = gtoStrategy.decide(state, player, DEFAULT_TRAINING_CONFIG);
    expect(decision.reactionTime).toBeGreaterThan(0);
  });
});

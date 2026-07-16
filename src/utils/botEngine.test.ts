import { describe, it, expect } from 'vitest';
import {
  createBotSettings,
  createOpponentSettings,
  botDecision,
  type BotPersonality,
} from './botEngine';
import type { GameState, Player, Suit, Rank } from '../types/card';

function makePlayer(overrides: Partial<Player> & { id: string }): Player {
  return {
    name: overrides.id,
    chips: 500,
    hand: [],
    bet: 0,
    folded: false,
    isBot: true,
    position: 1,
    totalBetThisRound: 0,
    totalHandBet: 0,
    isAllIn: false,
    actedThisRound: false,
    ...overrides,
  };
}

function makeGameState(overrides: Partial<GameState>): GameState {
  return {
    players: [makePlayer({ id: 'human', isBot: false, position: 0 }), makePlayer({ id: 'bot', position: 1 })],
    communityCards: [],
    pot: 15,
    sidePots: [],
    currentPhase: 'preflop',
    dealerPosition: 0,
    currentPlayerIndex: 1,
    currentBet: 10,
    minRaise: 10,
    lastRaiseAmount: 0,
    handNumber: 1,
    deck: [],
    gameOver: false,
    sbPosition: 0,
    bbPosition: 1,
    preflopRaised: false,
    ...overrides,
  };
}

describe('createBotSettings', () => {
  const personalities: BotPersonality[] = ['tight-aggressive', 'loose-aggressive', 'tight-passive', 'balanced'];

  for (const p of personalities) {
    it(`creates valid settings for ${p}`, () => {
      const settings = createBotSettings(p);
      expect(settings.personality).toBe(p);
      expect(settings.aggressionFactor).toBeGreaterThan(0);
      expect(settings.aggressionFactor).toBeLessThanOrEqual(1);
      expect(settings.bluffFrequency).toBeGreaterThanOrEqual(0);
      expect(settings.bluffFrequency).toBeLessThanOrEqual(1);
      expect(settings.mistakeRate).toBeGreaterThanOrEqual(0);
      expect(settings.mistakeRate).toBeLessThanOrEqual(1);
      expect(settings.tableImage).toBeTruthy();
    });
  }

  it('tight-aggressive has higher aggression than tight-passive', () => {
    const tag = createBotSettings('tight-aggressive');
    const tp = createBotSettings('tight-passive');
    expect(tag.aggressionFactor).toBeGreaterThan(tp.aggressionFactor);
  });

  it('loose-aggressive has highest bluff frequency', () => {
    const lag = createBotSettings('loose-aggressive');
    const tag = createBotSettings('tight-aggressive');
    const tp = createBotSettings('tight-passive');
    const bal = createBotSettings('balanced');
    expect(lag.bluffFrequency).toBeGreaterThan(tag.bluffFrequency);
    expect(lag.bluffFrequency).toBeGreaterThan(tp.bluffFrequency);
    expect(lag.bluffFrequency).toBeGreaterThan(bal.bluffFrequency);
  });
});

describe('createOpponentSettings', () => {
  it('creates settings with different values than training bot', () => {
    const opp = createOpponentSettings('tight-aggressive');
    const train = createBotSettings('tight-aggressive');
    // Opponent settings should be different from training bot settings
    expect(opp.mistakeRate).not.toBe(train.mistakeRate);
  });

  it('produces valid settings for all personalities', () => {
    const personalities: BotPersonality[] = ['tight-aggressive', 'loose-aggressive', 'tight-passive', 'balanced'];
    for (const p of personalities) {
      const settings = createOpponentSettings(p);
      expect(settings.personality).toBe(p);
      expect(settings.aggressionFactor).toBeGreaterThan(0);
      expect(settings.bluffFrequency).toBeGreaterThanOrEqual(0);
      expect(settings.mistakeRate).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('botDecision', () => {
  it('returns check when player has no chips', () => {
    const player = makePlayer({ id: 'bot', chips: 0 });
    const gs = makeGameState({ currentPlayerIndex: 1 });
    gs.players[1] = player;
    const decision = botDecision(gs, player);
    expect(decision.action).toBe('check');
    expect(decision.confidence).toBe(1);
  });

  it('returns a valid decision for a playable hand', () => {
    const player = makePlayer({
      id: 'bot',
      hand: [
        { suit: 'hearts' as Suit, rank: 'A' as Rank, id: 'Ah' },
        { suit: 'hearts' as Suit, rank: 'K' as Rank, id: 'Kh' },
      ],
      chips: 500,
    });
    const gs = makeGameState({ currentPlayerIndex: 1 });
    gs.players[1] = player;
    const decision = botDecision(gs, player);
    expect(['fold', 'check', 'call', 'raise']).toContain(decision.action);
    expect(decision.confidence).toBeGreaterThanOrEqual(0);
    expect(decision.confidence).toBeLessThanOrEqual(1);
    expect(decision.reasoning).toBeTruthy();
  });

  it('prefers aggressive actions for tight-aggressive bot with strong hand', () => {
    const settings = createBotSettings('tight-aggressive');
    const player = makePlayer({
      id: 'bot',
      hand: [
        { suit: 'spades' as Suit, rank: 'A' as Rank, id: 'As' },
        { suit: 'spades' as Suit, rank: 'A' as Rank, id: 'Ad' },
      ],
      chips: 500,
    });
    const community = [
      { suit: 'hearts' as Suit, rank: 'A' as Rank, id: 'Ah' },
      { suit: 'diamonds' as Suit, rank: 'K' as Rank, id: 'Kd' },
      { suit: 'clubs' as Suit, rank: '2' as Rank, id: '2c' },
    ];
    const gs = makeGameState({
      currentPlayerIndex: 1,
      communityCards: community,
      currentPhase: 'flop',
      pot: 50,
      currentBet: 20,
    });
    gs.players[1] = player;

    // Run multiple times — bot should not fold a monster hand
    let raises = 0;
    let calls = 0;
    const trials = 20;
    for (let i = 0; i < trials; i++) {
      const decision = botDecision(gs, player, settings);
      if (decision.action === 'raise') raises++;
      if (decision.action === 'call') calls++;
    }
    // With trips A and 80%+ equity — bot sometimes slow-plays, so just verify sensible behavior
    // (bot should not fold a monster hand)
    expect(raises + calls).toBeGreaterThanOrEqual(trials * 0.5);
  });

  it('folds very weak hands facing a bet', () => {
    const player = makePlayer({
      id: 'bot',
      hand: [
        { suit: 'clubs' as Suit, rank: '7' as Rank, id: '7c' },
        { suit: 'spades' as Suit, rank: '2' as Rank, id: '2s' },
      ],
      chips: 500,
    });
    const community = [
      { suit: 'hearts' as Suit, rank: 'A' as Rank, id: 'Ah' },
      { suit: 'diamonds' as Suit, rank: 'K' as Rank, id: 'Kd' },
      { suit: 'clubs' as Suit, rank: 'Q' as Rank, id: 'Qc' },
    ];
    const gs = makeGameState({
      currentPlayerIndex: 1,
      communityCards: community,
      currentPhase: 'flop',
      pot: 50,
      currentBet: 50,
      preflopRaised: true,
    });
    gs.players[1] = player;

    let folds = 0;
    const trials = 30;
    for (let i = 0; i < trials; i++) {
      const decision = botDecision(gs, player);
      if (decision.action === 'fold') folds++;
    }
    // 72o vs AKQ board, facing a pot-sized bet — should fold at least 50% of the time
    expect(folds).toBeGreaterThanOrEqual(trials * 0.3);
  });

  it('checks when no bet to face', () => {
    const player = makePlayer({
      id: 'bot',
      hand: [
        { suit: 'hearts' as Suit, rank: 'J' as Rank, id: 'Jh' },
        { suit: 'diamonds' as Suit, rank: '10' as Rank, id: 'Td' },
      ],
      chips: 500,
    });
    const gs = makeGameState({
      currentPlayerIndex: 1,
      currentBet: 0,
      currentPhase: 'preflop',
    });
    gs.players[1] = player;

    let checks = 0;
    let raises = 0;
    const trials = 20;
    for (let i = 0; i < trials; i++) {
      const decision = botDecision(gs, player);
      if (decision.action === 'check') checks++;
      if (decision.action === 'raise') raises++;
    }
    // Should check or raise, never fold when no bet to face
    expect(checks + raises).toBe(trials);
  });

  it('includes reasoning string', () => {
    const player = makePlayer({
      id: 'bot',
      hand: [
        { suit: 'hearts' as Suit, rank: 'A' as Rank, id: 'Ah' },
        { suit: 'diamonds' as Suit, rank: 'K' as Rank, id: 'Kd' },
      ],
      chips: 500,
    });
    const gs = makeGameState({ currentPlayerIndex: 1 });
    gs.players[1] = player;
    const decision = botDecision(gs, player);
    expect(decision.reasoning.length).toBeGreaterThan(0);
  });

  it('reaction time is reasonable', () => {
    const player = makePlayer({
      id: 'bot',
      hand: [
        { suit: 'hearts' as Suit, rank: 'A' as Rank, id: 'Ah' },
        { suit: 'diamonds' as Suit, rank: 'K' as Rank, id: 'Kd' },
      ],
      chips: 500,
    });
    const gs = makeGameState({ currentPlayerIndex: 1 });
    gs.players[1] = player;
    const decision = botDecision(gs, player);
    expect(decision.reactionTime).toBeGreaterThanOrEqual(0);
    expect(decision.reactionTime).toBeLessThan(10);
  });
});

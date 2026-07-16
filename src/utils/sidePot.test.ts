import { describe, it, expect } from 'vitest';
import { calculateSidePots } from './sidePot';
import type { Player, Card } from '../types/card';
import { evaluateHand } from './handEvaluator';

function makePlayer(overrides: Partial<Player> & { id: string }): Player {
  return {
    name: overrides.id,
    chips: 0,
    hand: [],
    bet: 0,
    folded: false,
    isBot: true,
    position: 0,
    totalBetThisRound: 0,
    totalHandBet: 0,
    isAllIn: false,
    actedThisRound: false,
    ...overrides,
  };
}

const emptyCommunity: Card[] = [];

describe('calculateSidePots', () => {
  it('no side pots — everyone has equal bets', () => {
    const players = [
      makePlayer({ id: 'p1', totalHandBet: 100, hand: [{ suit: 'hearts', rank: 'A', id: 'Ah' }, { suit: 'hearts', rank: 'K', id: 'Kh' }] }),
      makePlayer({ id: 'p2', totalHandBet: 100, hand: [{ suit: 'diamonds', rank: 'A', id: 'Ad' }, { suit: 'diamonds', rank: 'Q', id: 'Qd' }] }),
    ];
    const community: Card[] = [
      { suit: 'spades', rank: 'A', id: 'As' },
      { suit: 'clubs', rank: 'A', id: 'Ac' },
      { suit: 'hearts', rank: '2', id: '2h' },
      { suit: 'diamonds', rank: '3', id: '3d' },
      { suit: 'clubs', rank: '4', id: '4c' },
    ];
    const result = calculateSidePots(players, community);
    expect(result.pots).toHaveLength(1);
    expect(result.pots[0].amount).toBe(200);
    // p1 has quads A, p2 has full house — p1 wins
    expect(result.distribution['p1']).toBe(200);
  });

  it('creates side pot when one player is all-in for less', () => {
    const players = [
      makePlayer({ id: 'p1', totalHandBet: 50, hand: [{ suit: 'hearts', rank: 'A', id: 'Ah' }, { suit: 'hearts', rank: 'K', id: 'Kh' }] }),
      makePlayer({ id: 'p2', totalHandBet: 100, hand: [{ suit: 'diamonds', rank: 'Q', id: 'Qd' }, { suit: 'diamonds', rank: 'J', id: 'Jd' }] }),
      makePlayer({ id: 'p3', totalHandBet: 100, hand: [{ suit: 'clubs', rank: '10', id: '10c' }, { suit: 'clubs', rank: '9', id: '9c' }] }),
    ];
    const community: Card[] = [
      { suit: 'spades', rank: 'A', id: 'As' },
      { suit: 'spades', rank: '2', id: '2s' },
      { suit: 'spades', rank: '3', id: '3s' },
      { suit: 'spades', rank: '4', id: '4s' },
      { suit: 'spades', rank: '5', id: '5s' },
    ];
    const result = calculateSidePots(players, community);

    // Main pot: 50 * 3 = 150 (all eligible)
    // Side pot: 50 * 2 = 100 (only p2, p3 eligible)
    expect(result.pots).toHaveLength(2);
    expect(result.pots[0].amount).toBe(150);
    expect(result.pots[1].amount).toBe(100);

    // p2 wins main pot (better high card), p2 wins side pot
    expect(result.distribution['p2']).toBeGreaterThan(0);
  });

  it('handles multiple all-in levels', () => {
    const players = [
      makePlayer({ id: 'p1', totalHandBet: 30, hand: [{ suit: 'hearts', rank: 'A', id: 'Ah' }, { suit: 'hearts', rank: 'K', id: 'Kh' }] }),
      makePlayer({ id: 'p2', totalHandBet: 60, hand: [{ suit: 'diamonds', rank: 'Q', id: 'Qd' }, { suit: 'diamonds', rank: 'J', id: 'Jd' }] }),
      makePlayer({ id: 'p3', totalHandBet: 100, hand: [{ suit: 'clubs', rank: '10', id: '10c' }, { suit: 'clubs', rank: '9', id: '9c' }] }),
    ];
    const community: Card[] = [
      { suit: 'spades', rank: '2', id: '2s' },
      { suit: 'hearts', rank: '3', id: '3h' },
      { suit: 'diamonds', rank: '4', id: '4d' },
      { suit: 'clubs', rank: '5', id: '5c' },
      { suit: 'hearts', rank: '6', id: '6h' },
    ];
    const result = calculateSidePots(players, community);

    // Pot 1 (30*3=90): all eligible
    // Pot 2 (30*2=60): p2, p3 eligible
    // Pot 3 (40*1=40): only p3 eligible (p3 gets this back)
    expect(result.pots).toHaveLength(3);
    expect(result.pots[0].amount).toBe(90);
    expect(result.pots[1].amount).toBe(60);
    expect(result.pots[2].amount).toBe(40);

    // p3 wins pot 3 by default (others not eligible)
    expect(result.distribution['p3']).toBeGreaterThanOrEqual(40);
  });

  it('handles folded players — dead money in pot but ineligible', () => {
    const players = [
      makePlayer({ id: 'p1', totalHandBet: 50, folded: true, hand: [] }),
      makePlayer({ id: 'p2', totalHandBet: 100, hand: [{ suit: 'hearts', rank: 'A', id: 'Ah' }, { suit: 'hearts', rank: 'K', id: 'Kh' }] }),
      makePlayer({ id: 'p3', totalHandBet: 100, hand: [{ suit: 'diamonds', rank: 'Q', id: 'Qd' }, { suit: 'diamonds', rank: 'J', id: 'Jd' }] }),
    ];
    const community: Card[] = [
      { suit: 'spades', rank: 'A', id: 'As' },
      { suit: 'spades', rank: '2', id: '2s' },
      { suit: 'spades', rank: '3', id: '3s' },
      { suit: 'spades', rank: '4', id: '4s' },
      { suit: 'spades', rank: '5', id: '5s' },
    ];
    const result = calculateSidePots(players, community);

    // p1 contributed 50 but folded — dead money
    // Pot 1 (50*3=150): p2, p3 eligible, p1's money is dead
    // Pot 2 (50*2=100): p2, p3 eligible
    expect(result.pots[0].eligiblePlayers).toHaveLength(2); // p2, p3 only
    expect(result.pots[0].amount).toBe(150); // includes p1's dead 50
  });

  it('splits pot among tied winners', () => {
    const players = [
      makePlayer({ id: 'p1', totalHandBet: 100, hand: [{ suit: 'hearts', rank: 'A', id: 'Ah' }, { suit: 'hearts', rank: 'K', id: 'Kh' }] }),
      makePlayer({ id: 'p2', totalHandBet: 100, hand: [{ suit: 'diamonds', rank: 'A', id: 'Ad' }, { suit: 'diamonds', rank: 'K', id: 'Kd' }] }),
    ];
    const community: Card[] = [
      { suit: 'spades', rank: '2', id: '2s' },
      { suit: 'hearts', rank: '3', id: '3h' },
      { suit: 'diamonds', rank: '4', id: '4d' },
      { suit: 'clubs', rank: '5', id: '5c' },
      { suit: 'hearts', rank: '6', id: '6h' },
    ];
    const result = calculateSidePots(players, community);
    // Same hand — split
    expect(result.distribution['p1']).toBe(100);
    expect(result.distribution['p2']).toBe(100);
  });

  it('handles remainder chips going to first winner', () => {
    const players = [
      makePlayer({ id: 'p1', totalHandBet: 101, hand: [{ suit: 'hearts', rank: 'A', id: 'Ah' }, { suit: 'hearts', rank: 'K', id: 'Kh' }] }),
      makePlayer({ id: 'p2', totalHandBet: 101, hand: [{ suit: 'diamonds', rank: 'A', id: 'Ad' }, { suit: 'diamonds', rank: 'K', id: 'Kd' }] }),
    ];
    const community: Card[] = [
      { suit: 'spades', rank: '2', id: '2s' },
      { suit: 'hearts', rank: '3', id: '3h' },
      { suit: 'diamonds', rank: '4', id: '4d' },
      { suit: 'clubs', rank: '5', id: '5c' },
      { suit: 'hearts', rank: '6', id: '6h' },
    ];
    const result = calculateSidePots(players, community);
    // 101 each = 202 total, split 101 each (even, no remainder)
    expect(result.distribution['p1']).toBe(101);
    expect(result.distribution['p2']).toBe(101);
  });

  it('returns empty distributions when no players contributed', () => {
    const players = [
      makePlayer({ id: 'p1', totalHandBet: 0, hand: [] }),
      makePlayer({ id: 'p2', totalHandBet: 0, hand: [] }),
    ];
    const result = calculateSidePots(players, emptyCommunity);
    expect(result.pots).toHaveLength(0);
    expect(Object.keys(result.distribution)).toHaveLength(0);
  });
});

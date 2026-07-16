import { describe, it, expect } from 'vitest';
import {
  computePreflopEquity,
  computeEquity,
  computeActionWinRates,
  winRateColor,
  winRateTextClass,
  winRateBgClass,
} from './equity';
import type { Card, Player, GamePhase } from '../types/card';

const c = (rank: string, suit: string): Card => ({
  rank: rank as Card['rank'],
  suit: suit as Card['suit'],
  id: `${rank}-${suit}`,
});

function makePlayer(overrides: Partial<Player>): Player {
  return {
    id: 'human',
    name: 'You',
    chips: 500,
    hand: [],
    bet: 0,
    folded: false,
    isBot: false,
    position: 0,
    totalBetThisRound: 0,
    totalHandBet: 0,
    isAllIn: false,
    actedThisRound: false,
    ...overrides,
  };
}

describe('computePreflopEquity', () => {
  it('returns higher equity for premium pairs', () => {
    const aa = computePreflopEquity([c('A', 'hearts'), c('A', 'diamonds')], 1);
    const sevenTwo = computePreflopEquity([c('7', 'clubs'), c('2', 'spades')], 1);
    expect(aa).toBeGreaterThan(sevenTwo);
  });

  it('returns higher equity for suited vs unsuited', () => {
    const suited = computePreflopEquity([c('A', 'hearts'), c('K', 'hearts')], 1);
    const offsuit = computePreflopEquity([c('A', 'clubs'), c('K', 'spades')], 1);
    expect(suited).toBeGreaterThan(offsuit);
  });

  it('returns higher equity for connected vs gapped', () => {
    const connected = computePreflopEquity([c('J', 'hearts'), c('10', 'diamonds')], 1);
    const gapped = computePreflopEquity([c('J', 'hearts'), c('7', 'diamonds')], 1);
    expect(connected).toBeGreaterThan(gapped);
  });

  it('penalizes equity with more opponents', () => {
    const headsUp = computePreflopEquity([c('A', 'hearts'), c('K', 'hearts')], 1);
    const fullRing = computePreflopEquity([c('A', 'hearts'), c('K', 'hearts')], 5);
    expect(headsUp).toBeGreaterThan(fullRing);
  });

  it('returns value between 0 and 1', () => {
    const equity = computePreflopEquity([c('A', 'hearts'), c('K', 'diamonds')], 3);
    expect(equity).toBeGreaterThan(0);
    expect(equity).toBeLessThanOrEqual(1);
  });

  it('returns 0.25 for empty hand', () => {
    expect(computePreflopEquity([], 1)).toBe(0.25);
  });
});

describe('computeEquity', () => {
  it('returns higher equity with stronger postflop hand', () => {
    const strongPlayer = makePlayer({ hand: [c('A', 'hearts'), c('A', 'diamonds')] });
    const weakPlayer = makePlayer({ hand: [c('7', 'clubs'), c('2', 'spades')] });
    const community: Card[] = [c('K', 'hearts'), c('Q', 'hearts'), c('J', 'hearts')];

    const strongEquity = computeEquity(strongPlayer, community, 'flop', 2);
    const weakEquity = computeEquity(weakPlayer, community, 'flop', 2);
    expect(strongEquity).toBeGreaterThan(weakEquity);
  });

  it('returns 0 for empty hand', () => {
    const player = makePlayer({ hand: [] });
    expect(computeEquity(player, [], 'preflop', 1)).toBe(0);
  });

  it('increases equity as streets progress (same hand)', () => {
    const player = makePlayer({ hand: [c('A', 'hearts'), c('K', 'hearts')] });
    const community: Card[] = [c('A', 'spades'), c('K', 'diamonds'), c('2', 'clubs')];

    const flopEquity = computeEquity(player, community, 'flop', 1);
    const turnEquity = computeEquity(player, [...community, c('3', 'hearts')], 'turn', 1);
    const riverEquity = computeEquity(player, [...community, c('3', 'hearts'), c('4', 'diamonds')], 'river', 1);
    expect(riverEquity).toBeGreaterThanOrEqual(turnEquity);
    expect(turnEquity).toBeGreaterThanOrEqual(flopEquity);
  });
});

describe('computeActionWinRates', () => {
  it('returns 0 for fold', () => {
    const player = makePlayer({ hand: [c('A', 'hearts'), c('K', 'diamonds')] });
    const rates = computeActionWinRates(player, [], 'preflop', 10, 50, 1);
    expect(rates.fold).toBe(0);
  });

  it('returns higher raise rate than call rate', () => {
    const player = makePlayer({ hand: [c('A', 'hearts'), c('A', 'diamonds')] });
    const community: Card[] = [c('K', 'spades'), c('K', 'hearts'), c('2', 'diamonds')];
    const rates = computeActionWinRates(player, community, 'flop', 50, 100, 1);
    expect(rates.raise).toBeGreaterThanOrEqual(rates.checkCall);
  });

  it('all-in rate is highest', () => {
    const player = makePlayer({ hand: [c('A', 'hearts'), c('K', 'diamonds')] });
    const rates = computeActionWinRates(player, [], 'preflop', 10, 50, 2);
    expect(rates.allIn).toBeGreaterThanOrEqual(rates.raise);
  });

  it('caps rates at 95', () => {
    const player = makePlayer({ hand: [c('A', 'hearts'), c('A', 'diamonds')] });
    const rates = computeActionWinRates(player, [], 'preflop', 0, 100, 0);
    expect(rates.allIn).toBeLessThanOrEqual(95);
  });
});

describe('winRateColor', () => {
  it('returns green for >= 55', () => {
    expect(winRateColor(55)).toBe('green');
    expect(winRateColor(80)).toBe('green');
  });

  it('returns yellow for 30-54', () => {
    expect(winRateColor(30)).toBe('yellow');
    expect(winRateColor(45)).toBe('yellow');
  });

  it('returns red for < 30', () => {
    expect(winRateColor(0)).toBe('red');
    expect(winRateColor(29)).toBe('red');
  });
});

describe('winRateTextClass', () => {
  it('returns correct Tailwind class', () => {
    expect(winRateTextClass(60)).toContain('accent-green');
    expect(winRateTextClass(40)).toContain('accent-yellow');
    expect(winRateTextClass(10)).toContain('accent-red');
  });
});

describe('winRateBgClass', () => {
  it('returns correct Tailwind class', () => {
    expect(winRateBgClass(60)).toContain('accent-green');
    expect(winRateBgClass(40)).toContain('accent-yellow');
    expect(winRateBgClass(10)).toContain('accent-red');
  });
});

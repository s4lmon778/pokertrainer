import { describe, it, expect } from 'vitest';
import { evaluateHand } from './handEvaluator';
import type { Card } from '../types/card';

// Helper to quickly build cards
const c = (rank: string, suit: string): Card => ({
  rank: rank as Card['rank'],
  suit: suit as Card['suit'],
  id: `${rank}-${suit}`,
});

describe('evaluateHand', () => {
  describe('Hand Rankings — Correct Classification', () => {
    it('identifies a Royal Flush', () => {
      const hole = [c('A', 'spades'), c('K', 'spades')];
      const community = [c('Q', 'spades'), c('J', 'spades'), c('10', 'spades'), c('3', 'hearts'), c('7', 'diamonds')];
      const result = evaluateHand(hole, community);
      expect(result.strength).toBe('royal-flush');
      expect(result.description).toBe('Royal Flush');
      expect(result.score).toBeGreaterThanOrEqual(9_000_000);
    });

    it('identifies a Straight Flush', () => {
      const hole = [c('9', 'hearts'), c('8', 'hearts')];
      const community = [c('7', 'hearts'), c('6', 'hearts'), c('5', 'hearts'), c('2', 'clubs'), c('K', 'diamonds')];
      const result = evaluateHand(hole, community);
      expect(result.strength).toBe('straight-flush');
      expect(result.description).toContain('Straight Flush');
      expect(result.score).toBeGreaterThanOrEqual(8_000_000);
      expect(result.score).toBeLessThan(9_000_000);
    });

    it('identifies a Wheel Straight Flush (A-2-3-4-5)', () => {
      const hole = [c('A', 'clubs'), c('2', 'clubs')];
      const community = [c('3', 'clubs'), c('4', 'clubs'), c('5', 'clubs'), c('K', 'hearts'), c('Q', 'diamonds')];
      const result = evaluateHand(hole, community);
      expect(result.strength).toBe('straight-flush');
      expect(result.description).toContain('5 high');
    });

    it('identifies Four of a Kind', () => {
      const hole = [c('K', 'hearts'), c('K', 'diamonds')];
      const community = [c('K', 'clubs'), c('K', 'spades'), c('A', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')];
      const result = evaluateHand(hole, community);
      expect(result.strength).toBe('four-of-a-kind');
      expect(result.description).toContain('Quad');
      expect(result.score).toBeGreaterThanOrEqual(7_000_000);
      expect(result.score).toBeLessThan(8_000_000);
    });

    it('identifies a Full House', () => {
      const hole = [c('A', 'hearts'), c('A', 'diamonds')];
      const community = [c('K', 'clubs'), c('K', 'spades'), c('K', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')];
      const result = evaluateHand(hole, community);
      expect(result.strength).toBe('full-house');
      expect(result.description).toContain('Full House');
      expect(result.score).toBeGreaterThanOrEqual(6_000_000);
      expect(result.score).toBeLessThan(7_000_000);
    });

    it('identifies a Flush', () => {
      const hole = [c('A', 'hearts'), c('3', 'hearts')];
      const community = [c('K', 'hearts'), c('J', 'hearts'), c('8', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')];
      const result = evaluateHand(hole, community);
      expect(result.strength).toBe('flush');
      expect(result.description).toContain('Flush');
      expect(result.score).toBeGreaterThanOrEqual(5_000_000);
      expect(result.score).toBeLessThan(6_000_000);
    });

    it('identifies a Straight', () => {
      const hole = [c('10', 'hearts'), c('9', 'diamonds')];
      const community = [c('8', 'clubs'), c('7', 'spades'), c('6', 'hearts'), c('2', 'diamonds'), c('K', 'clubs')];
      const result = evaluateHand(hole, community);
      expect(result.strength).toBe('straight');
      expect(result.description).toContain('Straight');
      expect(result.score).toBeGreaterThanOrEqual(4_000_000);
      expect(result.score).toBeLessThan(5_000_000);
    });

    it('identifies a Wheel Straight (A-2-3-4-5)', () => {
      const hole = [c('A', 'hearts'), c('2', 'diamonds')];
      const community = [c('3', 'clubs'), c('4', 'spades'), c('5', 'hearts'), c('K', 'diamonds'), c('Q', 'clubs')];
      const result = evaluateHand(hole, community);
      expect(result.strength).toBe('straight');
      expect(result.description).toContain('5 high');
    });

    it('identifies Three of a Kind', () => {
      const hole = [c('J', 'hearts'), c('J', 'diamonds')];
      const community = [c('J', 'clubs'), c('A', 'spades'), c('4', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')];
      const result = evaluateHand(hole, community);
      expect(result.strength).toBe('three-of-a-kind');
      expect(result.description).toContain('Trip');
      expect(result.score).toBeGreaterThanOrEqual(3_000_000);
      expect(result.score).toBeLessThan(4_000_000);
    });

    it('identifies Two Pair', () => {
      const hole = [c('10', 'hearts'), c('10', 'diamonds')];
      const community = [c('5', 'clubs'), c('5', 'spades'), c('K', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')];
      const result = evaluateHand(hole, community);
      expect(result.strength).toBe('two-pair');
      expect(result.description).toContain('Two Pair');
      expect(result.score).toBeGreaterThanOrEqual(2_000_000);
      expect(result.score).toBeLessThan(3_000_000);
    });

    it('identifies One Pair', () => {
      const hole = [c('A', 'hearts'), c('A', 'diamonds')];
      const community = [c('K', 'clubs'), c('9', 'spades'), c('4', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')];
      const result = evaluateHand(hole, community);
      expect(result.strength).toBe('pair');
      expect(result.description).toContain('Pair');
      expect(result.score).toBeGreaterThanOrEqual(1_000_000);
      expect(result.score).toBeLessThan(2_000_000);
    });

    it('identifies High Card', () => {
      const hole = [c('A', 'hearts'), c('3', 'diamonds')];
      const community = [c('K', 'clubs'), c('9', 'spades'), c('6', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')];
      const result = evaluateHand(hole, community);
      expect(result.strength).toBe('high-card');
      expect(result.description).toContain('High Card');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThan(1_000_000);
    });
  });

  describe('Score Boundaries — Non-Overlapping Ranges', () => {
    // Test that stronger hand types always have higher scores than weaker ones
    it('Royal Flush > Straight Flush', () => {
      const royal = evaluateHand(
        [c('A', 'spades'), c('K', 'spades')],
        [c('Q', 'spades'), c('J', 'spades'), c('10', 'spades'), c('3', 'hearts'), c('7', 'diamonds')]
      );
      const straightFlush = evaluateHand(
        [c('9', 'hearts'), c('8', 'hearts')],
        [c('7', 'hearts'), c('6', 'hearts'), c('5', 'hearts'), c('2', 'clubs'), c('K', 'diamonds')]
      );
      expect(royal.score).toBeGreaterThan(straightFlush.score);
    });

    it('Straight Flush > Four of a Kind', () => {
      const sf = evaluateHand(
        [c('9', 'hearts'), c('8', 'hearts')],
        [c('7', 'hearts'), c('6', 'hearts'), c('5', 'hearts'), c('2', 'clubs'), c('K', 'diamonds')]
      );
      const quads = evaluateHand(
        [c('K', 'hearts'), c('K', 'diamonds')],
        [c('K', 'clubs'), c('K', 'spades'), c('A', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      expect(sf.score).toBeGreaterThan(quads.score);
    });

    it('Four of a Kind > Full House', () => {
      const quads = evaluateHand(
        [c('K', 'hearts'), c('K', 'diamonds')],
        [c('K', 'clubs'), c('K', 'spades'), c('A', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      const boat = evaluateHand(
        [c('A', 'hearts'), c('A', 'diamonds')],
        [c('K', 'clubs'), c('K', 'spades'), c('K', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      expect(quads.score).toBeGreaterThan(boat.score);
    });

    it('Full House > Flush', () => {
      const boat = evaluateHand(
        [c('A', 'hearts'), c('A', 'diamonds')],
        [c('K', 'clubs'), c('K', 'spades'), c('K', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      const flush = evaluateHand(
        [c('A', 'hearts'), c('3', 'hearts')],
        [c('K', 'hearts'), c('J', 'hearts'), c('8', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      expect(boat.score).toBeGreaterThan(flush.score);
    });

    it('Flush > Straight', () => {
      const flush = evaluateHand(
        [c('A', 'hearts'), c('3', 'hearts')],
        [c('K', 'hearts'), c('J', 'hearts'), c('8', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      const straight = evaluateHand(
        [c('10', 'hearts'), c('9', 'diamonds')],
        [c('8', 'clubs'), c('7', 'spades'), c('6', 'hearts'), c('2', 'diamonds'), c('K', 'clubs')]
      );
      expect(flush.score).toBeGreaterThan(straight.score);
    });

    it('Straight > Three of a Kind', () => {
      const straight = evaluateHand(
        [c('10', 'hearts'), c('9', 'diamonds')],
        [c('8', 'clubs'), c('7', 'spades'), c('6', 'hearts'), c('2', 'diamonds'), c('K', 'clubs')]
      );
      const trips = evaluateHand(
        [c('J', 'hearts'), c('J', 'diamonds')],
        [c('J', 'clubs'), c('A', 'spades'), c('4', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      expect(straight.score).toBeGreaterThan(trips.score);
    });

    it('Three of a Kind > Two Pair', () => {
      const trips = evaluateHand(
        [c('J', 'hearts'), c('J', 'diamonds')],
        [c('J', 'clubs'), c('A', 'spades'), c('4', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      const twoPair = evaluateHand(
        [c('10', 'hearts'), c('10', 'diamonds')],
        [c('5', 'clubs'), c('5', 'spades'), c('K', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      expect(trips.score).toBeGreaterThan(twoPair.score);
    });

    it('Two Pair > One Pair', () => {
      const twoPair = evaluateHand(
        [c('10', 'hearts'), c('10', 'diamonds')],
        [c('5', 'clubs'), c('5', 'spades'), c('K', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      const pair = evaluateHand(
        [c('A', 'hearts'), c('A', 'diamonds')],
        [c('K', 'clubs'), c('9', 'spades'), c('4', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      expect(twoPair.score).toBeGreaterThan(pair.score);
    });

    it('One Pair > High Card', () => {
      const pair = evaluateHand(
        [c('2', 'hearts'), c('2', 'diamonds')],
        [c('K', 'clubs'), c('9', 'spades'), c('4', 'hearts'), c('6', 'diamonds'), c('7', 'clubs')]
      );
      const highCard = evaluateHand(
        [c('A', 'hearts'), c('3', 'diamonds')],
        [c('K', 'clubs'), c('9', 'spades'), c('6', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      expect(pair.score).toBeGreaterThan(highCard.score);
    });
  });

  describe('Tie-Breakers', () => {
    it('higher pair beats lower pair', () => {
      const higherPair = evaluateHand(
        [c('A', 'hearts'), c('A', 'diamonds')],
        [c('K', 'clubs'), c('9', 'spades'), c('4', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      const lowerPair = evaluateHand(
        [c('K', 'hearts'), c('K', 'diamonds')],
        [c('9', 'clubs'), c('8', 'spades'), c('4', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      expect(higherPair.score).toBeGreaterThan(lowerPair.score);
    });

    it('higher kicker breaks pair tie', () => {
      const betterKicker = evaluateHand(
        [c('A', 'hearts'), c('A', 'diamonds')],
        [c('K', 'clubs'), c('9', 'spades'), c('4', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      const worseKicker = evaluateHand(
        [c('A', 'clubs'), c('A', 'spades')],
        [c('Q', 'diamonds'), c('9', 'hearts'), c('4', 'clubs'), c('2', 'spades'), c('7', 'diamonds')]
      );
      expect(betterKicker.score).toBeGreaterThan(worseKicker.score);
    });

    it('higher two pair beats lower two pair', () => {
      const higherTwoPair = evaluateHand(
        [c('A', 'hearts'), c('A', 'diamonds')],
        [c('K', 'clubs'), c('K', 'spades'), c('4', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      const lowerTwoPair = evaluateHand(
        [c('Q', 'hearts'), c('Q', 'diamonds')],
        [c('J', 'clubs'), c('J', 'spades'), c('4', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      expect(higherTwoPair.score).toBeGreaterThan(lowerTwoPair.score);
    });

    it('higher trips beats lower trips', () => {
      const higherTrips = evaluateHand(
        [c('A', 'hearts'), c('A', 'diamonds')],
        [c('A', 'clubs'), c('K', 'spades'), c('4', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      const lowerTrips = evaluateHand(
        [c('K', 'hearts'), c('K', 'diamonds')],
        [c('K', 'clubs'), c('A', 'spades'), c('4', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      expect(higherTrips.score).toBeGreaterThan(lowerTrips.score);
    });

    it('higher straight beats lower straight', () => {
      const higherStraight = evaluateHand(
        [c('K', 'hearts'), c('Q', 'diamonds')],
        [c('J', 'clubs'), c('10', 'spades'), c('9', 'hearts'), c('2', 'diamonds'), c('3', 'clubs')]
      );
      const lowerStraight = evaluateHand(
        [c('10', 'hearts'), c('9', 'diamonds')],
        [c('8', 'clubs'), c('7', 'spades'), c('6', 'hearts'), c('2', 'diamonds'), c('K', 'clubs')]
      );
      expect(higherStraight.score).toBeGreaterThan(lowerStraight.score);
    });

    it('higher flush beats lower flush (by high card)', () => {
      const higherFlush = evaluateHand(
        [c('A', 'hearts'), c('3', 'hearts')],
        [c('K', 'hearts'), c('J', 'hearts'), c('8', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      const lowerFlush = evaluateHand(
        [c('K', 'hearts'), c('3', 'hearts')],
        [c('J', 'hearts'), c('10', 'hearts'), c('8', 'hearts'), c('A', 'diamonds'), c('7', 'clubs')]
      );
      expect(higherFlush.score).toBeGreaterThan(lowerFlush.score);
    });

    it('higher full house beats lower full house', () => {
      const higherBoat = evaluateHand(
        [c('A', 'hearts'), c('A', 'diamonds')],
        [c('A', 'clubs'), c('K', 'spades'), c('K', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      const lowerBoat = evaluateHand(
        [c('K', 'hearts'), c('K', 'diamonds')],
        [c('K', 'clubs'), c('A', 'spades'), c('A', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      expect(higherBoat.score).toBeGreaterThan(lowerBoat.score);
    });

    it('higher quads beats lower quads', () => {
      const higherQuads = evaluateHand(
        [c('A', 'hearts'), c('A', 'diamonds')],
        [c('A', 'clubs'), c('A', 'spades'), c('K', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      const lowerQuads = evaluateHand(
        [c('K', 'hearts'), c('K', 'diamonds')],
        [c('K', 'clubs'), c('K', 'spades'), c('A', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      expect(higherQuads.score).toBeGreaterThan(lowerQuads.score);
    });
  });

  describe('Edge Cases', () => {
    it('handles less than 5 cards gracefully', () => {
      const result = evaluateHand(
        [c('A', 'hearts'), c('K', 'diamonds')],
        [c('Q', 'clubs'), c('J', 'spades')]
      );
      expect(result.strength).toBe('high-card');
      expect(result.description).toBe('High Card');
    });

    it('handles board-pair vs hole-card-pair (counterfeited)', () => {
      // Board has a pair of Kings, player has low pair of 3s
      const playerWithDeuces = evaluateHand(
        [c('3', 'hearts'), c('3', 'diamonds')],
        [c('K', 'clubs'), c('K', 'spades'), c('A', 'hearts'), c('9', 'diamonds'), c('2', 'clubs')]
      );
      expect(playerWithDeuces.strength).toBe('two-pair');
      // The two pair uses the board's K pair and hole pair of 3s
      expect(playerWithDeuces.description).toContain('Kings');
      expect(playerWithDeuces.description).toContain('Threes');
    });

    it('handles board with 4 spades and player has none', () => {
      const result = evaluateHand(
        [c('A', 'hearts'), c('K', 'diamonds')],
        [c('2', 'spades'), c('5', 'spades'), c('9', 'spades'), c('J', 'spades'), c('7', 'clubs')]
      );
      // No flush for this player — best hand is high card
      expect(result.strength).not.toBe('flush');
    });

    it('handles board straight and player has better straight', () => {
      const result = evaluateHand(
        [c('K', 'diamonds'), c('Q', 'clubs')],
        [c('J', 'hearts'), c('10', 'spades'), c('9', 'diamonds'), c('2', 'clubs'), c('3', 'hearts')]
      );
      expect(result.strength).toBe('straight');
      expect(result.description).toContain('King');
    });

    it('handles ace-low straight vs ace-high straight', () => {
      const wheel = evaluateHand(
        [c('A', 'hearts'), c('2', 'diamonds')],
        [c('3', 'clubs'), c('4', 'spades'), c('5', 'hearts'), c('K', 'diamonds'), c('Q', 'clubs')]
      );
      const broadway = evaluateHand(
        [c('A', 'hearts'), c('K', 'diamonds')],
        [c('Q', 'clubs'), c('J', 'spades'), c('10', 'hearts'), c('2', 'diamonds'), c('3', 'clubs')]
      );
      expect(broadway.score).toBeGreaterThan(wheel.score);
      expect(wheel.strength).toBe('straight');
      expect(broadway.strength).toBe('straight');
    });

    it('handles all 7 cards of the same suit', () => {
      const result = evaluateHand(
        [c('A', 'hearts'), c('K', 'hearts')],
        [c('Q', 'hearts'), c('J', 'hearts'), c('10', 'hearts'), c('9', 'hearts'), c('8', 'hearts')]
      );
      expect(result.strength).toBe('straight-flush');
    });
  });

  describe('Best 5-Card Selection', () => {
    it('picks the best 5 from 7 cards', () => {
      // Player has AK, board has AKQJ10 — should pick royal/straight flush if suited, else straight
      const result = evaluateHand(
        [c('A', 'hearts'), c('K', 'diamonds')],
        [c('Q', 'clubs'), c('J', 'spades'), c('10', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      expect(result.strength).toBe('straight');
      expect(result.description).toContain('Ace');
    });

    it('correctly selects the flush when both flush and straight possible', () => {
      const result = evaluateHand(
        [c('A', 'hearts'), c('2', 'hearts')],
        [c('3', 'hearts'), c('4', 'hearts'), c('5', 'hearts'), c('6', 'diamonds'), c('7', 'clubs')]
      );
      // Straight flush possible: A-2-3-4-5 all hearts
      expect(result.strength).toBe('straight-flush');
    });

    it('correctly selects full house over trips when both possible', () => {
      const result = evaluateHand(
        [c('A', 'hearts'), c('A', 'diamonds')],
        [c('K', 'clubs'), c('K', 'spades'), c('K', 'hearts'), c('2', 'diamonds'), c('7', 'clubs')]
      );
      // Both full house (AAA+KK) and trips (KKK) possible — should pick full house
      expect(result.strength).toBe('full-house');
    });
  });

  describe('Performance Benchmark', () => {
    it('evaluates 10,000 hands in under 500ms', () => {
      const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
      const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'] as const;

      const hands = Array.from({ length: 10000 }, () => {
        const holeCards: Card[] = [
          { rank: ranks[Math.floor(Math.random() * 13)], suit: suits[Math.floor(Math.random() * 4)], id: '' },
          { rank: ranks[Math.floor(Math.random() * 13)], suit: suits[Math.floor(Math.random() * 4)], id: '' },
        ];
        holeCards.forEach((hc, i) => { hc.id = `${hc.rank}-${hc.suit}-${i}`; });
        const communityCards: Card[] = Array.from({ length: 5 }, (_, i) => {
          const card = { rank: ranks[Math.floor(Math.random() * 13)], suit: suits[Math.floor(Math.random() * 4)], id: `cc-${i}` };
          return card;
        });
        return { holeCards, communityCards };
      });

      const start = performance.now();
      for (const hand of hands) {
        evaluateHand(hand.holeCards, hand.communityCards);
      }
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(500);
    });
  });
});

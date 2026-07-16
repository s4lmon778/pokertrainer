/**
 * GTO Solver Component
 * 
 * Interactive UI for the GTO solver on the Rules page.
 * Displays Pio-style strategy charts and allows hand analysis.
 */

import React, { useState, useCallback } from 'react';
import { solve, getStrategyForHand } from '../engine/gto-solver/solver';
import { cardIndexToString } from '../engine/gto-solver/equity';
import type { SolveResult, CardIndex } from '../engine/gto-solver/types';
import { RangeSelector } from './RangeSelector';

interface GTOSolverProps {
  board: CardIndex[];
  heroHand: CardIndex[];
  villainHand: CardIndex[];
}

export const GTOSolver: React.FC<GTOSolverProps> = ({ board, heroHand, villainHand }) => {
  const [result, setResult] = useState<SolveResult | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [iterations, setIterations] = useState(100);
  const [strategy, setStrategy] = useState<Map<string, number>>(new Map());
  const [heroRange, setHeroRange] = useState<Set<string>>(new Set());
  const [villainRange, setVillainRange] = useState<Set<string>>(new Set());
  const [heroPreset, setHeroPreset] = useState<string>('');
  const [villainPreset, setVillainPreset] = useState<string>('');

  /**
   * Handle hand toggle in range selector.
   */
  const handleHeroHandToggle = useCallback((hand: string, selected: boolean) => {
    setHeroRange(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(hand);
      } else {
        next.delete(hand);
      }
      return next;
    });
  }, []);

  const handleVillainHandToggle = useCallback((hand: string, selected: boolean) => {
    setVillainRange(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(hand);
      } else {
        next.delete(hand);
      }
      return next;
    });
  }, []);

  /**
   * Apply preset to range.
   */
  const applyPreset = useCallback((presetName: string, isHero: boolean) => {
    const allHands = new Set<string>();
    // Add all 169 hand types
    for (let i = 0; i < 13; i++) {
      for (let j = 0; j < 13; j++) {
        const isPair = i === j;
        const isSuited = i < j;
        const hiRank = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'][Math.min(i, j)];
        const loRank = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'][Math.max(i, j)];
        const handKey = isPair ? `${hiRank}${loRank}` : isSuited ? `${hiRank}${loRank}s` : `${hiRank}${loRank}o`;
        allHands.add(handKey);
      }
    }
    
    // Simplified preset logic - in real implementation would use proper range definitions
    if (presetName === '100%') {
      if (isHero) setHeroRange(allHands);
      else setVillainRange(allHands);
    } else if (presetName === 'Ultra Tight') {
      const tightHands = new Set(['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AKo']);
      if (isHero) setHeroRange(tightHands);
      else setVillainRange(tightHands);
    } else if (presetName === 'Tight') {
      const tightHands = new Set(['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AKo', 'AQs', 'AJs', 'KQs']);
      if (isHero) setHeroRange(tightHands);
      else setVillainRange(tightHands);
    } else if (presetName === 'Loose') {
      const looseHands = new Set(['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AKo', 'AQs', 'AJs', 'KQs', 'KJs', 'QJs', 'JTs']);
      if (isHero) setHeroRange(looseHands);
      else setVillainRange(looseHands);
    } else if (presetName === 'Very Loose') {
      // Include most hands
      if (isHero) setHeroRange(allHands);
      else setVillainRange(allHands);
    }
    
    if (isHero) setHeroPreset(presetName);
    else setVillainPreset(presetName);
  }, []);

  /**
   * Run the solver with current parameters.
   */
  const handleSolve = useCallback(async () => {
    setIsSolving(true);
    
    try {
      // Convert range sets to numerical indices for solver
      const heroRangeIndices = convertRangeToIndices(heroRange);
      const villainRangeIndices = convertRangeToIndices(villainRange);
      
      // Run solver
      const solveResult = solve(
        board,
        heroRangeIndices,
        villainRangeIndices,
        100, // stack size
        2,   // pot size
        iterations
      );
      
      setResult(solveResult);
      
      // Get strategy for current hand
      const handStrategy = getStrategyForHand(solveResult, heroHand, board);
      setStrategy(handStrategy);
    } catch (error) {
      console.error('Solver error:', error);
    } finally {
      setIsSolving(false);
    }
  }, [board, heroHand, heroRange, villainRange, iterations]);

  /**
   * Convert range set to numerical indices.
   */
  function convertRangeToIndices(rangeSet: Set<string>): number[] {
    const indices: number[] = [];
    const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    
    for (let i = 0; i < 13; i++) {
      for (let j = 0; j < 13; j++) {
        const isPair = i === j;
        const isSuited = i < j;
        const hiRank = ranks[Math.min(i, j)];
        const loRank = ranks[Math.max(i, j)];
        const handKey = isPair ? `${hiRank}${loRank}` : isSuited ? `${hiRank}${loRank}s` : `${hiRank}${loRank}o`;
        
        if (rangeSet.has(handKey)) {
          // Convert to 1326 index
          const index = isPair ? i * 13 + j - (i * (i + 1)) / 2 : i * 13 + j;
          indices.push(index);
        }
      }
    }
    
    return indices;
  }

  /**
   * Format strategy map for display.
   */
  const formatStrategy = (): string => {
    const parts: string[] = [];
    for (const [action, prob] of strategy.entries()) {
      parts.push(`${action}: ${(prob * 100).toFixed(1)}%`);
    }
    return parts.join(', ') || 'No strategy data available';
  };

  return (
    <div className="gto-solver space-y-4">
      <h3 className="text-xl font-bold">GTO Solver</h3>
      
      {/* Range Selectors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RangeSelector
          title="Hero Range"
          selectedHands={heroRange}
          onHandToggle={handleHeroHandToggle}
          preset={heroPreset}
          onPresetSelect={(preset) => applyPreset(preset, true)}
        />
        <RangeSelector
          title="Villain Range"
          selectedHands={villainRange}
          onHandToggle={handleVillainHandToggle}
          preset={villainPreset}
          onPresetSelect={(preset) => applyPreset(preset, false)}
        />
      </div>
      
      {/* Solver Controls */}
      <div className="p-4 bg-gray-800 rounded-lg">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Iterations: {iterations}
          </label>
          <input
            type="range"
            min="10"
            max="500"
            step="10"
            value={iterations}
            onChange={(e) => setIterations(Number(e.target.value))}
            className="w-full"
          />
        </div>
        
        <button
          onClick={handleSolve}
          disabled={isSolving}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isSolving ? 'Solving...' : 'Solve'}
        </button>
      </div>
      
      {/* Results */}
      {result && (
        <div className="p-4 bg-gray-700 rounded">
          <h4 className="font-bold mb-2">Solution Complete</h4>
          <p className="text-sm">
            Iterations: {result.iterations} | Time: {result.solveTimeMs}ms | Exploitability: {result.exploitability.toFixed(4)}
          </p>
          
          <h5 className="font-bold mt-4 mb-2">Strategy for {heroHand.map(cardIndexToString).join('')}:</h5>
          <pre className="text-xs bg-gray-900 p-2 rounded">
            {formatStrategy()}
          </pre>
        </div>
      )}
    </div>
  );
};

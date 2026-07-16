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

  /**
   * Run the solver with current parameters.
   */
  const handleSolve = useCallback(async () => {
    setIsSolving(true);
    
    try {
      // Create simple ranges (100% for now - real implementation would use range selectors)
      const heroRange = generateFullRange();
      const villainRange = generateFullRange();
      
      // Run solver
      const solveResult = solve(
        board,
        heroRange,
        villainRange,
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
  }, [board, heroHand, villainHand, iterations]);

  /**
   * Generate a full range (all hands).
   */
  function generateFullRange(): number[] {
    const range: number[] = [];
    for (let i = 0; i < 1326; i++) {
      range.push(i);
    }
    return range;
  }

  /**
   * Format strategy map for display.
   */
  const formatStrategy = (): string => {
    const parts: string[] = [];
    for (const [action, prob] of strategy.entries()) {
      parts.push(`${action}: ${(prob * 100).toFixed(1)}%`);
    }
    return parts.join(', ');
  };

  return (
    <div className="gto-solver p-4 bg-gray-800 rounded-lg">
      <h3 className="text-xl font-bold mb-4">GTO Solver</h3>
      
      {/* Controls */}
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
        
        <button
          onClick={handleSolve}
          disabled={isSolving}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isSolving ? 'Solving...' : 'Solve'}
        </button>
      </div>
      
      {/* Results */}
      {result && (
        <div className="mt-4 p-4 bg-gray-700 rounded">
          <h4 className="font-bold mb-2">Solution Complete</h4>
          <p className="text-sm">
            Iterations: {result.iterations} | Time: {result.solveTimeMs}ms | Exploitability: {result.exploitability.toFixed(4)}
          </p>
          
          <h5 className="font-bold mt-4 mb-2">Strategy for {heroHand.map(cardIndexToString).join('')}:</h5>
          <pre className="text-xs bg-gray-900 p-2 rounded">
            {formatStrategy() || 'No strategy data available'}
          </pre>
        </div>
      )}
    </div>
  );
};

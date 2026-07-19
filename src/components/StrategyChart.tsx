/**
 * GTO Strategy Chart Component
 * 
 * Pio-style color-coded hand matrix visualization for GTO solver results.
 * Displays strategy frequencies across all 169 hand combinations.
 */

import React, { useMemo } from 'react';
import type { CardIndex } from '../engine/gto-solver/types';

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

interface StrategyChartProps {
  title: string;
  strategyData: Map<string, number>;
  heroHand: CardIndex[];
  board: CardIndex[];
  actionLabel?: string;
}

/**
 * Get color for strategy frequency (Pio-style gradient).
 */
function getFrequencyColor(freq: number): string {
  if (freq >= 0.9) return 'bg-red-600';
  if (freq >= 0.7) return 'bg-orange-500';
  if (freq >= 0.5) return 'bg-yellow-500';
  if (freq >= 0.3) return 'bg-green-500';
  if (freq > 0) return 'bg-green-300';
  return 'bg-gray-700';
}

/**
 * Get text color based on background brightness.
 */
function getTextColor(freq: number): string {
  return freq > 0.5 ? 'text-white' : 'text-gray-200';
}

/**
 * Calculate hand strength rank (1-169) for display.
 */
function getHandRank(hiRank: string, loRank: string, isPair: boolean, isSuited: boolean): string {
  if (isPair) return `${hiRank}${loRank}`;
  return isSuited ? `${hiRank}${loRank}s` : `${hiRank}${loRank}o`;
}

export const StrategyChart: React.FC<StrategyChartProps> = ({
  title,
  strategyData,
  heroHand,
  board,
  actionLabel = 'Frequency',
}) => {
  /**
   * Build matrix data from strategy map.
   */
  const matrixData = useMemo(() => {
    const matrix: number[][] = [];
    
    for (let i = 0; i < 13; i++) {
      const row: number[] = [];
      for (let j = 0; j < 13; j++) {
        const isPair = i === j;
        const isSuited = i < j;
        const hiRank = RANKS[Math.min(i, j)];
        const loRank = RANKS[Math.max(i, j)];
        const handKey = getHandRank(hiRank, loRank, isPair, isSuited);
        
        // Get frequency from strategy data
        const freq = strategyData.get(handKey) || 0;
        row.push(freq);
      }
      matrix.push(row);
    }
    
    return matrix;
  }, [strategyData]);

  /**
   * Calculate statistics.
   */
  const stats = useMemo(() => {
    let totalFreq = 0;
    let count = 0;
    let maxFreq = 0;
    let minFreq = 1;
    
    for (const row of matrixData) {
      for (const freq of row) {
        if (freq > 0) {
          totalFreq += freq;
          count++;
          maxFreq = Math.max(maxFreq, freq);
          minFreq = Math.min(minFreq, freq);
        }
      }
    }
    
    return {
      avgFreq: count > 0 ? totalFreq / count : 0,
      maxFreq,
      minFreq,
      handsWithStrategy: count,
      totalHands: 169,
    };
  }, [matrixData]);

  return (
    <div className="strategy-chart p-4 bg-gray-800 rounded-lg">
      <h4 className="text-lg font-bold mb-3">{title}</h4>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-600 rounded"></span> ≥90%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-orange-500 rounded"></span> ≥70%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-500 rounded"></span> ≥50%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-500 rounded"></span> ≥30%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-300 rounded"></span> {'>'}0%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-gray-700 rounded"></span> 0%
        </span>
      </div>
      
      {/* Matrix Grid */}
      <div className="hand-matrix">
        <div className="grid grid-cols-14 gap-0.5 text-[8px]">
          {/* Header row */}
          <div className="col-span-1"></div>
          {RANKS.map(rank => (
            <div key={rank} className="text-center font-bold text-gray-400">{rank}</div>
          ))}
          
          {/* Matrix rows */}
          {matrixData.map((row, i) => (
            <React.Fragment key={i}>
              <div className="text-center font-bold text-gray-400">{RANKS[i]}</div>
              {row.map((freq, j) => {
                const isPair = i === j;
                const isSuited = i < j;
                const hiRank = RANKS[Math.min(i, j)];
                const loRank = RANKS[Math.max(i, j)];
                const handKey = getHandRank(hiRank, loRank, isPair, isSuited);
                const bgColor = getFrequencyColor(freq);
                const textColor = getTextColor(freq);
                
                return (
                  <div
                    key={`${i}-${j}`}
                    className={`aspect-square flex items-center justify-center rounded cursor-pointer transition-all hover:scale-110 ${bgColor} ${textColor}`}
                    title={`${handKey}: ${(freq * 100).toFixed(1)}%`}
                  >
                    {isPair ? `${hiRank}${loRank}` : isSuited ? `${hiRank}${loRank}s` : `${hiRank}${loRank}o`}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Statistics */}
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="bg-gray-700 p-2 rounded">
          <div className="text-gray-400">Avg Frequency</div>
          <div className="font-bold">{(stats.avgFreq * 100).toFixed(1)}%</div>
        </div>
        <div className="bg-gray-700 p-2 rounded">
          <div className="text-gray-400">Max Frequency</div>
          <div className="font-bold">{(stats.maxFreq * 100).toFixed(1)}%</div>
        </div>
        <div className="bg-gray-700 p-2 rounded">
          <div className="text-gray-400">Hands with Strategy</div>
          <div className="font-bold">{stats.handsWithStrategy}/{stats.totalHands}</div>
        </div>
        <div className="bg-gray-700 p-2 rounded">
          <div className="text-gray-400">Action</div>
          <div className="font-bold">{actionLabel}</div>
        </div>
      </div>
    </div>
  );
};

/**
 * Multi-action strategy chart — shows multiple actions side-by-side.
 */
export const MultiActionChart: React.FC<{
  title: string;
  actions: { label: string; data: Map<string, number> }[];
  heroHand: CardIndex[];
  board: CardIndex[];
}> = ({ title, actions, heroHand, board }) => {
  return (
    <div className="multi-action-chart space-y-4">
      <h3 className="text-xl font-bold">{title}</h3>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {actions.map(action => (
          <StrategyChart
            key={action.label}
            title={action.label}
            strategyData={action.data}
            heroHand={heroHand}
            board={board}
            actionLabel={action.label}
          />
        ))}
      </div>
    </div>
  );
};

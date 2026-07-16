/**
 * GTO Solver Web Worker
 * 
 * Runs the DCFR solver in a background thread to avoid blocking the UI.
 * Uses the Worker API for parallel computation.
 */

import { solve } from './solver';
import type { SolveRequest, SolveProgress, SolveComplete, SolveError, WorkerMessage, WorkerResponse, CardIndex } from './types';

// Worker message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  
  try {
    if (message.type === 'SOLVE') {
      await handleSolveRequest(message);
    }
  } catch (error) {
    // Send error response
    self.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
    } as SolveError);
  }
};

/**
 * Handle solve request from main thread.
 */
async function handleSolveRequest(request: SolveRequest): Promise<void> {
  // Notify progress start
  self.postMessage({
    type: 'PROGRESS',
    iteration: 0,
    total: request.iterations,
    exploitability: 1.0,
  } as SolveProgress);
  
  // Run solver (this is synchronous in the worker)
  const result = solve(
    request.board,
    request.heroRange,
    request.villainRange,
    {
      stackSize: request.stackSize,
      potSize: request.potSize,
      iterations: request.iterations,
      onProgress: (iteration, exploitability) => {
        self.postMessage({
          type: 'PROGRESS',
          iteration,
          total: request.iterations,
          exploitability,
        } as SolveProgress);
      },
    },
  );
  
  // Send complete response
  self.postMessage({
    type: 'COMPLETE',
    result,
    timeMs: result.solveTimeMs,
  } as SolveComplete);
}

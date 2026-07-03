# PokerTrainer Project Fixes

You are working on the PokerTrainer project at C:\Users\cheuk\OneDrive\Desktop\AI-Development\Projects\pokertrainer

## Current State
- React 19 + TypeScript + Vite + Zustand + Tailwind CSS
- Build passes but has known bugs
- We've already fixed unused variable warnings and bankroll calculation

## Issues to Fix (ONE AT A TIME, verify build after each)

### 1. Side Pot Handling in resolveHand
File: src/store/gameStore.ts, function resolveHand()
Problem: Doesn't handle all-in players properly. When someone goes all-in, they should only win the portion of the pot they contributed to.
Fix: 
- Calculate each player's contribution to the pot
- When distributing winnings, an all-in player can only win up to their contribution
- Use the sidePots array in GameState to track this
- Pass pot distribution info to endHand()

### 2. Pot Double-Counting in botAct  
File: src/store/gameStore.ts, function botAct()
Problem: When bot raises, the pot is updated by adding potIncrease, but the player's chips were already deducted. This causes incorrect pot totals.
Fix: 
- In botAct(), only update player chips (chips -= amount, bet += amount)
- Update pot by calculating the difference in totalBetThisRound before and after
- Don't double-add to the pot

### 3. Hardcoded Bot Delay
File: src/App.tsx, line ~54
Problem: Bot auto-play uses hardcoded 100ms delay instead of reading autoPlaySpeed from store
Fix: 
- Import autoPlaySpeed from useGameStore
- Use it instead of the hardcoded 100 in the setTimeout

### 4. Improve Hand Evaluator Tie-Breaking
File: src/utils/handEvaluator.ts, function evaluate5Card()
Problem: Scoring formula doesn't distinguish well between hands with same rank but different kickers
Fix:
- Modify the scoring to use higher precision for kickers
- For high-card and flush hands, the current formula uses powers of 15 which should work, but verify the scoring gives proper differentiation
- For pair/two-pair/three-of-a-kind, ensure kickers are properly weighted

### 5. Better Equity Calculation in RiskOverlay
File: src/components/RiskOverlay.tsx
Problem: Uses arbitrary phase multipliers for equity estimation
Fix:
- Consider: hand strength score, number of active opponents, cards dealt so far, pot odds
- Use a more realistic formula based on outs and community cards remaining

### 6. Human Decision Tracking
File: src/store/gameStore.ts
Problem: Only bot decisions are tracked, not human decisions
Fix:
- Add a function to track human decisions with accuracy comparison
- When human acts, compare against what the bot engine would recommend
- Store this in botEvaluations or a new humanEvaluations array

### 7. All-In Keyboard Shortcut
File: src/components/PlayerControls.tsx
Problem: No keyboard shortcut for all-in
Fix:
- Add Ctrl+Shift+A or Ctrl+Enter for all-in
- Update the keyboard event handler

## Constraints
- Fix ONE issue at a time
- Run npm run build after each fix to verify it passes
- Don't change the overall architecture or UI design
- Preserve the dark casino theme
- Keep the Zustand store pattern intact

Start with issue #1 (Side Pot Handling).

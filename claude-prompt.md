Fix the following issues in the pokertrainer project, one at a time, verifying each fix with a build:

BUG FIXES (critical):

1. Unused variables - Remove or use these:
   - App.tsx line 19: resolveHand declared but never read
   - gameStore.ts line 3: HandEvaluation imported but unused  
   - gameStore.ts line 450: activePlayers declared but never read
   - gameStore.ts line 583: humanNew declared but never read

2. Side pot handling - resolveHand() does not handle all-in players splitting pots. When a player is all-in, they should only win the portion of the pot they contributed to. Fix the showdown logic to properly distribute side pots.

3. Bankroll calculation bug - endHand() has flawed logic. When human wins, it does currentBankroll + pot but pot includes blinds from BOTH players, not just the human bet. The correct formula: human net = potWon - humanOriginalBet. Track this properly.

4. Hardcoded bot delay - App.tsx bot auto-play uses hardcoded 100ms delay instead of reading autoPlaySpeed from the store.

5. Pot double-counting - In botAct(), the pot is updated by adding potIncrease but the player chips were already deducted. This can cause the pot to grow incorrectly when the bot raises.

IMPROVEMENTS:

6. Human decision tracking - Currently only bot decisions are tracked. Add tracking of human player decisions (fold/call/raise/check) with accuracy compared to what the bot engine recommends.

7. Better equity in RiskOverlay - The current equity estimation uses arbitrary phase multipliers. Improve it to consider: hand strength score, number of opponents, cards dealt so far, and pot odds more accurately.

8. Tie-breaking in hand evaluator - evaluateHand() scores are not precise enough for tie-breaking. Two hands with the same rank but different kickers should be distinguished. Fix the scoring formula.

9. All-in keyboard shortcut - Add Ctrl+Shift+A or a dedicated key for all-in in PlayerControls.

CONSTRAINTS:
- Fix ONE issue at a time, verify build passes after each
- Do not change the overall architecture or UI design
- Preserve the dark casino theme
- Keep the Zustand store pattern intact
- Use the superpowers skills: executing-plans, verification-before-completion

Start with fixing the 4 unused variable warnings, then move to the critical bugs, then improvements.

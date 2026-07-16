# PokerTrainer — Round 4 Deep Improvements

Continue improving the poker trainer at:
`C:\Users\cheuk\OneDrive\Desktop\AI-Development\Projects\pokertrainer`

## CURRENT STATE
- Build passes clean
- Cards visible, slider fixed, overlay positioned
- Accessibility improvements made
- SettingsPanel React import fixed
- Documentation started

## FOCUS AREAS FOR THIS ROUND

### 1. STARTING HANDS MATRIX — VERIFY CORRECTNESS
The matrix in App.tsx needs careful verification:
- RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
- Diagonal (i===j): pairs ✓ (AA, KK, QQ...)
- Above diagonal (i<j): offsuit — but current code says `isSuited = i > j` which means ABOVE diagonal is offsuit
- BELOW diagonal (i>j): suited — but this is WRONG. Suited should be ABOVE diagonal
- FIX: Swap the logic. `isSuited = i < j` (above diagonal), `isOffsuit = i > j` (below diagonal)
- Also verify labels: above diagonal should show AKs (higher-lowier suited), below should show AKo (higher-lower offsuit)

### 2. BOT ENGINE — BET SIZING IMPROVEMENTS
- The bot bet sizing uses fixed multipliers (pot, half-pot, quarter-pot)
- Improve to use more realistic sizing based on:
  - Street (preflop vs postflop sizing differs)
  - Position (late position can bet larger)
  - Hand strength (stronger hands can bet bigger for value)
  - Opponent count (more players = larger bets for protection)
- Add TODO comments for future GTO integration

### 3. GAME STORE — STATE MANAGEMENT
- The store is ~900 lines and very complex
- Extract side-pot calculation into a pure function in a new file
- Extract hand resolution into a pure function
- Add TODO comments for future Training Bot integration points
- Ensure the store state is serializable for future desktop bot sharing

### 4. ANIMATIONS — POLISH
- Card dealing animation should have staggered delays per player
- Community cards should flip in one at a time
- Chip movement to pot should animate
- Winner celebration should feel premium (not overwhelming)
- Page transitions should be smooth

### 5. RESPONSIVE DESIGN — COMPLETE
- Test and fix ALL breakpoints (sm, md, lg, xl)
- Mobile: stack controls vertically
- Tablet: adjust table size
- Desktop: optimal viewing
- Ensure no horizontal scroll on any screen size

### 6. ERROR BOUNDARY — VERIFICATION
- Ensure ErrorBoundary catches all types of errors
- Add proper error message display
- Add retry mechanism

### 7. PERFORMANCE — DEEP AUDIT
- Profile render counts with React DevTools pattern
- Ensure no parent re-renders trigger child re-renders unnecessarily
- Check that gameStore selectors are granular
- Verify lazy loading works for tabs

### 8. FINAL DOCUMENTATION
- Complete README.md
- Add inline JSDoc to all public functions
- Document the folder structure
- Document the state flow diagram

## IMPORTANT RULES
- DO NOT rewrite major systems
- DO NOT replace the Zustand store
- DO NOT change the poker engine logic
- Preserve ALL existing functionality
- After each change, verify `npm run build` passes
- After changes, run `npx tsc --noEmit` to catch unused variable warnings
- Be surgical and precise

## WORKFLOW
After every meaningful improvement:
1. Explain what changed and why
2. List modified files
3. Mention anything that should be tested
4. Immediately continue

Keep iterating. Do not stop.

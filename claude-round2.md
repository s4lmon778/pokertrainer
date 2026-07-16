# PokerTrainer — Round 2 Deep Improvements

Continue improving the poker trainer at:
`C:\Users/cheuk/OneDrive/Desktop/AI-Development/Projects/pokertrainer`

## CURRENT STATE
- Build passes clean (tsc -b && tsc --noEmit)
- Cards visible (flat design)
- Raise slider fixed
- Winner overlay positioned correctly
- Buttons disabled during bot turns
- Formatting uses toLocaleString()
- Chip stack opacity fixed
- Table responsive with minWidth
- Unused imports cleaned
- console.logs removed

## FOCUS AREAS FOR THIS ROUND

### 1. ACCESSIBILITY (HIGH PRIORITY)
- Add `focus-visible` styles to ALL interactive elements (buttons, inputs, links)
- Add `aria-label` to icon-only buttons (Fold, Check, Call, Raise, All In)
- Add `aria-live="polite"` to game status announcements
- Add `role="status"` to game state regions
- Ensure keyboard navigation works: Tab through buttons, Enter/Space to activate
- Add `aria-describedby` to slider for accessibility

### 2. STARTING HANDS MATRIX (RULES PAGE)
The matrix in App.tsx has a labeling bug:
- Row labels should match column labels
- Above diagonal: suited hands (AKs, KQs...) — higher rank first
- Below diagonal: offsuit hands (AKo, KQo...) — higher rank first
- Diagonal: pocket pairs (AA, KK...)
- Verify the `getHandPercentile` function produces correct labels
- Check that `isSuited = i > j` is correct given the RANKS array order ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
- When i > j (e.g., row A, col K): should be AKs (suited) ✓
- When i < j (e.g., row K, col A): should be KAo (offsuit) → but label shows "KAo" not "AKo"
- FIX: Below diagonal should show lower-higher format (AKo not KAo)

### 3. BOT ENGINE READABILITY
- The botDecision function in botEngine.ts is complex (~200 lines)
- Extract sub-functions: calculateEquity(), decideAction(), calculateBetSize()
- Add JSDoc comments to exported functions
- Add type annotations to helper functions
- Document the personality system

### 4. GAME STORE ARCHITECTURE
- The gameStore is ~900 lines — very large
- Extract side-pot calculation into a pure function
- Extract hand resolution into a pure function
- Document the state flow with JSDoc
- Add TODO comments for future Training Bot extension points

### 5. CSS CLEANUP
- Check for unused CSS classes in index.css
- Ensure all animations have corresponding keyframes
- Remove any dead CSS rules
- Standardize the focus-visible pattern

### 6. POKER TABLE IMMERSION
- Add dealer button visual (small circle with "D")
- Add SB/BB position indicators
- Improve the felt texture (add subtle noise)
- Add wood grain to the rail
- Make community cards larger and more prominent
- Add a subtle table edge shadow

### 7. PERFORMANCE
- Check for unnecessary re-renders in the game loop
- Use `useCallback` for all event handlers in components
- Ensure `useMemo` dependencies are correct
- Add `React.memo` to any components missing it

### 8. DOCUMENTATION
- Create a README.md with project overview
- Document the folder structure
- Document the game state flow
- Document the bot personality system
- Document future Training Bot extension points

## IMPORTANT RULES
- DO NOT rewrite major systems
- DO NOT replace the Zustand store
- DO NOT change the poker engine logic
- Preserve ALL existing functionality
- After each change, verify `npm run build` passes
- After changes, also run `npx tsc --noEmit` to catch unused variable warnings
- Be surgical and precise

## WORKFLOW
After every meaningful improvement:
1. Explain what changed and why
2. List modified files
3. Mention anything that should be tested
4. Immediately continue

Keep iterating. Do not stop.

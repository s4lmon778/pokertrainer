# PokerTrainer — Round 3 Deep Improvements

Continue improving the poker trainer at:
`C:\Users\cheuk\OneDrive\Desktop\AI-Development\Projects\pokertrainer`

## CURRENT STATE
- Build passes clean (both `npm run build` and `tsc --noEmit`)
- Cards visible, slider fixed, overlay positioned
- Accessible buttons, proper formatting
- Bot engine improved with JSDoc comments
- Game history viewer functional

## FOCUS AREAS FOR THIS ROUND

### 1. ACCESSIBILITY — COMPLETE COVERAGE
Add focus-visible styles to ALL interactive elements:
- Buttons: add `:focus-visible` with gold outline ring
- Inputs (range sliders): ensure visible focus ring
- Navigation tabs: keyboard accessible with visible focus
- Links: proper focus indicators
- Add `aria-label` to ALL icon-only buttons
- Add `aria-live="polite"` region for game status updates
- Add `role="region"` and `aria-label` to each page section

### 2. STARTING HANDS MATRIX LABEL FIX
The matrix in App.tsx has a bug below the diagonal:
- Offsuit hands should show higher rank first (AKo not KAo)
- Currently: when row K (i=1) and col A (j=0), i > j is FALSE → offsuit → label shows "KAo" 
- Should show "AKo" (always higher rank first)
- FIX: The label construction needs to always put higher rank first regardless of position

### 3. POKER TABLE IMMERSION
- Add dealer button visual (small white circle with "D" near pot)
- Add SB/BB indicators on player badges
- Improve community card sizing (make them slightly larger)
- Add subtle wood grain to table rail using CSS
- Improve felt texture with subtle noise pattern
- Add chip stack animation when bets are placed

### 4. PERFORMANCE OPTIMIZATION
- Check ALL event handlers use `useCallback`
- Verify `useMemo` dependencies are complete (no stale closures)
- Ensure no unnecessary re-renders in the game loop
- Add `React.memo` to any components missing it
- Check that gameStore selectors are granular (not pulling whole state)

### 5. CODE QUALITY
- Add JSDoc comments to all exported functions
- Standardize naming conventions (camelCase for vars, PascalCase for components)
- Remove any remaining console.logs
- Check for any `any` types and replace with proper types
- Ensure all interfaces have proper documentation

### 6. DESIGN CONSISTENCY AUDIT
- Check ALL padding uses consistent scale (1, 2, 4, 6, 8, 12, 16)
- Check ALL border-radius values are consistent
- Check ALL shadow values come from theme
- Check ALL color values use Tailwind theme colors
- Standardize gap values across all flex/grid containers

### 7. DOCUMENTATION
- Create README.md with:
  - Project overview and vision
  - Tech stack
  - Folder structure
  - How to run locally
  - Bot personality system documentation
  - Future Training Bot extension points
  - Known limitations

### 8. ERROR HANDLING
- Ensure ErrorBoundary catches all render errors
- Add loading states for async operations
- Add fallback UI for missing data states
- Handle edge cases: 0 chips, 0 pot, empty hands

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

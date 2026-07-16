# PokerTrainer — Round 5 Deep Improvements

Continue improving the poker trainer at:
`C:\Users\cheuk\OneDrive\Desktop\AI-Development\Projects\pokertrainer`

## CURRENT STATE
- Build passes clean
- Cards visible, slider fixed, overlay positioned
- Accessibility improvements made
- SettingsPanel React import fixed
- Game store refactored with pure functions
- Bot engine improved with better bet sizing
- StartingHandsMatrix labels fixed
- Animations enhanced
- Error boundary with retry mechanism
- New sidePot.ts utility created

## FOCUS AREAS FOR THIS ROUND

### 1. STARTING HANDS MATRIX — COLOR GRADIENT VERIFICATION
The matrix uses a gradient to show hand strength. Verify:
- AA should be darkest green (strongest)
- 23o should be lightest (weakest)
- Gradient should be PERCEPTUALLY UNIFORM (not just numerical)
- Check that the percentile calculation is correct
- Verify the legend matches the matrix colors
- Ensure the matrix is readable at all sizes

### 2. CHAT/LIVE FEEDBACK SYSTEM
- Add a subtle "coach tip" system that shows occasional poker advice
- Tips should be context-aware (based on current game state)
- Examples:
  - "Remember to consider your opponent's position"
  - "Bluff frequency should decrease in early position"
  - "Pot odds matter more than hand strength in late stages"
- Add a toggle to enable/disable tips
- Store user preference in localStorage

### 3. KEYBOARD SHORTCUTS ENHANCEMENT
- Verify all shortcuts work: F, C, X, R, A
- Add visual indicator of active shortcuts
- Add a keyboard shortcuts modal/page
- Ensure shortcuts don't conflict with browser defaults
- Add Escape to cancel current action

### 4. SETTINGS PANEL — TRAINING BOT CONFIG
- Add a "Training Bot" settings section (even if stubbed)
- Document future configurable parameters:
  - Skill level (1-100)
  - GTO vs exploitative ratio
  - Aggression factor
  - Bluff frequency
  - Tight/loose tendency
  - Risk tolerance
  - Reaction time range
  - Humanization/randomization level
- These should be documented as TODOs with clear integration points

### 5. STATS DASHBOARD — DATA VISUALIZATION
- Verify all charts render correctly
- Add tooltips on hover for data points
- Ensure charts are responsive
- Add export functionality (CSV download)
- Add date range filtering

### 6. GAME HISTORY — DEEPENING
- Add sorting by multiple criteria (pot size, hand type, duration)
- Add filtering by action (fold, call, raise, all-in)
- Add search by hand pattern
- Add export to CSV
- Add hand comparison feature (compare similar situations)

### 7. MOBILE EXPERIENCE
- Test on various screen sizes
- Ensure touch targets are at least 44px
- Add swipe gestures for navigation
- Optimize for landscape mode
- Ensure no horizontal scroll

### 8. LOADING STATES
- Add skeleton loaders for all async operations
- Show loading spinner during game initialization
- Add optimistic UI updates for instant feedback
- Handle network errors gracefully

### 9. FINAL PERFORMANCE AUDIT
- Profile with React DevTools
- Check for unnecessary re-renders
- Verify bundle size is acceptable
- Add code splitting for large components
- Optimize image assets

### 10. DOCUMENTATION FINALIZATION
- Complete README.md with:
  - Project overview and vision
  - Tech stack
  - Folder structure
  - How to run locally
  - Bot personality system documentation
  - Training Bot future extension points
  - Known limitations
  - Contributing guidelines
  - License

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

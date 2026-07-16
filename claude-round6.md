# PokerTrainer — Round 6 Deep Improvements

Continue improving the poker trainer at:
`C:\Users\cheuk\OneDrive\Desktop\AI-Development\Projects\pokertrainer`

## CURRENT STATE
- Build passes clean
- All previous improvements applied
- Coach tips system added
- Keyboard shortcuts enhanced
- Training Bot settings stubbed
- StatsDashboard improved
- GameHistory enhanced
- Mobile experience optimized
- README.md finalized

## FOCUS AREAS FOR THIS ROUND

### 1. COACH TIPS SYSTEM — CONTEXT AWARENESS
The CoachTips component needs smarter tips:
- Tip should change based on game phase (preflop, flop, turn, river)
- Tip should consider player's recent actions (did they fold often? bluff?)
- Add tip categories: Strategy, Math, Psychology, Bankroll Management
- Allow user to dismiss tips permanently
- Store tip preferences in localStorage

### 2. SETTINGS PANEL — TRAINING BOT CONFIGURATION
Expand the Training Bot stub:
- Add sliders for all configurable parameters
- Add preview of how settings affect bot behavior
- Add preset configurations (GTO, Exploitative, Mixed)
- Add export/import settings functionality
- Document all parameters for future desktop bot integration

### 3. STATS DASHBOARD — DEEP ANALYSIS
- Add win rate by position (UTG, MP, CO, BTN, SB, BB)
- Add win rate by hand strength (pairs, suited connectors, etc.)
- Add bluff success rate tracking
- Add average pot size comparison
- Add time-based trends (win rate over sessions)
- Add export to CSV functionality

### 4. GAME HISTORY — ADVANCED FEATURES
- Add hand comparison feature
- Add mistake detection (compare to GTO recommendation)
- Add coaching mode overlay
- Add session summary generation
- Add export to PGN format (standard poker format)

### 5. PERFORMANCE OPTIMIZATION
- Profile with React DevTools
- Check for unnecessary re-renders
- Optimize bundle size
- Add code splitting for large components
- Optimize image assets
- Implement virtual scrolling for long lists

### 6. ACCESSIBILITY — COMPLETE COVERAGE
- Add skip navigation links
- Add proper heading hierarchy
- Add landmark regions
- Add keyboard trap prevention
- Add screen reader announcements
- Add high contrast mode support

### 7. RESPONSIVE DESIGN — FINAL POLISH
- Test all breakpoints thoroughly
- Ensure no layout shifts
- Add proper meta tags for mobile
- Optimize for all screen densities
- Test on real devices if possible

### 8. ERROR HANDLING — COMPREHENSIVE
- Add boundary for all major components
- Add retry mechanisms
- Add graceful degradation
- Add offline support
- Add data persistence

### 9. DOCUMENTATION — FINAL
- Update README.md with all new features
- Add inline JSDoc to all functions
- Add architecture diagram
- Add deployment guide
- Add contributing guidelines

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

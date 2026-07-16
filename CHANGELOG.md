# Changelog

All notable changes to PokerTrainer will be documented in this file.

## [1.0.0] — 2026-07-16

### Added
- **Poker Game Engine:** Full Texas Hold'em game logic with blinds, betting rounds (preflop/flop/turn/river), showdown evaluation
- **AI Opponents:** Multiple bot personalities (Tight-Aggressive, Loose-Aggressive, Tight-Passive, Balanced) with realistic bet sizing, bluff logic, and tilt mechanics
- **Training Bot (T-Bot):** Configurable AI bot with adjustable aggression, bluff frequency, accuracy, and reaction time
- **Side Pot Calculator:** Correct multi-way all-in side pot distribution algorithm
- **Hand Evaluator:** Poker hand ranking engine supporting all 10 hand categories with tie-breaking
- **Equity Calculator:** Preflop and post-flop win probability estimation with opponent count penalty
- **Interactive Poker Table:** SVG-styled table with player badges, community cards, pot display, and chip animations
- **Player Controls:** Fold/Check/Call/Raise/All-In buttons with raise slider, quick multipliers, and full keyboard shortcut support
- **Risk Overlay:** Real-time win probability, expected value, pot odds, and hand strength vs range chart (via Recharts)
- **Statistics Dashboard:** Comprehensive stats tracking including win rate, ROI, bankroll history, position stats, hand strength categories, and bluff performance
- **Game History:** Sortable/filterable hand history table with search, win/loss filters, CSV/PGN export
- **Coach Tips System:** Context-aware poker strategy tips with categories (strategy, math, psychology, bankroll), configurable frequency, and feedback
- **Error Boundary:** Class-based React error boundary with retry mechanism (3 attempts) and full-page reload fallback
- **Auto-Play Mode:** AI-controlled auto-play for hands-off observation and bot training
- **Configurable Settings:** Table size (2-9 players), buy-in amount, blind levels, starting bankroll, auto-play speed
- **Settings Export/Import:** Download and restore bot and game configuration as JSON files
- **Settings Backup/Restore:** LocalStorage-based backup with validation
- **Game Data Backup:** Full game data export/import including all stats, history, and bankroll data
- **Auto-Backup:** Periodic automatic backup snapshots to prevent data loss
- **Storage Monitoring:** localStorage usage tracking with capacity warnings
- **Analytics System:** Privacy-respecting event tracking with batching, categories, and configurable consent
- **Performance Monitoring:** Core Web Vitals (LCP, CLS), custom metrics, breadcrumb-based error context
- **Accessibility:** Skip navigation link, ARIA roles/labels, keyboard navigation, reduced-motion support, high-contrast mode
- **Responsive Design:** Mobile-friendly layout with touch swipe gestures and adaptive UI
- **i18n Foundation:** Translation system prepared for multi-language support
- **Security:** Input sanitization, XSS protection, HTML escaping, number clamping utilities
- **Dark Theme:** Full custom Tailwind design system with poker-themed colors, animations, and premium styling
- **CI/CD:** GitHub Actions pipeline for automated build and deployment to GitHub Pages
- **Testing:** 143 tests across 7 test files covering all utility modules

### Technical Stack
- React 19.2 with TypeScript 6.0
- Vite 8.1 (Rolldown-based bundler)
- Zustand 5.0 for state management with localStorage persistence
- Tailwind CSS 3.4 with custom poker-themed design system
- Recharts 3.9 for data visualization
- Lucide React icons
- Vitest 4.1 for testing
- Oxlint for linting

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-16 | Initial public release |

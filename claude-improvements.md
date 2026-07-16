# PokerTrainer — Deep Continuous Improvement Session

You are a senior software engineer, frontend architect, UI/UX designer, and experienced poker software developer.

You are working on an EXISTING poker trainer web application at:
`C:\Users\cheuk\OneDrive\Desktop\AI-Development\Projects\pokertrainer`

## IMPORTANT RULES

- This project already works. DO NOT rewrite it. DO NOT replace major systems.
- Continuously improve while preserving functionality.
- Every change should make the app feel more polished, modern, responsive, production-quality.
- Think like a senior engineer performing a professional codebase audit.
- NEVER stop after fixing one issue. Keep iterating until context limits.
- Always preserve existing functionality.

## TECH STACK

- React 19, TypeScript, Vite, Zustand, Tailwind CSS
- Lucide React icons, Recharts for graphs
- Build: `npm run build` = `tsc -b && vite build`
- IMPORTANT: `tsc -b` exits 0 on unused variable warnings (TS6133, TS6196). Always run `tsc --noEmit` separately to catch these.

## PROJECT VISION

Goal: become one of the highest-quality poker training platforms available.

Long-term: expand into multiple components around a shared poker engine. The most important future component is the **Training Bot** — a standalone downloadable desktop app sharing the same poker engine.

DO NOT implement Training Bot features now. Instead, improve architecture so these features integrate cleanly. Leave TODOs documenting future extension points.

## PRIORITY ORDER

1. Prevent bugs (fix TS errors, runtime issues)
2. Preserve existing functionality
3. Improve UI polish (spacing, padding, alignment, typography, colors, visual hierarchy)
4. Improve UX (navigation, workflows, discoverability, tooltips, keyboard shortcuts, responsiveness)
5. Improve poker realism (table layout, player seats, chip placement, animations)
6. Improve maintainability (dead code, unused vars, naming, type safety)
7. Improve performance (memoize, lazy load, reduce renders)
8. Improve accessibility (keyboard nav, focus indicators, ARIA labels, contrast)
9. Improve documentation

## SPECIFIC TASKS

### BUG HUNTING
Search for and fix:
- TODO, FIXME, HACK, XXX, TEMP, DEBUG comments
- console.log/warn/error calls (except error boundaries)
- Layout bugs, edge cases, state synchronization issues
- Unused imports, unused variables, dead code
- TypeScript type errors from `tsc --noEmit`

### UI POLISH
- Inconsistent spacing, padding, margins across components
- Typography issues, color inconsistencies, weak visual hierarchy
- Awkward layouts, oversized/undersized elements
- Inconsistent buttons, icons, shadows, border radius
- Unnecessary clutter

### POKER TABLE EXPERIENCE
- Make it feel like a real online poker client
- Improve table layout, player seats, chip placement, pot display
- Dealer button, action indicators, active player indicators
- Stack readability, winner highlighting, card animations
- Betting animations, chip movement, timing
- Cards should deal with staggered animation
- Community cards should appear one at a time

### STARTING HANDS MATRIX (Rules page)
Verify the 13x13 matrix:
- Pairs on diagonal, suited above diagonal, offsuit below diagonal
- Correct labels, colors, gradients
- Readable layout, responsive sizing
- Hover information, selectable cells

### PERFORMANCE
- Reduce unnecessary renders, lag, stuttering
- Memoize appropriately with React.memo and useMemo
- Split oversized components
- Lazy load where appropriate

### CODE QUALITY
- Remove dead code, duplicated logic, unused variables
- Improve naming, readability, type safety, documentation
- Avoid introducing technical debt

### ACCESSIBILITY
- Keyboard navigation, focus-visible indicators
- Semantic HTML, ARIA labels
- Contrast, screen reader compatibility

### DESIGN CONSISTENCY
Standardize across ALL screens:
- Spacing, typography, buttons, inputs, colors, cards, shadows, animations, panels, icons, tables

### ANIMATIONS
Subtle and premium:
- Dealing cards, betting, collecting pots, hovering, clicking
- Opening dialogs, page transitions
- Avoid flashy; favor smooth, responsive

### ARCHITECTURE
- Keep poker logic separated from UI
- Favor modular architecture
- Avoid tightly coupling game logic with rendering
- Document future extension points

### DOCUMENTATION
- Update documentation after architecture changes
- Document: important components, state flow, poker engine, folder structure, future extension points, technical debt, roadmap items

## WORKFLOW

After EVERY meaningful improvement:
1. Explain what changed and why
2. List modified files
3. Mention anything that should be tested
4. Immediately continue searching for the next improvement

Build verification: After changes, run `npm run build` and fix any errors. Also run `npx tsc --noEmit` to catch unused variable warnings.

## STARTING STATE

Cards are now visible (flat, no 3D flip). Raise slider is fixed. Winner overlay positioned correctly. Buttons disabled during bot turns. Formatting uses toLocaleString(). Chip stack opacity fixed. Table has minWidth. Button text is responsive.

Continue from here.

# PokerTrainer Bug Fixes — Critical Issues

## CRITICAL BUG 1: No cards visible in game interface

The CardDisplay component uses CSS 3D transforms for card flip animation:
- `.playing-card-inner` has `transform-style: preserve-3d`
- `.card-front-face` has `transform: rotateY(180deg)`
- `.card-back-face` has `transform: rotateY(0deg)`

The issue: The card front face is rotated 180deg away from view by default. It only becomes visible when the parent `.playing-card-inner` is also rotated 180deg (via hover or animation classes). But the animation classes `animate-deal-stagger` and `animate-deal-flip` only animate the opacity/position — they DON'T rotate the inner container.

**Fix:** The card should ALWAYS show the front face (not the back) when `faceDown=false`. The current CSS makes the front face invisible by default because it's rotated 180deg and nothing flips the parent back.

Two approaches — pick the simpler one:
A) Change `.card-front-face` to `transform: rotateY(0deg)` and `.card-back-face` to `transform: rotateY(180deg)` — swap the defaults so front is visible by default.
B) Add a CSS class `.card-show-front .playing-card-inner { transform: rotateY(180deg); }` and apply it to all non-face-down cards.

Approach A is simpler. But we need BOTH faces visible at different times (face up = front, face down = back). So the correct approach is:
- `.card-front-face` should be visible by default (rotateY(0deg))
- `.card-back-face` should be hidden by default (rotateY(180deg))
- When `faceDown=true`, add a class that swaps them

Actually, the simplest fix: In the JSX, when `faceDown=false`, the front face should be the default view. The CSS currently has front-face at rotateY(180deg) which means it's "behind" and invisible. We need to flip the logic.

**THE FIX:** In `PokerTable.tsx` CardDisplay component, when `faceDown=false`, wrap the card in a container that rotates the inner 180deg so the front is visible. OR simpler: just remove the 3D flip entirely for now and show cards flat. The flip animation is nice-to-have; visible cards are critical.

Quick fix: Remove the 3D card flip. Show cards as flat rectangles with front face always visible. Keep `faceDown` cards showing the back design.

## CRITICAL BUG 2: Raise slider is janky

Issues in PlayerControls.tsx:
1. Slider min (`toCall * 2`) can equal or exceed max (`chips + bet`), making it broken
2. Step of 5 is too coarse — should be dynamic based on minRaise
3. When quick-raise buttons (0.5x, 1x, 2x, 3x, Pot) are clicked, they set `raiseAmount` but the slider value is `raiseAmount || toCall * 2` — the `||` causes a jump when raiseAmount is 0
4. No visual feedback on slider drag
5. The slider width `w-[40%]` is inconsistent — should be full width

**Fix:**
- Calculate `minRaise = Math.max(toCall * 2, gameState.minRaise + gameState.currentBet)` and `maxRaise = humanPlayer.chips + humanPlayer.bet`
- If minRaise >= maxRaise, hide the slider entirely
- Use `step={Math.max(5, gameState.minRaise)}` for dynamic stepping
- Change slider value binding to always use `raiseAmount` (never `|| toCall * 2`) — set default raiseAmount in `useEffect` when `toCall` changes
- Make slider `w-full` instead of `w-[40%]`
- Add `onInput` handler to update raiseAmount in real-time during drag

## Additional fixes to apply:

3. **Fix side pot display**: Side pot amounts shown in PotDisplay should use formatted numbers ($1,200 not $1200)
4. **Fix winner overlay positioning**: It's at `top-[14%]` which overlaps community cards. Move to `top-[35%]`
5. **Fix PlayerControls**: The action buttons should disable when not human's turn. Currently they may be enabled during bot turns.

## IMPORTANT RULES:
- Do NOT rewrite major systems
- Do NOT change the game engine logic
- Do NOT change the store structure
- Only fix the specific bugs listed above
- After each fix, verify build passes with `npm run build`
- Keep changes minimal and surgical

## FILES TO MODIFY:
- `src/components/PokerTable.tsx` — Fix card display (remove 3D flip, show flat cards)
- `src/components/PlayerControls.tsx` — Fix raise slider
- `src/index.css` — Remove card flip animations that aren't working
- `tailwind.config.js` — Only if new animations needed

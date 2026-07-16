import { useEffect, useRef, useCallback } from 'react';

/**
 * Configuration for swipe gesture detection.
 */
interface SwipeConfig {
  /** Minimum distance in pixels to trigger a swipe (default: 50) */
  threshold?: number;
  /** Maximum time in ms for the gesture to be considered a swipe (default: 300) */
  maxTime?: number;
  /** Whether to prevent default touch behavior (default: false) */
  preventDefault?: boolean;
}

/**
 * React hook for detecting swipe gestures on touch devices.
 *
 * Usage:
 * ```tsx
 * const ref = useSwipeGesture({
 *   onSwipeLeft: () => goToNextTab(),
 *   onSwipeRight: () => goToPrevTab(),
 * });
 * return <div ref={ref}>...</div>;
 * ```
 */
export function useSwipeGesture(
  callbacks: {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
  },
  config: SwipeConfig = {},
): React.RefObject<HTMLDivElement | null> {
  const { threshold = 50, maxTime = 300, preventDefault = false } = config;
  const ref = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Stable callback refs to avoid re-attaching listeners
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!startRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startRef.current.x;
    const dy = touch.clientY - startRef.current.y;
    const dt = Date.now() - startRef.current.time;

    startRef.current = null;

    // Time check: gesture must be fast enough to be a swipe
    if (dt > maxTime) return;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Distance check: must exceed threshold
    if (Math.max(absDx, absDy) < threshold) return;

    // Determine primary direction
    if (absDx > absDy) {
      // Horizontal swipe
      if (dx > 0) {
        callbacksRef.current.onSwipeRight?.();
      } else {
        callbacksRef.current.onSwipeLeft?.();
      }
    } else {
      // Vertical swipe
      if (dy > 0) {
        callbacksRef.current.onSwipeDown?.();
      } else {
        callbacksRef.current.onSwipeUp?.();
      }
    }

    if (preventDefault) {
      e.preventDefault();
    }
  }, [threshold, maxTime, preventDefault]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
    el.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd, preventDefault]);

  return ref;
}

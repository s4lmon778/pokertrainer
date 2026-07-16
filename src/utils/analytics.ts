/**
 * Analytics hooks and tracking utilities.
 *
 * Lightweight, privacy-respecting analytics for PokerTrainer.
 * All tracking is opt-in via a consent flag. No PII is collected.
 *
 * Events tracked:
 * - Game lifecycle (start, end, hand complete)
 * - User actions (fold, call, raise, all-in)
 * - Navigation (tab switches)
 * - Performance (load time, render time)
 * - Errors (caught exceptions, boundary errors)
 *
 * Integration points for external services:
 * - Google Analytics 4: call gtag() from within trackEvent
 * - PostHog: call posthog.capture() from within trackEvent
 * - Custom backend: POST to analytics endpoint
 *
 * Privacy note: No personally identifiable information is collected.
 * All data is anonymous and aggregated. Users can disable tracking
 * via the settings panel.
 */

/** Analytics consent state — persisted in Zustand store */
let analyticsEnabled = false;

/** Enable or disable analytics tracking */
export function setAnalyticsEnabled(enabled: boolean): void {
  analyticsEnabled = enabled;
}

/** Check if analytics are currently enabled */
export function isAnalyticsEnabled(): boolean {
  return analyticsEnabled;
}

/** Event payload */
interface AnalyticsEvent {
  name: string;
  category: 'game' | 'action' | 'navigation' | 'performance' | 'error';
  properties?: Record<string, string | number | boolean>;
  timestamp: number;
}

/** Queue of events to be flushed */
const eventQueue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 5000; // 5 seconds

/** Flush queued events to the analytics backend */
function flushEvents(): void {
  if (eventQueue.length === 0) return;

  const events = eventQueue.splice(0);

  // In development, log to console
  if (import.meta.env.DEV) {
    for (const event of events) {
      console.debug('[Analytics]', event.category, event.name, event.properties);
    }
  }

  // Production: send to analytics service
  // Uncomment and configure for your backend:
  // if (import.meta.env.PROD) {
  //   fetch('/api/analytics/events', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ events }),
  //     keepalive: true,
  //   }).catch(() => {});
  // }
}

/**
 * Track a single event.
 * Events are batched and flushed periodically to minimize network requests.
 *
 * @param name - Event name (e.g., 'hand_complete', 'player_fold')
 * @param category - Event category for filtering
 * @param properties - Optional key-value metadata
 */
export function trackEvent(
  name: string,
  category: AnalyticsEvent['category'],
  properties?: Record<string, string | number | boolean>,
): void {
  if (!analyticsEnabled) return;

  eventQueue.push({
    name,
    category,
    properties,
    timestamp: Date.now(),
  });

  // Start flush timer if not already running
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushEvents();
      flushTimer = null;
    }, FLUSH_INTERVAL);
  }
}

/**
 * Track a page view or tab switch.
 */
export function trackPageView(page: string): void {
  trackEvent('page_view', 'navigation', { page });
}

/**
 * Track a game lifecycle event.
 */
export function trackGameEvent(
  event: 'game_started' | 'game_ended' | 'hand_complete' | 'hand_started',
  properties?: Record<string, string | number | boolean>,
): void {
  trackEvent(event, 'game', properties);
}

/**
 * Track a player action.
 */
export function trackPlayerAction(
  action: 'fold' | 'check' | 'call' | 'raise' | 'all_in',
  properties?: Record<string, string | number | boolean>,
): void {
  trackEvent(`player_${action}`, 'action', properties);
}

/**
 * Track a performance metric.
 * Use this for Core Web Vitals and custom metrics.
 */
export function trackPerformance(
  metric: string,
  value: number,
  properties?: Record<string, string | number | boolean>,
): void {
  trackEvent(`perf_${metric}`, 'performance', {
    value,
    ...properties,
  });
}

/**
 * Track an error event.
 */
export function trackError(
  errorType: string,
  message: string,
  properties?: Record<string, string | number | boolean>,
): void {
  trackEvent('error', 'error', {
    error_type: errorType,
    message: message.slice(0, 200), // Truncate for privacy
    ...properties,
  });
}

/**
 * React hook for component-level performance tracking.
 * Usage: useRenderTiming('PokerTable')
 */
export function trackRenderTime(componentName: string, renderTimeMs: number): void {
  trackPerformance('render_time', renderTimeMs, { component: componentName });
}

/**
 * Flush any pending events (call before page unload).
 */
export function flushAnalytics(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  flushEvents();
}

// Flush on page unload to minimize event loss
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushAnalytics);
}

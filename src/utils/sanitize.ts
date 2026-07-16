/**
 * Input sanitization and XSS protection utilities.
 *
 * PokerTrainer doesn't accept user-generated HTML, but we sanitize
 * any user-provided text that might end up in the DOM to prevent
 * DOM-based XSS via innerHTML, dangerouslySetInnerHTML, or URL params.
 */

/** Characters that have special meaning in HTML */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Escape HTML special characters to prevent XSS when inserting
 * user-provided text into the DOM.
 *
 * @param text - Raw user-provided text
 * @returns HTML-escaped safe string
 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize a string for use in a data attribute or URL parameter.
 * Removes anything that isn't alphanumeric, space, or common punctuation.
 *
 * @param input - Raw input string
 * @returns Sanitized string (max 256 chars)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[^\w\s\-.,!?@#$%^&*()+=:;]/g, '')
    .trim()
    .slice(0, 256);
}

/**
 * Validate that a number is within a safe range.
 * Prevents prototype pollution via extremely large/small numbers
 * and NaN/Infinity injection.
 *
 * @param value - The number to validate
 * @param min - Minimum allowed value (default 0)
 * @param max - Maximum allowed value (default 1e9)
 * @returns Safe number clamped to range
 */
export function clampNumber(value: number, min = 0, max = 1e9): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Sanitize a chip/bet amount input from the user.
 * Ensures the value is a valid positive integer within reasonable bounds.
 *
 * @param value - Raw input (could be string from form input)
 * @param max - Maximum allowed amount
 * @returns Safe integer amount, or 0 if invalid
 */
export function sanitizeChipAmount(value: string | number, max = 1_000_000): number {
  const parsed = typeof value === 'string' ? parseInt(value, 10) : Math.floor(value);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < 0) return 0;
  return Math.min(parsed, max);
}

/**
 * Check if a string looks like it contains script injection attempts.
 * This is a defense-in-depth measure — actual sanitization should
 * happen at the rendering layer.
 *
 * @param input - String to check
 * @returns true if the input appears safe
 */
export function appearsSafe(input: string): boolean {
  const dangerous = /<script|javascript:|on\w+\s*=|data:text\/html|vbscript:/i;
  return !dangerous.test(input);
}

/**
 * Truncate a string to a maximum length, appending ellipsis if truncated.
 * Safe for display purposes — doesn't break HTML entities mid-character.
 *
 * @param text - Input text
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateSafe(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

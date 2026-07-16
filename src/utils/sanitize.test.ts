import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  sanitizeString,
  clampNumber,
  sanitizeChipAmount,
  appearsSafe,
  truncateSafe,
} from './sanitize';

describe('escapeHtml', () => {
  it('escapes < and >', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
    expect(escapeHtml("it's")).toBe('it&#x27;s');
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('leaves safe text unchanged', () => {
    expect(escapeHtml('Hello, world!')).toBe('Hello, world!');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });
});

describe('sanitizeString', () => {
  it('removes angle brackets', () => {
    expect(sanitizeString('<script>alert(1)</script>')).not.toContain('<');
  });

  it('preserves alphanumeric and common punctuation', () => {
    const input = 'Hello, World! 123 @#$%^&*()+=:;';
    expect(sanitizeString(input)).toBe(input);
  });

  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('truncates to 256 chars', () => {
    const long = 'a'.repeat(500);
    expect(sanitizeString(long).length).toBeLessThanOrEqual(256);
  });

  it('handles empty string', () => {
    expect(sanitizeString('')).toBe('');
  });
});

describe('clampNumber', () => {
  it('clamps to minimum', () => {
    expect(clampNumber(-5, 0, 100)).toBe(0);
  });

  it('clamps to maximum', () => {
    expect(clampNumber(150, 0, 100)).toBe(100);
  });

  it('passes through valid values', () => {
    expect(clampNumber(50, 0, 100)).toBe(50);
  });

  it('handles Infinity', () => {
    expect(clampNumber(Infinity, 0, 100)).toBe(0);
  });

  it('handles NaN', () => {
    expect(clampNumber(NaN, 0, 100)).toBe(0);
  });

  it('handles -Infinity', () => {
    expect(clampNumber(-Infinity, 0, 100)).toBe(0);
  });

  it('uses default bounds', () => {
    expect(clampNumber(500)).toBe(500);
    expect(clampNumber(2e9)).toBe(1e9);
  });
});

describe('sanitizeChipAmount', () => {
  it('parses string input', () => {
    expect(sanitizeChipAmount('100')).toBe(100);
  });

  it('floors float input', () => {
    expect(sanitizeChipAmount(99.7)).toBe(99);
  });

  it('handles negative input', () => {
    expect(sanitizeChipAmount('-100')).toBe(0);
  });

  it('clamps to max', () => {
    expect(sanitizeChipAmount('2000000', 1_000_000)).toBe(1_000_000);
  });

  it('handles empty string', () => {
    expect(sanitizeChipAmount('')).toBe(0);
  });

  it('handles non-numeric string', () => {
    expect(sanitizeChipAmount('abc')).toBe(0);
  });
});

describe('appearsSafe', () => {
  it('flags script tags', () => {
    expect(appearsSafe('<script>alert(1)</script>')).toBe(false);
  });

  it('flags javascript: URLs', () => {
    expect(appearsSafe('javascript:alert(1)')).toBe(false);
  });

  it('flags event handlers', () => {
    expect(appearsSafe('onclick=alert(1)')).toBe(false);
  });

  it('passes normal text', () => {
    expect(appearsSafe('Hello, world!')).toBe(true);
    expect(appearsSafe('Player1')).toBe(true);
    expect(appearsSafe('Raise to $50')).toBe(true);
  });

  it('handles empty string', () => {
    expect(appearsSafe('')).toBe(true);
  });
});

describe('truncateSafe', () => {
  it('returns short text unchanged', () => {
    expect(truncateSafe('hello', 10)).toBe('hello');
  });

  it('truncates long text with ellipsis', () => {
    const result = truncateSafe('hello world this is long', 10);
    expect(result.length).toBeLessThanOrEqual(10);
    expect(result).toContain('…');
  });

  it('handles empty string', () => {
    expect(truncateSafe('', 5)).toBe('');
  });

  it('returns exact match at boundary', () => {
    expect(truncateSafe('hello', 5)).toBe('hello');
  });
});

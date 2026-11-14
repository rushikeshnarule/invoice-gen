import { describe, it, expect } from 'vitest';
import { sanitizeTemplateCss } from '../utils/sanitize';

describe('sanitizeTemplateCss', () => {
  it('returns empty string for empty or non-string inputs', () => {
    expect(sanitizeTemplateCss('')).toBe('');
    expect(sanitizeTemplateCss(null as any)).toBe('');
    expect(sanitizeTemplateCss(undefined as any)).toBe('');
  });

  it('preserves valid CSS rules untouched', () => {
    const css = '.invoice-header { color: #2563eb; font-size: 14pt; }';
    expect(sanitizeTemplateCss(css)).toBe(css);
  });

  it('neutralizes </style> breakout tags', () => {
    const malicious = 'body { color: red; } </style><script>alert("xss")</script>';
    const sanitized = sanitizeTemplateCss(malicious);
    expect(sanitized).not.toContain('</style');
    expect(sanitized).toContain('<\\/style');
    expect(sanitized).not.toContain('<script');
    expect(sanitized).toContain('&lt;script');
  });

  it('neutralizes multiple case variations of style and script tags', () => {
    const malicious = '</Style></STYLE><SCRIPT src="evil.js"></Script>';
    const sanitized = sanitizeTemplateCss(malicious);
    expect(sanitized).not.toContain('</Style');
    expect(sanitized).not.toContain('</STYLE');
    expect(sanitized).not.toContain('<SCRIPT');
  });
});

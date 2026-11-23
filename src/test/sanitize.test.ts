import { describe, it, expect } from 'vitest';
import { sanitizeTemplateCss, sanitizeSafeUrl } from '../utils/sanitize';

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

  it('neutralizes @import rules and javascript: url expressions', () => {
    const malicious = '@import url("https://malicious.com/tracker.css"); body { background: url(javascript:alert(1)); }';
    const sanitized = sanitizeTemplateCss(malicious);
    expect(sanitized).not.toContain('@import');
    expect(sanitized).toContain('/* [blocked-import] */');
    expect(sanitized).not.toContain('url(javascript:');
  });
});

describe('sanitizeSafeUrl', () => {
  it('allows valid HTTPS, HTTP, mailto, and tel URLs', () => {
    expect(sanitizeSafeUrl('https://example.com/invoice')).toBe('https://example.com/invoice');
    expect(sanitizeSafeUrl('http://localhost:5173')).toBe('http://localhost:5173');
    expect(sanitizeSafeUrl('mailto:billing@apex.com')).toBe('mailto:billing@apex.com');
    expect(sanitizeSafeUrl('tel:+919876543210')).toBe('tel:+919876543210');
  });

  it('blocks dangerous pseudo-protocols like javascript: and data:', () => {
    expect(sanitizeSafeUrl('javascript:alert(1)')).toBe('#');
    expect(sanitizeSafeUrl('javascript:/*--></title></style></textarea>*/<svg/onload=alert(1)>')).toBe('#');
    expect(sanitizeSafeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
    expect(sanitizeSafeUrl('')).toBe('#');
  });
});

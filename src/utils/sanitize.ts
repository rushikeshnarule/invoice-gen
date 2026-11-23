// ─── Input & Asset Sanitization Utilities ──────────────────────────────
// Protects against HTML injection, script tags, stylesheet breakout, and protocol abuse attacks.

/**
 * Sanitizes remote template CSS before insertion into JSX `<style>` tags.
 * Neutralizes closing style tags, script injection, `@import` external fetching,
 * and dangerous CSS URI expressions.
 */
export function sanitizeTemplateCss(css: string): string {
  if (!css || typeof css !== 'string') return '';
  return css
    .replace(/<\/style/gi, '<\\/style')
    .replace(/<script/gi, '&lt;script')
    .replace(/<\/script/gi, '&lt;/script')
    .replace(/@import\s+[^;]+;/gi, '/* [blocked-import] */')
    .replace(/url\s*\(\s*['"]?(?:javascript|vbscript|data:text\/html):/gi, 'url("about:blank')
    .replace(/expression\s*\(.*?\)/gi, 'none')
    .replace(/-moz-binding\s*:/gi, '/* blocked */:');
}

/**
 * Validates and sanitizes external URLs to prevent javascript: and data: pseudo-protocol execution.
 * Only allows http:, https:, mailto:, and tel: protocols.
 */
export function sanitizeSafeUrl(rawUrl: string, fallback = '#'): string {
  if (!rawUrl || typeof rawUrl !== 'string') return fallback;
  const trimmed = rawUrl.trim();
  if (/^(?:https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

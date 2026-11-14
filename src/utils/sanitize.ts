// ─── Input & Asset Sanitization Utilities ──────────────────────────────
// Protects against HTML injection, script tags, and CSS stylesheet breakout attacks.

/**
 * Sanitizes remote template CSS before insertion into JSX `<style>` tags.
 * Neutralizes closing style tags and script injection attempts.
 */
export function sanitizeTemplateCss(css: string): string {
  if (!css || typeof css !== 'string') return '';
  return css
    .replace(/<\/style/gi, '<\\/style')
    .replace(/<script/gi, '&lt;script')
    .replace(/<\/script/gi, '&lt;/script');
}

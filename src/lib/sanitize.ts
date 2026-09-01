import sanitizeHtmlLib from "sanitize-html";

/**
 * Shared rich-text sanitizer: applied to every piece of HTML that reaches the
 * database (migration import, admin editors) so rendered content is always
 * safe to inject.
 */
export function sanitizeRichHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: [
      "p", "br", "h2", "h3", "h4", "ul", "ol", "li", "strong", "em", "b", "i", "u", "s",
      "a", "img", "blockquote", "table", "thead", "tbody", "tr", "th", "td", "figure",
      "figcaption", "code", "pre", "hr",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "width", "height"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: sanitizeHtmlLib.simpleTransform("a", { rel: "noopener noreferrer" }, true),
    },
  })
    .replace(/<p>\s*(&nbsp;)?\s*<\/p>/g, "")
    .trim();
}

/**
 * Reduces HTML to its readable text.
 *
 * Uses the same parser as the sanitizer above rather than a regex. Stripping
 * tags with /<[^>]*>/g looks equivalent and is not: it leaves the *contents*
 * of <script> and <style> behind as text, and an attribute containing ">"
 * ends the match early, so `<img alt="a > b">` leaves `b">` in the output.
 * Both of those were reaching the search index and the JSON-LD answer text
 * that search engines display.
 */
export function stripHtml(html: string): string {
  const text = sanitizeHtmlLib(html, { allowedTags: [], allowedAttributes: {} });
  return decodeBasicEntities(text).replace(/\s+/g, " ").trim();
}

/**
 * The parser re-encodes the few characters that are special in markup, which
 * is right for HTML output and wrong for the plain text wanted here.
 * Ampersand goes last, so "&amp;lt;" does not decode twice into "<".
 */
function decodeBasicEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Rough reading time, from the readable text rather than the markup. */
export function readingMinutes(html: string): number {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

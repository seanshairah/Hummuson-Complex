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

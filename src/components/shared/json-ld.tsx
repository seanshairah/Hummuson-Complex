/**
 * Structured data, serialised safely.
 *
 * Every field in these blocks comes from the CMS, and the block is written
 * into the page with dangerouslySetInnerHTML. A product name or FAQ answer
 * containing `</script>` would close the tag early and put whatever followed
 * it into the document as markup — JSON.stringify escapes quotes, but not
 * angle brackets, because JSON has no reason to.
 *
 * Escaping `<` to its unicode form fixes that: it is still the same string to
 * any JSON parser, and no longer able to end the element it lives in. The
 * line and paragraph separators are escaped for the same class of reason —
 * valid inside a JSON string, and historically not inside a JavaScript one.
 */
export function JsonLd({ data }: { data: unknown }) {
  const serialised = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialised }} />;
}

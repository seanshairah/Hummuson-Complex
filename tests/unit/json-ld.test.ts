import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { JsonLd } from "@/components/shared/json-ld";

/**
 * Product names, FAQ answers and article titles all reach these blocks
 * straight from the CMS, so the escaping is the only thing standing between
 * an editor's typo — or a compromised account — and script execution on every
 * page that renders the record.
 */
/**
 * Index arithmetic rather than regex, on purpose. Picking tags apart with a
 * regular expression is the pattern behind a whole family of filter bypasses,
 * and a test file is exactly where someone finds it and reuses it somewhere
 * that matters. The markup here has a known shape — one element, no
 * attributes worth parsing — so slicing between the first ">" and the last
 * "<" is both simpler and not a bad example.
 */
function scriptBody(html: string): string {
  return html.slice(html.indexOf(">") + 1, html.lastIndexOf("<"));
}

function countClosingScriptTags(html: string): number {
  return html.split("</script>").length - 1;
}

describe("JsonLd", () => {
  it("cannot be closed early by content containing a script tag", () => {
    const html = renderToStaticMarkup(
      JsonLd({ data: { name: 'Boom</script><script>alert(1)</script>' } }),
    );
    expect(html).not.toContain("</script><script>");
    expect(countClosingScriptTags(html)).toBe(1);
  });

  it("keeps the payload parseable as the same data", () => {
    const value = { name: "IN5 <Bio>", note: "a < b" };
    const html = renderToStaticMarkup(JsonLd({ data: value }));
    expect(JSON.parse(scriptBody(html))).toEqual(value);
  });

  it("escapes the separators that are legal in JSON but not in JavaScript", () => {
    const html = renderToStaticMarkup(JsonLd({ data: { note: "a b c" } }));
    expect(html).not.toContain(" ");
    expect(html).not.toContain(" ");
    expect(html).toContain("\\u2028");
  });
});

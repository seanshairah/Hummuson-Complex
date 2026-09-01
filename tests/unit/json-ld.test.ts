import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { JsonLd } from "@/components/shared/json-ld";

/**
 * Product names, FAQ answers and article titles all reach these blocks
 * straight from the CMS, so the escaping is the only thing standing between
 * an editor's typo — or a compromised account — and script execution on every
 * page that renders the record.
 */
describe("JsonLd", () => {
  it("cannot be closed early by content containing a script tag", () => {
    const html = renderToStaticMarkup(
      JsonLd({ data: { name: 'Boom</script><script>alert(1)</script>' } }),
    );
    expect(html).not.toContain("</script><script>");
    expect(html.match(/<\/script>/g)).toHaveLength(1);
  });

  it("keeps the payload parseable as the same data", () => {
    const value = { name: "IN5 <Bio>", note: "a < b" };
    const html = renderToStaticMarkup(JsonLd({ data: value }));
    const body = html.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
    expect(JSON.parse(body)).toEqual(value);
  });

  it("escapes the separators that are legal in JSON but not in JavaScript", () => {
    const html = renderToStaticMarkup(JsonLd({ data: { note: "a b c" } }));
    expect(html).not.toContain(" ");
    expect(html).not.toContain(" ");
    expect(html).toContain("\\u2028");
  });
});

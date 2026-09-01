import { describe, expect, it } from "vitest";
import { stripHtml } from "@/lib/sanitize";

/**
 * stripHtml feeds the search index, the retrieval engine and the JSON-LD
 * answer text that search engines display. It used to be a regex, and these
 * are the cases that regex got wrong — each one put something into public
 * output that had no business being there.
 */
describe("stripHtml", () => {
  it("drops script contents rather than treating them as prose", () => {
    const text = stripHtml('<script>alert("steal")</script><p>Apply 2L per hectare.</p>');
    expect(text).toBe("Apply 2L per hectare.");
    expect(text).not.toContain("alert");
  });

  it("drops style contents too", () => {
    expect(stripHtml("<style>.rate{color:red}</style><p>Rate</p>")).toBe("Rate");
  });

  it("handles an attribute containing a closing bracket", () => {
    // The regex ended its match at the ">" inside the alt text and left the
    // remainder — `b">` — in the output.
    const text = stripHtml('<img src="x.jpg" alt="a > b"><p>After the image</p>');
    expect(text).toBe("After the image");
    expect(text).not.toContain('">');
  });

  it("decodes entities instead of passing them through", () => {
    expect(stripHtml("<p>Don&#8217;t &ldquo;guess&rdquo; the rate</p>")).toBe(
      "Don’t “guess” the rate",
    );
    expect(stripHtml("<p>N &amp; P &amp; K</p>")).toBe("N & P & K");
  });

  it("does not double-decode an escaped entity", () => {
    expect(stripHtml("<p>&amp;lt;not a tag&amp;gt;</p>")).toBe("&lt;not a tag&gt;");
  });

  it("collapses the whitespace left behind by block tags", () => {
    expect(stripHtml("<ul>\n  <li>One</li>\n  <li>Two</li>\n</ul>")).toBe("One Two");
  });

  it("returns nothing for markup with no text", () => {
    expect(stripHtml("<p></p><br>")).toBe("");
  });
});

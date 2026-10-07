/**
 * Where the flipbook downloads live.
 *
 * The published ones carry a fingerprint that changes whenever the design or
 * anything it shows changes, so a cached file is never an older catalogue
 * than the one on screen. The draft ones are the designer's, behind sign-in.
 */
export function flipbookDownloads(hash: string, options: { draft?: boolean } = {}) {
  if (options.draft) {
    return { pdf: "/api/admin/flipbook/pdf", html: "/api/admin/flipbook/html" };
  }
  const query = `v=${encodeURIComponent(hash)}`;
  return {
    pdf: `/api/flipbook/pdf?${query}`,
    html: `/api/flipbook/html?${query}`,
  };
}

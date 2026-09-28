/**
 * Where the flipbook downloads live. The fingerprint in the address changes
 * whenever the design or anything it shows changes, so a cached file is
 * never an older catalogue than the one on screen.
 */
export function flipbookDownloads(hash: string, options: { draft?: boolean } = {}) {
  const query = options.draft ? "draft=1" : `v=${encodeURIComponent(hash)}`;
  return {
    pdf: `/api/flipbook/pdf?${query}`,
    html: `/api/flipbook/html?${query}`,
  };
}

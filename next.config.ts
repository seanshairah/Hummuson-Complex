import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

/**
 * Legacy URL redirects are generated from the content migration inventory
 * (content/old-url-map.json), which maps every URL of the old WordPress site
 * to its destination on this platform. This preserves SEO equity and keeps
 * old links (search results, WhatsApp messages, printed material) working.
 */
function legacyRedirects(): { source: string; destination: string; permanent: boolean }[] {
  try {
    const file = path.join(process.cwd(), "content", "old-url-map.json");
    if (!fs.existsSync(file)) return [];
    const entries: { oldUrl: string; newPath: string; redirect?: boolean }[] = JSON.parse(
      fs.readFileSync(file, "utf8"),
    );
    const seen = new Set<string>();
    const rules: { source: string; destination: string; permanent: boolean }[] = [];
    for (const entry of entries) {
      if (entry.redirect === false || !entry.newPath) continue;
      let source: string;
      try {
        source = new URL(entry.oldUrl).pathname.replace(/\/$/, "");
      } catch {
        continue;
      }
      // Next.js cannot redirect the root path via this list, and identical
      // source/destination pairs would loop.
      if (!source || source === entry.newPath || seen.has(source)) continue;
      seen.add(source);
      rules.push({ source, destination: entry.newPath, permanent: true });
      rules.push({ source: `${source}/`, destination: entry.newPath, permanent: true });
    }
    return rules;
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1536, 1920],
    remotePatterns: [
      { protocol: "https", hostname: "humusoncomplex.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async redirects() {
    return legacyRedirects();
  },
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;

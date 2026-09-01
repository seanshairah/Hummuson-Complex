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

/**
 * Hosts this site is allowed to pull media from. Kept next to `remotePatterns`
 * below so the image loader and the Content-Security-Policy can never drift
 * apart — a host added to one and not the other is a broken image or a hole.
 */
const IMAGE_HOSTS = [
  "https://humusoncomplex.com",
  "https://img.youtube.com",
  "https://i.ytimg.com",
  "https://res.cloudinary.com",
];

/** The only third parties allowed to render inside a frame on this site. */
const FRAME_HOSTS = ["https://www.youtube-nocookie.com", "https://maps.google.com"];

/**
 * Content-Security-Policy.
 *
 * `script-src` carries 'unsafe-inline' because the App Router streams its RSC
 * payload through inline <script> tags and every JSON-LD block is inline too.
 * The alternative — a per-request nonce — would make every page dynamic and
 * cost the site its static and ISR caching, which is too high a price for a
 * catalogue whose own rich text is already run through a sanitizer
 * (src/lib/sanitize.ts) before it is ever rendered.
 *
 * The rest of the policy is worth having on its own account and needs no
 * nonces: `object-src 'none'` and `base-uri 'self'` close off plugin and
 * base-tag injection, `form-action 'self'` stops a posted form being
 * redirected to somebody else's server, `frame-ancestors 'none'` prevents
 * clickjacking, and a closed `connect-src` means injected script has nowhere
 * to send what it steals.
 */
function contentSecurityPolicy(): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...IMAGE_HOSTS],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'"],
    "frame-src": FRAME_HOSTS,
    "media-src": ["'self'"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
  };

  const policy = Object.entries(directives)
    .map(([directive, values]) => `${directive} ${values.join(" ")}`)
    .join("; ");

  // Only in production: on http://localhost this would rewrite every request
  // to https and break local development outright.
  return process.env.NODE_ENV === "production"
    ? `${policy}; upgrade-insecure-requests`
    : policy;
}

/**
 * Applied to every response. Set here rather than in middleware so they cover
 * static assets and cached pages too, and cost nothing per request.
 */
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  // Stop the browser second-guessing a declared content type — the route that
  // matters is uploaded media being sniffed into something executable.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // frame-ancestors above is the real control; this covers browsers that
  // still only understand the older header.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing here needs a camera, a microphone, a location or a payment
  // handler, so no embedded frame gets to ask for one either.
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "autoplay=(self)",
      "camera=()",
      "display-capture=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "payment=()",
      "usb=()",
    ].join(", "),
  },
  // Two years, subdomains included. Deliberately not `preload`: submitting to
  // the preload list is effectively irreversible and is the domain owner's
  // decision to make, not this file's. See docs/SECURITY.md.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // "X-Powered-By: Next.js" tells an attacker which advisories to read first.
  poweredByHeader: false,
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
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      {
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;

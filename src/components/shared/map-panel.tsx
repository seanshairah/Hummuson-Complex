"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { googleMapsLink, osmEmbedUrl, type MapScale, type MapPin as MapPinCoords } from "@/lib/maps";
import { cn } from "@/lib/utils";

/**
 * A map with somewhere to stand when there is nothing to show.
 *
 * The map is OpenStreetMap, not Google. Google's keyless embed now redirects to
 * a response carrying `X-Frame-Options: SAMEORIGIN`, so the browser refuses to
 * paint it, and the panel went blank on every page that used it.
 *
 * What this version fixes is the guaranteed case: without coordinates there is
 * no frame at all, because the OSM embed has no geocoder — it draws the box it
 * is given. Asking it for "Mutare, Zimbabwe" got an empty map every time. Now
 * no pin means no iframe, and the panel says so and links out to Google Maps,
 * which was always the part a farmer actually uses.
 *
 * The honest limit, unchanged and not fixable from here: a frame that fails
 * still fires `load` — the browser fires it on its own error page — and
 * same-origin rules stop us looking inside to tell the difference. So a hard
 * network failure shows the browser's error box rather than this panel. A
 * script-side probe could catch the unreachable-host case, but only by opening
 * `connect-src` to a third party, which is a real exfiltration surface traded
 * for a cosmetic gain. Escaping it properly means drawing the tiles ourselves
 * (MapLibre) instead of embedding someone else's page.
 *
 * The timeout still covers the slow-network case: if `load` has not fired by
 * then, the frame is dropped and the panel stays.
 */
export function MapPanel({
  query,
  pin,
  caption,
  scale = "address",
  action = "Open in Google Maps",
  aspect = "aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3]",
  className,
  hidden,
}: {
  /** What the "open in Google Maps" link searches for, and the default caption. */
  query: string;
  /** The coordinates to draw. No pin, no frame — see the note above. */
  pin?: MapPinCoords | null;
  /** How wide to draw: a yard, a town, or a district. */
  scale?: MapScale;
  /** The line under the frame. Defaults to the query. */
  caption?: string;
  action?: string;
  aspect?: string;
  className?: string;
  /** Collapsed on small screens behind the caller's own toggle. */
  hidden?: boolean;
}) {
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const src = pin ? osmEmbedUrl(pin, scale) : null;

  // Every map is a fresh attempt: one that failed for one place must not leave
  // the next showing a stale failure, or a stale success.
  useEffect(() => {
    if (!src) {
      setState("unavailable");
      return;
    }
    setState("loading");
    const timer = setTimeout(() => {
      setState((current) => (current === "loading" ? "unavailable" : current));
    }, 7000);
    return () => clearTimeout(timer);
  }, [src]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border border-line bg-cream",
        hidden && "hidden lg:block",
        className,
      )}
    >
      <div className={cn("relative", aspect)}>
        {src && state !== "unavailable" && (
          <iframe
            key={src}
            src={src}
            title={`Map — ${caption ?? query}`}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setState("ready")}
            className={cn(
              "absolute inset-0 size-full border-0 transition-opacity duration-500",
              state === "ready" ? "opacity-100" : "opacity-0",
            )}
          />
        )}

        <div
          aria-hidden={state === "ready"}
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-3 bg-paper-dim p-6 text-center transition-opacity duration-500",
            state === "ready" && "pointer-events-none opacity-0",
          )}
        >
          <span className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,rgba(31,41,26,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(31,41,26,0.08)_1px,transparent_1px)] [background-size:2.6rem_2.6rem]" />
          <span
            className={cn(
              "relative flex size-12 items-center justify-center rounded-full bg-humus-900 text-paper shadow-float",
              state === "loading" && "animate-pulse-soft",
            )}
          >
            <MapPin className="size-5" strokeWidth={1.8} />
          </span>
          <span className="relative font-display font-semibold text-ink">{caption ?? query}</span>
          {state === "unavailable" && (
            <span className="relative max-w-xs text-sm text-ink-faint">
              {src
                ? "The map could not load here. The link below opens it in Google Maps."
                : "No map pin for this one yet. The link below searches Google Maps."}
            </span>
          )}
        </div>
      </div>

      {/* Always present, whatever the frame did. */}
      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3.5">
        <p className="flex min-w-0 items-center gap-2 text-sm text-ink-soft">
          <MapPin className="size-4 shrink-0 text-leaf-700" strokeWidth={1.9} />
          <span className="min-w-0 truncate">{caption ?? query}</span>
        </p>
        <a
          href={googleMapsLink(query, pin)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-leaf-800 hover:text-brand"
        >
          {action} <ArrowUpRight className="size-4" />
        </a>
      </div>
    </div>
  );
}

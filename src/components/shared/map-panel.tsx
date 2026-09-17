"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { googleMapsEmbedUrl, googleMapsLink, type MapPin as MapPinCoords } from "@/lib/maps";
import { cn } from "@/lib/utils";

/**
 * A Google Maps embed with somewhere to stand when it cannot load.
 *
 * The embed is a third-party iframe on a network we do not control, and it
 * fails in ways this page cannot see: blocked, offline, slow, refused. The
 * version this replaces put a decorative placeholder *behind* the frame, so a
 * failure painted the browser's own broken-page box over the top of it and the
 * panel read as broken rather than as unavailable — which is what the contact
 * page and the stockist finder were both doing, separately, in their own copies
 * of the same markup.
 *
 * Here the designed panel sits on top, and the frame fades in underneath only
 * once `load` has actually fired. If it has not fired by the timeout, the frame
 * is dropped and the panel stays, with the link out to Google Maps that was
 * always the useful part of it.
 *
 * The honest limit: a frame that loads *someone else's error page* still fires
 * `load`, and same-origin rules stop us looking inside to tell the difference.
 * That case shows an unhelpful map rather than this fallback. Catching it would
 * need a keyed static-map API — a billing account, not a code change.
 */
export function MapPanel({
  query,
  pin,
  caption,
  action = "Open in Google Maps",
  aspect = "aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3]",
  className,
  hidden,
}: {
  /** What the map should show — an address, or "Harare, Zimbabwe". */
  query: string;
  /** Real coordinates, when we have them. A pin beats a text search. */
  pin?: MapPinCoords | null;
  /** The line under the frame. Defaults to the query. */
  caption?: string;
  action?: string;
  aspect?: string;
  className?: string;
  /** Collapsed on small screens behind the caller's own toggle. */
  hidden?: boolean;
}) {
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");

  // Every query is a fresh attempt: a map that failed for one place must not
  // leave the next showing a stale failure, or a stale success.
  useEffect(() => {
    setState("loading");
    const timer = setTimeout(() => {
      setState((current) => (current === "loading" ? "unavailable" : current));
    }, 7000);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border border-line bg-cream",
        hidden && "hidden lg:block",
        className,
      )}
    >
      <div className={cn("relative", aspect)}>
        {state !== "unavailable" && (
          <iframe
            key={query}
            src={googleMapsEmbedUrl(query, pin)}
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
              The map could not load here. The link below opens it in Google Maps.
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

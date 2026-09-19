"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { googleMapsLink, osmEmbedUrl, type MapScale, type MapPin as MapPinCoords } from "@/lib/maps";
import { cn } from "@/lib/utils";

/**
 * A map with somewhere to stand while it arrives, or if it never does.
 *
 * The map is OpenStreetMap. Google's keyless embed now answers with
 * `X-Frame-Options: SAMEORIGIN`, so browsers refuse to paint it, and its
 * supported embed wants a key on a billed Cloud project.
 *
 * The loading rule is the part that matters, and the version before this got
 * it wrong in a way that failed on every phone. The panel is collapsed behind
 * a toggle on a small screen, so the frame sits inside `display: none`; a
 * `loading="lazy"` frame in a hidden container is never fetched. But the
 * old timeout started on mount regardless, so it expired while the map was
 * still hidden, dropped the frame, and left the tap that finally opened the
 * panel showing a failure that had never been attempted. Guaranteed, every
 * time, on every phone.
 *
 * So the clock starts when the panel is actually on screen, not when it
 * mounts — an IntersectionObserver, the same trigger `loading="lazy"` uses —
 * and the timeout no longer unmounts the frame. A slow map is not a failed
 * one: the panel covers the wait and steps aside whenever `load` finally
 * fires, which on a 3G connection in Zimbabwe can be a good while after the
 * tap. Only a missing pin means no frame at all, because the OSM embed has
 * no geocoder and there would be nothing to draw.
 *
 * The honest limit, unchanged: a cross-origin frame that fails still fires
 * `load`, and same-origin rules stop us reading it, so a hard network failure
 * shows the browser's error box rather than this panel.
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
  const [state, setState] = useState<"waiting" | "loading" | "ready" | "slow">("waiting");
  const [onScreen, setOnScreen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const src = pin ? osmEmbedUrl(pin, scale) : null;

  // Start when the panel is actually visible, not when it mounts. On a phone it
  // begins life inside `display: none`, where a lazy frame is never fetched —
  // timing that from mount is timing a request nobody has made.
  useEffect(() => {
    const node = frameRef.current;
    if (!node || !src) return;
    if (typeof IntersectionObserver === "undefined") {
      setOnScreen(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setOnScreen(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [src]);

  // Every map is a fresh attempt: one that failed for one place must not leave
  // the next showing a stale failure, or a stale success.
  useEffect(() => {
    setState("waiting");
    setOnScreen(false);
  }, [src]);

  // The wait is only a wait. If it runs long the panel says so and stays put,
  // but the frame is left alone — a map that arrives late still gets to arrive.
  useEffect(() => {
    if (!src || !onScreen) return;
    setState((current) => (current === "ready" ? current : "loading"));
    const timer = setTimeout(() => {
      setState((current) => (current === "loading" ? "slow" : current));
    }, 15000);
    return () => clearTimeout(timer);
  }, [src, onScreen]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border border-line bg-cream",
        hidden && "hidden lg:block",
        className,
      )}
    >
      <div ref={frameRef} className={cn("relative", aspect)}>
        {src && onScreen && (
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
              (state === "loading" || state === "waiting") && "animate-pulse-soft",
            )}
          >
            <MapPin className="size-5" strokeWidth={1.8} />
          </span>
          <span className="relative font-display font-semibold text-ink">{caption ?? query}</span>
          {!src && (
            <span className="relative max-w-xs text-sm text-ink-faint">
              No map pin for this one yet. The link below searches Google Maps.
            </span>
          )}
          {state === "slow" && (
            <span className="relative max-w-xs text-sm text-ink-faint">
              The map is taking a while on this connection. It will appear if it
              arrives; the link below opens it in Google Maps either way.
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

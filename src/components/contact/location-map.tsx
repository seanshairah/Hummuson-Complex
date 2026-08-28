"use client";

import { useState } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { googleMapsEmbedUrl, googleMapsLink } from "@/lib/maps";

/**
 * Interactive location card. The whole card deep-links to Google Maps; the
 * live map itself loads only on request so the page costs nothing extra on
 * slow connections.
 */
export function LocationMap({ query, address }: { query: string; address: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-cream">
      <div className="relative aspect-[16/10]">
        {loaded ? (
          <iframe
            src={googleMapsEmbedUrl(query)}
            title={`Map — ${address}`}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 size-full border-0"
          />
        ) : (
          <a
            href={googleMapsLink(query)}
            target="_blank"
            rel="noopener noreferrer"
            className="group absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_30%_20%,#dfe8d3,transparent_55%),radial-gradient(circle_at_75%_80%,#e8e2cf,transparent_50%)] bg-paper-dim p-6 text-center"
            aria-label={`Open ${address} in Google Maps`}
          >
            {/* Stylised "map" grid so the card reads as a map before loading */}
            <span
              aria-hidden
              className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,rgba(31,41,26,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(31,41,26,0.08)_1px,transparent_1px)] [background-size:2.6rem_2.6rem]"
            />
            <span
              aria-hidden
              className="absolute top-[18%] -left-6 h-1.5 w-[55%] -rotate-6 rounded-full bg-leaf-600/15"
            />
            <span
              aria-hidden
              className="absolute right-[-4%] bottom-[24%] h-1.5 w-[48%] rotate-12 rounded-full bg-soil-400/20"
            />
            <span className="relative flex size-14 items-center justify-center rounded-full bg-humus-900 text-paper shadow-float transition-transform group-hover:scale-105">
              <MapPin className="size-6" strokeWidth={1.8} />
            </span>
            <span className="relative font-display font-semibold text-ink">{address}</span>
            <span className="relative inline-flex items-center gap-1.5 text-sm font-medium text-leaf-800">
              Open in Google Maps <ArrowUpRight className="size-4" />
            </span>
          </a>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <MapPin className="size-4 text-leaf-700" strokeWidth={1.9} />
          {address}
        </p>
        <div className="flex items-center gap-4">
          {!loaded && (
            <button
              type="button"
              onClick={() => setLoaded(true)}
              className="text-sm font-medium text-ink underline-offset-4 hover:underline"
            >
              Load map preview
            </button>
          )}
          <a
            href={googleMapsLink(query)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-leaf-800 hover:text-brand"
          >
            Directions <ArrowUpRight className="size-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

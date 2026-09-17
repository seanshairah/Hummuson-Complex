"use client";

import { useState } from "react";
import { ArrowUpRight, MapPin, Phone } from "lucide-react";
import { googleMapsEmbedUrl, googleMapsLink, type MapPin as MapPinCoords } from "@/lib/maps";
import { cn } from "@/lib/utils";

export interface StockistTown {
  town: string;
  distributors: {
    id: string;
    name: string;
    address: string | null;
    phones: string[];
    notes: string | null;
    pin: MapPinCoords | null;
  }[];
}

/**
 * Where to buy: one map, one town at a time.
 *
 * Google's keyless embed takes a single query, so it can show one place — which
 * rules out dropping every stockist on one national map without an API key and
 * a billing account. Switching the map by town is the honest version of the
 * same idea: the map shows the town you picked, and each shop under it carries
 * its own link into Google Maps, which is where directions actually belong.
 *
 * What the link sends depends on what we know. A shop with real coordinates
 * gets a pin. A shop with only a street address gets a Google search of that
 * address — Google's guess, clearly, rather than a pin we invented on its
 * behalf. A shop with neither gets no directions link at all rather than one
 * that lands somewhere plausible and wrong.
 */
export function StockistMap({ towns }: { towns: StockistTown[] }) {
  // Open on a town that has something to show. The owner's order decides the
  // tabs, but landing on a town whose addresses have not come in yet makes the
  // whole page look empty on arrival.
  const firstUseful = towns.find((town) => town.distributors.some((shop) => shop.address));
  const [active, setActive] = useState((firstUseful ?? towns[0])?.town ?? "");
  const current = towns.find((t) => t.town === active) ?? towns[0];
  if (!current) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr] lg:items-start">
      <div className="space-y-4">
        <div
          role="tablist"
          aria-label="Towns"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {towns.map((town) => {
            const selected = town.town === current.town;
            return (
              <button
                key={town.town}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(town.town)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  selected
                    ? "border-humus-950 bg-humus-950 text-paper"
                    : "border-line bg-cream text-ink-soft hover:border-leaf-600 hover:text-ink",
                )}
              >
                {town.town}
                <span className="ml-1.5 opacity-60">{town.distributors.length}</span>
              </button>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-3xl border border-line bg-cream">
          <div className="relative aspect-[4/3] sm:aspect-[16/11]">
            <span
              aria-hidden
              className="absolute inset-0 flex items-center justify-center bg-paper-dim"
            >
              <span className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,rgba(31,41,26,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(31,41,26,0.08)_1px,transparent_1px)] [background-size:2.6rem_2.6rem]" />
              <span className="relative flex size-12 items-center justify-center rounded-full bg-humus-900 text-paper shadow-float">
                <MapPin className="size-5" strokeWidth={1.8} />
              </span>
            </span>
            <iframe
              // Re-keyed on the town so switching tabs actually reloads the
              // frame; without it the src changes and some browsers keep the
              // old map painted.
              key={current.town}
              src={googleMapsEmbedUrl(`${current.town}, Zimbabwe`)}
              title={`Map — ${current.town}`}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 size-full border-0"
            />
          </div>
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {current.distributors.map((shop) => {
          const directions = shop.pin
            ? googleMapsLink(shop.name, shop.pin)
            : shop.address
              ? googleMapsLink(`${shop.name}, ${shop.address}, Zimbabwe`)
              : null;
          return (
            <li
              key={shop.id}
              className="flex h-full min-w-0 flex-col rounded-3xl border border-line bg-cream p-5 shadow-card"
            >
              <h3 className="font-display text-lg leading-snug font-semibold break-words text-ink">
                {shop.name}
              </h3>
              <p className="mt-1.5 flex items-start gap-2 text-sm text-ink-soft">
                <MapPin className="mt-0.5 size-4 shrink-0 text-leaf-700" strokeWidth={1.9} />
                <span className="min-w-0 break-words">
                  {shop.address ?? (
                    <span className="text-ink-faint italic">
                      Address to follow — call ahead or ask us
                    </span>
                  )}
                </span>
              </p>
              {shop.notes && <p className="mt-2 text-sm text-ink-faint">{shop.notes}</p>}
              {shop.phones.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {shop.phones.map((phone) => (
                    <li key={phone}>
                      <a
                        href={`tel:${phone.replace(/\s+/g, "")}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-leaf-600 hover:text-ink"
                      >
                        <Phone className="size-3.5" strokeWidth={1.9} />
                        {phone}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {directions && (
                <a
                  href={directions}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-medium text-leaf-800 hover:text-brand"
                >
                  Directions <ArrowUpRight className="size-4" />
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, ChevronDown, Map as MapIcon, MapPin, Phone } from "lucide-react";
import { googleMapsLink, type MapPin as MapPinCoords } from "@/lib/maps";
import { MapPanel } from "@/components/shared/map-panel";
import { Combobox } from "@/components/ui/combobox";
import { CardGrid } from "@/components/layout/card-grid";
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

/** Results shown before "Show more" — two full rows of the two-column grid. */
const PAGE_SIZE = 6;

/**
 * Where a stockist's "Get directions" goes, and whether it should exist.
 *
 * Coordinates give a pin. A street address gives Google a search — its guess,
 * plainly, not one we placed. Neither gives nothing: a link that lands
 * somewhere plausible and wrong is worse than no link, because a farmer
 * believes it.
 */
function directionsHref(shop: StockistTown["distributors"][number]) {
  if (shop.pin) return googleMapsLink(shop.name, shop.pin);
  if (shop.address) return googleMapsLink(`${shop.name}, ${shop.address}, Zimbabwe`);
  return null;
}

export function StockistMap({ towns }: { towns: StockistTown[] }) {
  // Open on a town that has something to show. The owner's order decides the
  // list, but landing on a town whose addresses have not come in yet makes the
  // whole page look empty on arrival.
  const firstUseful = towns.find((town) => town.distributors.some((shop) => shop.address));
  const [active, setActive] = useState((firstUseful ?? towns[0])?.town ?? "");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [mapOpen, setMapOpen] = useState(false);

  const current = towns.find((t) => t.town === active) ?? towns[0];

  const options = useMemo(
    () =>
      towns.map((town) => ({
        value: town.town,
        label: town.town,
        hint: String(town.distributors.length),
      })),
    [towns],
  );

  if (!current) return null;

  const results = current.distributors;
  const visible = results.slice(0, shown);
  const remaining = results.length - visible.length;

  return (
    <div className="space-y-6">
      {/* Control area: the one choice this page asks for, and what it produced. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="w-full sm:max-w-xs">
          <Combobox
            label="Town"
            value={current.town}
            onChange={(town) => {
              setActive(town);
              // A new town starts at the top of its own list, not part-way down
              // the previous one's.
              setShown(PAGE_SIZE);
            }}
            options={options}
            placeholder="Select a town"
            searchPlaceholder="Search towns…"
            emptyLabel="No town by that name"
          />
        </div>
        <p aria-live="polite" className="text-sm text-ink-soft">
          <span className="font-display font-semibold text-ink">{results.length}</span>{" "}
          {results.length === 1 ? "stockist" : "stockists"} in{" "}
          <span className="font-display font-semibold text-ink">{current.town}</span>
        </p>
      </div>

 <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
        {/* Map first in the DOM so the phone gets its control before the list;
            `lg:order-2` puts it back on the right on a wide screen, where both
            columns then start on the same line. */}
        <div className="lg:order-2 lg:sticky lg:top-24">
          <button
            type="button"
            onClick={() => setMapOpen((open) => !open)}
            aria-expanded={mapOpen}
            className="mb-3 flex h-11 w-full items-center justify-between gap-3 rounded-full border border-line bg-cream px-4 text-sm font-medium text-ink transition-colors hover:border-leaf-600 lg:hidden"
          >
            <span className="flex items-center gap-2">
              <MapIcon className="size-4 text-leaf-700" strokeWidth={2} />
              {mapOpen ? "Hide map" : `View map of ${current.town}`}
            </span>
            <ChevronDown
              className={cn("size-4 text-ink-faint transition-transform", mapOpen && "rotate-180")}
              strokeWidth={2}
            />
          </button>
          <MapPanel
            query={`${current.town}, Zimbabwe`}
            caption={`${current.town}, Zimbabwe`}
            hidden={!mapOpen}
          />
        </div>

        <div className="lg:order-1">
          {results.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line px-6 py-12 text-center">
              <p className="font-display text-lg font-semibold text-ink">
                No stockist listed in {current.town} yet
              </p>
              <p className="mt-2 text-sm text-ink-faint">
                Humuson delivers nationally — ask us and we will sort out supply.
              </p>
            </div>
          ) : (
            <>
              <CardGrid as="ul" min="sm" gap="base">
                {visible.map((shop) => {
                  const directions = directionsHref(shop);
                  return (
                    <li
                      key={shop.id}
                      className="flex h-full min-w-0 flex-col rounded-3xl border border-line bg-cream p-5 shadow-card"
                    >
                      <h3 className="font-display text-base leading-snug font-semibold break-words text-ink">
                        {shop.name}
                      </h3>

                      <p className="mt-2 flex items-start gap-2 text-sm text-ink-soft">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-leaf-700" strokeWidth={1.9} />
                        <span className="min-w-0 break-words">
                          {shop.address ?? (
                            <span className="text-ink-faint italic">
                              Address to follow — call ahead or ask us
                            </span>
                          )}
                        </span>
                      </p>

                      {shop.phones.length > 0 && (
                        <ul className="mt-2.5 space-y-1">
                          {shop.phones.map((phone) => (
                            <li key={phone}>
                              <a
                                href={`tel:${phone.replace(/\s+/g, "")}`}
                                className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-brand"
                              >
                                <Phone className="size-4 shrink-0 text-leaf-700" strokeWidth={1.9} />
                                {phone}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}

                      {shop.notes && (
                        <p className="mt-2.5 text-sm text-ink-faint">{shop.notes}</p>
                      )}

                      {/* `mt-auto` is the whole reason the card is a column: the
                          action sits on the card's floor wherever the address
                          above it happens to end, so a row of cards has its
                          links on one line. */}
                      <div className="mt-auto pt-4">
                        {directions ? (
                          <a
                            href={directions}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-leaf-800 hover:text-brand"
                          >
                            Get directions <ArrowUpRight className="size-4" />
                          </a>
                        ) : (
                          <span className="text-sm text-ink-faint">
                            Directions once we have the address
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </CardGrid>

              {remaining > 0 && (
                <button
                  type="button"
                  onClick={() => setShown((count) => count + PAGE_SIZE)}
                  className="mt-4 h-11 w-full rounded-full border border-line bg-cream px-5 text-sm font-medium text-ink transition-colors hover:border-leaf-600 hover:text-brand"
                >
                  Show {Math.min(remaining, PAGE_SIZE)} more in {current.town}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

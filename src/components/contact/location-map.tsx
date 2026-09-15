import { ArrowUpRight, MapPin } from "lucide-react";
import { googleMapsEmbedUrl, googleMapsLink, type MapPin as MapPinCoords } from "@/lib/maps";

/**
 * Location card: a live map of the yard, with the address and a directions
 * link under it.
 *
 * The map used to sit behind a "load preview" tap to spare people on mobile
 * data, which meant the contact page showed a drawing of a map rather than a
 * map. `loading="lazy"` buys back most of that: the embed stays off the wire
 * until it scrolls near the viewport, so anyone who never reaches it never
 * pays for it, and anyone who does gets the real thing without a second tap.
 *
 * The stylised card sits *behind* the iframe rather than in front of it, so it
 * is what shows while the embed is still loading instead of a blank hole. It
 * does not survive a blocked embed — a browser that cannot reach Google paints
 * its own error page over the frame, opaquely, and there is no reliable
 * cross-origin way to detect that and swap back. The address and the
 * directions link below the frame are what still work in that case, which is
 * why they live outside it rather than on top of the map.
 */
export function LocationMap({
  query,
  address,
  pin,
}: {
  query: string;
  address: string;
  pin?: MapPinCoords | null;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-cream">
      <div className="relative aspect-[16/10]">
        <span
          aria-hidden
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_30%_20%,#dfe8d3,transparent_55%),radial-gradient(circle_at_75%_80%,#e8e2cf,transparent_50%)] bg-paper-dim p-6 text-center"
        >
          {/* Stylised "map" grid so the card reads as a map before the embed lands */}
          <span className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,rgba(31,41,26,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(31,41,26,0.08)_1px,transparent_1px)] [background-size:2.6rem_2.6rem]" />
          <span className="absolute top-[18%] -left-6 h-1.5 w-[55%] -rotate-6 rounded-full bg-leaf-600/15" />
          <span className="absolute right-[-4%] bottom-[24%] h-1.5 w-[48%] rotate-12 rounded-full bg-soil-400/20" />
          <span className="relative flex size-14 items-center justify-center rounded-full bg-humus-900 text-paper shadow-float">
            <MapPin className="size-6" strokeWidth={1.8} />
          </span>
          <span className="relative font-display font-semibold text-ink">{address}</span>
        </span>
        <iframe
          src={googleMapsEmbedUrl(query, pin)}
          title={`Map — ${address}`}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 size-full border-0"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <MapPin className="size-4 text-leaf-700" strokeWidth={1.9} />
          {address}
        </p>
        <a
          href={googleMapsLink(query, pin)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-leaf-800 hover:text-brand"
        >
          Directions <ArrowUpRight className="size-4" />
        </a>
      </div>
    </div>
  );
}

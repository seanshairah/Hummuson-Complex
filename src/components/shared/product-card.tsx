import Link from "next/link";
import { ArrowUpRight, Leaf, Package } from "lucide-react";
import { cn, humanize } from "@/lib/utils";
import type { ProductCardData } from "@/server/data/products";
import { MediaImage } from "@/components/shared/media-image";
import { Badge } from "@/components/ui/badge";

/**
 * The signature product card: pack shot on a soft organic surface, confident
 * name, purpose line, and quick facts that slide in on hover. Fully
 * keyboard-accessible — the whole card is one link.
 */
export function ProductCard({
  product,
  reasons,
  className,
  priority = false,
}: {
  product: ProductCardData;
  /** Finder recommendation chips ("Listed for maize") — real mappings only. */
  reasons?: string[];
  className?: string;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-line/70 bg-cream shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-pop focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-500",
        className,
      )}
    >
      {/* Image stage */}
      <div className="relative aspect-[4/3.4] overflow-hidden bg-gradient-to-br from-paper-dim via-paper to-paper-deep">
        {product.image ? (
          <MediaImage
            image={product.image}
            alt={`${product.name} — product pack`}
            fill
            priority={priority}
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 320px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-faint/40">
            <Package className="size-14" strokeWidth={1} />
          </div>
        )}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-humus-950/25 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
        {product.category && (
          <Badge variant="glass" className="absolute top-3 left-3 backdrop-blur-md">
            {product.category.name}
          </Badge>
        )}
        {product.featured && (
          <Badge variant="leaf" className="absolute top-3 right-3">
            Featured
          </Badge>
        )}

        {/* Hover quick facts */}
        <div className="absolute inset-x-3 bottom-3 translate-y-2 rounded-xl bg-humus-950/80 p-3 opacity-0 backdrop-blur-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 max-lg:hidden">
          {product.cropNames.length > 0 ? (
            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-paper/90">
              <Leaf className="mt-0.5 size-3.5 shrink-0 text-leaf-400" strokeWidth={2} />
              <span>
                {product.cropNames.slice(0, 5).join(", ")}
                {product.cropNames.length > 5 && ` +${product.cropNames.length - 5} more`}
              </span>
            </p>
          ) : (
            <p className="text-xs text-paper/80">Ask us about crop suitability</p>
          )}
          {product.methods.length > 0 && (
            <p className="mt-1.5 text-[0.68rem] tracking-wide text-leaf-300 uppercase">
              {product.methods.map(humanize).join(" · ")}
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold tracking-tight text-ink transition-colors group-hover:text-brand">
            {product.name}
          </h3>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-ink-faint transition-all group-hover:border-leaf-600 group-hover:bg-leaf-400 group-hover:text-humus-950">
            <ArrowUpRight className="size-3.5" />
          </span>
        </div>
        {product.shortDescription && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-faint">
            {product.shortDescription}
          </p>
        )}

        {reasons && reasons.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {reasons.slice(0, 3).map((reason) => (
              <li key={reason}>
                <Badge variant="leaf" className="px-2.5 py-0.5 text-[0.66rem]">
                  {reason}
                </Badge>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-3.5 text-xs text-ink-faint">
          <span>
            {product.packSizes.length > 0
              ? product.packSizes.slice(0, 3).join(" · ")
              : "Pack info on request"}
          </span>
          {product.priceUsd !== null && (
            <span className="font-display text-sm font-semibold text-ink">
              ${product.priceUsd % 1 === 0 ? product.priceUsd : product.priceUsd.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

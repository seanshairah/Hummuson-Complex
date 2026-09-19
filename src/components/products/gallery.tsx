"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MediaImage } from "@/components/shared/media-image";
import type { ImageData } from "@/server/data/products";

export function ProductGallery({ images, name }: { images: ImageData[]; name: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];
  if (!current) return null;

  return (
    <div>
      <div className="group relative aspect-[4/4.6] overflow-hidden rounded-3xl bg-gradient-to-br from-paper-dim via-cream to-paper-deep shadow-card">
        <MediaImage
          key={current.url}
          image={current}
          alt={`${name} — product pack`}
          fill
          priority
          sizes="(max-width: 1024px) 92vw, 560px"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-humus-950/12 via-transparent to-transparent"
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2.5" role="tablist" aria-label={`${name} images`}>
          {images.map((image, i) => (
            <button
              key={image.url}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Image ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                "relative h-20 w-16 overflow-hidden rounded-xl border-2 transition-all",
                i === index
                  ? "border-leaf-600 shadow-card"
                  : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <MediaImage image={image} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

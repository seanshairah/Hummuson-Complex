import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ImageData } from "@/server/data/products";

/**
 * Renders a Media record with blur-up placeholder and correct alt text.
 * `fill` mode requires a positioned parent.
 */
export function MediaImage({
  image,
  alt,
  fill = false,
  sizes,
  className,
  priority = false,
  quality,
}: {
  image: ImageData;
  alt?: string;
  fill?: boolean;
  sizes?: string;
  className?: string;
  priority?: boolean;
  quality?: number;
}) {
  const common = {
    src: image.url,
    alt: alt ?? image.alt ?? "",
    sizes,
    priority,
    quality,
    className: cn(fill && "object-cover", className),
    ...(image.blurDataUrl ? { placeholder: "blur" as const, blurDataURL: image.blurDataUrl } : {}),
  };

  if (fill) return <Image {...common} fill />;
  return <Image {...common} width={image.width ?? 800} height={image.height ?? 800} />;
}

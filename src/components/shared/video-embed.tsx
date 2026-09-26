"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { cn, humanize } from "@/lib/utils";
import { youtubeEmbedUrl, youtubeThumbnail } from "@/lib/youtube";
import { trackClient } from "@/lib/analytics-client";

/**
 * Click-to-load YouTube embed: only a thumbnail + play affordance until the
 * viewer opts in — no third-party JS on page load (crucial on slow
 * connections).
 */
export function VideoEmbed({
  youtubeId,
  title,
  category,
  className,
}: {
  youtubeId: string;
  title: string;
  category?: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <figure
      id={youtubeId}
      className={cn(
        "group relative aspect-video overflow-hidden rounded-2xl bg-humus-900 shadow-card",
        className,
      )}
    >
      {playing ? (
        <iframe
          src={youtubeEmbedUrl(youtubeId)}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setPlaying(true);
            trackClient("VIDEO_PLAY", { entityType: "video", entityId: youtubeId });
          }}
          aria-label={`Play video: ${title}`}
          className="absolute inset-0 h-full w-full text-left"
        >
          <Image
            src={youtubeThumbnail(youtubeId)}
            alt=""
            fill
            sizes="(max-width: 768px) 92vw, 560px"
            className="object-cover opacity-85 transition-all duration-300 group-hover:scale-[1.03] group-hover:opacity-100"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-humus-950/80 via-humus-950/10 to-transparent"
          />
          <span className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-leaf-400 text-humus-950 shadow-float transition-transform duration-300 group-hover:scale-110">
            <Play className="ml-0.5 size-6 fill-current" />
          </span>
          <span className="absolute inset-x-4 bottom-3.5">
            {category && (
              <span className="text-[0.65rem] font-medium tracking-widest text-leaf-300 uppercase">
                {humanize(category)}
              </span>
            )}
            <span className="mt-0.5 line-clamp-2 block font-display text-sm font-medium text-paper">
              {title}
            </span>
          </span>
        </button>
      )}
    </figure>
  );
}

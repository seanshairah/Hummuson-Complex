"use client";

import { useMemo, useState } from "react";
import { PlayCircle } from "lucide-react";
import { VideoEmbed } from "@/components/shared/video-embed";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { cn, humanize } from "@/lib/utils";
import type { VideoData } from "@/server/data/content";

export function VideoGrid({ videos }: { videos: VideoData[] }) {
  const categories = useMemo(() => {
    const present = [...new Set(videos.map((video) => video.category))];
    return ["ALL", ...present];
  }, [videos]);
  const [active, setActive] = useState("ALL");
  const shown = active === "ALL" ? videos : videos.filter((video) => video.category === active);

  return (
    <div>
      {categories.length > 2 && (
        <div
          role="tablist"
          aria-label="Video categories"
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-none"
        >
          {categories.map((category) => (
            <button
              key={category}
              role="tab"
              aria-selected={active === category}
              onClick={() => setActive(category)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 font-display text-sm font-medium transition-colors",
                active === category
                  ? "border-humus-900 bg-humus-900 text-paper"
                  : "border-line bg-cream text-ink-soft hover:border-ink/30",
              )}
            >
              {category === "ALL" ? "All videos" : humanize(category)}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <EmptyState
          icon={PlayCircle}
          title="No videos in this category yet"
          description="New videos are added from the Humuson YouTube channel."
          action={<ButtonLink href="/knowledge">Browse articles instead</ButtonLink>}
          className="mt-6"
        />
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {shown.map((video) => (
            <div key={video.id}>
              <VideoEmbed
                youtubeId={video.youtubeId}
                title={video.title}
                category={humanize(video.category)}
              />
              {video.description && (
                <p className="mt-2.5 line-clamp-2 px-1 text-sm text-ink-faint">{video.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

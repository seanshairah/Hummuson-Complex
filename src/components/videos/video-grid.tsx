"use client";

import { useMemo, useState } from "react";
import { PlayCircle } from "lucide-react";
import { VideoEmbed } from "@/components/shared/video-embed";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { cn, humanize } from "@/lib/utils";
import type { VideoData } from "@/server/data/content";

export function VideoGrid({ videos }: { videos: VideoData[] }) {
  const featured = videos.find((video) => video.featured) ?? null;
  const rest = useMemo(
    () => videos.filter((video) => video.id !== featured?.id),
    [videos, featured],
  );
  const categories = useMemo(() => {
    const present = [...new Set(rest.map((video) => video.category))];
    return ["ALL", ...present];
  }, [rest]);
  const [active, setActive] = useState("ALL");
  const shown = active === "ALL" ? rest : rest.filter((video) => video.category === active);

  return (
    <div>
      {featured && (
        <div className="bg-grain relative mb-12 overflow-hidden rounded-[2rem] bg-humus-950 text-paper">
          <div aria-hidden className="absolute inset-0 glow-leaf" />
          <div className="relative grid items-center gap-7 p-5 sm:p-6 md:p-8 lg:grid-cols-[1.55fr_1fr] lg:gap-10">
            <VideoEmbed
              youtubeId={featured.youtubeId}
              title={featured.title}
              category={humanize(featured.category)}
            />
            <div className="pb-1 max-lg:px-1">
              <p className="text-eyebrow text-leaf-400">Featured film</p>
              <h2 className="mt-3 font-display text-2xl leading-snug font-semibold tracking-tight text-paper md:text-3xl">
                {featured.title}
              </h2>
              {featured.description && (
                <p className="mt-4 leading-relaxed text-paper/70">{featured.description}</p>
              )}
              <p className="mt-6 inline-flex rounded-full border border-paper/20 px-3.5 py-1.5 text-[0.65rem] font-medium tracking-widest text-paper/75 uppercase">
                {humanize(featured.category)}
              </p>
            </div>
          </div>
        </div>
      )}
      {categories.length > 2 && (
        <div
          role="tablist"
          aria-label="Video categories"
          className="scrollbar-none flex gap-2 overflow-x-auto pb-2"
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
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((video) => (
            <VideoEmbed
              key={video.id}
              youtubeId={video.youtubeId}
              title={video.title}
              category={humanize(video.category)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

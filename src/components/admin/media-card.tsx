"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Check, Pencil } from "lucide-react";
import { updateMediaAlt } from "@/server/actions/admin/misc";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { deleteMedia } from "@/server/actions/admin/misc";

export function MediaCard({
  media,
  usage,
}: {
  media: {
    id: string;
    url: string;
    alt: string | null;
    width: number | null;
    height: number | null;
    kind: string | null;
    sizeBytes: number | null;
  };
  usage: number;
}) {
  const [editing, setEditing] = useState(false);
  const [alt, setAlt] = useState(media.alt ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <figure className="group overflow-hidden rounded-2xl border border-line bg-cream">
      <div className="relative aspect-square bg-paper-dim">
        <Image src={media.url} alt={media.alt ?? ""} fill sizes="220px" className="object-cover" />
        <span className="absolute top-2 left-2 rounded-full bg-humus-950/70 px-2 py-0.5 text-[0.6rem] text-paper">
          {media.kind ?? "image"}
        </span>
      </div>
      <figcaption className="space-y-1.5 p-3">
        {editing ? (
          <form
            className="flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                await updateMediaAlt(media.id, alt);
                setEditing(false);
              });
            }}
          >
            <input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Alt text"
              aria-label="Alt text"
              className="h-8 w-full rounded-lg border border-line bg-paper px-2 text-xs outline-none focus:border-leaf-600"
            />
            <button
              type="submit"
              disabled={pending}
              aria-label="Save alt text"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-leaf-400 text-humus-950"
            >
              <Check className="size-3.5" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex w-full items-start gap-1.5 text-left text-xs text-ink-faint hover:text-ink"
          >
            <Pencil className="mt-0.5 size-3 shrink-0" />
            <span className="line-clamp-2">{media.alt || "Add alt text…"}</span>
          </button>
        )}
        <div className="flex items-center justify-between text-[0.65rem] text-ink-faint">
          <span>
            {media.width && media.height ? `${media.width}×${media.height}` : ""}
            {media.sizeBytes ? ` · ${Math.round(media.sizeBytes / 1024)}KB` : ""}
          </span>
          <span>{usage > 0 ? `${usage} use${usage === 1 ? "" : "s"}` : "unused"}</span>
        </div>
        {usage === 0 && (
          <ConfirmButton
            title="Delete this file?"
            description="The record is removed from the library."
            label="Delete"
            className="h-7 w-full justify-center text-xs"
            action={async () => deleteMedia(media.id)}
          />
        )}
      </figcaption>
    </figure>
  );
}

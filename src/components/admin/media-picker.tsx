"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, ImagePlus, X } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface MediaOption {
  id: string;
  url: string;
  alt: string | null;
}

/**
 * Gallery picker: choose ordered images from the media library. Selection is
 * submitted as hidden inputs (galleryIds, first = primary unless overridden).
 */
export function MediaPicker({
  media,
  initialIds = [],
  name = "galleryIds",
  max = 8,
  label = "Choose images",
}: {
  media: MediaOption[];
  initialIds?: string[];
  name?: string;
  max?: number;
  label?: string;
}) {
  const [selected, setSelected] = useState<string[]>(initialIds);
  const [open, setOpen] = useState(false);
  const byId = new Map(media.map((item) => [item.id, item]));

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length >= max
          ? current
          : [...current, id],
    );
  };

  return (
    <div>
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      <div className="flex flex-wrap items-center gap-2.5">
        {selected.map((id, index) => {
          const item = byId.get(id);
          if (!item) return null;
          return (
            <div key={id} className="group relative">
              <div className="relative h-20 w-16 overflow-hidden rounded-xl border border-line bg-paper-dim">
                <Image
                  src={item.url}
                  alt={item.alt ?? ""}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              {index === 0 && (
                <span className="absolute -top-1.5 -left-1.5 rounded-full bg-leaf-400 px-1.5 py-0.5 text-[0.55rem] font-semibold text-humus-950">
                  Primary
                </span>
              )}
              <button
                type="button"
                onClick={() => toggle(id)}
                aria-label="Remove image"
                className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-danger text-paper opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          );
        })}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="flex h-20 w-16 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-ink-faint transition-colors hover:border-leaf-600 hover:text-leaf-700"
            >
              <ImagePlus className="size-5" strokeWidth={1.6} />
              <span className="text-[0.6rem] font-medium">
                {selected.length > 0 ? "Edit" : label}
              </span>
            </button>
          </DialogTrigger>
          <DialogContent
            title="Media library"
            description={`Select up to ${max} images — the first is the primary image.`}
            className="max-w-2xl"
          >
            <div className="grid max-h-[55dvh] grid-cols-4 gap-3 overflow-y-auto pr-1 sm:grid-cols-5">
              {media.map((item) => {
                const index = selected.indexOf(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggle(item.id)}
                    className={cn(
                      "relative aspect-[3/4] overflow-hidden rounded-xl border-2 transition-all",
                      index >= 0
                        ? "border-leaf-600"
                        : "border-transparent opacity-85 hover:opacity-100",
                    )}
                  >
                    <Image
                      src={item.url}
                      alt={item.alt ?? ""}
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                    {index >= 0 && (
                      <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-leaf-400 text-[0.6rem] font-bold text-humus-950">
                        {index === 0 ? <Check className="size-3" /> : index + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setOpen(false)}>Done</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

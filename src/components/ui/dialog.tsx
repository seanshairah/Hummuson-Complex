"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  children,
  title,
  description,
  className,
  hideTitle = false,
}: {
  children: ReactNode;
  title: string;
  description?: string;
  className?: string;
  hideTitle?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-humus-950/60 backdrop-blur-sm data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 max-h-[85dvh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-cream p-6 shadow-pop focus:outline-none data-[state=open]:animate-scale-in",
          className,
        )}
      >
        <DialogPrimitive.Title className={cn("pr-8 text-title text-ink", hideTitle && "sr-only")}>
          {title}
        </DialogPrimitive.Title>
        {description && (
          <DialogPrimitive.Description className="mt-1.5 text-sm text-ink-faint">
            {description}
          </DialogPrimitive.Description>
        )}
        <div className={cn(!hideTitle && "mt-5")}>{children}</div>
        <DialogPrimitive.Close
          className="absolute top-4 right-4 rounded-full p-2 text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink"
          aria-label="Close"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Side sheet — bottom on mobile, right on desktop. */
export function SheetContent({
  children,
  title,
  description,
  side = "right",
  className,
  headerAction,
}: {
  children: ReactNode;
  title: string;
  description?: string;
  side?: "right" | "bottom" | "left";
  className?: string;
  /** Optional control rendered before the title (e.g. a back button). */
  headerAction?: ReactNode;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-humus-950/60 backdrop-blur-sm data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col bg-cream shadow-pop focus:outline-none",
          side === "right" &&
            "top-0 right-0 h-dvh w-full max-w-md data-[state=open]:animate-slide-in-right",
          side === "left" && "top-0 left-0 h-dvh w-full max-w-sm",
          side === "bottom" &&
            "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl data-[state=open]:animate-slide-in-up",
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="flex min-w-0 items-start gap-2">
            {headerAction}
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-title text-ink">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-0.5 text-sm text-ink-faint">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
          </div>
          <DialogPrimitive.Close
            className="rounded-full p-2 text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

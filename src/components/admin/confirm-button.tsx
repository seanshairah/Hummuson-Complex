"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Destructive action with an explicit confirmation step. Wraps a server
 * action bound to the entity id.
 */
export function ConfirmButton({
  action,
  title,
  description,
  label = "Delete",
  confirmLabel = "Yes, delete",
  icon = true,
  variant = "ghost",
  className,
}: {
  action: () => Promise<void | { error?: string }>;
  title: string;
  description?: string;
  label?: string;
  confirmLabel?: string;
  icon?: boolean;
  variant?: "ghost" | "danger" | "outline";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors",
          variant === "ghost" && "text-ink-faint hover:bg-danger/10 hover:text-danger",
          variant === "danger" && "bg-danger text-paper hover:opacity-90",
          variant === "outline" &&
            "border border-line text-ink-soft hover:border-danger hover:text-danger",
          className,
        )}
      >
        {icon && <Trash2 className="size-3.5" />}
        {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={title} description={description}>
          {error && (
            <p
              role="alert"
              className="mb-3 rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger"
            >
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const result = await action();
                  if (result && "error" in result && result.error) {
                    setError(result.error);
                  } else {
                    setOpen(false);
                  }
                })
              }
            >
              {pending && <Spinner className="size-4" />}
              {confirmLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

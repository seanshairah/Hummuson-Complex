"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/skeleton";
import { idle, type AdminActionState } from "@/lib/admin-state";

/**
 * Dialog wrapping a server-action form — used for the compact CRUD modules
 * (categories, crops, testimonials, videos, users). Closes and refreshes on
 * success; shows action errors inline.
 */
export function ActionDialog({
  trigger,
  title,
  description,
  action,
  children,
  submitLabel = "Save",
  wide = false,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  action: (prev: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  children: ReactNode;
  submitLabel?: string;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, idle);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success" && open) {
      setOpen(false);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        title={title}
        description={description}
        className={wide ? "max-w-2xl" : undefined}
      >
        <form action={formAction} className="space-y-4">
          {state.status === "error" && (
            <div role="alert" className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">
              <p className="font-medium">{state.message ?? "Please fix the errors below."}</p>
              {state.fieldErrors && (
                <ul className="mt-1 list-inside list-disc">
                  {Object.entries(state.fieldErrors).map(([field, message]) => (
                    <li key={field}>
                      {field}: {message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {children}
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner className="size-4" /> : <Save className="size-4" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

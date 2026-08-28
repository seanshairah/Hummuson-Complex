"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CloudOff } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 text-center">
      <CloudOff className="size-11 text-soil-500" strokeWidth={1.4} />
      <h1 className="text-display-3 mt-6 text-ink">Something went wrong</h1>
      <p className="mt-3 max-w-md text-ink-soft">
        The page hit an unexpected problem. It’s usually temporary — try again, or head back to
        safe ground.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center rounded-full bg-humus-900 px-6 font-display text-sm font-medium text-paper hover:bg-humus-700"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-full border border-ink/20 px-6 font-display text-sm font-medium text-ink hover:bg-ink/5"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Sprout } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-humus-950 bg-grain px-6 text-center text-paper">
      <div className="glow-leaf pointer-events-none absolute inset-0" aria-hidden />
      <Sprout className="size-12 text-leaf-400" strokeWidth={1.4} />
      <p className="text-eyebrow mt-6 text-leaf-400">404 — nothing planted here</p>
      <h1 className="text-display-2 mt-4 max-w-xl text-balance">
        This field is <em className="text-editorial text-leaf-300">fallow</em>.
      </h1>
      <p className="mt-4 max-w-md text-paper/70">
        The page you’re looking for doesn’t exist or has moved with our new site. Everything worth
        finding is a step away.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-12 items-center rounded-full bg-leaf-400 px-7 font-display font-medium text-humus-950 transition-colors hover:bg-leaf-300"
        >
          Back home
        </Link>
        <Link
          href="/products"
          className="inline-flex h-12 items-center rounded-full border border-paper/25 px-7 font-display font-medium text-paper transition-colors hover:border-paper/60 hover:bg-paper/10"
        >
          Browse products
        </Link>
        <Link
          href="/search"
          className="inline-flex h-12 items-center rounded-full px-4 font-display font-medium text-paper/70 hover:text-paper"
        >
          Search →
        </Link>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AdminNavLink({
  href,
  exact = false,
  badge,
  children,
}: {
  href: string;
  exact?: boolean;
  badge?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2 font-display text-sm font-medium transition-colors",
        active ? "bg-leaf-400 text-humus-950" : "text-paper/70 hover:bg-paper/10 hover:text-paper",
      )}
    >
      {children}
      {typeof badge === "number" && (
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-xs font-semibold",
            active ? "bg-humus-950/15 text-humus-950" : "bg-leaf-400 text-humus-950",
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

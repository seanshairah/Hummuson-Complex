import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { absoluteUrl } from "@/lib/site";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({
  crumbs,
  tone = "light",
  className,
}: {
  crumbs: Crumb[];
  tone?: "light" | "dark";
  className?: string;
}) {
  const items = [{ label: "Home", href: "/" }, ...crumbs];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.label,
      ...(crumb.href ? { item: absoluteUrl(crumb.href) } : {}),
    })),
  };

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ol
        className={cn(
          "flex flex-wrap items-center gap-1.5 text-xs",
          tone === "dark" ? "text-paper/55" : "text-ink-faint",
        )}
      >
        {items.map((crumb, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="size-3 opacity-60" aria-hidden />}
              {crumb.href && !last ? (
                <Link
                  href={crumb.href}
                  className={cn(
                    "transition-colors",
                    tone === "dark" ? "hover:text-paper" : "hover:text-ink",
                  )}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className="font-medium">
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

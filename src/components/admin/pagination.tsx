import Link from "next/link";

/**
 * Page size for every admin list.
 *
 * Without a limit these pages read the whole table into one render. That is
 * fine while a table holds forty rows and quietly stops being fine later —
 * and enquiries and uploaded media grow from outside the building, so how
 * many rows there are is not entirely the site owner's decision.
 */
export const ADMIN_PAGE_SIZE = 50;

/** Clamps the ?page= parameter to something a query can be built from. */
export function pageFrom(value: string | undefined): number {
  const page = Number(value);
  return Number.isFinite(page) && page > 1 ? Math.floor(page) : 1;
}

/** `take`/`skip` for a Prisma query on the requested page. */
export function pageQuery(page: number) {
  return { take: ADMIN_PAGE_SIZE, skip: (page - 1) * ADMIN_PAGE_SIZE };
}

export function AdminPagination({
  page,
  total,
  /** Extra query parameters to carry across page links (filters, search). */
  params = {},
  basePath,
}: {
  page: number;
  total: number;
  params?: Record<string, string | undefined>;
  basePath: string;
}) {
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  if (pages <= 1) return null;

  const href = (next: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
    if (next > 1) query.set("page", String(next));
    const search = query.toString();
    return search ? `${basePath}?${search}` : basePath;
  };

  return (
    <div className="mt-5 flex items-center justify-between text-xs text-ink-faint">
      <span>
        {total.toLocaleString()} in total · page {page} of {pages}
      </span>
      <div className="flex gap-3">
        {page > 1 && (
          <Link href={href(page - 1)} className="hover:text-ink">
            ← Previous
          </Link>
        )}
        {page < pages && (
          <Link href={href(page + 1)} className="hover:text-ink">
            Next →
          </Link>
        )}
      </div>
    </div>
  );
}

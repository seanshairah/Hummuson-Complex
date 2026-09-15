import { AdminPageHeader } from "@/components/admin/page-header";
import { db } from "@/server/db";
import { humanize } from "@/lib/utils";

export const metadata = { title: "Analytics — admin" };

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-dim">
      <div
        className="h-full rounded-full bg-leaf-500"
        style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
      />
    </div>
  );
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-line bg-cream p-6">
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = [7, 30, 90].includes(Number(daysParam)) ? Number(daysParam) : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    eventCounts,
    productViews,
    whatsappByEntity,
    topSearches,
    zeroSearches,
    unanswered,
    finderRuns,
  ] = await Promise.all([
    db.analyticsEvent.groupBy({
      by: ["type"],
      where: { createdAt: { gte: since } },
      _count: true,
      orderBy: { _count: { type: "desc" } },
    }),
    db.analyticsEvent.groupBy({
      by: ["entityId"],
      where: { type: "PRODUCT_VIEW", createdAt: { gte: since }, entityId: { not: null } },
      _count: { entityId: true },
      orderBy: { _count: { entityId: "desc" } },
      take: 10,
    }),
    db.analyticsEvent.groupBy({
      by: ["entityId"],
      where: {
        type: "WHATSAPP_CLICK",
        createdAt: { gte: since },
        entityType: "product",
        entityId: { not: null },
      },
      _count: { entityId: true },
      orderBy: { _count: { entityId: "desc" } },
      take: 8,
    }),
    db.searchEvent.groupBy({
      by: ["normalized"],
      where: { createdAt: { gte: since } },
      _count: true,
      orderBy: { _count: { normalized: "desc" } },
      take: 10,
    }),
    db.searchEvent.groupBy({
      by: ["normalized"],
      where: { createdAt: { gte: since }, resultCount: 0 },
      _count: true,
      orderBy: { _count: { normalized: "desc" } },
      take: 10,
    }),
    db.questionEvent.findMany({
      where: { createdAt: { gte: since }, matched: false },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.analyticsEvent.findMany({
      where: { type: "FINDER_COMPLETED", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { meta: true },
    }),
  ]);

  const productIds = [
    ...new Set([
      ...productViews.map((row) => row.entityId!),
      ...whatsappByEntity.map((row) => row.entityId!),
    ]),
  ].filter(Boolean);
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });
  const productName = (id: string | null) =>
    products.find((product) => product.id === id)?.name ?? "—";

  const finderCrops = new Map<string, number>();
  for (const run of finderRuns) {
    const crop = (run.meta as { cropSlug?: string } | null)?.cropSlug ?? "any";
    finderCrops.set(crop, (finderCrops.get(crop) ?? 0) + 1);
  }
  const finderCropRows = [...finderCrops.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const maxView = productViews[0]?._count.entityId ?? 0;
  const maxSearch = topSearches[0]?._count ?? 0;

  return (
    <>
      <AdminPageHeader
        title="Analytics"
        description="First-party events — what farmers look for, view and ask."
        actions={
          <div className="flex gap-2">
            {[7, 30, 90].map((option) => (
              <a
                key={option}
                href={`/admin/analytics?days=${option}`}
                className={`rounded-full border px-4 py-2 font-display text-sm font-medium ${
                  days === option
                    ? "border-humus-900 bg-humus-900 text-paper"
                    : "border-line bg-cream text-ink-soft"
                }`}
              >
                {option}d
              </a>
            ))}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {eventCounts.slice(0, 8).map((row) => (
          <div key={row.type} className="rounded-2xl border border-line bg-cream p-4">
            <p className="font-display text-2xl font-semibold text-ink">{row._count}</p>
            <p className="text-xs text-ink-faint">{humanize(row.type)}</p>
          </div>
        ))}
        {eventCounts.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-line p-6 text-sm text-ink-faint">
            No events recorded in this period yet — analytics accumulate as visitors use the site.
          </p>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Most viewed products" hint="PRODUCT_VIEW events">
          <ul className="space-y-2.5">
            {productViews.map((row) => (
              <li key={row.entityId} className="flex items-center gap-3 text-sm">
                <span className="w-40 truncate font-medium text-ink">
                  {productName(row.entityId)}
                </span>
                <Bar value={row._count.entityId} max={maxView} />
                <span className="w-8 text-right text-xs text-ink-faint">{row._count.entityId}</span>
              </li>
            ))}
            {productViews.length === 0 && (
              <li className="text-sm text-ink-faint">No product views yet.</li>
            )}
          </ul>
        </Panel>

        <Panel title="WhatsApp enquiries by product" hint="Clicks on product WhatsApp actions">
          <ul className="space-y-2.5">
            {whatsappByEntity.map((row) => (
              <li key={row.entityId} className="flex items-center gap-3 text-sm">
                <span className="w-40 truncate font-medium text-ink">
                  {productName(row.entityId)}
                </span>
                <Bar value={row._count.entityId} max={whatsappByEntity[0]?._count.entityId ?? 0} />
                <span className="w-8 text-right text-xs text-ink-faint">{row._count.entityId}</span>
              </li>
            ))}
            {whatsappByEntity.length === 0 && (
              <li className="text-sm text-ink-faint">No WhatsApp clicks recorded yet.</li>
            )}
          </ul>
        </Panel>

        <Panel title="Top searches" hint="What visitors type into search">
          <ul className="space-y-2.5">
            {topSearches.map((row) => (
              <li key={row.normalized} className="flex items-center gap-3 text-sm">
                <span className="w-40 truncate text-ink">“{row.normalized}”</span>
                <Bar value={row._count} max={maxSearch} />
                <span className="w-8 text-right text-xs text-ink-faint">{row._count}</span>
              </li>
            ))}
            {topSearches.length === 0 && (
              <li className="text-sm text-ink-faint">No searches yet.</li>
            )}
          </ul>
        </Panel>

        <Panel
          title="Zero-result searches"
          hint="Content gaps — consider adding products, FAQs or aliases"
        >
          <ul className="flex flex-wrap gap-2">
            {zeroSearches.map((row) => (
              <li
                key={row.normalized}
                className="rounded-full bg-danger/8 px-3 py-1.5 text-xs font-medium text-danger"
              >
                “{row.normalized}” ×{row._count}
              </li>
            ))}
            {zeroSearches.length === 0 && (
              <li className="text-sm text-ink-faint">None — great coverage.</li>
            )}
          </ul>
        </Panel>

        <Panel title="Unanswered Ask Humuson questions" hint="Turn these into FAQs">
          <ul className="space-y-1.5">
            {unanswered.map((row) => (
              <li key={row.id}>
                <a
                  href={`/admin/faqs/new?question=${encodeURIComponent(row.question)}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-paper px-4 py-2 text-sm text-ink-soft hover:bg-leaf-300/25"
                >
                  <span className="truncate">“{row.question}”</span>
                  <span className="shrink-0 text-xs font-medium text-leaf-700">Answer →</span>
                </a>
              </li>
            ))}
            {unanswered.length === 0 && (
              <li className="text-sm text-ink-faint">Every question was answered. 🎉</li>
            )}
          </ul>
        </Panel>

        <Panel title="Finder usage by crop" hint="What visitors say they grow">
          <ul className="space-y-2.5">
            {finderCropRows.map(([crop, count]) => (
              <li key={crop} className="flex items-center gap-3 text-sm">
                <span className="w-40 truncate text-ink capitalize">{crop}</span>
                <Bar value={count} max={finderCropRows[0]?.[1] ?? 0} />
                <span className="w-8 text-right text-xs text-ink-faint">{count}</span>
              </li>
            ))}
            {finderCropRows.length === 0 && (
              <li className="text-sm text-ink-faint">No finder completions yet.</li>
            )}
          </ul>
        </Panel>
      </div>
    </>
  );
}

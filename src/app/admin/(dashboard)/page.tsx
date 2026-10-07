import Link from "next/link";
import {
  ArrowRight,
  Inbox,
  MessageCircleQuestion,
  Newspaper,
  Package,
  PlaySquare,
  Search,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusPill } from "@/components/admin/status-pill";
import { db } from "@/server/db";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Overview — admin" };

export default async function AdminOverviewPage() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    productCount,
    publishedProducts,
    articleCount,
    faqCount,
    videoCount,
    newEnquiries,
    recentEnquiries,
    searches7d,
    zeroResults,
    unanswered,
    topViews,
  ] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { status: "PUBLISHED" } }),
    db.article.count({ where: { status: "PUBLISHED" } }),
    db.faq.count({ where: { status: "PUBLISHED" } }),
    db.video.count({ where: { status: "PUBLISHED" } }),
    db.enquiry.count({ where: { status: "NEW" } }),
    db.enquiry.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { product: true } }),
    db.searchEvent.count({ where: { createdAt: { gte: since } } }),
    db.searchEvent.findMany({
      where: { resultCount: 0, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.questionEvent.findMany({
      where: { matched: false, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.analyticsEvent.groupBy({
      by: ["entityId"],
      where: { type: "PRODUCT_VIEW", createdAt: { gte: since }, entityId: { not: null } },
      _count: { entityId: true },
      orderBy: { _count: { entityId: "desc" } },
      take: 5,
    }),
  ]);

  const topProducts = await db.product.findMany({
    where: { id: { in: topViews.map((row) => row.entityId!).filter(Boolean) } },
    select: { id: true, name: true, slug: true },
  });
  const productById = new Map(topProducts.map((product) => [product.id, product]));

  const stats = [
    {
      label: "Products",
      value: productCount,
      sub: `${publishedProducts} published`,
      href: "/admin/products",
      icon: Package,
    },
    {
      label: "New enquiries",
      value: newEnquiries,
      sub: "awaiting reply",
      href: "/admin/enquiries",
      icon: Inbox,
    },
    {
      label: "Published FAQs",
      value: faqCount,
      sub: "in the knowledge engine",
      href: "/admin/faqs",
      icon: MessageCircleQuestion,
    },
    {
      label: "Articles",
      value: articleCount,
      sub: "live in Knowledge",
      href: "/admin/articles",
      icon: Newspaper,
    },
    {
      label: "Videos",
      value: videoCount,
      sub: "in the video centre",
      href: "/admin/videos",
      icon: PlaySquare,
    },
    {
      label: "Searches (7d)",
      value: searches7d,
      sub: `${zeroResults.length} recent zero-result`,
      href: "/admin/analytics",
      icon: Search,
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Overview"
        description="What needs attention across the platform right now."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group rounded-2xl border border-line bg-cream p-5 transition-all hover:-translate-y-0.5 hover:shadow-card"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-xl bg-leaf-300/40 text-leaf-800">
                <stat.icon className="size-4.5" strokeWidth={1.8} />
              </span>
              <ArrowRight className="size-4 text-ink-faint/40 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-4 font-display text-3xl font-semibold text-ink">{stat.value}</p>
            <p className="text-sm font-medium text-ink">{stat.label}</p>
            <p className="text-xs text-ink-faint">{stat.sub}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        {/* Recent enquiries */}
        <section className="rounded-3xl border border-line bg-cream p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Latest enquiries</h2>
            <Link
              href="/admin/enquiries"
              className="text-sm font-medium text-leaf-700 hover:underline"
            >
              Inbox →
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {recentEnquiries.length === 0 && (
              <li className="py-6 text-sm text-ink-faint">No enquiries yet.</li>
            )}
            {recentEnquiries.map((enquiry) => (
              <li key={enquiry.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {enquiry.name}
                    {enquiry.product && (
                      <span className="text-ink-faint"> · {enquiry.product.name}</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-faint">{enquiry.message}</p>
                </div>
                <StatusPill status={enquiry.status} />
                <span className="shrink-0 text-xs text-ink-faint">
                  {formatDate(enquiry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Content gaps */}
        <section className="rounded-3xl border border-line bg-cream p-6">
          <h2 className="font-display text-lg font-semibold text-ink">
            Questions we couldn’t answer
          </h2>
          <p className="mt-1 text-xs text-ink-faint">
            Turn these into FAQs so Ask Humuson answers them next time.
          </p>
          <ul className="mt-4 space-y-2">
            {unanswered.length === 0 && (
              <li className="py-4 text-sm text-ink-faint">Nothing unanswered this week. 🎉</li>
            )}
            {unanswered.map((question) => (
              <li key={question.id}>
                <Link
                  href={`/admin/faqs/new?question=${encodeURIComponent(question.question)}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-paper px-4 py-2.5 text-sm text-ink-soft transition-colors hover:bg-leaf-300/25"
                >
                  <span className="truncate">“{question.question}”</span>
                  <span className="shrink-0 text-xs font-medium text-leaf-700">Answer it →</span>
                </Link>
              </li>
            ))}
          </ul>

          {zeroResults.length > 0 && (
            <>
              <h3 className="mt-6 font-display text-sm font-semibold text-ink">
                Zero-result searches
              </h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {zeroResults.map((search) => (
                  <li
                    key={search.id}
                    className="rounded-full bg-paper px-3 py-1.5 text-xs text-ink-faint"
                  >
                    “{search.query}”
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      {topViews.length > 0 && (
        <section className="mt-6 rounded-3xl border border-line bg-cream p-6">
          <h2 className="font-display text-lg font-semibold text-ink">
            Most viewed products (7 days)
          </h2>
          <ul className="mt-4 space-y-2">
            {topViews.map((row) => {
              const product = row.entityId ? productById.get(row.entityId) : null;
              if (!product) return null;
              const max = topViews[0]?._count.entityId ?? 1;
              return (
                <li key={row.entityId} className="flex items-center gap-3">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="w-44 shrink-0 truncate text-sm font-medium text-ink hover:text-brand"
                  >
                    {product.name}
                  </Link>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-dim">
                    <div
                      className="h-full rounded-full bg-leaf-500"
                      style={{ width: `${(row._count.entityId / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs text-ink-faint">
                    {row._count.entityId}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}

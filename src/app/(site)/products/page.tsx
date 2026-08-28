import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchX } from "lucide-react";
import { PageIntro } from "@/components/shared/page-intro";
import { ProductCard } from "@/components/shared/product-card";
import { ProductFilterBar, type ActiveFilters } from "@/components/products/filter-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { filterProducts, getAllProducts, getFilterOptions } from "@/server/data/products";
import { searchAll } from "@/server/data/search-index";
import { whatsappAdviceMessage } from "@/lib/whatsapp";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Products — organic fertilisers, biostimulants & foliar feeds",
  description:
    "Explore the full Humuson Complex range: organic fertilisers, biostimulants and liquid foliar fertilisers with published composition, rates and crop suitability.",
  alternates: { canonical: "/products" },
};

type SearchParams = { [key: string]: string | string[] | undefined };

function firstParam(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const active: ActiveFilters = {
    category: firstParam(params, "category"),
    crop: firstParam(params, "crop"),
    benefit: firstParam(params, "benefit"),
    method: firstParam(params, "method"),
    stage: firstParam(params, "stage"),
    q: firstParam(params, "q"),
  };

  const [allProducts, options] = await Promise.all([getAllProducts(), getFilterOptions()]);

  let products = filterProducts(allProducts, active);

  // Text query: rank with the retrieval engine and intersect with filters.
  if (active.q && active.q.trim().length >= 2) {
    const results = await searchAll(active.q, { types: ["product"], limit: 50, prefix: true });
    const orderedSlugs = results
      .map((result) => result.doc.href.split("/").pop())
      .filter((slug): slug is string => Boolean(slug));
    const bySlug = new Map(products.map((product) => [product.slug, product]));
    products = orderedSlugs
      .map((slug) => bySlug.get(slug))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  }

  const goalName = options.benefits.find((b) => b.slug === active.benefit)?.name;
  const cropName = options.crops.find((c) => c.slug === active.crop)?.name;

  return (
    <>
      <PageIntro
        eyebrow="The Humuson range"
        title="Products that feed the"
        titleAccent="soil first"
        lede="Organic fertilisers, biostimulants and liquid foliar feeds — each with its published composition, application guidance and crop suitability. Filter by what you grow or what you want to improve."
        crumbs={[{ label: "Products" }]}
      />

      <Suspense>
        <ProductFilterBar options={options} active={active} resultCount={products.length} />
      </Suspense>

      <section className="container-site py-10 md:py-14">
        {(goalName || cropName) && (
          <p className="mb-6 text-sm text-ink-faint">
            Showing products listed for{" "}
            {[cropName, goalName ? goalName.toLowerCase() : null].filter(Boolean).join(" · ")}
          </p>
        )}
        {products.length > 0 ? (
          <RevealGroup
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            stagger={0.04}
            amount={0.05}
          >
            {products.map((product, i) => (
              <RevealItem key={product.id}>
                <ProductCard product={product} priority={i < 4} className="h-full" />
              </RevealItem>
            ))}
          </RevealGroup>
        ) : (
          <EmptyState
            icon={SearchX}
            title="No products match those filters"
            description="Try removing a filter — or tell us what you’re growing and we’ll recommend the right product from the range."
            action={
              <>
                <ButtonLink href="/products" variant="outline">
                  Clear filters
                </ButtonLink>
                <ButtonLink href="/product-finder" variant="primary">
                  Use the product finder
                </ButtonLink>
                <WhatsAppButton
                  message={whatsappAdviceMessage(active.q ?? cropName ?? "the right product")}
                  label="Ask on WhatsApp"
                />
              </>
            }
          />
        )}
      </section>
    </>
  );
}

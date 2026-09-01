import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { Copy, Eye, Package, Plus, Star } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminSearch } from "@/components/admin/admin-search";
import { StatusPill } from "@/components/admin/status-pill";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listAdminProducts } from "@/server/data/admin";
import {
  deleteProduct,
  duplicateProduct,
  setProductStatus,
  toggleProductFeatured,
} from "@/server/actions/admin/products";
import { cn, formatPriceUsd } from "@/lib/utils";

export const metadata = { title: "Products — admin" };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const products = await listAdminProducts(q);

  return (
    <>
      <AdminPageHeader
        title="Products"
        description={`${products.length} product${products.length === 1 ? "" : "s"} — create, edit, publish and archive the range.`}
        actions={
          <>
            <Suspense>
              <AdminSearch placeholder="Search products…" />
            </Suspense>
            <ButtonLink href="/admin/products/new" size="sm">
              <Plus className="size-4" /> New product
            </ButtonLink>
          </>
        }
      />

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={q ? `No products match “${q}”` : "No products yet"}
          action={<ButtonLink href="/admin/products/new">Create the first product</ButtonLink>}
        />
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Product</Th>
              <Th>Category</Th>
              <Th>Price</Th>
              <Th>Data</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </THead>
          <TBody>
            {products.map((product) => (
              <Tr key={product.id} className="hover:bg-paper-dim/50">
                <Td>
                  <Link href={`/admin/products/${product.id}`} className="flex items-center gap-3">
                    <span className="relative block h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-paper-dim">
                      {product.primaryImage && (
                        <Image
                          src={product.primaryImage.url}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      )}
                    </span>
                    <span>
                      <span className="flex items-center gap-1.5 font-display font-semibold text-ink">
                        {product.name}
                        {product.featured && (
                          <Star className="size-3.5 fill-leaf-500 text-leaf-600" />
                        )}
                      </span>
                      <span className="block text-xs text-ink-faint">/{product.slug}</span>
                    </span>
                  </Link>
                </Td>
                <Td>{product.category?.name ?? "—"}</Td>
                <Td>{formatPriceUsd(product.priceUsd ? Number(product.priceUsd) : null) ?? "—"}</Td>
                <Td>
                  <span
                    className={cn(
                      "text-xs",
                      product._count.applicationGuides === 0 ? "text-danger/80" : "text-ink-faint",
                    )}
                  >
                    {product._count.crops} crops · {product._count.applicationGuides} rates ·{" "}
                    {product._count.faqs} FAQs
                  </span>
                </Td>
                <Td>
                  <StatusPill status={product.status} />
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <form
                      action={async () => {
                        "use server";
                        await toggleProductFeatured(product.id);
                      }}
                    >
                      <button
                        type="submit"
                        title={product.featured ? "Unfeature" : "Feature"}
                        className="flex size-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5"
                      >
                        <Star
                          className={cn(
                            "size-3.5",
                            product.featured && "fill-leaf-500 text-leaf-600",
                          )}
                        />
                      </button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await setProductStatus(
                          product.id,
                          product.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                        );
                      }}
                    >
                      <button
                        type="submit"
                        title={product.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                        className="flex size-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5"
                      >
                        <Eye
                          className={cn(
                            "size-3.5",
                            product.status === "PUBLISHED" && "text-leaf-700",
                          )}
                        />
                      </button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await duplicateProduct(product.id);
                      }}
                    >
                      <button
                        type="submit"
                        title="Duplicate"
                        className="flex size-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    </form>
                    <ConfirmButton
                      title={`Delete ${product.name}?`}
                      description="This permanently removes the product and its pack sizes, rates and relations. Prefer Archive to hide it while keeping data."
                      label=""
                      action={async () => {
                        "use server";
                        return deleteProduct(product.id);
                      }}
                    />
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}

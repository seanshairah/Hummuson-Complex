import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { StatusPill } from "@/components/admin/status-pill";
import { getAdminProduct, getProductFormOptions } from "@/server/data/admin";

export const metadata = { title: "Edit product — admin" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, options] = await Promise.all([getAdminProduct(id), getProductFormOptions()]);
  if (!product) notFound();

  return (
    <>
      <AdminPageHeader
        title={product.name}
        description={product.notes ? `Migration note: ${product.notes}` : undefined}
        actions={
          <>
            <StatusPill status={product.status} />
            <Link
              href={`/products/${product.slug}`}
              target="_blank"
              className="flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-ink/30"
            >
              <ExternalLink className="size-3.5" /> View live
            </Link>
          </>
        }
      />
      <ProductForm
        initial={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          status: product.status,
          featured: product.featured,
          tagline: product.tagline,
          shortDescription: product.shortDescription,
          descriptionHtml: product.descriptionHtml,
          operatingPrinciple: product.operatingPrinciple,
          instructionsHtml: product.instructionsHtml,
          composition: product.composition,
          benefitClaims: product.benefitClaims,
          priceUsd: product.priceUsd ? String(product.priceUsd) : null,
          whatsappRef: product.whatsappRef,
          categoryId: product.categoryId,
          tags: product.tags,
          seoTitle: product.seoTitle,
          seoDescription: product.seoDescription,
          methods: product.applicationMethods,
          cropIds: product.crops.map((crop) => crop.cropId),
          benefitIds: product.benefits.map((benefit) => benefit.benefitId),
          stageIds: product.growthStages.map((stage) => stage.growthStageId),
          relatedIds: product.related.map((related) => related.id),
          galleryIds: product.gallery.map((image) => image.mediaId),
          packSizes: product.packageSizes.map((pack) => [
            pack.size,
            pack.priceUsd ? String(pack.priceUsd) : "",
          ]),
          guides: product.applicationGuides.map((guide) => [
            guide.rate,
            guide.unit ?? "",
            guide.notes ?? "",
          ]),
        }}
        options={options}
      />
    </>
  );
}

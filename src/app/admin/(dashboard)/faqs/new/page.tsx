import { AdminPageHeader } from "@/components/admin/page-header";
import { FaqForm } from "@/components/admin/faq-form";
import { db } from "@/server/db";

export const metadata = { title: "New FAQ — admin" };

export default async function NewFaqPage({
  searchParams,
}: {
  searchParams: Promise<{ question?: string }>;
}) {
  const { question } = await searchParams;
  const [products, crops] = await Promise.all([
    db.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.crop.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <AdminPageHeader
        title="New FAQ"
        description="Write the answer once — Ask Humuson, search and product pages all use it."
      />
      <FaqForm initial={{ question: question ?? "" }} products={products} crops={crops} />
    </>
  );
}

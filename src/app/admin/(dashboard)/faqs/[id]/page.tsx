import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/page-header";
import { FaqForm } from "@/components/admin/faq-form";
import { db } from "@/server/db";

export const metadata = { title: "Edit FAQ — admin" };

export default async function EditFaqPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [faq, products, crops] = await Promise.all([
    db.faq.findUnique({ where: { id }, include: { crops: true } }),
    db.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.crop.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!faq) notFound();

  return (
    <>
      <AdminPageHeader title="Edit FAQ" />
      <FaqForm
        initial={{
          id: faq.id,
          question: faq.question,
          answerHtml: faq.answerHtml,
          category: faq.category,
          published: faq.status === "PUBLISHED",
          aliases: faq.aliases,
          keywords: faq.keywords,
          productId: faq.productId,
          cropIds: faq.crops.map((crop) => crop.cropId),
        }}
        products={products}
        crops={crops}
      />
    </>
  );
}

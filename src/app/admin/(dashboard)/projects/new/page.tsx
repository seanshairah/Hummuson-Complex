import { AdminPageHeader } from "@/components/admin/page-header";
import { ProjectForm } from "@/components/admin/project-form";
import { db } from "@/server/db";

export const metadata = { title: "New result — admin" };

export default async function NewProjectPage() {
  const [crops, products, testimonials, media] = await Promise.all([
    db.crop.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.testimonial.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.media.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, url: true, alt: true },
    }),
  ]);
  return (
    <>
      <AdminPageHeader
        title="New result"
        description="Only document verified outcomes — never invent results."
      />
      <ProjectForm
        initial={{}}
        crops={crops}
        products={products}
        testimonials={testimonials}
        media={media}
      />
    </>
  );
}

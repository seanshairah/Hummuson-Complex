import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ProjectForm } from "@/components/admin/project-form";
import { db } from "@/server/db";

export const metadata = { title: "Edit result — admin" };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, crops, products, testimonials, media] = await Promise.all([
    db.project.findUnique({
      where: { id },
      include: {
        products: { select: { id: true } },
        images: { orderBy: { order: "asc" }, select: { mediaId: true } },
      },
    }),
    db.crop.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.testimonial.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.media.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, url: true, alt: true },
    }),
  ]);
  if (!project) notFound();

  return (
    <>
      <AdminPageHeader title={project.title} />
      <ProjectForm
        initial={{
          id: project.id,
          title: project.title,
          slug: project.slug,
          status: project.status,
          cropId: project.cropId,
          location: project.location,
          summary: project.summary,
          problem: project.problem,
          application: project.application,
          outcome: project.outcome,
          bodyHtml: project.bodyHtml,
          testimonialId: project.testimonialId,
          productIds: project.products.map((product) => product.id),
          galleryIds: project.images.map((image) => image.mediaId),
        }}
        crops={crops}
        products={products}
        testimonials={testimonials}
        media={media}
      />
    </>
  );
}

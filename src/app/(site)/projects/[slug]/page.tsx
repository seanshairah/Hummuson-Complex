import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { MediaImage } from "@/components/shared/media-image";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { ViewTracker } from "@/components/products/view-tracker";
import { getAllProjects, getProjectBySlug } from "@/server/data/content";
import { whatsappAdviceMessage } from "@/lib/whatsapp";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const projects = await getAllProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: "Result not found" };
  return {
    title: `${project.title} — Humuson results`,
    description: project.summary ?? undefined,
    alternates: { canonical: `/projects/${project.slug}` },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const facts = [
    { label: "Crop", value: project.cropName },
    { label: "Location", value: project.location },
    { label: "Products", value: project.productNames.join(", ") || null },
    { label: "Application", value: project.application },
  ].filter((fact) => fact.value);

  return (
    <>
      <ViewTracker type="PROJECT_VIEW" entityType="project" entityId={project.id} />
      <article className="pt-28 pb-16 md:pt-36">
        <header className="container-site max-w-4xl">
          <Breadcrumbs
            crumbs={[{ label: "Results", href: "/projects" }, { label: project.title }]}
            className="mb-6"
          />
          <div className="flex flex-wrap gap-2">
            {project.cropName && (
              <Badge variant="leaf" className="capitalize">
                {project.cropName}
              </Badge>
            )}
            {project.location && <Badge variant="outline">{project.location}</Badge>}
          </div>
          <h1 className="mt-5 text-display-2 text-ink capitalize">{project.title}</h1>
          {project.summary && (
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
              {project.summary}
            </p>
          )}
        </header>

        {project.images.length > 0 && (
          <div className="container-site mt-10 max-w-5xl space-y-5">
            {project.images.map((image, i) => (
              <figure
                key={image.url}
                className="overflow-hidden rounded-3xl border border-line bg-white shadow-card"
              >
                <MediaImage
                  image={image}
                  alt={image.caption ?? `${project.title} — image ${i + 1}`}
                  sizes="(max-width: 1024px) 92vw, 1000px"
                  className="h-auto w-full"
                  priority={i === 0}
                />
                {image.caption && (
                  <figcaption className="px-5 py-3 text-xs text-ink-faint">
                    {image.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}

        <div className="container-site mt-12 grid max-w-4xl gap-10 md:grid-cols-[1fr_280px]">
          <div className="min-w-0">
            {project.problem && (
              <section className="mb-8">
                <h2 className="font-display text-xl font-semibold text-ink">The problem</h2>
                <p className="mt-2 leading-relaxed text-ink-soft">{project.problem}</p>
              </section>
            )}
            {project.bodyHtml && (
              <div className="rich-text" dangerouslySetInnerHTML={{ __html: project.bodyHtml }} />
            )}
            {project.outcome && (
              <section className="mt-8 rounded-3xl bg-leaf-300/30 p-6">
                <h2 className="font-display text-xl font-semibold text-ink">Outcome</h2>
                <p className="mt-2 leading-relaxed text-ink-soft">{project.outcome}</p>
              </section>
            )}
            {project.testimonial && (
              <figure className="bg-grain mt-8 rounded-3xl bg-humus-950 p-6 text-paper">
                <Quote className="size-5 text-leaf-400" aria-hidden />
                <blockquote className="mt-3 text-editorial text-lg leading-relaxed">
                  {project.testimonial.quote}
                </blockquote>
                <figcaption className="mt-4 text-sm text-paper/70">
                  {project.testimonial.name}
                  {project.testimonial.role && ` — ${project.testimonial.role}`}
                </figcaption>
              </figure>
            )}
          </div>

          <aside className="space-y-5 md:sticky md:top-32 md:self-start">
            {facts.length > 0 && (
              <dl className="space-y-4 rounded-3xl border border-line bg-cream p-6">
                {facts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="text-eyebrow text-[0.6rem] text-ink-faint">{fact.label}</dt>
                    <dd className="mt-1 text-sm text-ink capitalize">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {project.products.length > 0 && (
              <div className="rounded-3xl border border-line bg-cream p-6">
                <p className="text-eyebrow text-[0.6rem] text-ink-faint">Products used</p>
                <ul className="mt-3 space-y-2">
                  {project.products.map((product) => (
                    <li key={product.slug}>
                      <Link
                        href={`/products/${product.slug}`}
                        className="block rounded-xl bg-paper px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-leaf-300/40"
                      >
                        {product.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <WhatsAppButton
              message={whatsappAdviceMessage(`a program like "${project.title}" for my farm`)}
              label="Plan this for my farm"
              className="w-full"
            />
          </aside>
        </div>
      </article>
    </>
  );
}

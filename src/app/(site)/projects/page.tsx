import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Images } from "lucide-react";
import { PageIntro } from "@/components/shared/page-intro";
import { MediaImage } from "@/components/shared/media-image";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { getAllProjects, getAllTestimonials } from "@/server/data/content";
import { Quote } from "lucide-react";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Results & crop programs",
  description:
    "Field results and published application programs from Humuson Complex — maize, wheat, potatoes, sugar beans and more.",
  alternates: { canonical: "/projects" },
};

export default async function ProjectsPage() {
  const [projects, testimonials] = await Promise.all([getAllProjects(), getAllTestimonials()]);

  return (
    <>
      <PageIntro
        eyebrow="Results from the field"
        title="Programs and results you can"
        titleAccent="verify"
        lede="Published crop programs and field results from Humuson Complex work — exactly as shared by the team, with nothing invented."
        crumbs={[{ label: "Results" }]}
      />

      <section className="container-site pb-16">
        {projects.length === 0 ? (
          <EmptyState
            icon={Images}
            title="Results are being documented"
            description="Talk to the team about recent field programs in your area."
            action={<ButtonLink href="/contact">Contact Humuson</ButtonLink>}
          />
        ) : (
          <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
            {projects.map((project) => (
              <RevealItem key={project.id}>
                <Link
                  href={`/projects/${project.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-cream shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-pop"
                >
                  {project.image && (
                    <div className="relative aspect-[16/10] overflow-hidden bg-white">
                      <MediaImage
                        image={project.image}
                        alt={project.title}
                        fill
                        sizes="(max-width: 768px) 92vw, 400px"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex flex-wrap gap-2">
                      {project.cropName && (
                        <Badge variant="leaf" className="capitalize">
                          {project.cropName}
                        </Badge>
                      )}
                      {project.location && <Badge variant="outline">{project.location}</Badge>}
                    </div>
                    <h2 className="mt-3 font-display text-lg font-semibold text-ink capitalize group-hover:text-brand">
                      {project.title}
                    </h2>
                    {project.summary && (
                      <p className="mt-1.5 line-clamp-3 text-sm text-ink-faint">{project.summary}</p>
                    )}
                    <p className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-medium text-leaf-700">
                      View <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </p>
                  </div>
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </section>

      {testimonials.length > 0 && (
        <section id="testimonials" className="border-t border-line bg-humus-950 bg-grain py-16 text-paper">
          <div className="container-site">
            <h2 className="text-display-3 text-paper">What farmers say</h2>
            <p className="mt-2 text-sm text-paper/60">
              Reviews shared on the Humuson website by customers.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {testimonials.map((testimonial) => (
                <figure key={testimonial.id} className="rounded-2xl border border-paper/10 bg-paper/5 p-6">
                  <Quote className="size-5 text-leaf-400" aria-hidden />
                  <blockquote className="text-editorial mt-3 leading-relaxed text-paper/90">
                    {testimonial.quote}
                  </blockquote>
                  <figcaption className="mt-4 flex items-center gap-3 text-sm">
                    <span className="flex size-8 items-center justify-center rounded-full bg-leaf-400/20 font-display text-xs font-semibold text-leaf-300">
                      {testimonial.name.charAt(0)}
                    </span>
                    <span className="font-medium">{testimonial.name}</span>
                    {testimonial.location && (
                      <span className="text-paper/50">· {testimonial.location}</span>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

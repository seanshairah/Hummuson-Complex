import type { Metadata } from "next";
import { HomeHero } from "@/components/home/hero";
import {
  BenefitNav,
  CatalogueTeaser,
  CropsBand,
  FeaturedProducts,
  FinderBand,
  KnowledgePreview,
  RangesBand,
  ResultsBand,
  SoilStory,
} from "@/components/home/sections";
import { getCatalogueStats, getFeaturedProducts, getFilterOptions } from "@/server/data/products";
import { getAllCrops } from "@/server/data/crops";
import {
  getAllArticles,
  getAllProjects,
  getAllTestimonials,
  getAllVideos,
} from "@/server/data/content";
import { getCompanySettings } from "@/server/data/settings";
import { site } from "@/lib/site";
import { organizationJsonLd } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `${site.name} — Home of Healthy Soil & Healthy Crop`,
  description: site.description,
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [stats, featured, options, crops, articles, videos, projects, testimonials, company] =
    await Promise.all([
      getCatalogueStats(),
      getFeaturedProducts(8),
      getFilterOptions(),
      getAllCrops(),
      getAllArticles(),
      getAllVideos(),
      getAllProjects(),
      getAllTestimonials(),
      getCompanySettings(),
    ]);

  const spotlight =
    featured.find((p) => p.image && p.cropNames.length > 0 && p.shortDescription) ??
    featured[0] ??
    null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <HomeHero
        spotlight={spotlight}
        productCount={stats.products}
        cropCount={stats.crops}
        partnerCount={company.partnerBrands.length}
      />
      <RangesBand />
      <BenefitNav options={options} />
      <FeaturedProducts products={featured} />
      <FinderBand />
      <CropsBand crops={crops} />
      <SoilStory claims={company.whyChooseUs} />
      <ResultsBand projects={projects} testimonials={testimonials} />
      <KnowledgePreview articles={articles} videos={videos} />
      <CatalogueTeaser products={featured} />
    </>
  );
}

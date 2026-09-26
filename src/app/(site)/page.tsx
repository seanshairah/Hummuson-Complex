import type { Metadata } from "next";
import { HomeHero } from "@/components/home/hero";
import {
  BenefitNav,
  CatalogueTeaser,
  CropsBand,
  FeaturedProducts,
  FinderBand,
  KnowledgePreview,
  SoilStory,
} from "@/components/home/sections";
import { ScreenNav } from "@/components/home/screen-nav";
import { getCatalogueStats, getFeaturedProducts, getFilterOptions } from "@/server/data/products";
import { getAllCrops } from "@/server/data/crops";
import { getAllArticles, getAllVideos } from "@/server/data/content";
import { getCompanySettings, getContactSettings } from "@/server/data/settings";
import { site } from "@/lib/site";
import { organizationJsonLd } from "@/lib/seo";
import { toMapPin } from "@/lib/maps";
import { JsonLd } from "@/components/shared/json-ld";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `${site.name} — Home of Healthy Soil & Healthy Crop`,
  description: site.description,
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [stats, featured, options, crops, articles, videos, company, contact] =
    await Promise.all([
      getCatalogueStats(),
      getFeaturedProducts(8),
      getFilterOptions(),
      getAllCrops(),
      getAllArticles(),
      getAllVideos(),
      getCompanySettings(),
      getContactSettings(),
    ]);

  const spotlight =
    featured.find((p) => p.image && p.cropNames.length > 0 && p.shortDescription) ??
    featured[0] ??
    null;

  return (
    <>
      <JsonLd data={organizationJsonLd(toMapPin(contact))} />
      {/*
       * `data-screens` is what switches scroll snapping on for this page (see
       * globals.css); `contents` keeps the wrapper out of the layout. The
       * screens themselves are the sections inside.
       */}
      <div data-screens className="contents">
        <HomeHero
          spotlight={spotlight}
          productCount={stats.products}
          cropCount={stats.crops}
          partnerCount={company.partnerBrands.length}
        />
        <BenefitNav options={options} />
        <FeaturedProducts products={featured} />
        <FinderBand />
        <CropsBand crops={crops} />
        <SoilStory claims={company.whyChooseUs} />
        <KnowledgePreview articles={articles} videos={videos} />
        <CatalogueTeaser products={featured} />
      </div>
      <ScreenNav />
    </>
  );
}

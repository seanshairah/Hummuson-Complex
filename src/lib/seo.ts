import { absoluteUrl, site } from "@/lib/site";
import { truncate } from "@/lib/utils";
import { stripHtml } from "@/lib/sanitize";
import type { ProductDetailData } from "@/server/data/products";
import type { ArticleDetailData, FaqData, VideoData } from "@/server/data/content";

/** Organization schema (real details from the audited site). */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: site.url,
    logo: absoluteUrl("/images/brand/logo-color.png"),
    slogan: site.tagline,
    description: site.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: "78 Lomagundi Rd",
      addressLocality: "Harare",
      addressCountry: "ZW",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+263776656433",
      contactType: "customer service",
      availableLanguage: "en",
    },
    sameAs: [
      "https://www.facebook.com/humusoncomplex",
      "https://instagram.com/humuson_complex",
    ],
  };
}

export function productJsonLd(product: ProductDetailData) {
  const offers =
    product.packageSizes.filter((pack) => pack.priceUsd !== null).length > 0
      ? product.packageSizes
          .filter((pack) => pack.priceUsd !== null)
          .map((pack) => ({
            "@type": "Offer",
            priceCurrency: "USD",
            price: pack.priceUsd,
            name: pack.size,
            availability: "https://schema.org/InStock",
            url: absoluteUrl(`/products/${product.slug}`),
          }))
      : product.priceUsd !== null
        ? [
            {
              "@type": "Offer",
              priceCurrency: "USD",
              price: product.priceUsd,
              availability: "https://schema.org/InStock",
              url: absoluteUrl(`/products/${product.slug}`),
            },
          ]
        : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url: absoluteUrl(`/products/${product.slug}`),
    ...(product.image ? { image: absoluteUrl(product.image.url) } : {}),
    ...(product.shortDescription ? { description: product.shortDescription } : {}),
    ...(product.category ? { category: product.category.name } : {}),
    brand: { "@type": "Brand", name: site.name },
    ...(offers ? { offers } : {}),
  };
}

export function articleJsonLd(article: ArticleDetailData) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    url: absoluteUrl(`/knowledge/${article.slug}`),
    ...(article.cover ? { image: absoluteUrl(article.cover.url) } : {}),
    ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
    ...(article.excerpt ? { description: article.excerpt } : {}),
    author: { "@type": "Organization", name: site.name },
    publisher: { "@type": "Organization", name: site.name, url: site.url },
  };
}

export function faqJsonLd(faqs: Pick<FaqData, "question" | "answerHtml">[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: truncate(stripHtml(faq.answerHtml), 1200) },
    })),
  };
}

export function videoJsonLd(video: VideoData, uploadDate?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    ...(video.description ? { description: video.description } : {}),
    thumbnailUrl: `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${video.youtubeId}`,
    ...(uploadDate ? { uploadDate } : {}),
  };
}

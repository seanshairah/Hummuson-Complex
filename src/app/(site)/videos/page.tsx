import type { Metadata } from "next";
import { PageIntro } from "@/components/shared/page-intro";
import { VideoGrid } from "@/components/videos/video-grid";
import { getAllVideos } from "@/server/data/content";
import { videoJsonLd } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Video centre — see the products at work",
  description:
    "Watch Humuson Complex webinars, product demonstrations and organic farming education — from pea production to biostimulants.",
  alternates: { canonical: "/videos" },
};

export default async function VideosPage() {
  const videos = await getAllVideos();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(videos.map((video) => videoJsonLd(video))),
        }}
      />
      <PageIntro
        eyebrow="Video centre"
        title="See it"
        titleAccent="growing"
        lede="Webinars, demonstrations and organic-farming education from the Humuson team. Videos load only when you press play — kind to your data bundle."
        crumbs={[{ label: "Videos" }]}
      />
      <section className="container-site pb-20">
        <VideoGrid videos={videos} />
      </section>
    </>
  );
}

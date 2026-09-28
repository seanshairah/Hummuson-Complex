import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: "Humuson",
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0c1810",
    theme_color: "#0c1810",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}

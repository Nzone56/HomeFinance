import type { MetadataRoute } from "next";

import { content } from "@/content/es";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: content.app.name,
    short_name: content.app.shortName,
    description: content.app.description,
    lang: "es-CO",
    dir: "ltr",
    // Installed users land on the dashboard, not the marketing-free root.
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

import type { MetadataRoute } from "next";

/** Web app manifest: lets phones install the site as a standalone app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bangladesh Crime Monitor",
    short_name: "BD Crime",
    description:
      "Open-source crime tracking for Bangladesh, compiled from public news and official channels.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#09090b",
    theme_color: "#09090b",
    categories: ["news", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

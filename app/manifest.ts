import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FlashLocal",
    short_name: "FlashLocal",
    description:
      "Field sales toolkit — sign up local businesses, track prospects, earn commissions.",
    start_url: "/rep",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    orientation: "any",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

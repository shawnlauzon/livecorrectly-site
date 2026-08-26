import type { MetadataRoute } from "next";
import { getWebNewsletters } from "@/newsletters/web";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://livecorrectly.com";

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date() },
    { url: `${base}/see-your-design`, lastModified: new Date() },
    { url: `${base}/privacy`, lastModified: new Date() },
    { url: `${base}/newsletter`, lastModified: new Date() },
  ];

  const newsletterPages: MetadataRoute.Sitemap = getWebNewsletters().map(
    (issue) => ({
      url: `${base}/newsletter/${issue.slug}`,
      lastModified: new Date(issue.publishedAt + "T00:00:00"),
    })
  );

  return [...staticPages, ...newsletterPages];
}

import type { MetadataRoute } from "next";
import { getWebNewsletters } from "@/newsletters/web";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://livecorrectly.com";

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date() },
    { url: `${base}/see-your-design`, lastModified: new Date() },
    { url: `${base}/privacy`, lastModified: new Date() },
    { url: `${base}/newsletter`, lastModified: new Date() },
  ];

  const issues = await getWebNewsletters();
  const newsletterPages: MetadataRoute.Sitemap = issues.map((issue) => ({
    url: `${base}/newsletter/${issue.slug}`,
    lastModified: new Date(issue.publishedAt),
  }));

  return [...staticPages, ...newsletterPages];
}

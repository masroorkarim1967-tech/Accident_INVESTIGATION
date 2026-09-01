import type { MetadataRoute } from "next";

/**
 * Basic SEO: this is a public portfolio piece (product-spec.md §13), so
 * indexing is allowed — only the API routes are excluded, since they're
 * not meaningful pages to crawl.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
  };
}

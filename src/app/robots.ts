import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/** A private household ledger has no business in a search index. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}

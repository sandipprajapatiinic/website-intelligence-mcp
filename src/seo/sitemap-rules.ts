export type SitemapStatus =
  | "good"
  | "missing"
  | "needs_improvement";

export interface SitemapAnalysis {
  sitemapUrl: string | null;
  hasSitemap: boolean;
  isValidUrl: boolean;
  status: SitemapStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeSitemapRules(
  sitemapUrl: string | null,
): SitemapAnalysis {
  const normalizedUrl = sitemapUrl?.trim() || null;

  if (!normalizedUrl) {
    return {
      sitemapUrl: null,
      hasSitemap: false,
      isValidUrl: false,
      status: "missing",
      issues: ["Page does not declare a sitemap"],
      recommendation:
        "Provide a sitemap.xml file and reference it through robots.txt or your site infrastructure.",
    };
  }

  let isValidUrl = false;

  try {
    const parsed = new URL(normalizedUrl);

    isValidUrl =
      parsed.protocol === "http:" ||
      parsed.protocol === "https:";
  } catch {
    isValidUrl = false;
  }

  if (!isValidUrl) {
    return {
      sitemapUrl: normalizedUrl,
      hasSitemap: true,
      isValidUrl: false,
      status: "needs_improvement",
      issues: ["Sitemap URL is invalid"],
      recommendation:
        "Use a valid absolute HTTP or HTTPS sitemap URL.",
    };
  }

  return {
    sitemapUrl: normalizedUrl,
    hasSitemap: true,
    isValidUrl: true,
    status: "good",
    issues: [],
    recommendation:
      "Page has a valid sitemap declaration.",
  };
}
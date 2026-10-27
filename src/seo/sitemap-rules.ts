export type SitemapStatus =
  | "good"
  | "missing"
  | "needs_improvement";

// Where the sitemap URL came from: a `Sitemap:` line in robots.txt, or /sitemap.xml at the origin.
export type SitemapSource = "robots_txt" | "well_known";

export interface SitemapAnalysis {
  sitemapUrl: string | null;
  hasSitemap: boolean;
  isValidUrl: boolean;
  source: SitemapSource | null;
  declaredInRobotsTxt: boolean;
  status: SitemapStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeSitemapRules(
  sitemapUrl: string | null,
  source: SitemapSource | null = sitemapUrl ? "well_known" : null,
): SitemapAnalysis {
  const normalizedUrl = sitemapUrl?.trim() || null;

  if (!normalizedUrl) {
    return {
      sitemapUrl: null,
      hasSitemap: false,
      isValidUrl: false,
      source: null,
      declaredInRobotsTxt: false,
      status: "missing",
      issues: ["Page does not declare a sitemap"],
      recommendation:
        "Provide a sitemap.xml file and reference it through robots.txt or your site infrastructure.",
    };
  }

  const declaredInRobotsTxt = source === "robots_txt";

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
      source,
      declaredInRobotsTxt,
      status: "needs_improvement",
      issues: ["Sitemap URL is invalid"],
      recommendation:
        "Use a valid absolute HTTP or HTTPS sitemap URL.",
    };
  }

  // A sitemap that exists but isn't referenced from robots.txt is harder for crawlers to discover.
  if (!declaredInRobotsTxt) {
    return {
      sitemapUrl: normalizedUrl,
      hasSitemap: true,
      isValidUrl: true,
      source,
      declaredInRobotsTxt: false,
      status: "needs_improvement",
      issues: ["Sitemap is not referenced from robots.txt"],
      recommendation:
        "Add a `Sitemap:` line to robots.txt so crawlers can discover the sitemap.",
    };
  }

  return {
    sitemapUrl: normalizedUrl,
    hasSitemap: true,
    isValidUrl: true,
    source,
    declaredInRobotsTxt: true,
    status: "good",
    issues: [],
    recommendation:
      "Page has a valid sitemap declaration.",
  };
}

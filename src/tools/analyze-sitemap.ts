import { discardBody, safeFetch, validatePublicUrl } from "../utils/fetch-page.js";
import { fetchRobotsTxt, sitemapUrlsFromRobotsTxt, type FetchedRobotsTxt } from "../utils/fetch-robots-txt.js";
import {
  analyzeSitemapRules,
  type SitemapAnalysis,
  type SitemapSource,
} from "../seo/sitemap-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

// Checks that a sitemap URL exists. HEAD is tried first; servers that reject HEAD are retried with GET.
async function sitemapExists(sitemapUrl: string): Promise<boolean> {
  try {
    const head = await safeFetch(sitemapUrl, { method: "HEAD" });

    if (head.ok) return true;

    // 403, 405 and 501 usually mean "HEAD not allowed here", not "no sitemap".
    if (![403, 405, 501].includes(head.status)) return false;
  } catch {
    return false;
  }

  try {
    const response = await safeFetch(sitemapUrl);

    await discardBody(response);

    return response.ok;
  } catch {
    return false;
  }
}

export async function analyzeSitemap(
  url: string,
  prefetchedRobotsTxt?: FetchedRobotsTxt,
): Promise<AnalyzerResult<SitemapAnalysis>> {
  const { origin } = await validatePublicUrl(url);

  const robotsTxt = prefetchedRobotsTxt ?? (await fetchRobotsTxt(origin));

  // Prefer a sitemap declared in robots.txt; fall back to /sitemap.xml at the origin.
  const candidates: { sitemapUrl: string; source: SitemapSource }[] = [
    ...sitemapUrlsFromRobotsTxt(robotsTxt.content).map((sitemapUrl) => ({
      sitemapUrl,
      source: "robots_txt" as const,
    })),
    { sitemapUrl: `${origin}/sitemap.xml`, source: "well_known" },
  ];

  for (const candidate of candidates) {
    // An invalid URL in robots.txt is reported as declared-but-invalid rather than silently skipped.
    if (candidate.source === "robots_txt" && !URL.canParse(candidate.sitemapUrl)) {
      return {
        url,
        ...analyzeSitemapRules(candidate.sitemapUrl, candidate.source),
      };
    }

    if (await sitemapExists(candidate.sitemapUrl)) {
      return {
        url,
        ...analyzeSitemapRules(candidate.sitemapUrl, candidate.source),
      };
    }
  }

  return {
    url,
    ...analyzeSitemapRules(null),
  };
}

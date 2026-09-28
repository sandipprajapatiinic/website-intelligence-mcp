import { fetchPage, safeFetch } from "../utils/fetch-page.js";
import { analyzeSitemapRules, type SitemapAnalysis } from "../seo/sitemap-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeSitemap(
  url: string,
  prefetchedHtml?: string,
): Promise<AnalyzerResult<SitemapAnalysis>> {
  console.error(`Fetching website: ${url}`);

  const html = prefetchedHtml ?? (await fetchPage(url));

  console.error(`HTML received: ${html.length} characters`);

  const origin = new URL(url).origin;
  const sitemapUrl = `${origin}/sitemap.xml`;

  let sitemapExists = false;

  try {
    const response = await safeFetch(sitemapUrl, {
      method: "HEAD",
    });

    sitemapExists = response.ok;
  } catch {
    sitemapExists = false;
  }

  const analysis = analyzeSitemapRules(
    sitemapExists ? sitemapUrl : null,
  );

  return {
    url,
    ...analysis,
  };
}
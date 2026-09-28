import * as cheerio from "cheerio";
import { fetchPage } from "../utils/fetch-page.js";
import { analyzeFaviconRules, type FaviconAnalysis } from "../seo/favicon-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeFavicon(
  url: string,
  prefetchedHtml?: string,
): Promise<AnalyzerResult<FaviconAnalysis>> {
  console.error(`Fetching website: ${url}`);

  const html = prefetchedHtml ?? (await fetchPage(url));

  console.error(`HTML received: ${html.length} characters`);

  const $ = cheerio.load(html);

  const faviconLinks: string[] = [];

  $('link[rel~="icon"]').each((_, element) => {
    const href = $(element).attr("href");

    if (href) {
      faviconLinks.push(href);
    }
  });

  const analysis = analyzeFaviconRules(faviconLinks);

  return {
    url,
    ...analysis,
  };
}
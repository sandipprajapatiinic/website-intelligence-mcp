import * as cheerio from "cheerio";
import { fetchPage } from "../utils/fetch-page.js";
import { analyzeCanonicalRules, type CanonicalAnalysis } from "../seo/canonical-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeCanonical(
  url: string,
  prefetchedHtml?: string,
): Promise<AnalyzerResult<CanonicalAnalysis>> {
  console.error(`Fetching website: ${url}`);

  const html = prefetchedHtml ?? (await fetchPage(url));

  console.error(`HTML received: ${html.length} characters`);

  const $ = cheerio.load(html);

  const canonicals: string[] = [];

  $('link[rel="canonical"]').each((_, element) => {
    const href = $(element).attr("href");

    if (href) {
      canonicals.push(href.trim());
    }
  });

  const analysis = analyzeCanonicalRules(canonicals);

  return {
    url,
    ...analysis,
  };
}
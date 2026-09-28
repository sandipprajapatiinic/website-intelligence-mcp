import * as cheerio from "cheerio";
import { fetchPage } from "../utils/fetch-page.js";
import { analyzeOpenGraphRules, type OpenGraphAnalysis } from "../seo/open-graph-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeOpenGraph(
  url: string,
  prefetchedHtml?: string,
): Promise<AnalyzerResult<OpenGraphAnalysis>> {
  console.error(`Fetching website: ${url}`);

  const html = prefetchedHtml ?? (await fetchPage(url));

  console.error(`HTML received: ${html.length} characters`);

  const $ = cheerio.load(html);

  const tags: Record<string, string> = {};

  $('meta[property^="og:"]').each((_, element) => {
    const property = $(element).attr("property");
    const content = $(element).attr("content");

    if (property && content) {
      tags[property] = content.trim();
    }
  });

  const analysis = analyzeOpenGraphRules(tags);

  return {
    url,
    ...analysis,
  };
}
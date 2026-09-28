import * as cheerio from "cheerio";
import { fetchPage } from "../utils/fetch-page.js";
import { analyzeViewportRules, type ViewportAnalysis } from "../seo/viewport-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeViewport(
  url: string,
  prefetchedHtml?: string,
): Promise<AnalyzerResult<ViewportAnalysis>> {
  console.error(`Fetching website: ${url}`);

  const html = prefetchedHtml ?? (await fetchPage(url));

  console.error(`HTML received: ${html.length} characters`);

  const $ = cheerio.load(html);

  const viewportContent =
    $('meta[name="viewport"]').attr("content") ?? "";

  const analysis = analyzeViewportRules(viewportContent);

  return {
    url,
    ...analysis,
  };
}
import * as cheerio from "cheerio";
import { fetchPage } from "../utils/fetch-page.js";
import { analyzeMetaRules, type MetaAnalysis } from "../seo/meta-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeMeta(
  url: string,
  prefetchedHtml?: string,
): Promise<AnalyzerResult<MetaAnalysis>> {
  console.error(`Fetching website: ${url}`);

  const html = prefetchedHtml ?? (await fetchPage(url));

  console.error(`HTML received: ${html.length} characters`);

  const $ = cheerio.load(html);

  const description =
    $('meta[name="description"]').attr("content") ?? "";

  const analysis = analyzeMetaRules(description);

  return {
    url,
    ...analysis,
  };
}
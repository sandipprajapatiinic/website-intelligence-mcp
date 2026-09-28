import * as cheerio from "cheerio";
import { fetchPage } from "../utils/fetch-page.js";
import { analyzeHeadingsRules, type HeadingsAnalysis } from "../seo/headings-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeHeadings(
  url: string,
  prefetchedHtml?: string,
): Promise<AnalyzerResult<HeadingsAnalysis>> {
  console.error(`Fetching website: ${url}`);

  const html = prefetchedHtml ?? (await fetchPage(url));

  console.error(`HTML received: ${html.length} characters`);

  const $ = cheerio.load(html);

  const h1Count = $("h1").length;
  const h2Count = $("h2").length;
  const h3Count = $("h3").length;

  const analysis = analyzeHeadingsRules(
    h1Count,
    h2Count,
    h3Count,
  );

  return {
    url,
    ...analysis,
  };
}
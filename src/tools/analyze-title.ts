import * as cheerio from "cheerio";
import { fetchPage } from "../utils/fetch-page.js";
import { analyzeTitleRules, type TitleAnalysis } from "../seo/title-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeTitle(
  url: string,
  prefetchedHtml?: string,
): Promise<AnalyzerResult<TitleAnalysis>> {
  console.error(`Fetching website: ${url}`);

  const html = prefetchedHtml ?? (await fetchPage(url));

  console.error(`HTML received: ${html.length} characters`);

  const $ = cheerio.load(html);

  const title = $("title").text();

  const analysis = analyzeTitleRules(title);

  return {
    url,
    ...analysis,
  };
}
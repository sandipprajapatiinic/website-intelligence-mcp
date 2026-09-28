import * as cheerio from "cheerio";
import { fetchPage } from "../utils/fetch-page.js";
import { analyzeRobotsRules, type RobotsAnalysis } from "../seo/robots-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeRobots(
  url: string,
  prefetchedHtml?: string,
): Promise<AnalyzerResult<RobotsAnalysis>> {
  console.error(`Fetching website: ${url}`);

  const html = prefetchedHtml ?? (await fetchPage(url));

  console.error(`HTML received: ${html.length} characters`);

  const $ = cheerio.load(html);

  const robotsContent =
    $('meta[name="robots"]').attr("content") ?? "";

  const analysis = analyzeRobotsRules(robotsContent);

  return {
    url,
    ...analysis,
  };
}
import * as cheerio from "cheerio";
import { fetchPage } from "../utils/fetch-page.js";
import {
  analyzeHreflangRules,
  type HreflangAnalysis,
  type HreflangEntry,
} from "../seo/hreflang-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeHreflang(
  url: string,
  prefetchedHtml?: string,
): Promise<AnalyzerResult<HreflangAnalysis>> {
  console.error(`Fetching website: ${url}`);

  const html = prefetchedHtml ?? (await fetchPage(url));

  console.error(`HTML received: ${html.length} characters`);

  const $ = cheerio.load(html);

  const entries: HreflangEntry[] = [];

  $('link[rel="alternate"][hreflang]').each((_, element) => {
    const lang = $(element).attr("hreflang") ?? "";
    const href = $(element).attr("href") ?? "";

    entries.push({
      lang,
      href,
    });
  });

  const analysis = analyzeHreflangRules(entries);

  return {
    url,
    ...analysis,
  };
}
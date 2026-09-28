import * as cheerio from "cheerio";
import { fetchPage } from "../utils/fetch-page.js";
import { analyzeLangRules, type LangAnalysis } from "../seo/lang-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeLang(
  url: string,
  prefetchedHtml?: string,
): Promise<AnalyzerResult<LangAnalysis>> {
  console.error(`Fetching website: ${url}`);

  const html = prefetchedHtml ?? (await fetchPage(url));

  console.error(`HTML received: ${html.length} characters`);

  const $ = cheerio.load(html);

  const lang = $("html").attr("lang") ?? "";

  const analysis = analyzeLangRules(lang);

  return {
    url,
    ...analysis,
  };
}
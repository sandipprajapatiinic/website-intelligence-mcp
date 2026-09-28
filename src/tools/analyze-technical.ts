import { discardBody, safeFetch } from "../utils/fetch-page.js";
import { analyzeTechnicalRules, type TechnicalAnalysis } from "../seo/technical-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeTechnical(
  url: string,
  prefetchedHtml?: string,
): Promise<AnalyzerResult<TechnicalAnalysis>> {
  console.error(`Analyzing technical SEO for: ${url}`);

  let html = prefetchedHtml;

  if (html === undefined) {
    const response = await safeFetch(url);

    if (!response.ok) {
      await discardBody(response);
      throw new Error(
        `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
      );
    }

    html = await response.text();
  }

  return analyzeTechnicalRules(html, url);
}
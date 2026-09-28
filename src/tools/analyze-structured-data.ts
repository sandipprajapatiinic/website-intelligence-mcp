import { discardBody, safeFetch } from "../utils/fetch-page.js";
import {
  analyzeStructuredDataRules,
  type StructuredDataAnalysis,
} from "../seo/structured-data-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeStructuredData(
  url: string,
  prefetchedHtml?: string,
): Promise<AnalyzerResult<StructuredDataAnalysis>> {
  console.error(`Analyzing structured data for: ${url}`);

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

  const analysis = analyzeStructuredDataRules(html);

  return {
    url,
    ...analysis,
  };
}
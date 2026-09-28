import { discardBody, safeFetch } from "../utils/fetch-page.js";
import { analyzeContentRules, type ContentAnalysis } from "../seo/content-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeContent(
  url: string,
  prefetchedHtml?: string,
): Promise<AnalyzerResult<ContentAnalysis>> {
  console.error(`Analyzing content for: ${url}`);

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

  const analysis = analyzeContentRules(html);

  return {
    url,
    ...analysis,
  };
}
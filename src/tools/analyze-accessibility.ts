import { safeFetch } from "../utils/fetch-page.js";
import {
  analyzeAccessibilityRules,
  type AccessibilityAnalysis,
} from "../seo/accessibility-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeAccessibility(
  url: string,
  prefetchedHtml?: string,
): Promise<AnalyzerResult<AccessibilityAnalysis>> {
  console.error(`Analyzing accessibility for: ${url}`);

  const html = prefetchedHtml ?? (await (await safeFetch(url)).text());

  const analysis = analyzeAccessibilityRules(html);

  return {
    url,
    ...analysis,
  };
}
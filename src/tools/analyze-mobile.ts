import { safeFetch } from "../utils/fetch-page.js";
import { analyzeMobileRules, type MobileAnalysis } from "../seo/mobile-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeMobile(
  url: string,
  prefetchedHtml?: string,
): Promise<AnalyzerResult<MobileAnalysis>> {
  console.error(`Analyzing mobile configuration for: ${url}`);

  const html = prefetchedHtml ?? (await (await safeFetch(url)).text());

  const viewportMatch = html.match(
    /<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']*)["'][^>]*>/i,
  );

  const reverseViewportMatch = html.match(
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']viewport["'][^>]*>/i,
  );

  const viewport =
    viewportMatch?.[1] ??
    reverseViewportMatch?.[1] ??
    null;

  const analysis = analyzeMobileRules(viewport);

  return {
    url,
    ...analysis,
  };
}
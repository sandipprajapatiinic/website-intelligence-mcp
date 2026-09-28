import { safeFetch } from "../utils/fetch-page.js";
import { analyzeSocialRules, type SocialAnalysis } from "../seo/social-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeSocial(
  url: string,
  prefetchedHtml?: string,
): Promise<AnalyzerResult<SocialAnalysis>> {
  console.error(`Analyzing social metadata for: ${url}`);

  const html = prefetchedHtml ?? (await (await safeFetch(url)).text());

  const getMeta = (property: string): string | null => {
    const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const propertyRegex = new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`,
      "i",
    );

    const reverseRegex = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
      "i",
    );

    return (
      html.match(propertyRegex)?.[1] ??
      html.match(reverseRegex)?.[1] ??
      null
    );
  };

  const analysis = analyzeSocialRules(getMeta);

  return {
    url,
    ...analysis,
  };
}
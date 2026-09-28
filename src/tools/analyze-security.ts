import { discardBody, safeFetch, type FetchedPage } from "../utils/fetch-page.js";
import { analyzeSecurityRules, type SecurityAnalysis } from "../seo/security-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

// prefetchedPage lets analyze_website reuse the headers of its page request instead of making another.
export async function analyzeSecurity(
  url: string,
  prefetchedPage?: Pick<FetchedPage, "headers">,
): Promise<AnalyzerResult<SecurityAnalysis>> {
  console.error(`Analyzing security for: ${url}`);

  const targetUrl = new URL(url);

  let headers = prefetchedPage?.headers;

  if (headers === undefined) {
    const response = await safeFetch(url);
    headers = response.headers;
    // Only the headers are needed.
    await discardBody(response);
  }

  const analysis = analyzeSecurityRules(
    targetUrl.protocol === "https:",
    headers,
  );

  return {
    url,
    ...analysis,
  };
}
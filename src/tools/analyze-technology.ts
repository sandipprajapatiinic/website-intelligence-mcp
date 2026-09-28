import { safeFetch, type FetchedPage } from "../utils/fetch-page.js";
import { analyzeTechnologyRules, type TechnologyAnalysis } from "../seo/technology-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

// prefetchedPage lets analyze_website reuse the HTML and headers of its page request instead of making another.
export async function analyzeTechnology(
  url: string,
  prefetchedPage?: Pick<FetchedPage, "html" | "headers">,
): Promise<AnalyzerResult<TechnologyAnalysis>> {
  console.error(`Analyzing technologies for: ${url}`);

  let page = prefetchedPage;

  if (page === undefined) {
    const response = await safeFetch(url);
    page = { html: await response.text(), headers: response.headers };
  }

  const analysis = analyzeTechnologyRules(
    page.html,
    page.headers,
  );

  return {
    url,
    ...analysis,
  };
}
import { safeFetch, type FetchedPage } from "../utils/fetch-page.js";
import { analyzePerformanceRules, type PerformanceAnalysis } from "../seo/performance-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

type TimedPage = Pick<FetchedPage, "html" | "status" | "responseTimeMs">;

// Requests the page itself, accepting any status or content type, timed from before validation to the end of the body.
async function requestPage(url: string): Promise<TimedPage> {
  const startTime = performance.now();

  const response = await safeFetch(url);

  const html = await response.text();

  const responseTimeMs = Math.round(
    performance.now() - startTime,
  );

  return { html, status: response.status, responseTimeMs };
}

// prefetchedPage lets analyze_website reuse its (identically timed) page request instead of making another.
export async function analyzePerformance(
  url: string,
  prefetchedPage?: TimedPage,
): Promise<AnalyzerResult<PerformanceAnalysis & { statusCode: number }>> {
  console.error(`Analyzing performance for: ${url}`);

  const { html, status, responseTimeMs } = prefetchedPage ?? (await requestPage(url));

  const htmlSizeBytes = Buffer.byteLength(html, "utf8");

  console.error(
    `Response time: ${responseTimeMs}ms`,
  );

  console.error(
    `HTML size: ${htmlSizeBytes} bytes`,
  );

  const analysis = analyzePerformanceRules(
    responseTimeMs,
    htmlSizeBytes,
  );

  return {
    url,
    statusCode: status,
    ...analysis,
  };
}
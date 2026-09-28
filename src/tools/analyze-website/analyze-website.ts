import { analyzeTitle } from "../analyze-title.js";
import { analyzeMeta } from "../analyze-meta.js";
import { analyzeHeadings } from "../analyze-headings.js";
import { analyzeImages } from "../analyze-images.js";
import { analyzeLinks } from "../analyze-links.js";
import { analyzeCanonical } from "../analyze-canonical.js";
import { analyzeRobots } from "../analyze-robots.js";
import { analyzeOpenGraph } from "../analyze-open-graph.js";
import { analyzeSchema } from "../analyze-schema.js";
import { analyzeViewport } from "../analyze-viewport.js";
import { analyzeLang } from "../analyze-lang.js";
import { analyzeFavicon } from "../analyze-favicon.js";
import { analyzeHreflang } from "../analyze-hreflang.js";
import { analyzeCharset } from "../analyze-charset.js";
import { analyzeSsl } from "../analyze-ssl.js";
import { analyzeSitemap } from "../analyze-sitemap.js";
import { analyzeRobotsTxt } from "../analyze-robots-txt.js";
import { analyzePerformance } from "../analyze-performance.js";
import { analyzeSecurity } from "../analyze-security.js";
import { analyzeSocial } from "../analyze-social.js";
import { analyzeMobile } from "../analyze-mobile.js";
import { analyzeTechnology } from "../analyze-technology.js";
import { analyzeAccessibility } from "../analyze-accessibility.js";
import { analyzeContent } from "../analyze-content.js";
import { analyzeStructuredData } from "../analyze-structured-data.js";
import { analyzeTechnical } from "../analyze-technical.js";
import { fetchPageDetails, validatePublicUrl, type FetchedPage } from "../../utils/fetch-page.js";
import type { AnalyzerErrorResult, WebsiteAnalysisResult } from "../../types/analyzer-result.js";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Runs one analyzer; a failure becomes an error result instead of aborting the whole analysis.
async function runAnalyzer<T>(
  url: string,
  analyzer: () => Promise<T>,
): Promise<T | AnalyzerErrorResult> {
  try {
    return await analyzer();
  } catch (error) {
    return { url, status: "error", error: errorMessage(error) };
  }
}

export async function analyzeWebsite(url: string) {
  // Reject invalid, localhost and private URLs up front so no analyzer requests them.
  await validatePublicUrl(url);

  // Fetch the page once for this call and share it: the HTML with every HTML-based analyzer, and the
  // response (timing, status, headers) with performance, security and technology.
  let page: FetchedPage | undefined;
  let pageError = "";

  try {
    page = await fetchPageDetails(url);
  } catch (error) {
    pageError = errorMessage(error);
  }

  const sharedHtml = page?.html;

  const runWithHtml = <T>(
    analyzer: (url: string, html: string) => Promise<T>,
  ): Promise<T | AnalyzerErrorResult> =>
    sharedHtml === undefined
      ? Promise.resolve({
          url,
          status: "error" as const,
          error: `Page could not be fetched: ${pageError}`,
        })
      : runAnalyzer(url, () => analyzer(url, sharedHtml));

  // Performance, security and technology reuse the shared response. If the shared fetch failed (for example,
  // the page is not HTML), they make their own request, which accepts any status and content type.
  // Performance runs on its own so that request isn't slowed by concurrent ones.
  const performance = await runAnalyzer(url, () => analyzePerformance(url, page));

  // The remaining analyzers are independent and never reject (errors become results), so run them concurrently.
  const [
    title,
    meta,
    headings,
    images,
    links,
    canonical,
    robots,
    openGraph,
    schema,
    viewport,
    lang,
    favicon,
    hreflang,
    charset,
    ssl,
    sitemap,
    robotsTxt,
    security,
    social,
    mobile,
    technology,
    accessibility,
    content,
    structuredData,
    technical,
  ] = await Promise.all([
    runWithHtml(analyzeTitle),
    runWithHtml(analyzeMeta),
    runWithHtml(analyzeHeadings),
    runWithHtml(analyzeImages),
    runWithHtml(analyzeLinks),
    runWithHtml(analyzeCanonical),
    runWithHtml(analyzeRobots),
    runWithHtml(analyzeOpenGraph),
    runWithHtml(analyzeSchema),
    runWithHtml(analyzeViewport),
    runWithHtml(analyzeLang),
    runWithHtml(analyzeFavicon),
    runWithHtml(analyzeHreflang),
    runWithHtml(analyzeCharset),
    runAnalyzer(url, () => analyzeSsl(url)),
    runWithHtml(analyzeSitemap),
    runAnalyzer(url, () => analyzeRobotsTxt(url)),
    runAnalyzer(url, () => analyzeSecurity(url, page)),
    runWithHtml(analyzeSocial),
    runWithHtml(analyzeMobile),
    runAnalyzer(url, () => analyzeTechnology(url, page)),
    runWithHtml(analyzeAccessibility),
    runWithHtml(analyzeContent),
    runWithHtml(analyzeStructuredData),
    runWithHtml(analyzeTechnical),
  ]);

  const analyses = {
    title,
    meta,
    headings,
    images,
    links,
    canonical,
    robots,
    openGraph,
    schema,
    viewport,
    lang,
    favicon,
    hreflang,
    charset,
    ssl,
    sitemap,
    robotsTxt,
    performance,
    security,
    social,
    mobile,
    technology,
    accessibility,
    content,
    structuredData,
    technical,
  };

  const failedAnalyzers = Object.entries(analyses)
    .filter(([, result]) => result.status === "error")
    .map(([name]) => name);

  if (failedAnalyzers.length > 0) {
    return {
      url,
      status: "completed_with_errors",
      failedAnalyzers,
      analyses,
    } satisfies WebsiteAnalysisResult<typeof analyses>;
  }

  return {
    url,
    status: "completed",
    analyses,
  } satisfies WebsiteAnalysisResult<typeof analyses>;
}

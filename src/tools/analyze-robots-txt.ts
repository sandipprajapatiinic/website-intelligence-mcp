import { validatePublicUrl } from "../utils/fetch-page.js";
import { fetchRobotsTxt, type FetchedRobotsTxt } from "../utils/fetch-robots-txt.js";
import { analyzeRobotsTxtRules, type RobotsTxtAnalysis } from "../seo/robots-txt-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeRobotsTxt(
  url: string,
  prefetchedRobotsTxt?: FetchedRobotsTxt,
): Promise<AnalyzerResult<RobotsTxtAnalysis>> {
  const robotsTxt =
    prefetchedRobotsTxt ?? (await fetchRobotsTxt((await validatePublicUrl(url)).origin));

  const analysis = analyzeRobotsTxtRules(
    robotsTxt.content !== null ? robotsTxt.robotsTxtUrl : null,
    robotsTxt.content,
  );

  return {
    url,
    ...analysis,
  };
}

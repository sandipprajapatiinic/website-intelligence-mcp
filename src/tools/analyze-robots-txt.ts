import { discardBody, safeFetch, validatePublicUrl } from "../utils/fetch-page.js";
import { analyzeRobotsTxtRules, type RobotsTxtAnalysis } from "../seo/robots-txt-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeRobotsTxt(url: string): Promise<AnalyzerResult<RobotsTxtAnalysis>> {
  const origin = (await validatePublicUrl(url)).origin;
  const robotsTxtUrl = `${origin}/robots.txt`;

  console.error(`Fetching robots.txt: ${robotsTxtUrl}`);

  let content: string | null = null;

  try {
    const response = await safeFetch(robotsTxtUrl);

    if (response.ok) {
      content = await response.text();
      console.error(
        `robots.txt received: ${content.length} characters`,
      );
    } else {
      await discardBody(response);
    }
  } catch {
    content = null;
  }

  const analysis = analyzeRobotsTxtRules(
    content !== null ? robotsTxtUrl : null,
    content,
  );

  return {
    url,
    ...analysis,
  };
}
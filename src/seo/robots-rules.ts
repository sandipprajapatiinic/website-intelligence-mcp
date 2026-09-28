export type RobotsStatus =
  | "good"
  | "missing"
  | "blocking";

export interface RobotsAnalysis {
  content: string | null;
  hasRobotsMeta: boolean;
  status: RobotsStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeRobotsRules(
  content: string,
): RobotsAnalysis {
  const cleanContent = content.trim();

  let status: RobotsStatus;
  const issues: string[] = [];
  let recommendation = "";

  if (!cleanContent) {
    status = "missing";

    recommendation =
      "Consider adding a robots meta directive when page-level crawling or indexing behavior needs to be controlled.";
  } else {
    const normalized = cleanContent.toLowerCase();

    const hasNoindex = normalized.includes("noindex");
    const hasNofollow = normalized.includes("nofollow");

    if (hasNoindex) {
      status = "blocking";

      issues.push("Robots meta contains a noindex directive");

      recommendation =
        "Verify that noindex is intentional because it prevents the page from being indexed.";
    } else if (hasNofollow) {
      status = "blocking";

      issues.push("Robots meta contains a nofollow directive");

      recommendation =
        "Verify that nofollow is intentional because it instructs crawlers not to follow links on the page.";
    } else {
      status = "good";

      recommendation =
        "Robots meta directives do not contain noindex or nofollow.";
    }
  }

  return {
    content: cleanContent || null,
    hasRobotsMeta: cleanContent.length > 0,
    status,
    issues,
    recommendation,
  };
}
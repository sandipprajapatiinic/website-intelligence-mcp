export type RobotsTxtStatus =
  | "good"
  | "missing"
  | "needs_improvement";

export interface RobotsTxtAnalysis {
  robotsTxtUrl: string | null;
  hasRobotsTxt: boolean;
  isValid: boolean;
  status: RobotsTxtStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeRobotsTxtRules(
  robotsTxtUrl: string | null,
  content: string | null,
): RobotsTxtAnalysis {
  if (!robotsTxtUrl || content === null) {
    return {
      robotsTxtUrl: null,
      hasRobotsTxt: false,
      isValid: false,
      status: "missing",
      issues: ["Page does not have a robots.txt file"],
      recommendation:
        "Add a valid robots.txt file at the website root.",
    };
  }

  const trimmedContent = content.trim();

  if (!trimmedContent) {
    return {
      robotsTxtUrl,
      hasRobotsTxt: true,
      isValid: false,
      status: "needs_improvement",
      issues: ["robots.txt file is empty"],
      recommendation:
        "Add appropriate robots.txt directives for crawler access.",
    };
  }

  const lines = trimmedContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const hasDirective = lines.some((line) =>
    /^(user-agent|allow|disallow|sitemap|host):/i.test(line),
  );

  if (!hasDirective) {
    return {
      robotsTxtUrl,
      hasRobotsTxt: true,
      isValid: false,
      status: "needs_improvement",
      issues: ["robots.txt contains no recognized directives"],
      recommendation:
        "Add valid robots.txt directives such as User-agent, Allow, Disallow, or Sitemap.",
    };
  }

  return {
    robotsTxtUrl,
    hasRobotsTxt: true,
    isValid: true,
    status: "good",
    issues: [],
    recommendation:
      "robots.txt file is present and contains recognized directives.",
  };
}
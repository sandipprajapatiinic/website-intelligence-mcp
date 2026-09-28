export interface HeadingsAnalysis {
  h1Count: number;
  h2Count: number;
  h3Count: number;
  status: "good" | "needs_improvement" | "critical";
  issues: string[];
  recommendation: string;
}

export function analyzeHeadingsRules(
  h1Count: number,
  h2Count: number,
  h3Count: number,
): HeadingsAnalysis {
  const issues: string[] = [];
  let status: "good" | "needs_improvement" | "critical";
  let recommendation = "";

  if (h1Count === 0) {
    status = "critical";

    issues.push("Page is missing an H1 heading");

    recommendation =
      "Add one clear and descriptive H1 heading that represents the main topic of the page.";
  } else if (h1Count > 1) {
    status = "needs_improvement";

    issues.push("Page has multiple H1 headings");

    recommendation =
      "Consider using one primary H1 heading and organize secondary topics with H2 and H3 headings.";
  } else if (h2Count === 0 && h3Count === 0) {
    status = "needs_improvement";

    issues.push("Page has no H2 or H3 headings");

    recommendation =
      "Use H2 and H3 headings to organize the page content into clear sections.";
  } else {
    status = "good";

    recommendation =
      "Heading structure contains a primary H1 and supporting section headings.";
  }

  return {
    h1Count,
    h2Count,
    h3Count,
    status,
    issues,
    recommendation,
  };
}
export type LinkStatus =
  | "good"
  | "needs_improvement"
  | "critical";

export interface LinkAnalysis {
  totalLinks: number;
  internalLinks: number;
  externalLinks: number;
  linksWithoutText: number;
  status: LinkStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeLinkRules(
  totalLinks: number,
  internalLinks: number,
  externalLinks: number,
  linksWithoutText: number,
): LinkAnalysis {
  let status: LinkStatus;
  const issues: string[] = [];
  let recommendation = "";

  if (totalLinks === 0) {
    status = "critical";

    issues.push("Page contains no links");

    recommendation =
      "Add relevant internal and external links where they provide useful context.";
  } else if (linksWithoutText > 0) {
    status = "needs_improvement";

    issues.push(
      `${linksWithoutText} link(s) have no visible link text`,
    );

    recommendation =
      "Use descriptive link text so users and search engines can understand the destination.";
  } else {
    status = "good";

    recommendation =
      "Links have descriptive text and the page contains a link structure.";
  }

  return {
    totalLinks,
    internalLinks,
    externalLinks,
    linksWithoutText,
    status,
    issues,
    recommendation,
  };
}
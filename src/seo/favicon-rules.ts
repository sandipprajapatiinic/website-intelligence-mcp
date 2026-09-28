export type FaviconStatus =
  | "good"
  | "missing"
  | "needs_improvement";

export interface FaviconAnalysis {
  favicon: string | null;
  faviconCount: number;
  hasFavicon: boolean;
  status: FaviconStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeFaviconRules(
  faviconLinks: string[],
): FaviconAnalysis {
  const cleanLinks = faviconLinks
    .map((link) => link.trim())
    .filter(Boolean);

  const faviconCount = cleanLinks.length;

  if (faviconCount === 0) {
    return {
      favicon: null,
      faviconCount: 0,
      hasFavicon: false,
      status: "missing",
      issues: ["Page is missing a favicon"],
      recommendation:
        "Add a favicon link so browsers can display the site's icon.",
    };
  }

  if (faviconCount > 1) {
    return {
      favicon: cleanLinks[0],
      faviconCount,
      hasFavicon: true,
      status: "needs_improvement",
      issues: ["Page contains multiple favicon declarations"],
      recommendation:
        "Keep the favicon declarations intentional and avoid unnecessary duplicates.",
    };
  }

  return {
    favicon: cleanLinks[0],
    faviconCount: 1,
    hasFavicon: true,
    status: "good",
    issues: [],
    recommendation:
      "Page contains a favicon declaration.",
  };
}
export type CanonicalStatus =
  | "good"
  | "missing"
  | "multiple";

export interface CanonicalAnalysis {
  canonical: string | null;
  canonicalCount: number;
  hasCanonical: boolean;
  status: CanonicalStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeCanonicalRules(
  canonicals: string[],
): CanonicalAnalysis {
  const canonicalCount = canonicals.length;

  let status: CanonicalStatus;
  const issues: string[] = [];
  let recommendation = "";

  if (canonicalCount === 0) {
    status = "missing";

    issues.push("Page is missing a canonical URL");

    recommendation =
      "Add one canonical link element that points to the preferred URL.";
  } else if (canonicalCount > 1) {
    status = "multiple";

    issues.push("Page contains multiple canonical URL declarations");

    recommendation =
      "Keep only one canonical link element for the page.";
  } else {
    status = "good";

    recommendation =
      "Page contains one canonical URL declaration.";
  }

  return {
    canonical: canonicals[0] ?? null,
    canonicalCount,
    hasCanonical: canonicalCount > 0,
    status,
    issues,
    recommendation,
  };
}
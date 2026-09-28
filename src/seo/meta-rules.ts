export type MetaStatus =
  | "missing"
  | "too_short"
  | "good"
  | "too_long";

export interface MetaAnalysis {
  description: string | null;
  length: number;
  hasDescription: boolean;
  status: MetaStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeMetaRules(description: string): MetaAnalysis {
  const cleanDescription = description.trim();
  const length = cleanDescription.length;

  let status: MetaStatus;
  const issues: string[] = [];
  let recommendation = "";

  if (!cleanDescription) {
    status = "missing";

    issues.push("Page is missing a meta description");

    recommendation =
      "Add a unique and descriptive meta description for the page.";
  } else if (length < 50) {
    status = "too_short";

    issues.push("Meta description is very short");

    recommendation =
      "Make the meta description more descriptive and useful to searchers.";
  } else if (length <= 160) {
    status = "good";

    recommendation =
      "Meta description length is within the initial recommended range.";
  } else {
    status = "too_long";

    issues.push("Meta description is longer than 160 characters");

    recommendation =
      "Consider shortening the meta description so the main message is clear.";
  }

  return {
    description: cleanDescription || null,
    length,
    hasDescription: length > 0,
    status,
    issues,
    recommendation,
  };
}
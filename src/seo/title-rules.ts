export type TitleStatus =
  | "critical"
  | "needs_improvement"
  | "good"
  | "too_long";

export interface TitleAnalysis {
  title: string | null;
  length: number;
  hasTitle: boolean;
  status: TitleStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeTitleRules(title: string): TitleAnalysis {
  const cleanTitle = title.trim();
  const length = cleanTitle.length;

  let status: TitleStatus;
  const issues: string[] = [];
  let recommendation = "";

  if (!cleanTitle) {
    status = "critical";

    issues.push("Page is missing a title tag");

    recommendation = "Add a unique and descriptive title tag.";
  } else if (length <= 20) {
    status = "needs_improvement";

    issues.push("Title is very short");

    recommendation =
      "Make the title more descriptive and useful to searchers.";
  } else if (length <= 60) {
    status = "good";

    recommendation =
      "Title length is within the initial recommended range.";
  } else {
    status = "too_long";

    issues.push("Title is longer than 60 characters");

    recommendation =
      "Consider shortening the title so the main topic is clear.";
  }

  return {
    title: cleanTitle || null,
    length,
    hasTitle: length > 0,
    status,
    issues,
    recommendation,
  };
}
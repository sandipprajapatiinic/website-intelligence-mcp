export type ViewportStatus =
  | "good"
  | "missing"
  | "needs_improvement";

export interface ViewportAnalysis {
  content: string | null;
  hasViewport: boolean;
  status: ViewportStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeViewportRules(
  content: string,
): ViewportAnalysis {
  const cleanContent = content.trim();

  if (!cleanContent) {
    return {
      content: null,
      hasViewport: false,
      status: "missing",
      issues: ["Page is missing a viewport meta tag"],
      recommendation:
        "Add a responsive viewport meta tag such as width=device-width, initial-scale=1.",
    };
  }

  const normalized = cleanContent.toLowerCase();

  const hasWidth = normalized.includes("width=");
  const hasDeviceWidth = normalized.includes("width=device-width");
  const hasInitialScale = normalized.includes("initial-scale=");

  const issues: string[] = [];

  if (!hasWidth) {
    issues.push("Viewport meta tag does not define width");
  }

  if (!hasDeviceWidth) {
    issues.push("Viewport meta tag does not use width=device-width");
  }

  if (!hasInitialScale) {
    issues.push("Viewport meta tag does not define initial-scale");
  }

  if (issues.length > 0) {
    return {
      content: cleanContent,
      hasViewport: true,
      status: "needs_improvement",
      issues,
      recommendation:
        "Use a responsive viewport configuration with width=device-width and initial-scale=1.",
    };
  }

  return {
    content: cleanContent,
    hasViewport: true,
    status: "good",
    issues: [],
    recommendation:
      "Viewport meta tag contains the expected responsive configuration.",
  };
}
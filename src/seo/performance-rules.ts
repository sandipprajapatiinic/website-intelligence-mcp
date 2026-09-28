export type PerformanceStatus =
  | "good"
  | "needs_improvement"
  | "poor";

export interface PerformanceAnalysis {
  responseTimeMs: number;
  htmlSizeBytes: number;
  status: PerformanceStatus;
  issues: string[];
  recommendation: string;
}

export function analyzePerformanceRules(
  responseTimeMs: number,
  htmlSizeBytes: number,
): PerformanceAnalysis {
  const issues: string[] = [];

  if (responseTimeMs > 3000) {
    issues.push("Server response time is above 3000ms");
  } else if (responseTimeMs > 1500) {
    issues.push("Server response time is above 1500ms");
  }

  if (htmlSizeBytes > 500_000) {
    issues.push("HTML document is larger than 500KB");
  } else if (htmlSizeBytes > 250_000) {
    issues.push("HTML document is larger than 250KB");
  }

  let status: PerformanceStatus;

  if (
    responseTimeMs > 3000 ||
    htmlSizeBytes > 500_000
  ) {
    status = "poor";
  } else if (
    responseTimeMs > 1500 ||
    htmlSizeBytes > 250_000
  ) {
    status = "needs_improvement";
  } else {
    status = "good";
  }

  let recommendation =
    "Page response time and HTML size are within the expected thresholds.";

  if (status === "needs_improvement") {
    recommendation =
      "Reduce server response time and/or HTML document size where possible.";
  }

  if (status === "poor") {
    recommendation =
      "Optimize server response time and significantly reduce the HTML document size.";
  }

  return {
    responseTimeMs,
    htmlSizeBytes,
    status,
    issues,
    recommendation,
  };
}
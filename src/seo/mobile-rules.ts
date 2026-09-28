export type MobileStatus =
  | "good"
  | "needs_improvement"
  | "poor";

export interface MobileAnalysis {
  hasViewport: boolean;
  viewport: string | null;
  hasResponsiveViewport: boolean;
  hasFixedWidth: boolean;
  status: MobileStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeMobileRules(
  viewport: string | null,
): MobileAnalysis {
  const normalized = viewport?.toLowerCase() ?? "";

  const hasViewport = Boolean(viewport);

  const hasResponsiveViewport =
    hasViewport &&
    normalized.includes("width=device-width") &&
    normalized.includes("initial-scale=1");

  const hasFixedWidth =
    hasViewport &&
    /width\s*=\s*\d+/i.test(normalized);

  const issues: string[] = [];

  if (!hasViewport) {
    issues.push("Viewport meta tag is missing");
  } else {
    if (!hasResponsiveViewport) {
      issues.push(
        "Viewport meta tag may not provide a fully responsive configuration",
      );
    }

    if (hasFixedWidth) {
      issues.push(
        "Viewport configuration contains a fixed numeric width",
      );
    }
  }

  let status: MobileStatus;

  if (!hasViewport) {
    status = "poor";
  } else if (issues.length > 0) {
    status = "needs_improvement";
  } else {
    status = "good";
  }

  let recommendation =
    "Viewport configuration is suitable for responsive layouts.";

  if (status === "needs_improvement") {
    recommendation =
      "Use a responsive viewport such as width=device-width, initial-scale=1.";
  }

  if (status === "poor") {
    recommendation =
      "Add a responsive viewport meta tag to support mobile devices.";
  }

  return {
    hasViewport,
    viewport,
    hasResponsiveViewport,
    hasFixedWidth,
    status,
    issues,
    recommendation,
  };
}
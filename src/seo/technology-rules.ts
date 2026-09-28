export type TechnologyStatus =
  | "good"
  | "needs_improvement"
  | "unknown";

export interface TechnologyAnalysis {
  technologies: string[];
  detectedCount: number;
  status: TechnologyStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeTechnologyRules(
  html: string,
  headers: Headers,
): TechnologyAnalysis {
  const technologies = new Set<string>();

  const generatorMatch = html.match(
    /<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  );

  if (generatorMatch?.[1]) {
    technologies.add(generatorMatch[1].trim());
  }

  const poweredBy = headers.get("x-powered-by");

  if (poweredBy) {
    technologies.add(poweredBy.trim());
  }

  const server = headers.get("server");

  if (server) {
    technologies.add(`Server: ${server.trim()}`);
  }

  const htmlLower = html.toLowerCase();

  if (
    htmlLower.includes("__next_data__") ||
    htmlLower.includes("/_next/")
  ) {
    technologies.add("Next.js");
  }

  if (
    htmlLower.includes("wp-content") ||
    htmlLower.includes("wp-includes")
  ) {
    technologies.add("WordPress");
  }

  if (
    htmlLower.includes("shopify") ||
    htmlLower.includes("cdn.shopify.com")
  ) {
    technologies.add("Shopify");
  }

  if (
    htmlLower.includes("wixstatic.com") ||
    htmlLower.includes("wix.com")
  ) {
    technologies.add("Wix");
  }

  if (
    htmlLower.includes("squarespace.com") ||
    htmlLower.includes("static1.squarespace.com")
  ) {
    technologies.add("Squarespace");
  }

  if (
    htmlLower.includes("react") &&
    (
      htmlLower.includes("react-dom") ||
      htmlLower.includes("data-reactroot")
    )
  ) {
    technologies.add("React");
  }

  const detected = Array.from(technologies);

  const issues: string[] = [];

  if (detected.length === 0) {
    issues.push("No recognizable technology signals were detected");
  }

  const status: TechnologyStatus =
    detected.length > 0
      ? "good"
      : "unknown";

  const recommendation =
    detected.length > 0
      ? "Technology signals were detected from page markup and response headers."
      : "No recognizable technology signals were detected; this does not necessarily mean the page uses no framework or platform.";

  return {
    technologies: detected,
    detectedCount: detected.length,
    status,
    issues,
    recommendation,
  };
}
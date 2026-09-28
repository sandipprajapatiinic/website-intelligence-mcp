import * as cheerio from "cheerio";

export type StructuredDataStatus =
  | "good"
  | "needs_improvement"
  | "poor";

export interface StructuredDataAnalysis {
  jsonLdCount: number;
  schemaCount: number;
  schemaTypes: string[];
  status: StructuredDataStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeStructuredDataRules(html: string): StructuredDataAnalysis {
  const $ = cheerio.load(html);

  const jsonLdBlocks = $('script[type="application/ld+json"]').toArray();

  const schemas: unknown[] = [];
  const issues: string[] = [];

  for (const block of jsonLdBlocks) {
    const raw = $(block).html()?.trim();

    if (!raw) {
      issues.push("Empty JSON-LD block found");
      continue;
    }

    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        schemas.push(...parsed);
      } else {
        schemas.push(parsed);
      }
    } catch {
      issues.push("Invalid JSON-LD structured data found");
    }
  }

  const schemaTypes = schemas
    .map((schema) => {
      if (
        typeof schema === "object" &&
        schema !== null &&
        "@type" in schema
      ) {
        const type = (schema as { "@type"?: unknown })["@type"];

        if (Array.isArray(type)) {
          return type.filter(
            (value): value is string => typeof value === "string",
          );
        }

        return typeof type === "string" ? [type] : [];
      }

      return [];
    })
    .flat();

  if (jsonLdBlocks.length === 0) {
    issues.push("No JSON-LD structured data found");
  }

  const status =
    issues.length === 0
      ? "good"
      : issues.some((issue) => issue.includes("Invalid"))
        ? "poor"
        : "needs_improvement";

  return {
    jsonLdCount: jsonLdBlocks.length,
    schemaCount: schemas.length,
    schemaTypes,
    status,
    issues,
    recommendation:
      status === "good"
        ? "Valid JSON-LD structured data was detected."
        : "Add valid JSON-LD structured data and review schema implementation.",
  };
}
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

export function analyzeStructuredDataRules(
  html: string,
): StructuredDataAnalysis {
  const $ = cheerio.load(html);
  const jsonLdBlocks = $('script[type="application/ld+json"]').toArray();

  const schemas: unknown[] = [];
  const issues: string[] = [];
  let hasInvalidJson = false;

  for (const block of jsonLdBlocks) {
    const raw = $(block).html()?.trim();

    if (!raw) {
      issues.push("Empty JSON-LD block found");
      continue;
    }

    try {
      const parsed: unknown = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        schemas.push(...parsed);
      } else {
        schemas.push(parsed);
      }
    } catch {
      hasInvalidJson = true;
      issues.push("Invalid JSON-LD structured data found");
    }
  }

  const schemaTypes: string[] = [];

  for (const schema of schemas) {
    if (
      typeof schema !== "object" ||
      schema === null ||
      Array.isArray(schema)
    ) {
      issues.push("Invalid JSON-LD schema object found");
      continue;
    }

    const type = (schema as Record<string, unknown>)["@type"];

    if (typeof type === "string" && type.trim()) {
      schemaTypes.push(type.trim());
    } else if (Array.isArray(type)) {
      for (const item of type) {
        if (typeof item === "string" && item.trim()) {
          schemaTypes.push(item.trim());
        }
      }
    }
  }

  if (jsonLdBlocks.length === 0) {
    issues.push("No JSON-LD structured data found");
  }

  if (
    schemas.length > 0 &&
    !schemaTypes.some((type) => type.trim())
  ) {
    issues.push("JSON-LD is present but no @type was detected");
  }

  const uniqueSchemaTypes = [...new Set(schemaTypes)];

  const status: StructuredDataStatus =
    hasInvalidJson
      ? "poor"
      : issues.length === 0
        ? "good"
        : "needs_improvement";

  return {
    jsonLdCount: jsonLdBlocks.length,
    schemaCount: schemas.length,
    schemaTypes: uniqueSchemaTypes,
    status,
    issues: [...new Set(issues)],
    recommendation:
      status === "good"
        ? "Valid JSON-LD structured data was detected."
        : "Fix invalid JSON-LD, add missing @type values, and review the structured data implementation.",
  };
}
export type SchemaStatus =
  | "good"
  | "needs_improvement"
  | "missing"
  | "invalid";

export interface SchemaAnalysis {
  totalSchemas: number;
  validSchemas: number;
  invalidSchemas: number;
  schemaTypes: string[];
  status: SchemaStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeSchemaRules(
  schemas: unknown[],
): SchemaAnalysis {
  const schemaTypes: string[] = [];
  let validSchemas = 0;
  let invalidSchemas = 0;

  for (const schema of schemas) {
    if (
      typeof schema === "object" &&
      schema !== null
    ) {
      validSchemas++;

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
    } else {
      invalidSchemas++;
    }
  }

  const totalSchemas = schemas.length;

  let status: SchemaStatus;
  const issues: string[] = [];
  let recommendation = "";

  if (totalSchemas === 0) {
    status = "missing";

    issues.push("Page does not contain JSON-LD structured data");

    recommendation =
      "Consider adding relevant Schema.org structured data where appropriate.";
  } else if (invalidSchemas > 0) {
    status = "invalid";

    issues.push("Page contains invalid JSON-LD structured data");

    recommendation =
      "Fix invalid JSON-LD syntax before relying on the structured data.";
  } else if (schemaTypes.length === 0) {
    status = "needs_improvement";

    issues.push("JSON-LD is present but no @type was detected");

    recommendation =
      "Add an appropriate Schema.org @type to the structured data.";
  } else {
    status = "good";

    recommendation =
      "Page contains valid JSON-LD structured data with detected schema types.";
  }

  return {
    totalSchemas,
    validSchemas,
    invalidSchemas,
    schemaTypes: [...new Set(schemaTypes)],
    status,
    issues,
    recommendation,
  };
}
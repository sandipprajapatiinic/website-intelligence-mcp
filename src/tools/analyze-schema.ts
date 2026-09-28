import * as cheerio from "cheerio";
import { fetchPage } from "../utils/fetch-page.js";
import { analyzeSchemaRules, type SchemaAnalysis } from "../seo/schema-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeSchema(
  url: string,
  prefetchedHtml?: string,
): Promise<AnalyzerResult<SchemaAnalysis>> {
  console.error(`Fetching website: ${url}`);

  const html = prefetchedHtml ?? (await fetchPage(url));

  console.error(`HTML received: ${html.length} characters`);

  const $ = cheerio.load(html);

  const schemas: unknown[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const content = $(element).html();

    if (!content?.trim()) {
      return;
    }

    try {
      const parsed = JSON.parse(content);

      if (Array.isArray(parsed)) {
        schemas.push(...parsed);
      } else {
        schemas.push(parsed);
      }
    } catch {
      schemas.push(null);
    }
  });

  const analysis = analyzeSchemaRules(schemas);

  return {
    url,
    ...analysis,
  };
}
import * as cheerio from "cheerio";
import { fetchPage } from "../utils/fetch-page.js";
import { analyzeCharsetRules, type CharsetAnalysis } from "../seo/charset-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeCharset(
  url: string,
  prefetchedHtml?: string,
): Promise<AnalyzerResult<CharsetAnalysis>> {
  console.error(`Fetching website: ${url}`);

  const html = prefetchedHtml ?? (await fetchPage(url));

  console.error(`HTML received: ${html.length} characters`);

  const $ = cheerio.load(html);

  let charset: string | null = null;

  const metaCharset = $("meta[charset]").first().attr("charset");

  if (metaCharset) {
    charset = metaCharset;
  } else {
    const contentTypeMeta = $(
      'meta[http-equiv="Content-Type"]',
    )
      .first()
      .attr("content");

    if (contentTypeMeta) {
      const match = contentTypeMeta.match(
        /charset\s*=\s*([^\s;]+)/i,
      );

      if (match?.[1]) {
        charset = match[1];
      }
    }
  }

  const analysis = analyzeCharsetRules(charset);

  return {
    url,
    ...analysis,
  };
}
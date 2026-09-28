import * as cheerio from "cheerio";
import { fetchPage } from "../utils/fetch-page.js";
import { analyzeLinkRules, type LinkAnalysis } from "../seo/link-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeLinks(
  url: string,
  prefetchedHtml?: string,
): Promise<AnalyzerResult<LinkAnalysis>> {
  console.error(`Fetching website: ${url}`);

  const html = prefetchedHtml ?? (await fetchPage(url));

  console.error(`HTML received: ${html.length} characters`);

  const $ = cheerio.load(html);

  const links = $("a[href]");

  const totalLinks = links.length;

  let internalLinks = 0;
  let externalLinks = 0;
  let linksWithoutText = 0;

  const baseUrl = new URL(url);

  links.each((_, element) => {
    const href = $(element).attr("href") ?? "";
    const text = $(element).text().trim();

    if (!text) {
      linksWithoutText++;
    }

    try {
      const linkUrl = new URL(href, baseUrl);

      if (linkUrl.hostname === baseUrl.hostname) {
        internalLinks++;
      } else {
        externalLinks++;
      }
    } catch {
      // Ignore invalid or non-URL href values.
    }
  });

  const analysis = analyzeLinkRules(
    totalLinks,
    internalLinks,
    externalLinks,
    linksWithoutText,
  );

  return {
    url,
    ...analysis,
  };
}
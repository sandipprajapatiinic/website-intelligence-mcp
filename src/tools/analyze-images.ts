import * as cheerio from "cheerio";
import { fetchPage } from "../utils/fetch-page.js";
import { analyzeImageRules, type ImageAnalysis } from "../seo/image-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeImages(
  url: string,
  prefetchedHtml?: string,
): Promise<AnalyzerResult<ImageAnalysis>> {
  console.error(`Fetching website: ${url}`);

  const html = prefetchedHtml ?? (await fetchPage(url));

  console.error(`HTML received: ${html.length} characters`);

  const $ = cheerio.load(html);

  const images = $("img");

  const missingAlt = images.filter((_, el) => {
  const alt = $(el).attr("alt");
  return alt === undefined || alt.trim() === "";
}).length;

console.error("Total images:", images.length);
console.error("Images missing/empty alt:", missingAlt);

  const totalImages = images.length;

  let imagesWithAlt = 0;

  images.each((_, element) => {
    const alt = $(element).attr("alt");

    if (alt !== undefined && alt.trim().length > 0) {
      imagesWithAlt++;
    }
  });

  const analysis = analyzeImageRules(
    totalImages,
    imagesWithAlt,
  );

  return {
    url,
    ...analysis,
  };
}
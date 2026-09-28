import * as cheerio from "cheerio";

export type ContentStatus =
  | "good"
  | "needs_improvement"
  | "poor";

export interface ContentAnalysis {
  title: string;
  wordCount: number;
  paragraphCount: number;
  headingsCount: number;
  h1Count: number;
  imagesCount: number;
  linksCount: number;
  status: ContentStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeContentRules(html: string): ContentAnalysis {
  const $ = cheerio.load(html);

  $("script, style, noscript").remove();

  const title = $("title").text().trim();
  const headings = $("h1, h2, h3, h4, h5, h6").toArray();
  const h1Count = $("h1").length;

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText
    ? bodyText.split(/\s+/).filter(Boolean).length
    : 0;

  const paragraphs = $("p").toArray();
  const paragraphCount = paragraphs.length;

  const images = $("img").length;
  const links = $("a").length;

  const issues: string[] = [];

  if (!title) {
    issues.push("Page is missing a title");
  }

  if (h1Count === 0) {
    issues.push("Page is missing an H1 heading");
  } else if (h1Count > 1) {
    issues.push(`Page has ${h1Count} H1 headings`);
  }

  if (wordCount < 100) {
    issues.push("Page has very little text content");
  }

  if (paragraphCount === 0 && wordCount > 0) {
    issues.push("Page has text content but no paragraph elements");
  }

  const status =
    issues.length === 0
      ? "good"
      : issues.length <= 2
        ? "needs_improvement"
        : "poor";

  return {
    title,
    wordCount,
    paragraphCount,
    headingsCount: headings.length,
    h1Count,
    imagesCount: images,
    linksCount: links,
    status,
    issues,
    recommendation:
      issues.length === 0
        ? "Basic content structure looks healthy."
        : "Improve page content structure, heading usage, and text depth.",
  };
}
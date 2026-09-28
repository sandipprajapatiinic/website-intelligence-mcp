import * as cheerio from "cheerio";

export type TechnicalStatus =
  | "good"
  | "needs_improvement"
  | "poor";

export interface TechnicalAnalysis {
  url: string;
  protocol: string | null;
  titlePresent: boolean;
  metaDescriptionPresent: boolean;
  canonicalPresent: boolean;
  langPresent: boolean;
  viewportPresent: boolean;
  h1Present: boolean;
  robotsMetaPresent: boolean;
  isHttps: boolean;
  status: TechnicalStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeTechnicalRules(html: string, url: string): TechnicalAnalysis {
  const $ = cheerio.load(html);

  const issues: string[] = [];

  const title = $("title").first().text().trim();
  const metaDescription = $('meta[name="description"]').attr("content")?.trim();
  const canonical = $('link[rel="canonical"]').attr("href")?.trim();
  const lang = $("html").attr("lang")?.trim();
  const viewport = $('meta[name="viewport"]').attr("content")?.trim();

  const hasH1 = $("h1").length > 0;
  const hasRobotsMeta = $('meta[name="robots"]').length > 0;

  let parsedUrl: URL | null = null;

  try {
    parsedUrl = new URL(url);
  } catch {
    issues.push("Invalid URL");
  }

  if (!title) {
    issues.push("Title tag is missing");
  }

  if (!metaDescription) {
    issues.push("Meta description is missing");
  }

  if (!canonical) {
    issues.push("Canonical URL is missing");
  }

  if (!lang) {
    issues.push("HTML lang attribute is missing");
  }

  if (!viewport) {
    issues.push("Viewport meta tag is missing");
  }

  if (!hasH1) {
    issues.push("H1 heading is missing");
  }

  if (!hasRobotsMeta) {
    issues.push("Robots meta directive is missing");
  }

  if (parsedUrl && parsedUrl.protocol !== "https:") {
    issues.push("Page is not using HTTPS");
  }

  const status =
    issues.length === 0
      ? "good"
      : issues.length >= 4
        ? "poor"
        : "needs_improvement";

  return {
    url,
    protocol: parsedUrl?.protocol ?? null,
    titlePresent: Boolean(title),
    metaDescriptionPresent: Boolean(metaDescription),
    canonicalPresent: Boolean(canonical),
    langPresent: Boolean(lang),
    viewportPresent: Boolean(viewport),
    h1Present: hasH1,
    robotsMetaPresent: hasRobotsMeta,
    isHttps: parsedUrl?.protocol === "https:",
    status,
    issues,
    recommendation:
      status === "good"
        ? "Basic technical SEO configuration looks healthy."
        : "Review the missing technical SEO elements and improve the page configuration.",
  };
}
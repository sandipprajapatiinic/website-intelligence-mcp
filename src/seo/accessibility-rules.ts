import * as cheerio from "cheerio";

export type AccessibilityStatus =
  | "good"
  | "needs_improvement"
  | "poor";

export interface AccessibilityAnalysis {
  imagesCount: number;
  imagesMissingAlt: number;
  linksCount: number;
  linksMissingText: number;
  buttonsCount: number;
  buttonsMissingText: number;
  formControlsCount: number;
  formControlsMissingLabel: number;
  status: AccessibilityStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeAccessibilityRules(html: string): AccessibilityAnalysis {
  const $ = cheerio.load(html);

  const images = $("img").toArray();
  const links = $("a").toArray();
  const buttons = $("button").toArray();
  const inputs = $("input, textarea, select").toArray();

  const imagesMissingAlt = images.filter(
    (el) => $(el).attr("alt") === undefined,
  ).length;

  const linksMissingText = links.filter(
    (el) => $(el).text().trim() === "" && !$(el).attr("aria-label"),
  ).length;

  const buttonsMissingText = buttons.filter(
    (el) => $(el).text().trim() === "" && !$(el).attr("aria-label"),
  ).length;

  const formControlsMissingLabel = inputs.filter((el) => {
    const id = $(el).attr("id");
    const ariaLabel = $(el).attr("aria-label");

    if (ariaLabel?.trim()) return false;

    if (!id) return true;

    return $(`label[for="${id}"]`).length === 0;
  }).length;

  const issues: string[] = [];

  if (imagesMissingAlt > 0) {
    issues.push(`${imagesMissingAlt} image(s) are missing alt attributes`);
  }

  if (linksMissingText > 0) {
    issues.push(`${linksMissingText} link(s) have no accessible text`);
  }

  if (buttonsMissingText > 0) {
    issues.push(`${buttonsMissingText} button(s) have no accessible text`);
  }

  if (formControlsMissingLabel > 0) {
    issues.push(
      `${formControlsMissingLabel} form control(s) may be missing accessible labels`,
    );
  }

  const status =
    issues.length === 0
      ? "good"
      : issues.length <= 2
        ? "needs_improvement"
        : "poor";

  return {
    imagesCount: images.length,
    imagesMissingAlt,
    linksCount: links.length,
    linksMissingText,
    buttonsCount: buttons.length,
    buttonsMissingText,
    formControlsCount: inputs.length,
    formControlsMissingLabel,
    status,
    issues,
    recommendation:
      issues.length === 0
        ? "Basic accessibility checks passed."
        : "Add missing alternative text, accessible names, and form labels.",
  };
}
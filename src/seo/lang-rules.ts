export type LangStatus =
  | "good"
  | "missing"
  | "invalid";

export interface LangAnalysis {
  lang: string | null;
  hasLang: boolean;
  status: LangStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeLangRules(
  lang: string,
): LangAnalysis {
  const cleanLang = lang.trim();

  if (!cleanLang) {
    return {
      lang: null,
      hasLang: false,
      status: "missing",
      issues: ["HTML element is missing a lang attribute"],
      recommendation:
        "Add a valid language code to the HTML lang attribute.",
    };
  }

  // Basic BCP 47-style validation.
  // Examples: en, en-US, fr, hi-IN
  const langPattern =
    /^[a-zA-Z]{2,3}(?:-[a-zA-Z]{2,4})?$/;

  if (!langPattern.test(cleanLang)) {
    return {
      lang: cleanLang,
      hasLang: true,
      status: "invalid",
      issues: ["HTML lang attribute does not appear to be valid"],
      recommendation:
        "Use a valid language code such as en, en-US, hi, or hi-IN.",
    };
  }

  return {
    lang: cleanLang,
    hasLang: true,
    status: "good",
    issues: [],
    recommendation:
      "HTML lang attribute is present and appears valid.",
  };
}
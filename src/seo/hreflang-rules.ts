export type HreflangStatus =
  | "good"
  | "missing"
  | "needs_improvement";

export interface HreflangEntry {
  lang: string;
  href: string;
}

export interface HreflangAnalysis {
  entries: HreflangEntry[];
  count: number;
  hasHreflang: boolean;
  status: HreflangStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeHreflangRules(
  entries: HreflangEntry[],
): HreflangAnalysis {
  if (entries.length === 0) {
    return {
      entries: [],
      count: 0,
      hasHreflang: false,
      status: "missing",
      issues: ["Page does not contain hreflang declarations"],
      recommendation:
        "Add hreflang annotations when the page has language or regional variants.",
    };
  }

  const issues: string[] = [];
  const seenLanguages = new Set<string>();

  for (const entry of entries) {
    const lang = entry.lang.trim().toLowerCase();
    const href = entry.href.trim();

    if (!lang) {
      issues.push("A hreflang declaration is missing its language code");
      continue;
    }

    if (!href) {
      issues.push(`Hreflang "${lang}" is missing its href`);
    }

    if (seenLanguages.has(lang)) {
      issues.push(`Duplicate hreflang language: ${lang}`);
    }

    seenLanguages.add(lang);
  }

  if (issues.length > 0) {
    return {
      entries,
      count: entries.length,
      hasHreflang: true,
      status: "needs_improvement",
      issues,
      recommendation:
        "Use unique, valid hreflang language-region codes with valid URLs.",
    };
  }

  return {
    entries,
    count: entries.length,
    hasHreflang: true,
    status: "good",
    issues: [],
    recommendation:
      "Hreflang declarations are present with unique language codes and URLs.",
  };
}
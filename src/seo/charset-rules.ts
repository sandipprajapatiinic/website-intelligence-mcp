export type CharsetStatus =
  | "good"
  | "missing"
  | "needs_improvement";

export interface CharsetAnalysis {
  charset: string | null;
  hasCharset: boolean;
  isUtf8: boolean;
  status: CharsetStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeCharsetRules(
  charset: string | null,
): CharsetAnalysis {
  const normalizedCharset = charset?.trim().toLowerCase() || null;

  if (!normalizedCharset) {
    return {
      charset: null,
      hasCharset: false,
      isUtf8: false,
      status: "missing",
      issues: ["Page is missing a character encoding declaration"],
      recommendation:
        "Add a UTF-8 charset declaration to the page.",
    };
  }

  const isUtf8 =
    normalizedCharset === "utf-8" ||
    normalizedCharset === "utf8";

  if (!isUtf8) {
    return {
      charset: normalizedCharset,
      hasCharset: true,
      isUtf8: false,
      status: "needs_improvement",
      issues: [
        `Page uses "${normalizedCharset}" instead of UTF-8`,
      ],
      recommendation:
        "Use UTF-8 character encoding for modern web pages.",
    };
  }

  return {
    charset: normalizedCharset,
    hasCharset: true,
    isUtf8: true,
    status: "good",
    issues: [],
    recommendation:
      "Page declares UTF-8 character encoding.",
  };
}
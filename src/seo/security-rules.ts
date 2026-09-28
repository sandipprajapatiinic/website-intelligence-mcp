export type SecurityStatus =
  | "good"
  | "needs_improvement"
  | "poor";

export interface SecurityAnalysis {
  isHttps: boolean;
  hasContentSecurityPolicy: boolean;
  hasXContentTypeOptions: boolean;
  hasXFrameOptions: boolean;
  hasReferrerPolicy: boolean;
  status: SecurityStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeSecurityRules(
  isHttps: boolean,
  headers: Headers,
): SecurityAnalysis {
  const hasContentSecurityPolicy =
    headers.has("content-security-policy");

  const hasXContentTypeOptions =
    headers.has("x-content-type-options");

  const hasXFrameOptions =
    headers.has("x-frame-options");

  const hasReferrerPolicy =
    headers.has("referrer-policy");

  const issues: string[] = [];

  if (!isHttps) {
    issues.push("Page is not served over HTTPS");
  }

  if (!hasContentSecurityPolicy) {
    issues.push("Content-Security-Policy header is missing");
  }

  if (!hasXContentTypeOptions) {
    issues.push("X-Content-Type-Options header is missing");
  }

  if (!hasXFrameOptions) {
    issues.push("X-Frame-Options header is missing");
  }

  if (!hasReferrerPolicy) {
    issues.push("Referrer-Policy header is missing");
  }

  let status: SecurityStatus;

  if (!isHttps) {
    status = "poor";
  } else if (issues.length > 2) {
    status = "needs_improvement";
  } else {
    status = "good";
  }

  let recommendation =
    "Basic HTTPS and security headers are configured.";

  if (status === "needs_improvement") {
    recommendation =
      "Add the missing security headers and review the site's security policy.";
  }

  if (status === "poor") {
    recommendation =
      "Serve the website over HTTPS and configure appropriate security headers.";
  }

  return {
    isHttps,
    hasContentSecurityPolicy,
    hasXContentTypeOptions,
    hasXFrameOptions,
    hasReferrerPolicy,
    status,
    issues,
    recommendation,
  };
}
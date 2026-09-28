export type SslStatus =
  | "good"
  | "needs_improvement";

export interface SslAnalysis {
  protocol: string;
  isHttps: boolean;
  status: SslStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeSslRules(
  protocol: string,
): SslAnalysis {
  const normalizedProtocol = protocol.trim().toLowerCase();

  const isHttps = normalizedProtocol === "https:";

  if (!isHttps) {
    return {
      protocol: normalizedProtocol,
      isHttps: false,
      status: "needs_improvement",
      issues: ["Page is not using HTTPS"],
      recommendation:
        "Serve the website over HTTPS to protect connections and improve security.",
    };
  }

  return {
    protocol: normalizedProtocol,
    isHttps: true,
    status: "good",
    issues: [],
    recommendation:
      "Page is served over HTTPS.",
  };
}
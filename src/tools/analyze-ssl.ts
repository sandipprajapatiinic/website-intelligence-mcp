import { analyzeSslRules, type SslAnalysis } from "../seo/ssl-rules.js";
import type { AnalyzerResult } from "../types/analyzer-result.js";

export async function analyzeSsl(url: string): Promise<AnalyzerResult<SslAnalysis>> {
  console.error(`Analyzing SSL for: ${url}`);

  let protocol: string;

  try {
    protocol = new URL(url).protocol;
  } catch {
    return {
      url,
      protocol: "",
      isHttps: false,
      status: "needs_improvement" as const,
      issues: ["Invalid URL"],
      recommendation: "Provide a valid webpage URL.",
    };
  }

  const analysis = analyzeSslRules(protocol);

  return {
    url,
    ...analysis,
  };
}
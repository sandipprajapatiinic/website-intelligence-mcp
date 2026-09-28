// Shared result types for the analyzer tools and analyze_website.
//
// Types only: they describe the JSON the tools already return and add no runtime code.

// Fields every analyzer result has, whatever the analyzer.
export interface AnalyzerResultBase<Status extends string = string> {
  url: string;
  // Each analyzer keeps its own status values (for example "good", "missing", "critical").
  status: Status;
  issues: string[];
  recommendation: string;
}

// What an analyzer's rules must produce: the common fields other than url, which the analyzer adds.
export type AnalysisFields = Omit<AnalyzerResultBase, "url">;

// An analyzer result: url plus the analysis, which must include status, issues and recommendation.
// Analyzer-specific fields and each analyzer's own status union are kept as they are, so the result
// stays fully typed (for example AnalyzerResult<TitleAnalysis>["status"] is TitleStatus).
// "error" is reserved for AnalyzerErrorResult: an analysis whose status can be "error" becomes never.
export type AnalyzerResult<Analysis extends AnalysisFields> =
  "error" extends Analysis["status"] ? never : { url: string } & Analysis;

// The section analyze_website returns in place of a result when an analyzer throws.
export interface AnalyzerErrorResult {
  url: string;
  status: "error";
  error: string;
}

// One section of an analyze_website result.
export type AnalyzerSection<Result extends AnalyzerResultBase> = Result | AnalyzerErrorResult;

// The analyze_website result: analyses maps each section name to its result or error section.
export interface WebsiteAnalysisResult<
  Analyses extends Record<string, AnalyzerResultBase | AnalyzerErrorResult>,
> {
  url: string;
  status: "completed" | "completed_with_errors";
  // Present only when status is "completed_with_errors": the names of the sections that failed.
  failedAnalyzers?: string[];
  analyses: Analyses;
}

// Checks for the shared result types in src/types/analyzer-result.ts.
// Most checks are compile-time (npm run typecheck fails if they break); the test records that they ran.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { AnalyzerErrorResult, AnalyzerResult, AnalyzerResultBase } from "../src/types/analyzer-result.js";
import type { TitleAnalysis, TitleStatus } from "../src/seo/title-rules.js";
import type { TechnicalStatus } from "../src/seo/technical-rules.js";
import type { analyzeTechnical } from "../src/tools/analyze-technical.js";
import type { analyzePerformance } from "../src/tools/analyze-performance.js";
import type { analyzeWebsite } from "../src/tools/analyze-website/analyze-website.js";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Result<F extends (...args: never[]) => Promise<unknown>> = Awaited<ReturnType<F>>;
type Website = Result<typeof analyzeWebsite>;

// Each analyzer keeps its own status union instead of widening to string.
const titleStatus: Equal<AnalyzerResult<TitleAnalysis>["status"], TitleStatus> = true;
const technicalStatus: Equal<Result<typeof analyzeTechnical>["status"], TechnicalStatus> = true;

// Analyzer-specific fields stay typed.
const statusCode: Equal<Result<typeof analyzePerformance>["statusCode"], number> = true;

// analyze_website's status and error sections are typed.
const websiteStatus: Equal<Website["status"], "completed" | "completed_with_errors"> = true;
const titleSection: Equal<Website["analyses"]["title"], AnalyzerResult<TitleAnalysis> | AnalyzerErrorResult> = true;

// Every result is assignable to the common base.
const base: AnalyzerResultBase = {} as Result<typeof analyzePerformance>;

// @ts-expect-error An analysis without issues is not an analyzer result.
type MissingIssues = AnalyzerResult<{ status: "good"; recommendation: string }>;

// "error" is reserved for analyze_website error sections.
type ReportsError = AnalyzerResult<{ status: "good" | "error"; issues: string[]; recommendation: string }>;
const reservedError: Equal<ReportsError, never> = true;

test("shared result types preserve statuses and fields, and reject invalid analyses", () => {
  assert.deepEqual(
    [titleStatus, technicalStatus, statusCode, websiteStatus, titleSection, reservedError],
    [true, true, true, true, true, true],
  );
  assert.ok(base !== undefined);
});

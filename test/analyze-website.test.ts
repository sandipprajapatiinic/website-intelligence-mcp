import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setUpTestNetwork, type StubServer } from "./helpers/network.js";
import { SECTION_KEYS } from "./helpers/expected.js";
import { RICH_HTML } from "./helpers/fixtures.js";
import { analyzeWebsite } from "../src/tools/analyze-website/analyze-website.js";
import { analyzeTitle } from "../src/tools/analyze-title.js";
import { analyzeSecurity } from "../src/tools/analyze-security.js";
import { analyzeTechnical } from "../src/tools/analyze-technical.js";
import { analyzeMeta } from "../src/tools/analyze-meta.js";
import { analyzeHeadings } from "../src/tools/analyze-headings.js";
import { analyzeImages } from "../src/tools/analyze-images.js";
import { analyzeLinks } from "../src/tools/analyze-links.js";
import { analyzeCanonical } from "../src/tools/analyze-canonical.js";
import { analyzeRobots } from "../src/tools/analyze-robots.js";
import { analyzeOpenGraph } from "../src/tools/analyze-open-graph.js";
import { analyzeSchema } from "../src/tools/analyze-schema.js";
import { analyzeViewport } from "../src/tools/analyze-viewport.js";
import { analyzeLang } from "../src/tools/analyze-lang.js";
import { analyzeFavicon } from "../src/tools/analyze-favicon.js";
import { analyzeHreflang } from "../src/tools/analyze-hreflang.js";
import { analyzeCharset } from "../src/tools/analyze-charset.js";
import { analyzeSsl } from "../src/tools/analyze-ssl.js";
import { analyzeSitemap } from "../src/tools/analyze-sitemap.js";
import { analyzeRobotsTxt } from "../src/tools/analyze-robots-txt.js";
import { analyzePerformance } from "../src/tools/analyze-performance.js";
import { analyzeSocial } from "../src/tools/analyze-social.js";
import { analyzeMobile } from "../src/tools/analyze-mobile.js";
import { analyzeTechnology } from "../src/tools/analyze-technology.js";
import { analyzeAccessibility } from "../src/tools/analyze-accessibility.js";
import { analyzeContent } from "../src/tools/analyze-content.js";
import { analyzeStructuredData } from "../src/tools/analyze-structured-data.js";
import type {
  AnalyzerErrorResult,
  AnalyzerResultBase,
  WebsiteAnalysisResult,
} from "../src/types/analyzer-result.js";


// Sections that need the page HTML from the shared fetch.
const HTML_SECTIONS = SECTION_KEYS.filter(
  (key) => !["ssl", "robotsTxt", "performance", "security", "technology"].includes(key),
);

// Results are checked as the JSON MCP clients receive, typed with the shared result types.
type Section = (AnalyzerResultBase | AnalyzerErrorResult) & { [field: string]: unknown };
type WebsiteResult = WebsiteAnalysisResult<Record<string, Section>>;

const asJson = <T = WebsiteResult>(value: unknown): T => JSON.parse(JSON.stringify(value));

// Response times differ between requests; every other field must match exactly.
const withoutTiming = (value: unknown) => JSON.stringify(value).replace(/"responseTimeMs":\d+/g, '"responseTimeMs":0');

// Each section's analyzer, called directly (as its MCP tool does).
const DIRECT: Record<string, (url: string) => Promise<unknown>> = {
  title: analyzeTitle, meta: analyzeMeta, headings: analyzeHeadings, images: analyzeImages, links: analyzeLinks,
  canonical: analyzeCanonical, robots: analyzeRobots, openGraph: analyzeOpenGraph, schema: analyzeSchema,
  viewport: analyzeViewport, lang: analyzeLang, favicon: analyzeFavicon, hreflang: analyzeHreflang,
  charset: analyzeCharset, ssl: analyzeSsl, sitemap: analyzeSitemap, robotsTxt: analyzeRobotsTxt,
  performance: analyzePerformance, security: analyzeSecurity, social: analyzeSocial, mobile: analyzeMobile,
  technology: analyzeTechnology, accessibility: analyzeAccessibility, content: analyzeContent,
  structuredData: analyzeStructuredData, technical: analyzeTechnical,
};

const pageRequests = () => stub.requests.filter((r) => r.path !== "/robots.txt" && r.path !== "/sitemap.xml");

let stub: StubServer;

before(async () => {
  stub = await setUpTestNetwork();
});

after(() => stub.close());

beforeEach(() => stub.reset());

describe("analyze_website success", () => {
  let raw: Awaited<ReturnType<typeof analyzeWebsite>>;
  let result: WebsiteResult;

  before(async () => {
    stub.reset();
    raw = await analyzeWebsite("https://site.test/");
    result = asJson(raw);
  });

  test("reports completed with the requested URL and no failures", () => {
    assert.equal(result.status, "completed");
    assert.equal(result.url, "https://site.test/");
    assert.equal(result.failedAnalyzers, undefined);
  });

  test("contains all 26 sections in order, each a result for the same URL", () => {
    assert.deepEqual(Object.keys(result.analyses), SECTION_KEYS);

    for (const key of SECTION_KEYS) {
      const section = result.analyses[key];
      assert.ok(section && typeof section === "object", `${key} is missing`);
      assert.equal(section.url, "https://site.test/", key);
      assert.notEqual(section.status, "error", `${key}: ${section.error}`);
      assert.ok(Array.isArray(section.issues), `${key}.issues`);
    }
  });

  test("every section is byte-for-byte the output of calling its analyzer directly", async () => {
    assert.deepEqual(Object.keys(DIRECT), SECTION_KEYS);

    for (const key of SECTION_KEYS) {
      const section = raw.analyses[key as keyof typeof raw.analyses];
      assert.equal(withoutTiming(section), withoutTiming(await DIRECT[key]("https://site.test/")), key);
    }
  });

  test("performance reports the shared page request", () => {
    const performance = result.analyses.performance;
    assert.equal(performance.statusCode, 200);
    assert.equal(performance.htmlSizeBytes, Buffer.byteLength(RICH_HTML));
    assert.ok(Number.isInteger(performance.responseTimeMs) && Number(performance.responseTimeMs) >= 0);
  });

  test("is valid JSON", () => {
    assert.deepEqual(asJson(raw), raw);
  });

  test("every section has the standardized common fields", () => {
    for (const key of SECTION_KEYS) {
      const section = result.analyses[key] as AnalyzerResultBase;
      assert.equal(typeof section.url, "string", key);
      assert.equal(typeof section.status, "string", key);
      assert.ok(Array.isArray(section.issues), key);
      assert.equal(typeof section.recommendation, "string", key);
    }
  });

  test("the top-level result has exactly url, status and analyses", () => {
    assert.deepEqual(Object.keys(result), ["url", "status", "analyses"]);
  });
});

describe("analyze_website network usage", () => {
  test("fetches the main page once and makes 3 requests in total", async () => {
    await analyzeWebsite("https://site.test/");

    // The shared page fetch, robots.txt, and the sitemap HEAD request (previously 6: performance,
    // security and technology each requested the page again).
    assert.deepEqual(stub.requests.map((r) => `${r.method} ${r.path}`).sort(), [
      "GET /",
      "GET /robots.txt",
      "HEAD /sitemap.xml",
    ]);
  });

  test("security and technology use the final response after a redirect", async () => {
    const result = asJson(await analyzeWebsite("https://site.test/redirect"));

    assert.equal(result.analyses.security.hasXFrameOptions, true);
    assert.deepEqual(result.analyses.technology.technologies, ["WordPress 6.5", "PHP/8.2", "WordPress"]);
    assert.deepEqual(pageRequests().map((r) => r.path), ["/redirect", "/"]);
  });

  test("a server that answers the page only once still gets a full analysis", async () => {
    // /flaky drops every connection after the first page request.
    const result = asJson(await analyzeWebsite("https://site.test/flaky"));

    assert.equal(result.status, "completed");
    assert.equal(result.failedAnalyzers, undefined);
    assert.equal(pageRequests().length, 1);
  });

  test("nothing is shared between calls", async () => {
    // Concurrent calls for different sites each fetch and analyze their own page.
    const [rich, bare] = (await Promise.all([
      analyzeWebsite("https://site.test/"),
      analyzeWebsite("https://bare.test/"),
    ])).map((r) => asJson(r));

    assert.equal(rich.analyses.title.title, "Stub Site Home Page for Automated Testing");
    assert.equal(bare.analyses.title.title, null);
    assert.deepEqual(pageRequests().map((r) => r.host).sort(), ["bare.test", "site.test"]);

    // A repeated call for the same URL fetches the page again (no caching).
    stub.reset();
    await analyzeWebsite("https://site.test/");
    await analyzeWebsite("https://site.test/");
    assert.equal(pageRequests().length, 2);
  });
});

describe("analyze_website partial errors", () => {
  test("a failing analyzer becomes an error section while the others complete", async () => {
    // /json-then-drop answers the shared fetch with JSON, so the HTML analyzers report it and
    // performance, security and technology make their own requests, which are dropped and throw.
    const result = asJson(await analyzeWebsite("https://site.test/json-then-drop"));
    const thrown = ["performance", "security", "technology"];

    assert.equal(result.status, "completed_with_errors");
    assert.deepEqual(result.failedAnalyzers, SECTION_KEYS.filter((key) => key !== "ssl" && key !== "robotsTxt"));
    assert.deepEqual(Object.keys(result.analyses), SECTION_KEYS);

    for (const key of thrown) {
      const section = result.analyses[key];
      assert.deepEqual(Object.keys(section).sort(), ["error", "status", "url"]);
      assert.equal(section.url, "https://site.test/json-then-drop");
      assert.equal(section.status, "error");
      assert.equal(typeof section.error, "string");
      assert.ok(String(section.error).length > 0);
    }

    assert.notEqual(result.analyses.security.error, result.analyses.title.error);
    assert.equal(result.analyses.ssl.status, "good");
    assert.equal(result.analyses.robotsTxt.status, "good");
  });

  test("when the shared page fetch fails, HTML sections report it and the rest still run", async () => {
    const result = asJson(await analyzeWebsite("https://site.test/json"));

    assert.equal(result.status, "completed_with_errors");
    assert.deepEqual(result.failedAnalyzers, HTML_SECTIONS);

    for (const key of HTML_SECTIONS) {
      assert.deepEqual(result.analyses[key], {
        url: "https://site.test/json",
        status: "error",
        error: "Page could not be fetched: Website did not return HTML content",
      });
    }

    for (const key of ["ssl", "robotsTxt", "performance", "security", "technology"]) {
      assert.notEqual(result.analyses[key].status, "error", key);
    }

    // The HTML analyzers don't retry the failed page fetch; performance, security and technology
    // make their own request because they accept non-HTML responses.
    assert.equal(stub.requests.filter((r) => r.path === "/json").length, 4);
    assert.equal(result.analyses.performance.statusCode, 200);
  });

  test("rejects unsafe URLs before any analyzer makes a request", async () => {
    for (const url of [
      "not a url",
      "http://localhost/",
      `http://127.0.0.1:${stub.port}/`,
      "http://169.254.169.254/",
      "http://private.test/",
      "https://user:pass@site.test/",
      "ftp://site.test/",
      "https://does-not-exist.invalid/",
    ]) {
      await assert.rejects(analyzeWebsite(url), Error, url);
    }

    assert.equal(stub.requests.length, 0);
  });
});

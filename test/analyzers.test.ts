import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setUpTestNetwork, type StubServer } from "./helpers/network.js";
import { RICH_HTML } from "./helpers/fixtures.js";
import type { AnalyzerResultBase } from "../src/types/analyzer-result.js";
import { fetchPageDetails } from "../src/utils/fetch-page.js";
import { analyzeTitle } from "../src/tools/analyze-title.js";
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
import { analyzeSecurity } from "../src/tools/analyze-security.js";
import { analyzeSocial } from "../src/tools/analyze-social.js";
import { analyzeMobile } from "../src/tools/analyze-mobile.js";
import { analyzeTechnology } from "../src/tools/analyze-technology.js";
import { analyzeAccessibility } from "../src/tools/analyze-accessibility.js";
import { analyzeContent } from "../src/tools/analyze-content.js";
import { analyzeStructuredData } from "../src/tools/analyze-structured-data.js";
import { analyzeTechnical } from "../src/tools/analyze-technical.js";

const RICH = "https://site.test/";
const BARE = "https://bare.test/";

// Called with just the URL, as its MCP tool calls it.
type Analyzer = (url: string) => Promise<AnalyzerResultBase>;
// Analyzers with acceptsHtml also take the pre-fetched page HTML.
type HtmlAnalyzer = (url: string, prefetchedHtml: string) => Promise<AnalyzerResultBase>;

type Case = {
  name: string;
  fn: Analyzer;
  // Accepts pre-fetched HTML (used by analyze_website to share one page fetch).
  acceptsHtml: boolean;
  rich: Record<string, unknown>;
  bare: Record<string, unknown>;
};

const CASES: Case[] = [
  {
    name: "title",
    fn: analyzeTitle,
    acceptsHtml: true,
    rich: { title: "Stub Site Home Page for Automated Testing", length: 41, hasTitle: true, status: "good", issues: [] },
    bare: { title: null, length: 0, hasTitle: false, status: "critical", issues: ["Page is missing a title tag"] },
  },
  {
    name: "meta",
    fn: analyzeMeta,
    acceptsHtml: true,
    rich: { length: 129, hasDescription: true, status: "good", issues: [] },
    bare: { description: null, hasDescription: false, status: "missing" },
  },
  {
    name: "headings",
    fn: analyzeHeadings,
    acceptsHtml: true,
    rich: { h1Count: 1, h2Count: 2, h3Count: 1, status: "good", issues: [] },
    bare: { h1Count: 0, h2Count: 0, h3Count: 0, status: "critical", issues: ["Page is missing an H1 heading"] },
  },
  {
    name: "images",
    fn: analyzeImages,
    acceptsHtml: true,
    rich: { totalImages: 2, imagesWithAlt: 1, imagesWithoutAlt: 1, altPercentage: 50, status: "needs_improvement" },
    bare: { totalImages: 0, imagesWithoutAlt: 0, status: "good", issues: [] },
  },
  {
    name: "links",
    fn: analyzeLinks,
    acceptsHtml: true,
    rich: { totalLinks: 3, internalLinks: 2, externalLinks: 1, linksWithoutText: 1, status: "needs_improvement" },
    bare: { totalLinks: 0, status: "critical", issues: ["Page contains no links"] },
  },
  {
    name: "canonical",
    fn: analyzeCanonical,
    acceptsHtml: true,
    rich: { canonical: "https://site.test/", canonicalCount: 1, hasCanonical: true, status: "good" },
    bare: { canonical: null, canonicalCount: 0, hasCanonical: false, status: "missing" },
  },
  {
    name: "robots",
    fn: analyzeRobots,
    acceptsHtml: true,
    rich: { content: "index, follow", hasRobotsMeta: true, status: "good" },
    bare: { content: null, hasRobotsMeta: false, status: "missing" },
  },
  {
    name: "openGraph",
    fn: analyzeOpenGraph,
    acceptsHtml: true,
    rich: {
      title: "Stub Site",
      description: "Stub Open Graph description",
      image: "https://site.test/og.png",
      ogUrl: "https://site.test/",
      presentTags: 4,
      missingTags: [],
      status: "good",
    },
    bare: { presentTags: 0, missingTags: ["og:title", "og:description", "og:image", "og:url"], status: "missing" },
  },
  {
    name: "schema",
    fn: analyzeSchema,
    acceptsHtml: true,
    rich: { totalSchemas: 1, validSchemas: 1, invalidSchemas: 0, schemaTypes: ["Organization"], status: "good" },
    bare: { totalSchemas: 0, schemaTypes: [], status: "missing" },
  },
  {
    name: "viewport",
    fn: analyzeViewport,
    acceptsHtml: true,
    rich: { content: "width=device-width, initial-scale=1", hasViewport: true, status: "good" },
    bare: { content: null, hasViewport: false, status: "missing" },
  },
  {
    name: "lang",
    fn: analyzeLang,
    acceptsHtml: true,
    rich: { lang: "en", hasLang: true, status: "good" },
    bare: { lang: null, hasLang: false, status: "missing" },
  },
  {
    name: "favicon",
    fn: analyzeFavicon,
    acceptsHtml: true,
    rich: { favicon: "/favicon.ico", faviconCount: 1, hasFavicon: true, status: "good" },
    bare: { favicon: null, faviconCount: 0, hasFavicon: false, status: "missing" },
  },
  {
    name: "hreflang",
    fn: analyzeHreflang,
    acceptsHtml: true,
    rich: {
      entries: [
        { lang: "en", href: "https://site.test/" },
        { lang: "fr", href: "https://site.test/fr/" },
        { lang: "x-default", href: "https://site.test/" },
      ],
      count: 3,
      status: "good",
    },
    bare: { entries: [], count: 0, hasHreflang: false, status: "missing" },
  },
  {
    name: "charset",
    fn: analyzeCharset,
    acceptsHtml: true,
    rich: { charset: "utf-8", hasCharset: true, isUtf8: true, status: "good" },
    bare: { charset: null, hasCharset: false, status: "missing" },
  },
  {
    name: "ssl",
    fn: analyzeSsl,
    acceptsHtml: false,
    rich: { protocol: "https:", isHttps: true, status: "good" },
    bare: { protocol: "https:", isHttps: true, status: "good" },
  },
  {
    name: "sitemap",
    fn: analyzeSitemap,
    acceptsHtml: true,
    rich: { sitemapUrl: "https://site.test/sitemap.xml", hasSitemap: true, status: "good" },
    bare: { sitemapUrl: null, hasSitemap: false, status: "missing" },
  },
  {
    name: "robotsTxt",
    fn: analyzeRobotsTxt,
    acceptsHtml: false,
    rich: { robotsTxtUrl: "https://site.test/robots.txt", hasRobotsTxt: true, isValid: true, status: "good" },
    bare: { robotsTxtUrl: null, hasRobotsTxt: false, status: "missing" },
  },
  {
    name: "performance",
    fn: analyzePerformance,
    acceptsHtml: false,
    rich: { statusCode: 200, htmlSizeBytes: Buffer.byteLength(RICH_HTML), status: "good" },
    bare: { statusCode: 200, status: "good" },
  },
  {
    name: "security",
    fn: analyzeSecurity,
    acceptsHtml: false,
    rich: {
      isHttps: true,
      hasContentSecurityPolicy: true,
      hasXContentTypeOptions: true,
      hasXFrameOptions: true,
      hasReferrerPolicy: true,
      status: "good",
    },
    bare: { isHttps: true, status: "good" },
  },
  {
    name: "social",
    fn: analyzeSocial,
    acceptsHtml: true,
    rich: { hasOpenGraph: true, hasTwitterCard: true, twitterCard: "summary_large_image", status: "good" },
    bare: { hasOpenGraph: false, hasTwitterCard: false, twitterCard: null, status: "poor" },
  },
  {
    name: "mobile",
    fn: analyzeMobile,
    acceptsHtml: true,
    rich: { hasViewport: true, hasResponsiveViewport: true, hasFixedWidth: false, status: "good" },
    bare: { hasViewport: false, viewport: null, status: "poor" },
  },
  {
    name: "technology",
    fn: analyzeTechnology,
    acceptsHtml: false,
    rich: { technologies: ["WordPress 6.5", "PHP/8.2", "WordPress"], detectedCount: 3, status: "good" },
    bare: { technologies: ["PHP/8.2"], detectedCount: 1 },
  },
  {
    name: "accessibility",
    fn: analyzeAccessibility,
    acceptsHtml: true,
    rich: {
      imagesMissingAlt: 1,
      linksMissingText: 1,
      buttonsCount: 2,
      buttonsMissingText: 1,
      formControlsCount: 2,
      formControlsMissingLabel: 1,
      status: "poor",
    },
    bare: { imagesCount: 0, linksCount: 0, buttonsCount: 0, formControlsCount: 0, status: "good", issues: [] },
  },
  {
    name: "content",
    fn: analyzeContent,
    acceptsHtml: true,
    rich: { wordCount: 40, paragraphCount: 2, headingsCount: 4, h1Count: 1, imagesCount: 2, linksCount: 3 },
    bare: { wordCount: 0, paragraphCount: 0, h1Count: 0, status: "poor" },
  },
  {
    name: "structuredData",
    fn: analyzeStructuredData,
    acceptsHtml: true,
    rich: { jsonLdCount: 1, schemaCount: 1, schemaTypes: ["Organization"], status: "good" },
    bare: { jsonLdCount: 0, schemaCount: 0, status: "needs_improvement" },
  },
  {
    name: "technical",
    fn: analyzeTechnical,
    acceptsHtml: true,
    rich: { titlePresent: true, canonicalPresent: true, h1Present: true, isHttps: true, status: "good", issues: [] },
    bare: { titlePresent: false, metaDescriptionPresent: false, h1Present: false, status: "poor" },
  },
];

let stub: StubServer;

before(async () => {
  stub = await setUpTestNetwork();
});

after(() => stub.close());

beforeEach(() => stub.reset());

function assertFields(actual: object, expected: Record<string, unknown>) {
  for (const [key, value] of Object.entries(expected)) {
    assert.deepEqual((actual as Record<string, unknown>)[key], value, `field "${key}"`);
  }
}

// The standardized common fields: url first, then analyzer-specific fields, then status, issues, recommendation.
function assertCommonShape(result: AnalyzerResultBase, url: string) {
  const keys = Object.keys(result);

  assert.equal(result.url, url);
  assert.equal(keys[0], "url", "url is the first field");
  assert.deepEqual(keys.slice(-3), ["status", "issues", "recommendation"], "common fields come last");
  assert.equal(typeof result.status, "string");
  assert.ok(result.status.length > 0, "status is not empty");
  assert.notEqual(result.status, "error", '"error" is reserved for analyze_website failures');
  assert.ok(Array.isArray(result.issues), "issues must be an array");
  assert.ok(result.issues.every((issue) => typeof issue === "string" && issue.length > 0), "issues are strings");
  assert.equal(typeof result.recommendation, "string");
  assert.ok(result.recommendation.length > 0, "recommendation is not empty");
  // Output is sent over MCP as JSON, so it must survive a round trip unchanged.
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
}

test("covers all 26 analyzers", () => {
  assert.equal(CASES.length, 26);
});

// Field names and order of each analyzer's JSON output, as they were before the shared result type was introduced.
// A change here breaks backward compatibility for MCP clients.
const FIELD_ORDER: Record<string, string[]> = {
  title: ["url", "title", "length", "hasTitle", "status", "issues", "recommendation"],
  meta: ["url", "description", "length", "hasDescription", "status", "issues", "recommendation"],
  headings: ["url", "h1Count", "h2Count", "h3Count", "status", "issues", "recommendation"],
  images: ["url", "totalImages", "imagesWithAlt", "imagesWithoutAlt", "altPercentage", "status", "issues", "recommendation"],
  links: ["url", "totalLinks", "internalLinks", "externalLinks", "linksWithoutText", "status", "issues", "recommendation"],
  canonical: ["url", "canonical", "canonicalCount", "hasCanonical", "status", "issues", "recommendation"],
  robots: ["url", "content", "hasRobotsMeta", "status", "issues", "recommendation"],
  openGraph: ["url", "title", "description", "image", "ogUrl", "presentTags", "missingTags", "status", "issues", "recommendation"],
  schema: ["url", "totalSchemas", "validSchemas", "invalidSchemas", "schemaTypes", "status", "issues", "recommendation"],
  viewport: ["url", "content", "hasViewport", "status", "issues", "recommendation"],
  lang: ["url", "lang", "hasLang", "status", "issues", "recommendation"],
  favicon: ["url", "favicon", "faviconCount", "hasFavicon", "status", "issues", "recommendation"],
  hreflang: ["url", "entries", "count", "hasHreflang", "status", "issues", "recommendation"],
  charset: ["url", "charset", "hasCharset", "isUtf8", "status", "issues", "recommendation"],
  ssl: ["url", "protocol", "isHttps", "status", "issues", "recommendation"],
  sitemap: ["url", "sitemapUrl", "hasSitemap", "isValidUrl", "status", "issues", "recommendation"],
  robotsTxt: ["url", "robotsTxtUrl", "hasRobotsTxt", "isValid", "status", "issues", "recommendation"],
  performance: ["url", "statusCode", "responseTimeMs", "htmlSizeBytes", "status", "issues", "recommendation"],
  security: [
    "url", "isHttps", "hasContentSecurityPolicy", "hasXContentTypeOptions", "hasXFrameOptions", "hasReferrerPolicy",
    "status", "issues", "recommendation",
  ],
  social: [
    "url", "hasOpenGraph", "hasTwitterCard", "hasOgTitle", "hasOgDescription", "hasOgImage", "hasOgUrl", "twitterCard",
    "status", "issues", "recommendation",
  ],
  mobile: ["url", "hasViewport", "viewport", "hasResponsiveViewport", "hasFixedWidth", "status", "issues", "recommendation"],
  technology: ["url", "technologies", "detectedCount", "status", "issues", "recommendation"],
  accessibility: [
    "url", "imagesCount", "imagesMissingAlt", "linksCount", "linksMissingText", "buttonsCount", "buttonsMissingText",
    "formControlsCount", "formControlsMissingLabel", "status", "issues", "recommendation",
  ],
  content: [
    "url", "title", "wordCount", "paragraphCount", "headingsCount", "h1Count", "imagesCount", "linksCount",
    "status", "issues", "recommendation",
  ],
  structuredData: ["url", "jsonLdCount", "schemaCount", "schemaTypes", "status", "issues", "recommendation"],
  technical: [
    "url", "protocol", "titlePresent", "metaDescriptionPresent", "canonicalPresent", "langPresent", "viewportPresent",
    "h1Present", "robotsMetaPresent", "isHttps", "status", "issues", "recommendation",
  ],
};

describe("backward-compatible output", () => {
  for (const c of CASES) {
    test(`${c.name} keeps its field names and order`, async () => {
      for (const url of [RICH, BARE]) {
        assert.deepEqual(Object.keys(await c.fn(url)), FIELD_ORDER[c.name], url);
      }
    });
  }
});

describe("analyzers on a fully populated page", () => {
  for (const c of CASES) {
    test(c.name, async () => {
      const result = await c.fn(RICH);
      assertCommonShape(result, RICH);
      assertFields(result, c.rich);
    });
  }
});

describe("analyzers on a page with no optional metadata", () => {
  for (const c of CASES) {
    test(c.name, async () => {
      const result = await c.fn(BARE);
      assertCommonShape(result, BARE);
      assertFields(result, c.bare);
    });
  }
});

describe("analyzer edge cases", () => {
  test("schema and structuredData flag invalid JSON-LD", async () => {
    const url = "https://site.test/invalid-schema";

    assertFields(await analyzeSchema(url), { totalSchemas: 1, validSchemas: 0, invalidSchemas: 1, status: "invalid" });
    assertFields(await analyzeStructuredData(url), { jsonLdCount: 1, schemaCount: 0, status: "poor" });
  });

  test("ssl reports HTTP and invalid URLs without making a request", async () => {
    assertFields(await analyzeSsl("http://site.test/"), { protocol: "http:", isHttps: false, status: "needs_improvement" });
    assertFields(await analyzeSsl("not a url"), { protocol: "", isHttps: false, issues: ["Invalid URL"] });
    assert.equal(stub.requests.length, 0);
  });

  test("security reports plain HTTP", async () => {
    assertFields(await analyzeSecurity("http://site.test/"), { isHttps: false });
  });

  test("HTML analyzers reject pages that cannot be fetched", async () => {
    await assert.rejects(analyzeTitle("https://site.test/json"), { message: "Website did not return HTML content" });
    await assert.rejects(analyzeTitle("https://site.test/not-found"), { message: "Failed to fetch website: 404 Not Found" });
    await assert.rejects(analyzeContent("https://site.test/not-found"), /404/);
  });

  test("request-making analyzers reject unsafe URLs without making a request", async () => {
    for (const c of CASES.filter((c) => c.name !== "ssl")) {
      for (const url of ["http://localhost/", `http://127.0.0.1:${stub.port}/`, "http://private.test/", "https://u:p@site.test/"]) {
        await assert.rejects(c.fn(url), Error, `${c.name} accepted ${url}`);
      }
    }

    assert.equal(stub.requests.length, 0);
  });
});

describe("network usage", () => {
  test("analyzers given pre-fetched HTML do not request the page", async () => {
    for (const c of CASES.filter((c) => c.acceptsHtml)) {
      const result = await (c.fn as HtmlAnalyzer)(RICH, RICH_HTML);
      assertFields(result, c.rich);
    }

    // Only the sitemap analyzer makes its own (HEAD /sitemap.xml) request.
    assert.deepEqual(
      stub.requests.map((r) => `${r.method} ${r.path}`),
      ["HEAD /sitemap.xml"],
    );
  });

  test("performance, security and technology given a fetched page make no request", async () => {
    const page = await fetchPageDetails(RICH);
    stub.reset();

    const performance = await analyzePerformance(RICH, page);
    const security = await analyzeSecurity(RICH, page);
    const technology = await analyzeTechnology(RICH, page);

    assert.equal(stub.requests.length, 0);
    assert.equal(performance.responseTimeMs, page.responseTimeMs);
    assertFields(performance, { statusCode: 200, htmlSizeBytes: Buffer.byteLength(RICH_HTML), status: "good" });
    assert.deepEqual(security, await analyzeSecurity(RICH));
    assert.deepEqual(technology, await analyzeTechnology(RICH));
  });

  test("performance, security and technology called directly still accept non-HTML responses", async () => {
    const url = "https://site.test/json";

    assertFields(await analyzePerformance(url), { statusCode: 200, htmlSizeBytes: 11 });
    assertFields(await analyzeSecurity(url), { isHttps: true, hasXFrameOptions: false });
    assertFields(await analyzeTechnology(url), { url });
    assert.equal(stub.requests.filter((r) => r.path === "/json").length, 3);
  });

  test("each individual analyzer makes only its own requests", async () => {
    const expected: Record<string, string[]> = {
      ssl: [],
      sitemap: ["GET /", "HEAD /sitemap.xml"],
      robotsTxt: ["GET /robots.txt"],
    };

    for (const c of CASES) {
      stub.reset();
      await c.fn(RICH);
      assert.deepEqual(
        stub.requests.map((r) => `${r.method} ${r.path}`),
        expected[c.name] ?? ["GET /"],
        c.name,
      );
    }
  });
});

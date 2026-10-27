import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setUpTestNetwork, type StubServer } from "./helpers/network.js";
import { analyzeSitemap } from "../src/tools/analyze-sitemap.js";
import { sitemapUrlsFromRobotsTxt } from "../src/utils/fetch-robots-txt.js";

let stub: StubServer;

before(async () => {
  stub = await setUpTestNetwork();
});

after(() => stub.close());

beforeEach(() => stub.reset());

const paths = () => stub.requests.map((r) => `${r.method} ${r.path}`);

describe("sitemapUrlsFromRobotsTxt", () => {
  test("reads Sitemap directives in order, ignoring case and surrounding space", () => {
    const content = "User-agent: *\n  sitemap :  https://a.test/one.xml  \nDisallow: /x\nSITEMAP: https://a.test/two.xml\n";

    assert.deepEqual(sitemapUrlsFromRobotsTxt(content), [
      "https://a.test/one.xml",
      "https://a.test/two.xml",
    ]);
  });

  test("returns nothing for missing, empty or sitemap-free content", () => {
    assert.deepEqual(sitemapUrlsFromRobotsTxt(null), []);
    assert.deepEqual(sitemapUrlsFromRobotsTxt(""), []);
    assert.deepEqual(sitemapUrlsFromRobotsTxt("User-agent: *\nAllow: /\n"), []);
    // "Sitemap:" with no value isn't a declaration.
    assert.deepEqual(sitemapUrlsFromRobotsTxt("Sitemap:   \n"), []);
  });
});

describe("analyze_sitemap discovery", () => {
  test("uses the sitemap declared in robots.txt, at any path", async () => {
    const result = await analyzeSitemap("https://custom-sitemap.test/");

    assert.equal(result.sitemapUrl, "https://custom-sitemap.test/sitemap-index.xml");
    assert.equal(result.source, "robots_txt");
    assert.equal(result.declaredInRobotsTxt, true);
    assert.equal(result.status, "good");

    // The well-known path is never requested: robots.txt already named the sitemap.
    assert.deepEqual(paths(), ["GET /robots.txt", "HEAD /sitemap-index.xml"]);
  });

  test("falls back to /sitemap.xml and flags that robots.txt doesn't reference it", async () => {
    const result = await analyzeSitemap("https://no-robots-sitemap.test/");

    assert.equal(result.sitemapUrl, "https://no-robots-sitemap.test/sitemap.xml");
    assert.equal(result.source, "well_known");
    assert.equal(result.declaredInRobotsTxt, false);
    assert.equal(result.status, "needs_improvement");
    assert.deepEqual(result.issues, ["Sitemap is not referenced from robots.txt"]);
  });

  test("retries with GET when the server rejects HEAD", async () => {
    const result = await analyzeSitemap("https://no-head.test/");

    assert.equal(result.hasSitemap, true);
    assert.equal(result.sitemapUrl, "https://no-head.test/sitemap.xml");
    assert.deepEqual(paths(), ["GET /robots.txt", "HEAD /sitemap.xml", "GET /sitemap.xml"]);
  });

  test("reports a sitemap declared in robots.txt with an invalid URL", async () => {
    const result = await analyzeSitemap("https://bad-sitemap.test/");

    assert.equal(result.sitemapUrl, "/sitemap.xml");
    assert.equal(result.isValidUrl, false);
    assert.equal(result.status, "needs_improvement");
    assert.deepEqual(result.issues, ["Sitemap URL is invalid"]);
  });

  test("reports missing when neither robots.txt nor the well-known path has one", async () => {
    const result = await analyzeSitemap("https://bare.test/");

    assert.equal(result.sitemapUrl, null);
    assert.equal(result.hasSitemap, false);
    assert.equal(result.source, null);
    assert.equal(result.status, "missing");
  });

  test("reuses a pre-fetched robots.txt instead of requesting it again", async () => {
    const result = await analyzeSitemap("https://site.test/", {
      robotsTxtUrl: "https://site.test/robots.txt",
      content: "Sitemap: https://site.test/sitemap.xml\n",
    });

    assert.equal(result.status, "good");
    assert.deepEqual(paths(), ["HEAD /sitemap.xml"]);
  });
});

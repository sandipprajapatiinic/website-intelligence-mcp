import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { setUpTestNetwork, type StubServer } from "./helpers/network.js";
import { RICH_HTML } from "./helpers/fixtures.js";
import { fetchPage, fetchPageDetails, safeFetch } from "../src/utils/fetch-page.js";
import { analyzePerformance } from "../src/tools/analyze-performance.js";
import { analyzeTechnology } from "../src/tools/analyze-technology.js";
import { analyzeSitemap } from "../src/tools/analyze-sitemap.js";
import { analyzeSecurity } from "../src/tools/analyze-security.js";
import { analyzeRobotsTxt } from "../src/tools/analyze-robots-txt.js";
import { analyzeContent } from "../src/tools/analyze-content.js";
import { analyzeStructuredData } from "../src/tools/analyze-structured-data.js";
import { analyzeTechnical } from "../src/tools/analyze-technical.js";

let stub: StubServer;

before(async () => {
  stub = await setUpTestNetwork();
});

after(() => stub.close());

beforeEach(() => stub.reset());

const paths = () => stub.requests.map((r) => `${r.method} ${r.host}${r.path}`);

describe("test harness", () => {
  test("refuses connections to hosts outside the stub network", async () => {
    const request = new Promise((resolve, reject) =>
      http.get("http://example.com/", { agent: false }, resolve).on("error", reject),
    );

    await assert.rejects(request, /Test harness blocked a connection to example.com/);
  });

  test("refuses connections that skip the DNS lookup hook", async () => {
    const request = new Promise((resolve, reject) =>
      http.get("http://site.test/", { agent: false }, resolve).on("error", reject),
    );

    await assert.rejects(request, /without a DNS lookup hook/);
  });

  test("refuses fetch(), which has no connect-time DNS check", async () => {
    await assert.rejects(fetch("https://site.test/"), /Test harness blocked a fetch\(\) call/);
  });
});

describe("fetchPage", () => {
  test("returns the HTML of a successful response", async () => {
    assert.equal(await fetchPage("https://site.test/"), RICH_HTML);
    assert.deepEqual(paths(), ["GET site.test/"]);
  });

  test("follows same-site redirects", async () => {
    assert.equal(await fetchPage("https://site.test/redirect"), RICH_HTML);
    assert.deepEqual(paths(), ["GET site.test/redirect", "GET site.test/"]);
  });

  test("rejects unsafe URLs before making any request", async () => {
    for (const url of [
      "not a url",
      "http://localhost/",
      `http://127.0.0.1:${stub.port}/`,
      "http://10.0.0.1/",
      "https://user:pass@site.test/",
      "ftp://site.test/",
      "http://private.test/",
    ]) {
      await assert.rejects(fetchPage(url), Error, url);
    }

    assert.equal(stub.requests.length, 0);
  });

  test("rejects redirects to loopback, metadata and privately resolving hosts", async () => {
    await assert.rejects(fetchPage("https://site.test/redirect-to-loopback"), {
      message: "Private or link-local IP addresses are not allowed",
    });
    await assert.rejects(fetchPage("https://site.test/redirect-to-metadata"), {
      message: "Private or link-local IP addresses are not allowed",
    });
    await assert.rejects(fetchPage("https://site.test/redirect-to-private-dns"), {
      message: "Host resolves to a private or link-local IP address",
    });

    assert.ok(!stub.requests.some((r) => r.path === "/secret"), "redirect target must not be requested");
  });

  test("stops after 5 redirects", async () => {
    await assert.rejects(fetchPage("https://site.test/redirect-loop"), { message: "Too many redirects" });
    assert.equal(stub.requests.length, 6);
  });

  test("rejects non-HTML responses", async () => {
    await assert.rejects(fetchPage("https://site.test/json"), {
      message: "Website did not return HTML content",
    });
  });

  test("rejects unsuccessful status codes", async () => {
    await assert.rejects(fetchPage("https://site.test/not-found"), {
      message: "Failed to fetch website: 404 Not Found",
    });
  });

  test("decodes gzip-encoded responses", async () => {
    assert.equal(await fetchPage("https://site.test/gzip"), RICH_HTML);
  });

  test("rejects HTML larger than 5 MB declared by Content-Length", async () => {
    await assert.rejects(fetchPage("https://site.test/huge-declared"), {
      message: "HTML response is too large",
    });
  });

  test("rejects HTML larger than 5 MB while streaming without Content-Length", async () => {
    await assert.rejects(fetchPage("https://site.test/huge-streamed"), {
      message: "HTML response is too large",
    });
  });
});

describe("fetchPageDetails", () => {
  test("returns the HTML with the final response's status, headers and timing in one request", async () => {
    const page = await fetchPageDetails("https://site.test/redirect");

    assert.equal(page.html, RICH_HTML);
    assert.equal(page.status, 200);
    assert.equal(page.headers.get("x-frame-options"), "DENY");
    assert.ok(Number.isInteger(page.responseTimeMs) && page.responseTimeMs >= 0);
    assert.deepEqual(paths(), ["GET site.test/redirect", "GET site.test/"]);
  });

  test("applies exactly the same checks as fetchPage", async () => {
    const cases: [string, string][] = [
      ["http://localhost/", "Localhost URLs are not allowed"],
      ["http://private.test/", "Host resolves to a private or link-local IP address"],
      ["https://site.test/redirect-to-loopback", "Private or link-local IP addresses are not allowed"],
      ["https://rebind-loopback.test/", "Failed to fetch website: Host resolves to a private or link-local IP address"],
      ["https://site.test/json", "Website did not return HTML content"],
      ["https://site.test/not-found", "Failed to fetch website: 404 Not Found"],
      ["https://site.test/bytes?size=5000001", "HTML response is too large"],
      ["https://site.test/gzip-bomb", "HTML response is too large"],
    ];

    for (const [url, message] of cases) {
      stub.reset();
      await assert.rejects(fetchPageDetails(url), { message }, `fetchPageDetails ${url}`);
      stub.reset();
      await assert.rejects(fetchPage(url), { message }, `fetchPage ${url}`);
    }

    assert.ok(!stub.requests.some((r) => r.path === "/secret"));
  });
});

describe("safeFetch", () => {
  test("returns the raw response, including non-HTML content", async () => {
    const response = await safeFetch("https://site.test/json");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/json");
    assert.deepEqual(await response.json(), { ok: true });
  });

  test("returns non-2xx responses without throwing", async () => {
    const response = await safeFetch("https://site.test/not-found");
    assert.equal(response.status, 404);
    await response.body?.cancel();
  });

  test("exposes status, headers and a decoded body like fetch()", async () => {
    const response = await safeFetch("https://site.test/");
    assert.equal(response.ok, true);
    assert.equal(response.status, 200);
    assert.equal(response.statusText, "OK");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(await response.text(), RICH_HTML);

    const gzip = await safeFetch("https://site.test/gzip");
    assert.equal(await gzip.text(), RICH_HTML);
  });

  test("passes the request method through", async () => {
    const response = await safeFetch("https://site.test/sitemap.xml", { method: "HEAD" });
    assert.equal(response.status, 200);
    assert.deepEqual(paths(), ["HEAD site.test/sitemap.xml"]);
  });

  test("follows same-site redirects", async () => {
    const response = await safeFetch("https://site.test/redirect");
    assert.equal(await response.text(), RICH_HTML);
    assert.deepEqual(paths(), ["GET site.test/redirect", "GET site.test/"]);
  });

  test("rejects unsafe URLs and unsafe redirects", async () => {
    await assert.rejects(safeFetch("http://localhost/"), { message: "Localhost URLs are not allowed" });
    await assert.rejects(safeFetch("http://private.test/"), {
      message: "Host resolves to a private or link-local IP address",
    });
    await assert.rejects(safeFetch("https://site.test/redirect-to-loopback"), {
      message: "Private or link-local IP addresses are not allowed",
    });
    await assert.rejects(safeFetch("https://site.test/redirect-loop"), { message: "Too many redirects" });

    assert.ok(!stub.requests.some((r) => r.path === "/secret"));
  });
});

// The limit is 5,000,000 bytes of decoded body, the same as fetchPage's HTML limit.
const LIMIT = 5_000_000;
const bytes = (size: number, length?: "declared" | number) =>
  `https://site.test/bytes?size=${size}${length === undefined ? "" : `&length=${length}`}`;

describe("safeFetch size limit", () => {
  test("returns responses under the limit unchanged", async () => {
    const response = await safeFetch(bytes(1000, "declared"));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-length"), "1000");
    assert.equal((await response.text()).length, 1000);
  });

  test("allows a body of exactly 5,000,000 bytes, with or without Content-Length", async () => {
    assert.equal((await (await safeFetch(bytes(LIMIT, "declared"))).text()).length, LIMIT);
    assert.equal((await (await safeFetch(bytes(LIMIT))).text()).length, LIMIT);
  });

  test("rejects a declared Content-Length over the limit before reading the body", async () => {
    await assert.rejects(safeFetch(bytes(LIMIT + 1, "declared")), { message: "Response is too large" });
  });

  test("rejects a body over the limit without Content-Length while streaming", async () => {
    const response = await safeFetch(bytes(LIMIT + 1));
    await assert.rejects(response.text(), { message: "Response is too large" });

    await assert.rejects((await safeFetch(bytes(6_000_000))).arrayBuffer(), { message: "Response is too large" });
  });

  test("rejects a body that exceeds the limit despite a small Content-Length (gzip bomb)", async () => {
    const response = await safeFetch("https://site.test/gzip-bomb");
    assert.ok(Number(response.headers.get("content-length")) < 100_000);
    await assert.rejects(response.text(), { message: "Response is too large" });
  });

  test("repeated oversized reads fail cleanly without asynchronous errors", async () => {
    // An unguarded stream adapter can throw after the body errors; the test runner reports that as a failure.
    for (let i = 0; i < 10; i++) {
      await assert.rejects((await safeFetch(bytes(6_000_000))).text(), { message: "Response is too large" });
      await assert.rejects((await safeFetch("https://site.test/gzip-bomb")).text(), { message: "Response is too large" });
      await assert.rejects(fetchPage("https://site.test/gzip-bomb"), { message: "HTML response is too large" });
    }
  });

  test("never reads past a Content-Length that is smaller than the body sent", async () => {
    // The server sends 6,000,000 bytes but declares 1000; only the declared bytes are read.
    const response = await safeFetch(bytes(6_000_000, 1000));
    assert.equal((await response.text()).length, 1000);
  });

  test("applies the limit to the final response after redirects", async () => {
    await assert.rejects((await safeFetch("https://site.test/redirect-to-large")).text(), {
      message: "Response is too large",
    });
  });

  test("does not apply to HEAD responses, whose body is never read", async () => {
    const response = await safeFetch(bytes(50_000_000, "declared"), { method: "HEAD" });
    assert.equal(response.status, 200);
    assert.equal(response.body, null);
  });

  test("still allows non-HTML content types", async () => {
    const response = await safeFetch("https://site.test/bytes?size=10&type=text/plain");
    assert.equal(response.headers.get("content-type"), "text/plain");
    assert.equal(await response.text(), "aaaaaaaaaa");
  });

  test("analyzers that use safeFetch report oversized pages as errors", async () => {
    await assert.rejects(analyzePerformance(bytes(6_000_000)), { message: "Response is too large" });
    await assert.rejects(analyzeTechnology(bytes(6_000_000, "declared")), { message: "Response is too large" });

    // The sitemap check is a HEAD request, so a large sitemap is still detected.
    const sitemap = await analyzeSitemap("https://site.test/", "<html></html>");
    assert.equal(sitemap.hasSitemap, true);
  });
});

describe("fetchPage size limit (unchanged)", () => {
  test("allows exactly 5,000,000 bytes", async () => {
    assert.equal((await fetchPage(bytes(LIMIT, "declared"))).length, LIMIT);
    assert.equal((await fetchPage(bytes(LIMIT))).length, LIMIT);
  });

  test("rejects 5,000,001 bytes with or without Content-Length", async () => {
    await assert.rejects(fetchPage(bytes(LIMIT + 1, "declared")), { message: "HTML response is too large" });
    await assert.rejects(fetchPage(bytes(LIMIT + 1)), { message: "HTML response is too large" });
  });

  test("rejects a gzip body that decodes to more than the limit", async () => {
    await assert.rejects(fetchPage("https://site.test/gzip-bomb"), { message: "HTML response is too large" });
  });
});

describe("connection cleanup", () => {
  // Waits briefly for closed sockets to be noticed by the stub server, then returns how many are still open.
  async function openConnectionsAfterSettling(): Promise<number> {
    for (let i = 0; i < 20; i++) {
      if ((await stub.openConnections()) === 0) return 0;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return stub.openConnections();
  }

  const large = (params: string) => `https://site.test/bytes?size=3000000&${params}`;

  test("fetchPage closes the connection when it rejects a response without reading it", async () => {
    const cases: [string, string][] = [
      [large("type=application/json"), "Website did not return HTML content"],
      [large("status=404"), "Failed to fetch website: 404 Not Found"],
      ["https://site.test/bytes?size=6000000&length=declared", "HTML response is too large"],
    ];

    for (const [url, message] of cases) {
      await assert.rejects(fetchPage(url), { message });
      assert.equal(await openConnectionsAfterSettling(), 0, url);
    }
  });

  test("analyzers that don't use the response body close the connection", async () => {
    await analyzeSecurity(large("type=text/html"));
    assert.equal(await openConnectionsAfterSettling(), 0, "analyze_security");

    assert.equal((await analyzeRobotsTxt("https://big-404.test/")).hasRobotsTxt, false);
    assert.equal(await openConnectionsAfterSettling(), 0, "analyze_robots_txt with a 404");

    for (const [name, analyzer] of [
      ["analyze_content", analyzeContent],
      ["analyze_structured_data", analyzeStructuredData],
      ["analyze_technical", analyzeTechnical],
    ] as const) {
      await assert.rejects(analyzer(large("status=404")), /404/);
      assert.equal(await openConnectionsAfterSettling(), 0, `${name} with a 404`);
    }
  });
});

describe("timeouts", () => {
  // Both limits are fixed at 10 seconds in production code, so the two checks run concurrently.
  test("fetchPage and safeFetch abort requests that stall after 10 seconds", { timeout: 20_000 }, async () => {
    const started = Date.now();

    await Promise.all([
      // Headers and part of the body arrive, then the body stalls.
      assert.rejects(fetchPage("https://site.test/slow-body"), { name: "AbortError" }),
      assert.rejects((await safeFetch("https://site.test/slow-body")).text(), { name: "AbortError" }),
      assert.rejects(fetchPage("https://site.test/hang"), {
        message: "Website request timed out after 10 seconds",
      }),
      assert.rejects(safeFetch("https://site.test/hang"), {
        message: "Website request timed out after 10 seconds",
      }),
    ]);

    const elapsed = Date.now() - started;
    assert.ok(elapsed >= 9_500 && elapsed < 15_000, `timed out after ${elapsed}ms`);
  });
});

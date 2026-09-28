// DNS rebinding: a hostname passes validatePublicUrl with a public address, then resolves to a
// private one when the connection is made. The connect-time lookup must refuse to connect.
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setUpTestNetwork, connections, REBIND_RECORDS, PUBLIC_TEST_ADDRESS, type StubServer } from "./helpers/network.js";
import { RICH_HTML } from "./helpers/fixtures.js";
import { fetchPage, safeFetch, validatePublicUrl } from "../src/utils/fetch-page.js";
import { analyzeTitle } from "../src/tools/analyze-title.js";
import { analyzeSecurity } from "../src/tools/analyze-security.js";
import { analyzeRobotsTxt } from "../src/tools/analyze-robots-txt.js";
import { analyzeWebsite } from "../src/tools/analyze-website/analyze-website.js";

const BLOCKED = "Host resolves to a private or link-local IP address";

let stub: StubServer;

before(async () => {
  stub = await setUpTestNetwork();
});

after(() => stub.close());

beforeEach(() => stub.reset());

describe("connect-time DNS check", () => {
  test("a public hostname connects to the address it resolved to", async () => {
    assert.equal(await fetchPage("https://site.test/"), RICH_HTML);
    assert.deepEqual(connections, [{ host: "site.test", addresses: [PUBLIC_TEST_ADDRESS] }]);
  });

  test("a public IPv6 hostname is allowed", async () => {
    assert.equal(await fetchPage("https://ipv6-public.test/"), RICH_HTML);
    assert.deepEqual(connections, [{ host: "ipv6-public.test", addresses: ["2001:db8::10"] }]);
  });

  test("the rebinding hosts pass the initial validation", async () => {
    for (const host of Object.keys(REBIND_RECORDS)) {
      assert.equal((await validatePublicUrl(`https://${host}/`)).hostname, host);
    }
  });

  for (const [host, address] of Object.entries(REBIND_RECORDS)) {
    test(`fetchPage refuses to connect when ${host} rebinds to ${address}`, async () => {
      await assert.rejects(fetchPage(`https://${host}/`), { message: `Failed to fetch website: ${BLOCKED}` });
      assert.equal(stub.requests.length, 0);
      assert.deepEqual(connections, []);
    });

    test(`safeFetch refuses to connect when ${host} rebinds to ${address}`, async () => {
      await assert.rejects(safeFetch(`https://${host}/`), { message: BLOCKED });
      assert.equal(stub.requests.length, 0);
    });
  }

  test("plain HTTP requests are checked too", async () => {
    await assert.rejects(safeFetch("http://rebind-metadata.test/latest/meta-data/"), { message: BLOCKED });
    assert.equal(stub.requests.length, 0);
  });

  test("HEAD requests are checked too", async () => {
    await assert.rejects(safeFetch("https://rebind-loopback.test/", { method: "HEAD" }), { message: BLOCKED });
    assert.equal(stub.requests.length, 0);
  });
});

describe("redirect targets", () => {
  test("a redirect to a host that rebinds to loopback is refused", async () => {
    await assert.rejects(fetchPage("https://site.test/redirect-to-rebind"), { message: `Failed to fetch website: ${BLOCKED}` });
    await assert.rejects(safeFetch("https://site.test/redirect-to-rebind"), { message: BLOCKED });
    assert.ok(!stub.requests.some((r) => r.path === "/secret"));
  });

  test("redirects to private hostnames and IPs are refused", async () => {
    const cases: [string, string][] = [
      ["/redirect-to-private-dns", BLOCKED],
      ["/redirect-to-loopback", "Private or link-local IP addresses are not allowed"],
      ["/redirect-to-10", "Private or link-local IP addresses are not allowed"],
      ["/redirect-to-metadata", "Private or link-local IP addresses are not allowed"],
      ["/redirect-to-ipv6-loopback", "Localhost URLs are not allowed"],
    ];

    for (const [path, message] of cases) {
      await assert.rejects(fetchPage(`https://site.test${path}`), { message }, `fetchPage ${path}`);
      await assert.rejects(safeFetch(`https://site.test${path}`), { message }, `safeFetch ${path}`);
    }

    assert.ok(!stub.requests.some((r) => r.path === "/secret"));
  });

  test("same-site redirects still work and every hop is checked", async () => {
    assert.equal(await fetchPage("https://site.test/redirect"), RICH_HTML);
    assert.deepEqual(connections.map((c) => c.host), ["site.test", "site.test"]);
  });
});

describe("analyzers", () => {
  test("individual analyzers do not reach a rebinding host", async () => {
    await assert.rejects(analyzeTitle("https://rebind-loopback.test/"), { message: `Failed to fetch website: ${BLOCKED}` });
    stub.reset();
    await assert.rejects(analyzeSecurity("https://rebind-metadata.test/"), { message: BLOCKED });
    stub.reset();

    // robots.txt failures are reported as "missing", not thrown.
    const robots = await analyzeRobotsTxt("https://rebind-10.test/");
    assert.equal(robots.hasRobotsTxt, false);

    assert.equal(stub.requests.length, 0);
  });

  test("analyze_website makes no request to a rebinding host", async () => {
    const result = (await analyzeWebsite("https://rebind-loopback.test/")) as {
      status: string;
      failedAnalyzers: string[];
    };

    assert.equal(result.status, "completed_with_errors");
    assert.ok(result.failedAnalyzers.includes("title"));
    assert.ok(result.failedAnalyzers.includes("performance"));
    assert.equal(stub.requests.length, 0);
  });
});

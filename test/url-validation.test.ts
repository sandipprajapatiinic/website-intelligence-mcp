import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { installFakeDns } from "./helpers/network.js";
import { validateUrl, validatePublicUrl } from "../src/utils/fetch-page.js";

before(() => installFakeDns());

function assertRejected(urls: string[], message: string | RegExp) {
  for (const url of urls) {
    assert.throws(() => validateUrl(url), { message }, `expected ${url} to be rejected`);
  }
}

describe("validateUrl", () => {
  test("rejects malformed URLs", () => {
    assertRejected(["not a url", "", "http://", "://site.test", "site.test"], "Invalid URL");
  });

  test("rejects unsupported protocols", () => {
    assertRejected(
      [
        "ftp://site.test/",
        "file:///etc/passwd",
        "javascript:alert(1)",
        "data:text/html,<h1>x</h1>",
        "ws://site.test/",
        "gopher://site.test/",
      ],
      "Only HTTP and HTTPS URLs are allowed",
    );
  });

  test("rejects URLs with credentials", () => {
    assertRejected(
      ["https://user:pass@site.test/", "https://user@site.test/", "http://:pass@site.test/"],
      "URLs with credentials are not allowed",
    );
  });

  test("rejects localhost hostnames", () => {
    assertRejected(
      [
        "http://localhost/",
        "http://LOCALHOST:8080/",
        "http://localhost./",
        "http://api.localhost/",
        "http://localhost.localdomain/",
        "http://0.0.0.0/",
        "http://[::1]/",
      ],
      "Localhost URLs are not allowed",
    );
  });

  test("rejects loopback and private IPv4 addresses", () => {
    assertRejected(
      [
        "http://127.0.0.1/",
        "http://127.1.2.3:3000/",
        "http://127.0.0.1./",
        "http://10.0.0.1/",
        "http://172.16.0.1/",
        "http://172.31.255.255/",
        "http://192.168.1.1/",
        "http://100.64.0.1/",
        "http://192.0.0.8/",
        "http://198.18.0.1/",
        "http://0.1.2.3/",
      ],
      "Private or link-local IP addresses are not allowed",
    );
  });

  test("rejects link-local, cloud metadata, multicast and reserved addresses", () => {
    assertRejected(
      [
        "http://169.254.169.254/latest/meta-data/",
        "http://169.254.1.1/",
        "http://224.0.0.1/",
        "http://240.0.0.1/",
        "http://255.255.255.255/",
      ],
      "Private or link-local IP addresses are not allowed",
    );
  });

  test("rejects encoded IPv4 forms that normalize to loopback", () => {
    assertRejected(
      ["http://2130706433/", "http://0x7f000001/", "http://0177.0.0.1/", "http://127.1/"],
      "Private or link-local IP addresses are not allowed",
    );
  });

  test("rejects private, link-local and mapped IPv6 addresses", () => {
    assertRejected(
      [
        "http://[::]/",
        "http://[::ffff:127.0.0.1]/",
        "http://[::ffff:10.0.0.1]/",
        "http://[::ffff:169.254.169.254]/",
        "http://[fd00::1]/",
        "http://[fc00::1]/",
        "http://[fe80::1]/",
        "http://[ff02::1]/",
        "http://[64:ff9b::7f00:1]/",
        "http://[64:ff9b:1::a00:1]/",
        "http://[fec0::1]/",
        "http://[::7f00:1]/",
        "http://[fd00:ec2::254]/",
      ],
      "Private or link-local IP addresses are not allowed",
    );
  });

  test("accepts public HTTP and HTTPS URLs", () => {
    for (const url of [
      "https://site.test/",
      "http://site.test/path?query=1",
      "https://203.0.113.10/",
      "http://172.32.0.1/",
      "http://100.128.0.1/",
      "https://[2001:db8::1]/",
    ]) {
      assert.equal(validateUrl(url).href, new URL(url).href);
    }
  });
});

describe("validatePublicUrl (DNS check)", () => {
  test("accepts hostnames that resolve to public addresses", async () => {
    assert.equal((await validatePublicUrl("https://site.test/page")).href, "https://site.test/page");
  });

  test("accepts hostnames that resolve to public IPv6 addresses", async () => {
    assert.equal((await validatePublicUrl("https://ipv6-public.test/")).hostname, "ipv6-public.test");
  });

  test("rejects hostnames that resolve to private, loopback, link-local, metadata or IPv6 private addresses", async () => {
    for (const host of [
      "loopback.test",
      "private.test",
      "private-172.test",
      "private-192.test",
      "linklocal.test",
      "metadata.test",
      "zero.test",
      "ipv6-loopback.test",
      "ipv6-linklocal.test",
      "ula.test",
      "mapped.test",
    ]) {
      await assert.rejects(validatePublicUrl(`http://${host}/`), {
        message: "Host resolves to a private or link-local IP address",
      });
    }
  });

  test("rejects a hostname if any resolved address is private", async () => {
    await assert.rejects(validatePublicUrl("http://mixed.test/"), {
      message: "Host resolves to a private or link-local IP address",
    });
  });

  test("rejects hostnames that do not resolve", async () => {
    await assert.rejects(validatePublicUrl("https://does-not-exist.invalid/"), {
      message: "Could not resolve host: does-not-exist.invalid",
    });
  });

  test("still applies the static checks before resolving", async () => {
    await assert.rejects(validatePublicUrl("http://localhost/"), { message: "Localhost URLs are not allowed" });
    await assert.rejects(validatePublicUrl("ftp://site.test/"), { message: "Only HTTP and HTTPS URLs are allowed" });
    await assert.rejects(validatePublicUrl("https://a:b@site.test/"), { message: "URLs with credentials are not allowed" });
  });
});

// Deterministic, offline network for tests.
//
// The production code rejects localhost, so the stub server can't be requested directly. Instead:
//   1. installFakeDns() answers every DNS lookup locally: *.test hosts resolve to a public TEST-NET
//      address (203.0.113.10) unless listed in DNS_RECORDS or REBIND_RECORDS, and anything else fails to resolve.
//   2. installConnectionRouting() intercepts outgoing sockets. For *.test hosts it still runs the
//      production DNS lookup hook, then connects to the local stub server (http or https, served as
//      plain HTTP). Every other destination, and every fetch() call, is refused, so nothing reaches the internet.
// URL validation, connect-time DNS checks, redirect checks, size limits and content-type checks all run unmodified.

import http from "node:http";
import https from "node:https";
import net, { type AddressInfo } from "node:net";
import { createRequire, syncBuiltinESMExports } from "node:module";
import { gzipSync } from "node:zlib";
import { RICH_HTML, BARE_HTML, INVALID_SCHEMA_HTML, ROBOTS_TXT } from "./fixtures.js";

const require = createRequire(import.meta.url);

export const PUBLIC_TEST_ADDRESS = "203.0.113.10";

const DNS_RECORDS: Record<string, { address: string; family: number }[]> = {
  "private.test": [{ address: "10.0.0.5", family: 4 }],
  "loopback.test": [{ address: "127.0.0.1", family: 4 }],
  "metadata.test": [{ address: "169.254.169.254", family: 4 }],
  "private-172.test": [{ address: "172.20.0.5", family: 4 }],
  "private-192.test": [{ address: "192.168.0.10", family: 4 }],
  "linklocal.test": [{ address: "169.254.10.10", family: 4 }],
  "zero.test": [{ address: "0.0.0.0", family: 4 }],
  "ipv6-loopback.test": [{ address: "::1", family: 6 }],
  "ipv6-linklocal.test": [{ address: "fe80::1", family: 6 }],
  "mapped.test": [{ address: "::ffff:127.0.0.1", family: 6 }],
  "ula.test": [{ address: "fd00::1", family: 6 }],
  "ipv6-public.test": [{ address: "2001:db8::10", family: 6 }],
  "mixed.test": [
    { address: PUBLIC_TEST_ADDRESS, family: 4 },
    { address: "192.168.1.10", family: 4 },
  ],
};

// DNS rebinding: the first lookup of each host returns a public address, every later lookup the listed one.
export const REBIND_RECORDS: Record<string, string> = {
  "rebind-loopback.test": "127.0.0.1",
  "rebind-10.test": "10.1.2.3",
  "rebind-172.test": "172.31.0.9",
  "rebind-192.test": "192.168.50.1",
  "rebind-linklocal.test": "169.254.1.1",
  "rebind-metadata.test": "169.254.169.254",
  "rebind-zero.test": "0.0.0.0",
  "rebind-ipv6-loopback.test": "::1",
  "rebind-ipv6-ula.test": "fd00:ec2::254",
  "rebind-ipv6-linklocal.test": "fe80::1",
  "rebind-mapped.test": "::ffff:10.0.0.1",
};

const lookupCounts = new Map<string, number>();

export function resetFakeDns(): void {
  lookupCounts.clear();
}

export function installFakeDns(): void {
  const dns = require("node:dns/promises");

  dns.lookup = async (hostname: string, options?: { all?: boolean }) => {
    const count = (lookupCounts.get(hostname) ?? 0) + 1;
    lookupCounts.set(hostname, count);

    const rebindTarget = REBIND_RECORDS[hostname];
    const rebound = rebindTarget && count > 1
      ? [{ address: rebindTarget, family: net.isIP(rebindTarget) }]
      : undefined;

    const records =
      rebound ??
      DNS_RECORDS[hostname] ??
      (hostname.endsWith(".test")
        ? [{ address: PUBLIC_TEST_ADDRESS, family: 4 }]
        : undefined);

    if (!records) {
      const error = new Error(`getaddrinfo ENOTFOUND ${hostname}`) as Error & { code: string };
      error.code = "ENOTFOUND";
      throw error;
    }

    return options?.all ? records : records[0];
  };

  // Propagate the patched export to ESM `import { lookup } from "node:dns/promises"` bindings.
  syncBuiltinESMExports();
}

export type Connection = { host: string; addresses: string[] };

// Hosts and approved addresses of every socket opened, as reported by the production lookup hook.
export const connections: Connection[] = [];

function blockedSocket(message: string): net.Socket {
  const socket = new net.Socket();
  process.nextTick(() => socket.destroy(new Error(message)));
  return socket;
}

export function installConnectionRouting(port: number): void {
  function createConnection(options: net.NetConnectOpts & { host?: string; lookup?: net.LookupFunction }) {
    const host = options.host ?? "";
    const productionLookup = options.lookup;

    if (!host.endsWith(".test")) {
      return blockedSocket(`Test harness blocked a connection to ${host}`);
    }

    if (typeof productionLookup !== "function") {
      return blockedSocket(`Test harness blocked a connection to ${host} without a DNS lookup hook`);
    }

    // Run the production lookup exactly as net.connect would, then connect to the stub instead of the approved address.
    const lookup: net.LookupFunction = (hostname, lookupOptions, callback) =>
      productionLookup(hostname, lookupOptions, (error, address, family) => {
        if (error) {
          callback(error, "", 0);
          return;
        }

        const addresses = Array.isArray(address) ? address.map((entry) => entry.address) : [address];
        connections.push({ host: hostname, addresses });

        if (Array.isArray(address)) {
          callback(null, [{ address: "127.0.0.1", family: 4 }]);
        } else {
          callback(null, "127.0.0.1", 4);
        }
      });

    return net.connect({ host, port, lookup });
  }

  // Covers the http and https agents (https is served as plain HTTP by the stub).
  (http.Agent.prototype as unknown as { createConnection: unknown }).createConnection = createConnection;
  (https.Agent.prototype as unknown as { createConnection: unknown }).createConnection = createConnection;

  // Production requests must not use fetch(): it has no connect-time DNS check.
  globalThis.fetch = (async (input: string | URL | Request) => {
    throw new Error(`Test harness blocked a fetch() call to ${input instanceof Request ? input.url : String(input)}`);
  }) as typeof fetch;
}

export type StubRequest = { method: string; host: string; path: string };

export type StubServer = {
  port: number;
  requests: StubRequest[];
  // Connections currently open to the stub server.
  openConnections(): Promise<number>;
  reset(): void;
  close(): Promise<void>;
};

const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "content-security-policy": "default-src 'self'",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-powered-by": "PHP/8.2",
};

const SIX_MB = 6 * 1024 * 1024;

// Tiny on the wire, 6,000,000 bytes once decoded.
const GZIP_BOMB = gzipSync(Buffer.alloc(6_000_000, "a"));

// /bytes?size=N[&length=declared|<number>][&type=...][&status=...] serves N bytes of "a".
// length=declared sends a correct Content-Length, a number sends that (wrong) value, and no length streams chunked.
function serveBytes(req: http.IncomingMessage, res: http.ServerResponse, query: URLSearchParams) {
  const size = Number(query.get("size"));
  const length = query.get("length");
  const headers: Record<string, string> = { "content-type": query.get("type") ?? "text/html" };

  if (length !== null) {
    headers["content-length"] = length === "declared" ? String(size) : length;
  }

  res.writeHead(Number(query.get("status") ?? 200), headers);

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  for (let remaining = size; remaining > 0; remaining -= 1024 * 1024) {
    res.write(Buffer.alloc(Math.min(remaining, 1024 * 1024), "a"));
  }

  res.end();
}

export async function startStubServer(): Promise<StubServer> {
  const requests: StubRequest[] = [];
  const pathCounts = new Map<string, number>();
  let port = 0;

  const server = http.createServer((req, res) => {
    const host = String(req.headers.host ?? "").replace(/:\d+$/, "");
    const [path, search = ""] = (req.url ?? "/").split("?");
    const count = (pathCounts.get(path) ?? 0) + 1;

    pathCounts.set(path, count);
    requests.push({ method: req.method ?? "GET", host, path });

    // "big-404.test" answers robots.txt with a large 404 page.
    if (host === "big-404.test" && path === "/robots.txt") {
      serveBytes(req, res, new URLSearchParams("size=3000000&status=404"));
      return;
    }

    // "bare.test" has no robots.txt or sitemap.xml.
    if (host === "bare.test" && (path === "/robots.txt" || path === "/sitemap.xml")) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Not found");
      return;
    }

    if (path === "/bytes") {
      serveBytes(req, res, new URLSearchParams(search));
      return;
    }

    switch (path) {
      case "/":
        res.writeHead(200, HTML_HEADERS);
        res.end(host === "bare.test" ? BARE_HTML : RICH_HTML);
        return;
      case "/invalid-schema":
        res.writeHead(200, { "content-type": "text/html" });
        res.end(INVALID_SCHEMA_HTML);
        return;
      case "/robots.txt":
        res.writeHead(200, { "content-type": "text/plain" });
        res.end(ROBOTS_TXT);
        return;
      case "/sitemap.xml":
        res.writeHead(200, { "content-type": "application/xml" });
        res.end(req.method === "HEAD" ? undefined : "<urlset></urlset>");
        return;
      case "/json":
        res.writeHead(200, { "content-type": "application/json" });
        res.end('{"ok":true}');
        return;
      case "/not-found":
        res.writeHead(404, { "content-type": "text/html" });
        res.end("<html><body>Not found</body></html>");
        return;
      case "/huge-declared":
        res.writeHead(200, { "content-type": "text/html", "content-length": String(SIX_MB) });
        res.end("a".repeat(SIX_MB));
        return;
      case "/huge-streamed":
        // No Content-Length: the size limit must be enforced while streaming.
        res.writeHead(200, { "content-type": "text/html" });
        for (let i = 0; i < 6; i++) res.write("a".repeat(1024 * 1024));
        res.end();
        return;
      case "/hang":
        return; // Never respond.
      case "/redirect":
        res.writeHead(302, { location: "/" });
        res.end();
        return;
      case "/redirect-loop":
        res.writeHead(302, { location: "/redirect-loop" });
        res.end();
        return;
      case "/redirect-to-loopback":
        res.writeHead(302, { location: `http://127.0.0.1:${port}/secret` });
        res.end();
        return;
      case "/redirect-to-metadata":
        res.writeHead(302, { location: "http://169.254.169.254/latest/meta-data/" });
        res.end();
        return;
      case "/redirect-to-ipv6-loopback":
        res.writeHead(302, { location: "http://[::1]/secret" });
        res.end();
        return;
      case "/redirect-to-10":
        res.writeHead(302, { location: "http://10.0.0.1/secret" });
        res.end();
        return;
      case "/redirect-to-rebind":
        res.writeHead(302, { location: "https://rebind-loopback.test/secret" });
        res.end();
        return;
      case "/gzip":
        res.writeHead(200, { "content-type": "text/html", "content-encoding": "gzip" });
        res.end(gzipSync(RICH_HTML));
        return;
      case "/gzip-bomb":
        res.writeHead(200, {
          "content-type": "text/html",
          "content-encoding": "gzip",
          "content-length": String(GZIP_BOMB.byteLength),
        });
        res.end(GZIP_BOMB);
        return;
      case "/redirect-to-large":
        res.writeHead(302, { location: "/bytes?size=6000000" });
        res.end();
        return;
      case "/slow-body":
        // Sends the headers and part of the body, then stalls.
        res.writeHead(200, { "content-type": "text/html" });
        res.write("<html><head><title>Partial");
        return;
      case "/redirect-to-private-dns":
        res.writeHead(302, { location: "http://private.test/secret" });
        res.end();
        return;
      case "/secret":
        res.writeHead(200, { "content-type": "text/html" });
        res.end("<title>INTERNAL SECRET</title>");
        return;
      case "/json-then-drop":
        // Answers the first request with JSON (not HTML), then drops every later connection.
        if (count === 1) {
          res.writeHead(200, { "content-type": "application/json" });
          res.end('{"ok":true}');
        } else {
          req.socket.destroy();
        }
        return;
      case "/flaky":
        // Serves the page once, then drops every later connection.
        if (count === 1) {
          res.writeHead(200, HTML_HEADERS);
          res.end(RICH_HTML);
        } else {
          req.socket.destroy();
        }
        return;
      default:
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("Not found");
    }
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as AddressInfo).port;

  return {
    port,
    requests,
    openConnections: () =>
      new Promise<number>((resolve, reject) =>
        server.getConnections((error, count) => (error ? reject(error) : resolve(count))),
      ),
    reset() {
      requests.length = 0;
      pathCounts.clear();
      connections.length = 0;
      resetFakeDns();
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

// Starts the stub server and routes this process's DNS and fetch() to it.
export async function setUpTestNetwork(): Promise<StubServer> {
  const stub = await startStubServer();
  installFakeDns();
  installConnectionRouting(stub.port);
  return stub;
}

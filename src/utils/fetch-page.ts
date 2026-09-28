import http from "node:http";
import https from "node:https";
import zlib from "node:zlib";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { lookup } from "node:dns/promises";
import { Readable, pipeline } from "node:stream";

const MAX_REDIRECTS = 5;

// Same limit as fetchPage's HTML limit, applied by safeFetch to any response body.
const MAX_RESPONSE_SIZE = 5_000_000;
const RESPONSE_TOO_LARGE_MESSAGE = "Response is too large";

// Loopback, private, link-local, CGNAT, multicast and reserved ranges.
// IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1) are matched against the IPv4 rules.
const blockedAddresses = new BlockList();

for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv4");
}

for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["::", 96], // IPv4-compatible (deprecated)
  ["64:ff9b:1::", 48], // Local-use NAT64
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10], // Site-local (deprecated)
  ["ff00::", 8],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv6");
}

function isBlockedAddress(address: string): boolean {
  const ipVersion = isIP(address);

  if (ipVersion === 4) {
    return blockedAddresses.check(address, "ipv4");
  }

  if (ipVersion === 6) {
    return blockedAddresses.check(address, "ipv6");
  }

  return false;
}

export function validateUrl(url: string): URL {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are allowed");
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error("URLs with credentials are not allowed");
  }

  // URL keeps IPv6 hosts in brackets ("[::1]"); strip them and any trailing dot.
  const hostname = parsedUrl.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "localhost.localdomain" ||
    hostname === "0.0.0.0" ||
    hostname === "::1"
  ) {
    throw new Error("Localhost URLs are not allowed");
  }

  if (isBlockedAddress(hostname)) {
    throw new Error("Private or link-local IP addresses are not allowed");
  }

  return parsedUrl;
}

// validateUrl plus a DNS check, so hostnames that resolve to private addresses are rejected too.
export async function validatePublicUrl(url: string): Promise<URL> {
  const parsedUrl = validateUrl(url);
  const hostname = parsedUrl.hostname.replace(/^\[|\]$/g, "");

  if (isIP(hostname)) {
    return parsedUrl;
  }

  let addresses: { address: string }[];

  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error(`Could not resolve host: ${hostname}`);
  }

  if (addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new Error(BLOCKED_HOST_MESSAGE);
  }

  return parsedUrl;
}

const BLOCKED_HOST_MESSAGE = "Host resolves to a private or link-local IP address";

// Resolves the hostname again when the socket connects and refuses to connect if any address is blocked.
// The connection can only use addresses returned by this check, so a DNS answer that changes after
// validatePublicUrl (DNS rebinding) cannot point the request at a private address.
const pinnedLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { all: true, verbatim: true }).then(
    (addresses) => {
      if (addresses.some(({ address }) => isBlockedAddress(address))) {
        callback(new Error(BLOCKED_HOST_MESSAGE), "", 0);
        return;
      }

      const family =
        options.family === 4 || options.family === "IPv4" ? 4
        : options.family === 6 || options.family === "IPv6" ? 6
        : 0;
      const matching = family ? addresses.filter((entry) => entry.family === family) : addresses;

      if (matching.length === 0) {
        callback(Object.assign(new Error(`Could not resolve host: ${hostname}`), { code: "ENOTFOUND" }), "", 0);
      } else if (options.all) {
        callback(null, matching);
      } else {
        callback(null, matching[0].address, matching[0].family);
      }
    },
    (error: NodeJS.ErrnoException) => callback(error, "", 0),
  );
};

// The request headers Node's fetch() sends by default, so websites see the same request as before.
const DEFAULT_REQUEST_HEADERS: Record<string, string> = {
  accept: "*/*",
  "accept-language": "*",
  "sec-fetch-mode": "cors",
  "user-agent": "node",
  "accept-encoding": "gzip, deflate",
};

const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304]);

// Decodes gzip/deflate/br bodies as fetch() does; unknown encodings are passed through unchanged.
function decodeBody(body: Readable, contentEncoding: string | null): Readable {
  const codings = (contentEncoding ?? "")
    .toLowerCase()
    .split(",")
    .map((coding) => coding.trim())
    .filter((coding) => coding && coding !== "identity")
    .reverse();

  const flush = { flush: zlib.constants.Z_SYNC_FLUSH, finishFlush: zlib.constants.Z_SYNC_FLUSH };
  const decoders = codings.map((coding) =>
    coding === "gzip" || coding === "x-gzip" ? zlib.createGunzip(flush)
    : coding === "deflate" ? zlib.createInflate(flush)
    : coding === "br" ? zlib.createBrotliDecompress()
    : null,
  );

  if (decoders.length === 0 || decoders.includes(null)) {
    return body;
  }

  return decoders.reduce<Readable>((stream, decoder) => pipeline(stream, decoder!, () => {}), body);
}

// Converts a Node stream to a web ReadableStream, optionally failing it once more than maxBytes have been read
// (whatever Content-Length said). Chunks are only enqueued when the web stream pulls, so an error or cancel can
// never be followed by a late enqueue; Readable.toWeb can throw one asynchronously when a stream fails mid-flow.
function toWebStream(body: Readable, maxBytes?: number): ReadableStream<Uint8Array> {
  const chunks = body[Symbol.asyncIterator]() as AsyncIterator<Buffer>;
  let totalSize = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await chunks.next();

      if (done) {
        controller.close();
        return;
      }

      totalSize += value.byteLength;

      if (maxBytes !== undefined && totalSize > maxBytes) {
        body.destroy();
        throw new Error(RESPONSE_TOO_LARGE_MESSAGE);
      }

      controller.enqueue(new Uint8Array(value));
    },

    async cancel() {
      await chunks.return?.();
      body.destroy();
    },
  });
}

function toResponse(
  message: http.IncomingMessage,
  method: string,
  signal: AbortSignal,
  maxBytes?: number,
): Response {
  const headers = new Headers();

  for (const [name, value] of Object.entries(message.headers)) {
    for (const entry of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      headers.append(name, entry);
    }
  }

  const status = message.statusCode ?? 0;
  const reason = message.statusMessage ?? "";
  const init = { status, statusText: /^[\t\x20-\x7e\x80-\xff]*$/.test(reason) ? reason : "", headers };

  if (method === "HEAD" || NULL_BODY_STATUSES.has(status)) {
    message.resume();
    return new Response(null, init);
  }

  // Keep the timeout active while the body is read, failing the stream the way fetch() does.
  const abort = () => message.destroy(new DOMException("This operation was aborted", "AbortError"));
  signal.addEventListener("abort", abort, { once: true });
  message.once("close", () => signal.removeEventListener("abort", abort));

  const body = decodeBody(message, headers.get("content-encoding"));

  return new Response(toWebStream(body, maxBytes), init);
}

// A fetch() replacement for GET/HEAD requests whose socket only connects to addresses approved by pinnedLookup.
// Redirects are not followed; callers handle and validate them.
function pinnedFetch(url: URL, init: RequestInit, signal: AbortSignal, maxBytes?: number): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = { ...DEFAULT_REQUEST_HEADERS };

  new Headers(init.headers).forEach((value, name) => {
    headers[name] = value;
  });

  const client = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const request = client.request(
      url,
      { method, headers, signal, lookup: pinnedLookup, agent: false },
      (message) => {
        try {
          resolve(toResponse(message, method, signal, maxBytes));
        } catch (error) {
          message.destroy();
          reject(error);
        }
      },
    );

    request.on("error", reject);
    request.end();
  });
}

// A fetch()-style request with the same URL validation as fetchPage: every redirect hop is checked and the request times out.
// Returns the raw Response for analyzers that need status codes, headers or timing. Any content type is
// allowed (robots.txt, sitemap checks), but bodies over MAX_RESPONSE_SIZE are rejected: up front when
// Content-Length declares it, otherwise while the body is read.
export async function safeFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  let currentUrl = await validatePublicUrl(url);
  const signal = AbortSignal.timeout(10000);

  for (let redirectCount = 0; ; redirectCount++) {
    let response: Response;

    try {
      response = await pinnedFetch(currentUrl, init, signal, MAX_RESPONSE_SIZE);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError")
      ) {
        throw new Error("Website request timed out after 10 seconds");
      }

      throw error;
    }

    const location = response.headers.get("location");

    if (response.status < 300 || response.status >= 400 || !location) {
      // HEAD and other bodiless responses are exempt: their Content-Length describes a body that is never read.
      const declaredSize = Number(response.headers.get("content-length"));

      if (response.body && Number.isFinite(declaredSize) && declaredSize > MAX_RESPONSE_SIZE) {
        await response.body.cancel();
        throw new Error(RESPONSE_TOO_LARGE_MESSAGE);
      }

      return response;
    }

    await response.body?.cancel();

    if (redirectCount >= MAX_REDIRECTS) {
      throw new Error("Too many redirects");
    }

    currentUrl = await validatePublicUrl(
      new URL(location, currentUrl).toString(),
    );
  }
}

// Cancels a response body that won't be read, closing its connection now instead of leaving it open
// until the server (or, for safeFetch, the 10 second timeout) closes it.
export async function discardBody(response: Response): Promise<void> {
  await response.body?.cancel().catch(() => {});
}

// A page fetched by fetchPageDetails: the HTML plus what the final response looked like.
export interface FetchedPage {
  html: string;
  status: number;
  headers: Headers;
  // Time from the start of the call (URL and DNS validation included) until the body was read.
  responseTimeMs: number;
}

export async function fetchPage(url: string): Promise<string> {
  return (await fetchPageDetails(url)).html;
}

// fetchPage, also returning the final response's status and headers and the request's duration,
// so analyze_website can share one page request with analyzers that need more than the HTML.
export async function fetchPageDetails(url: string): Promise<FetchedPage> {
  const startTime = performance.now();
  let currentUrl = await validatePublicUrl(url);

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {
    let response: Response;
    let redirectCount = 0;

    // Follow redirects manually so every hop is validated, not just the first URL.
    while (true) {
      try {
        response = await pinnedFetch(currentUrl, {}, controller.signal);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Website request timed out after 10 seconds");
        }

        throw new Error(
          `Failed to fetch website: ${
            error instanceof Error ? error.message : "Unknown network error"
          }`,
        );
      }

      const location = response.headers.get("location");

      if (response.status < 300 || response.status >= 400 || !location) {
        break;
      }

      await response.body?.cancel();

      redirectCount++;

      if (redirectCount > MAX_REDIRECTS) {
        throw new Error("Too many redirects");
      }

      currentUrl = await validatePublicUrl(
        new URL(location, currentUrl).toString(),
      );
    }

    // Each rejection below discards the unread body; the timeout is cleared on return, so nothing else would close it.
    if (!response.ok) {
      await discardBody(response);
      throw new Error(
        `Failed to fetch website: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("text/html")) {
      await discardBody(response);
      throw new Error("Website did not return HTML content");
    }

    const contentLength = response.headers.get("content-length");

    if (contentLength) {
      const size = Number(contentLength);

      if (Number.isFinite(size) && size > 5_000_000) {
        await discardBody(response);
        throw new Error("HTML response is too large");
      }
    }

    const MAX_HTML_SIZE = 5_000_000;

    if (!response.body) {
      throw new Error("Response body is empty");
    }

    const reader = response.body.getReader();

    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        if (value) {
          totalSize += value.byteLength;

          if (totalSize > MAX_HTML_SIZE) {
            await reader.cancel();
            throw new Error("HTML response is too large");
          }

          chunks.push(value);
        }
      }
    } finally {
      reader.releaseLock();
    }

    const result = new Uint8Array(totalSize);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const html = new TextDecoder().decode(result);

    return {
      html,
      status: response.status,
      headers: response.headers,
      responseTimeMs: Math.round(performance.now() - startTime),
    };
  } finally {
    clearTimeout(timeout);
  }
}
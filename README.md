# Website Intelligence MCP

An [MCP](https://modelcontextprotocol.io) server that analyzes a public webpage for SEO, metadata, and technical signals. It runs over stdio and exposes 27 tools: 26 single-purpose analyzers, plus `analyze_website`, which runs all 26 in one call.

Source code and issues: [github.com/sandipprajapatiinic/website-intelligence-mcp](https://github.com/sandipprajapatiinic/website-intelligence-mcp).

Every tool takes one required input, `url` (an HTTP or HTTPS URL), and returns its result as JSON in a single text content item.

## Installation

Requires Node.js 22 or later (`engines: >=22`; tested on 22.17).

```bash
git clone https://github.com/sandipprajapatiinic/website-intelligence-mcp.git
cd website-intelligence-mcp
npm install
npm run build
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Runs the server from source with `tsx src/server.ts` |
| `npm run build` | Deletes `dist/`, then compiles `src/` to `dist/` with `tsc` |
| `npm run start` | Runs the compiled server, `node dist/server.js` (run `npm run build` first) |
| `npm run typecheck` | Type-checks the source, the tests, and `src/test-client.ts` without emitting files |
| `npm test` | Runs the automated test suite (see [Testing](#testing)) |

`npm pack` and `npm publish` build first (`prepack`), and `npm publish` also runs the typecheck and tests (`prepublishOnly`). The package contains only `dist/`, `README.md`, `LICENSE`, and `package.json`. It installs a `website-intelligence-mcp` command that starts the compiled server.

`main` also points to `dist/server.js`. The package is a command-line server, not a library: importing it starts the server, and it exports nothing.

## Using it from an MCP client

The server uses the stdio transport. stdout carries only MCP protocol messages, and all logging (the startup message and per-analyzer progress) goes to stderr.

Register it as a stdio server. From a checkout, after `npm run build`:

```json
{
  "mcpServers": {
    "website-intelligence": {
      "command": "node",
      "args": ["/absolute/path/to/website-intelligence-mcp/dist/server.js"]
    }
  }
}
```

If the package is installed, use `"command": "website-intelligence-mcp"` with no arguments. It can be installed globally from a checkout or from a tarball made by `npm pack`:

```bash
npm install -g /path/to/website-intelligence-mcp          # a checkout (run npm run build first)
npm install -g ./website-intelligence-mcp-1.0.0.tgz       # a tarball
```

The package isn't on the npm registry yet. Once it's published, `npm install -g website-intelligence-mcp` will install the same command.

To run from source instead, use `"command": "npx"` with `"args": ["tsx", "/absolute/path/to/website-intelligence-mcp/src/server.ts"]`.

Don't launch it through `npm start` or `npm run dev`: npm prints its own banner to stdout before the server starts, which breaks the MCP protocol stream.

## Tools

Descriptions are the ones the server registers.

| Tool | Description |
|---|---|
| `analyze_title` | Analyze the title tag of a webpage |
| `analyze_meta` | Analyze the meta description of a webpage |
| `analyze_headings` | Analyze the heading structure of a webpage |
| `analyze_images` | Analyze images and their alt attributes on a webpage |
| `analyze_links` | Analyze the links on a webpage |
| `analyze_canonical` | Analyze the canonical URL of a webpage |
| `analyze_robots` | Analyze the robots meta directive of a webpage |
| `analyze_open_graph` | Analyze Open Graph metadata of a webpage |
| `analyze_schema` | Validate JSON-LD schema objects of a webpage and count valid and invalid schemas |
| `analyze_viewport` | Analyze the viewport meta tag of a webpage |
| `analyze_lang` | Analyze the HTML lang attribute of a webpage |
| `analyze_favicon` | Analyze the favicon of a webpage |
| `analyze_hreflang` | Analyze hreflang declarations of a webpage |
| `analyze_charset` | Analyze the character encoding of a webpage |
| `analyze_ssl` | Analyze whether a webpage uses HTTPS |
| `analyze_sitemap` | Analyze the sitemap availability of a webpage |
| `analyze_robots_txt` | Analyze the robots.txt file of a webpage |
| `analyze_performance` | Analyze basic page performance metrics |
| `analyze_security` | Analyze basic HTTPS and security headers |
| `analyze_social` | Analyze Open Graph and Twitter Card metadata |
| `analyze_mobile` | Analyze mobile viewport and responsive configuration |
| `analyze_technology` | Analyze basic technology and platform signals |
| `analyze_accessibility` | Analyze basic accessibility issues |
| `analyze_content` | Analyze basic content quality and structure |
| `analyze_structured_data` | Summarize JSON-LD structured data blocks of a webpage and flag empty or invalid blocks |
| `analyze_technical` | Analyze basic technical SEO configuration |
| `analyze_website` | Run a complete website intelligence analysis |

Notes on specific tools:

- `analyze_ssl` only inspects the URL's protocol and makes no request.
- `analyze_sitemap` sends a HEAD request for `/sitemap.xml` at the page's origin.
- `analyze_robots_txt` fetches `/robots.txt` at the page's origin. A missing or unreadable file is reported as `missing`, not as an error.
- `analyze_performance` times one request for the page and reports its status code, HTML size, and response time.
- `analyze_security` checks HTTPS and the `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy` headers.

Every analyzer result has the same common fields:
- `url` comes first.
- The analyzer-specific fields follow.
- It ends with `status`, `issues` (an array of strings) and `recommendation` (a string).

`status` values are specific to each analyzer, for example `good`, `needs_improvement`, `missing`, `poor`, `critical` or `invalid`. `error` is never used by an analyzer; it only marks a failed section in `analyze_website`.

The TypeScript types for these results are in `src/types/analyzer-result.ts`:
- `AnalyzerResultBase`: the common fields.
- `AnalyzerResult<Analysis>`: the common fields plus one analyzer's own fields and status values.
- `AnalyzerErrorResult`: a failed `analyze_website` section.
- `WebsiteAnalysisResult`: the whole `analyze_website` result.

## `analyze_website`

`analyze_website` runs all 26 analyzers against one URL:

1. It validates the URL, including the DNS check, before any request is made. If the URL is rejected, the whole call fails.
2. It fetches the page once for this call and shares it:
   - the HTML goes to the 21 analyzers that only read HTML
   - the final response's timing and status go to performance
   - its headers go to security
   - its HTML and headers go to technology

   Nothing is cached or shared between calls.
3. The analyzers then run concurrently.

A full run makes 3 requests: the page, `/robots.txt`, and a HEAD request for `/sitemap.xml`. robots.txt and the sitemap are separate resources, so they always need their own requests. When a tool is called on its own, it fetches what it needs itself.

The result has 26 sections under `analyses`, in this order: `title`, `meta`, `headings`, `images`, `links`, `canonical`, `robots`, `openGraph`, `schema`, `viewport`, `lang`, `favicon`, `hreflang`, `charset`, `ssl`, `sitemap`, `robotsTxt`, `performance`, `security`, `social`, `mobile`, `technology`, `accessibility`, `content`, `structuredData`, `technical`. Each section is the same result the matching individual tool returns (apart from timing values such as `responseTimeMs`).

```json
{
  "url": "https://example.com",
  "status": "completed",
  "analyses": {
    "title": { "...": "..." },
    "meta": { "...": "..." }
  }
}
```

If an analyzer fails, the others still complete:
- The failed analyzer's section becomes `{ "url": "<url>", "status": "error", "error": "<message>" }`.
- The top-level `status` becomes `completed_with_errors`, and a `failedAnalyzers` array lists the failed section names.

If the shared page fetch fails (for example, the page isn't HTML), the 21 sections that need the HTML each report `Page could not be fetched: <reason>`. `ssl` and `robotsTxt` still run. `performance`, `security`, and `technology` fall back to their own page request, which accepts any status and content type, just as when they're called on their own.

## Error handling

| Situation | What the MCP client receives |
|---|---|
| Success | The JSON result as text |
| `url` missing or not a URL | `isError: true`, text `Input validation error: Invalid arguments for tool <name>: url: Invalid URL` |
| URL rejected by the security rules, or the request fails | `isError: true`, with the error message as plain text (for example `Localhost URLs are not allowed`) |
| Some analyzers fail inside `analyze_website` | A normal result with `status: "completed_with_errors"` (see above) |

A failed call doesn't stop the server.

## Security / SSRF protections

All outbound requests go through `src/utils/fetch-page.ts`; nothing calls `fetch()` directly. It has two entry points:

- **`fetchPage(url)`** returns a page's HTML. It is used by the HTML analyzers and by `analyze_website`'s shared fetch, and it requires a `2xx` status and a `text/html` content type.
- **`safeFetch(url, init)`** returns the raw response (status, headers, body). It is used where the status, headers, or timing matter (performance, security, technology), for robots.txt and the sitemap check, and by the HTML analyzers that read the page directly. It accepts any content type, because robots.txt is plain text and the sitemap check is a HEAD request for an XML file.

Both apply the same rules:

- **HTTP and HTTPS only:** other protocols (`ftp:`, `file:`, `data:`, `javascript:`, …) are rejected.
- **No credentials:** URLs containing a username or password are rejected.
- **No localhost:** `localhost`, `localhost.`, `*.localhost`, `localhost.localdomain`, `0.0.0.0`, and `[::1]` are rejected.
- **Blocked IPv4 ranges:**
  - `0.0.0.0/8`, `10.0.0.0/8`, `100.64.0.0/10`, `127.0.0.0/8`, `169.254.0.0/16` (including the cloud metadata address `169.254.169.254`)
  - `172.16.0.0/12`, `192.0.0.0/24`, `192.168.0.0/16`, `198.18.0.0/15`
  - `224.0.0.0/4` and `240.0.0.0/4`
- **Blocked IPv6 ranges:**
  - `::`, `::1`, and the IPv4-compatible `::/96`
  - `fc00::/7`, `fe80::/10`, `fec0::/10`, and `ff00::/8`
  - NAT64 `64:ff9b::/96` and `64:ff9b:1::/48`

  IPv4-mapped addresses such as `::ffff:127.0.0.1` are checked against the IPv4 ranges. Encoded forms such as `2130706433` or `0x7f000001` are normalized by the URL parser and caught.
- **DNS check:** before a request, the hostname is resolved, and it is rejected if any address it resolves to is blocked.
- **DNS rebinding protection:** requests use Node's built-in `http`/`https` modules with a DNS `lookup` hook. The hook resolves the hostname again when the socket connects and refuses to connect if any address is blocked. The connection can only use addresses that passed that check, so a hostname that resolves to a public address during validation and a private one at connect time is refused.
- **Redirects:** followed manually, at most 5, and every hop gets the full URL, DNS, and connect-time checks. A redirect to a blocked address is refused before any request is sent to it.
- **Timeout:** each call is aborted after 10 seconds, covering redirects and reading the body. A request that gets no response reports `Website request timed out after 10 seconds`.
- **Size limit:** 5 MB, meaning 5,000,000 bytes of decoded body.
  - A declared `Content-Length` over the limit is rejected before the body is read.
  - The limit is enforced again while streaming, so a missing or misleading `Content-Length` is still caught. That includes a small gzip body that decompresses to more than 5 MB.
  - `fetchPage` reports `HTML response is too large`, and `safeFetch` reports `Response is too large`.
  - `safeFetch` HEAD requests are exempt because no body is read.
- **Unread bodies:** when a response is rejected, or only its headers are needed, its body is discarded right away, so the connection closes instead of staying open.

## Testing

```bash
npm test
```

Runs 199 tests with Node's built-in test runner (`node:test`), in about 11 seconds. Most of that is one check of the 10-second timeout.

The suite is deterministic and doesn't need internet access:
- **Stub server:** a local HTTP server serves the test pages, redirects, oversized bodies, stalled responses, and gzip responses.
- **Local DNS:** every DNS lookup is answered locally. That includes hostnames whose answer changes after the first lookup, which are used to test DNS rebinding.
- **Routing:** connections are routed to the stub only after the production connect-time DNS check has approved them. A connection to any other host, a connection without that check, or a `fetch()` call fails the test.

The production URL, DNS, redirect, timeout, size, and content-type checks run unchanged.

| File | Covers |
|---|---|
| `test/url-validation.test.ts` | URL, protocol, credential, localhost, IP-range, and DNS validation |
| `test/fetch-page.test.ts` | `fetchPage`, `fetchPageDetails`, and `safeFetch`: success, redirects, content type, status codes, size limits, gzip, closing connections for unread bodies, timeouts |
| `test/dns-rebinding.test.ts` | The connect-time DNS check, for direct requests, redirects, analyzers, and `analyze_website` |
| `test/analyzers.test.ts` | All 26 analyzers on a fully populated page and on a bare page, the common result fields, each analyzer's field names and order, and network usage |
| `test/analyzer-result.test.ts` | The shared result types (compile-time checks run by `npm run typecheck`) |
| `test/analyze-website.test.ts` | The combined result and its 26 sections (compared with direct analyzer calls), the single page fetch and 3-request budget, no sharing between calls, and partial errors |
| `test/mcp-server.test.ts` | Starts the real stdio server: registration of all 27 tools, their input schemas, tool calls, and rejection of unsafe URLs |

## Example usage

`src/test-client.ts` starts the server from source, lists its tools, and calls `analyze_website` on `https://example.com`. It needs internet access, and it isn't part of the build.

```bash
npx tsx src/test-client.ts
```

Calling `analyze_title` with `{ "url": "https://example.com" }` returns:

```json
{
  "url": "https://example.com",
  "title": "Example Domain",
  "length": 14,
  "hasTitle": true,
  "status": "needs_improvement",
  "issues": ["Title is very short"],
  "recommendation": "Make the title more descriptive and useful to searchers."
}
```

## Known limitations

- **No JavaScript rendering:** analyzers read the HTML the server returns, so content added by client-side JavaScript isn't seen.
- **`safeFetch` doesn't check content type:** analyzers that read the page through it (performance, security, technology, and the HTML analyzers that fetch the page themselves) accept any content type. Only `fetchPage` requires `text/html`.
- **Sitemap detection:** `analyze_sitemap` only checks `/sitemap.xml` with a HEAD request. It doesn't read `Sitemap:` lines in robots.txt, and it reports `missing` if the server rejects HEAD requests.
- **Responses over 5 MB:** analyzers report an error instead of analyzing a partial page. An oversized robots.txt is reported as `missing`.
- **HTTPS in the test suite:** the stub server is plain HTTP, so `npm test` doesn't exercise real TLS connections.
- **Ports and concurrency:** any port on a public host is allowed (for example `:8080`), and there's no limit on how many tool calls or requests run at once.

## License

[MIT](LICENSE) © 2026 Sandip Prajapati

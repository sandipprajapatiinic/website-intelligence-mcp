# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-10-27

### Added

- `analyze_sitemap` now reads `Sitemap:` lines from the origin's robots.txt and
  checks the first declared sitemap that exists, at any path, instead of only
  looking at `/sitemap.xml`.
- The sitemap result gained two fields: `source` (`robots_txt` or
  `well_known`) and `declaredInRobotsTxt`.
- A GitHub Actions CI workflow running the typecheck, tests, and build on
  Node 22 and 24.
- This changelog.

### Changed

- A sitemap found only at `/sitemap.xml`, with no `Sitemap:` line in
  robots.txt, is now `needs_improvement` rather than `good`, because crawlers
  can't discover it from robots.txt.
- `analyze_sitemap` no longer fetches the page HTML, which it never used. It
  validates the URL itself, so unsafe URLs are still rejected before any
  request.
- `analyze_website` fetches robots.txt once and shares it with the `robotsTxt`
  and `sitemap` analyzers, keeping a full run at 3 requests.

### Fixed

- A sitemap is no longer reported as `missing` when the server rejects HEAD
  requests; the check is retried with GET on 403, 405 and 501.

## [1.0.2] - 2026-10-14

### Fixed

- Corrected several SEO analyzer rules so statuses and issue lists match the
  documented thresholds.

## [1.0.1] - 2026-10-13

### Fixed

- Aligned structured data schema detection between `analyze_structured_data`
  and `analyze_schema`, so both agree on which JSON-LD blocks are valid.

## [1.0.0] - 2026-09-28

### Added

- Initial release: an MCP stdio server exposing 27 tools — 26 single-purpose
  webpage analyzers plus `analyze_website`, which runs all 26 in one call and
  shares a single page fetch between them.
- SSRF-safe fetching in `src/utils/fetch-page.ts`: HTTP/HTTPS only, no
  credentials in URLs, blocked private and reserved IP ranges, a DNS check
  before each request, connect-time DNS rebinding protection, manual redirect
  following with full checks on every hop, a 10-second timeout, and a 5 MB
  response size limit.
- A deterministic test suite that needs no internet access, using a local stub
  server and a local DNS resolver.

[Unreleased]: https://github.com/sandipprajapatiinic/website-intelligence-mcp/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/sandipprajapatiinic/website-intelligence-mcp/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/sandipprajapatiinic/website-intelligence-mcp/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/sandipprajapatiinic/website-intelligence-mcp/releases/tag/v1.0.1

// HTML fixtures served by the stub server. Every value asserted in the tests comes from here.

export const RICH_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Stub Site Home Page for Automated Testing</title>
  <meta name="description" content="A deterministic stub page used by the Website Intelligence MCP test suite to verify every analyzer without touching the internet.">
  <meta name="robots" content="index, follow">
  <meta name="generator" content="WordPress 6.5">
  <link rel="canonical" href="https://site.test/">
  <link rel="icon" href="/favicon.ico">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="alternate" hreflang="en" href="https://site.test/">
  <link rel="alternate" hreflang="fr" href="https://site.test/fr/">
  <link rel="alternate" hreflang="x-default" href="https://site.test/">
  <meta property="og:title" content="Stub Site">
  <meta property="og:description" content="Stub Open Graph description">
  <meta property="og:image" content="https://site.test/og.png">
  <meta property="og:url" content="https://site.test/">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Stub Site">
  <meta name="twitter:description" content="Stub Twitter description">
  <meta name="twitter:image" content="https://site.test/og.png">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Stub Site","url":"https://site.test/"}</script>
  <script src="/wp-content/themes/stub/app.js"></script>
</head>
<body>
  <h1>Welcome to the Stub Site</h1>
  <h2>First section</h2>
  <p>This paragraph contains enough words to be counted by the content analyzer during testing.</p>
  <h2>Second section</h2>
  <h3>Details</h3>
  <p>Another paragraph with some more words for the content analyzer.</p>
  <img src="/a.png" alt="A descriptive alt text">
  <img src="/b.png">
  <a href="/about">About us</a>
  <a href="https://external.test/">External site</a>
  <a href="/empty"></a>
  <button>Submit</button>
  <button></button>
  <label for="email">Email</label>
  <input id="email" type="email">
  <input type="text">
</body>
</html>`;

export const BARE_HTML = `<html><head></head><body></body></html>`;

export const INVALID_SCHEMA_HTML = `<!DOCTYPE html>
<html lang="en"><head><title>Invalid schema page for tests</title>
<script type="application/ld+json">{ this is not json }</script>
</head><body><h1>Invalid schema</h1></body></html>`;

export const ROBOTS_TXT = `User-agent: *
Allow: /
Sitemap: https://site.test/sitemap.xml
`;

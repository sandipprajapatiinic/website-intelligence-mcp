import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { analyzeStructuredDataRules } from "../src/seo/structured-data-rules.js";
import { analyzeStructuredData } from "../src/tools/analyze-structured-data.js";
import { analyzeSchema } from "../src/tools/analyze-schema.js";

const URL = "https://site.test/";

function page(...blocks: string[]): string {
  const scripts = blocks.map((block) => `<script type="application/ld+json">${block}</script>`).join("");
  return `<html><head>${scripts}</head><body></body></html>`;
}

const NO_JSON_LD = page();
const INVALID = page("{ this is not json }");
const NO_TYPE = page('{"@context":"https://schema.org","name":"Stub Site"}');
const BLANK_TYPE = page('{"@context":"https://schema.org","@type":"  "}');
const TYPED = page('{"@context":"https://schema.org","@type":"Organization","name":"Stub Site"}');

describe("analyzeStructuredDataRules status", () => {
  test("no JSON-LD is needs_improvement", () => {
    const result = analyzeStructuredDataRules(NO_JSON_LD);

    assert.equal(result.status, "needs_improvement");
    assert.deepEqual(result.issues, ["No JSON-LD structured data found"]);
    assert.equal(result.jsonLdCount, 0);
  });

  test("invalid JSON-LD is poor", () => {
    const result = analyzeStructuredDataRules(INVALID);

    assert.equal(result.status, "poor");
    assert.deepEqual(result.issues, ["Invalid JSON-LD structured data found"]);
  });

  test("JSON-LD without @type is needs_improvement", () => {
    const result = analyzeStructuredDataRules(NO_TYPE);

    assert.equal(result.status, "needs_improvement");
    assert.deepEqual(result.issues, ["JSON-LD is present but no @type was detected"]);
    assert.deepEqual(result.schemaTypes, []);
    assert.equal(result.schemaCount, 1);
  });

  test("JSON-LD with only a blank @type is needs_improvement", () => {
    const result = analyzeStructuredDataRules(BLANK_TYPE);

    assert.equal(result.status, "needs_improvement");
    assert.deepEqual(result.issues, ["JSON-LD is present but no @type was detected"]);
  });

  test("invalid JSON-LD stays poor when the valid blocks have no @type", () => {
    const html = page("{ this is not json }", '{"name":"Stub Site"}');

    assert.equal(analyzeStructuredDataRules(html).status, "poor");
  });

  test("valid JSON-LD with @type is good", () => {
    const result = analyzeStructuredDataRules(TYPED);

    assert.equal(result.status, "good");
    assert.deepEqual(result.issues, []);
    assert.deepEqual(result.schemaTypes, ["Organization"]);
    assert.equal(result.recommendation, "Valid JSON-LD structured data was detected.");
  });

  test("a typed schema alongside an untyped one is good", () => {
    const html = page('[{"name":"Untyped"},{"@type":"WebSite"}]');

    assert.equal(analyzeStructuredDataRules(html).status, "good");
  });
});

describe("analyze_structured_data agrees with analyze_schema", () => {
  // Each analyzer keeps its own status values: schema uses "missing" and "invalid"
  // where structured data uses "needs_improvement" and "poor".
  const cases = [
    { name: "no JSON-LD", html: NO_JSON_LD, schema: "missing", structuredData: "needs_improvement" },
    { name: "invalid JSON-LD", html: INVALID, schema: "invalid", structuredData: "poor" },
    { name: "JSON-LD without @type", html: NO_TYPE, schema: "needs_improvement", structuredData: "needs_improvement" },
    { name: "JSON-LD with a blank @type", html: BLANK_TYPE, schema: "needs_improvement", structuredData: "needs_improvement" },
    { name: "JSON-LD with @type", html: TYPED, schema: "good", structuredData: "good" },
  ];

  for (const c of cases) {
    test(c.name, async () => {
      // Pre-fetched HTML: no request is made.
      assert.equal((await analyzeSchema(URL, c.html)).status, c.schema);
      assert.equal((await analyzeStructuredData(URL, c.html)).status, c.structuredData);
    });
  }
});

// End-to-end tests: starts src/server.ts as a real stdio MCP server and talks to it with the MCP client.
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { startStubServer, type StubServer } from "./helpers/network.js";
import { EXPECTED_TOOLS, SECTION_KEYS } from "./helpers/expected.js";

const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));

type ToolResult = { isError?: boolean; content: { type: string; text: string }[] };

let stub: StubServer;
let client: Client;

before(async () => {
  stub = await startStubServer();

  // The child loads child-preload.ts so its DNS and connections use the stub network too.
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", "--import", "./test/helpers/child-preload.ts", "src/server.ts"],
    cwd: PROJECT_ROOT,
    env: { ...process.env, STUB_PORT: String(stub.port) } as Record<string, string>,
    stderr: "ignore",
  });

  client = new Client({ name: "website-intelligence-test", version: "1.0.0" });
  await client.connect(transport);
});

after(async () => {
  await client?.close();
  await stub?.close();
});

beforeEach(() => stub.reset());

async function call(name: string, url: unknown): Promise<ToolResult> {
  return (await client.callTool({ name, arguments: { url } })) as ToolResult;
}

function parse(result: ToolResult) {
  assert.ok(!result.isError, `unexpected error: ${result.content[0]?.text}`);
  assert.equal(result.content.length, 1);
  assert.equal(result.content[0].type, "text");
  return JSON.parse(result.content[0].text);
}

describe("tool registration", () => {
  test("registers exactly the 27 expected tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    assert.equal(names.length, 27);
    assert.equal(new Set(names).size, names.length, "duplicate tool names");
    assert.deepEqual([...names].sort(), [...EXPECTED_TOOLS].sort());
  });

  test("every tool has a description and a required string url input", async () => {
    const { tools } = await client.listTools();

    for (const tool of tools) {
      assert.ok(tool.description?.trim(), `${tool.name} has no description`);

      const schema = tool.inputSchema as {
        type: string;
        properties?: Record<string, { type?: string }>;
        required?: string[];
      };

      assert.equal(schema.type, "object", tool.name);
      assert.equal(schema.properties?.url?.type, "string", tool.name);
      assert.deepEqual(schema.required, ["url"], tool.name);
    }
  });
});

describe("tool calls", () => {
  test("every analyzer tool returns JSON for the stub site", async () => {
    for (const name of EXPECTED_TOOLS.filter((n) => n !== "analyze_website")) {
      const json = parse(await call(name, "https://site.test/"));
      assert.equal(json.url, "https://site.test/", name);
      assert.equal(typeof json.status, "string", name);
      assert.ok(Array.isArray(json.issues), name);
    }
  });

  test("analyze_title returns the page title", async () => {
    const json = parse(await call("analyze_title", "https://site.test/"));
    assert.equal(json.title, "Stub Site Home Page for Automated Testing");
    assert.equal(json.status, "good");
  });

  test("analyze_website returns a completed result with 26 sections", async () => {
    const json = parse(await call("analyze_website", "https://site.test/"));

    assert.equal(json.status, "completed");
    assert.equal(json.url, "https://site.test/");
    assert.deepEqual(Object.keys(json.analyses), SECTION_KEYS);
  });

  test("analyze_website reports partial errors over MCP", async () => {
    const json = parse(await call("analyze_website", "https://site.test/json-then-drop"));

    assert.equal(json.status, "completed_with_errors");
    assert.equal(json.failedAnalyzers.length, 24);
    assert.ok(json.failedAnalyzers.includes("performance"));
    assert.equal(json.analyses.ssl.status, "good");
  });
});

describe("input validation and security over MCP", () => {
  test("rejects values that are not URLs", async () => {
    for (const url of ["not a url", "", 42, null]) {
      const result = await call("analyze_title", url);
      assert.equal(result.isError, true, `accepted ${JSON.stringify(url)}`);
    }
  });

  test("every request-making tool rejects unsafe URLs without making a request", async () => {
    const unsafe = [
      "http://localhost/",
      `http://127.0.0.1:${stub.port}/`,
      "http://[::1]/",
      "http://10.0.0.1/",
      "http://169.254.169.254/latest/meta-data/",
      "http://private.test/",
      "https://user:pass@site.test/",
      "ftp://site.test/",
      "file:///etc/passwd",
    ];

    for (const name of EXPECTED_TOOLS.filter((n) => n !== "analyze_ssl")) {
      for (const url of unsafe) {
        const result = await call(name, url);
        assert.equal(result.isError, true, `${name} accepted ${url}`);
      }
    }

    assert.equal(stub.requests.length, 0);
  });

  test("tools do not connect to a host that rebinds to a private address", async () => {
    const result = await call("analyze_title", "https://rebind-metadata.test/");
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Host resolves to a private or link-local IP address/);
    assert.equal(stub.requests.length, 0);
  });

  test("returns the validation message as the error text", async () => {
    const result = await call("analyze_title", "http://localhost/");
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Localhost URLs are not allowed/);
  });

  test("the server keeps working after errors", async () => {
    await call("analyze_title", "https://site.test/json");
    await call("analyze_website", "https://does-not-exist.invalid/");

    const json = parse(await call("analyze_ssl", "https://site.test/"));
    assert.equal(json.isHttps, true);
  });
});

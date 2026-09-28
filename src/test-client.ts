import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

console.log("1. Creating client...");

const client = new Client({
  name: "website-intelligence-test-client",
  version: "1.0.0",
});

const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "src/server.ts"],
});

console.log("2. Connecting to MCP server...");

await client.connect(transport);

console.log("3. Connected!");

const tools = await client.listTools();

console.log("4. Tools received:");
console.log(tools.tools);

console.log("5. Calling analyze_website...");

const result = await client.callTool({
  name: "analyze_website",
  arguments: {
    url: "https://example.com",
  },
});

console.log("6. Tool result:");
console.log(result);
await client.close();

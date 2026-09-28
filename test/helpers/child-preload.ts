// Loaded with --import into the MCP server child process so its DNS and connections use the test network.
import { installFakeDns, installConnectionRouting } from "./network.js";

const port = Number(process.env.STUB_PORT);

if (!port) {
  throw new Error("STUB_PORT is not set");
}

installFakeDns();
installConnectionRouting(port);

#!/usr/bin/env node
import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { analyzeTitle } from "./tools/analyze-title.js";
import { analyzeMeta } from "./tools/analyze-meta.js";
import { analyzeHeadings } from "./tools/analyze-headings.js";
import { analyzeImages } from "./tools/analyze-images.js";
import { analyzeLinks } from "./tools/analyze-links.js";
import { analyzeCanonical } from "./tools/analyze-canonical.js";
import { analyzeRobots } from "./tools/analyze-robots.js";
import { analyzeOpenGraph } from "./tools/analyze-open-graph.js";
import { analyzeSchema } from "./tools/analyze-schema.js";
import { analyzeViewport } from "./tools/analyze-viewport.js";
import { analyzeLang } from "./tools/analyze-lang.js";
import { analyzeFavicon } from "./tools/analyze-favicon.js";
import { analyzeHreflang } from "./tools/analyze-hreflang.js";
import { analyzeCharset } from "./tools/analyze-charset.js";
import { analyzeSsl } from "./tools/analyze-ssl.js";
import { analyzeSitemap } from "./tools/analyze-sitemap.js";
import { analyzeRobotsTxt } from "./tools/analyze-robots-txt.js";
import { analyzePerformance } from "./tools/analyze-performance.js";
import { analyzeSecurity } from "./tools/analyze-security.js";
import { analyzeSocial } from "./tools/analyze-social.js";
import { analyzeMobile } from "./tools/analyze-mobile.js";
import { analyzeTechnology } from "./tools/analyze-technology.js";
import { analyzeAccessibility } from "./tools/analyze-accessibility.js";
import { analyzeContent } from "./tools/analyze-content.js";
import { analyzeStructuredData } from "./tools/analyze-structured-data.js";
import { analyzeTechnical } from "./tools/analyze-technical.js";
import { analyzeWebsite } from "./tools/analyze-website/analyze-website.js";

// Report the package version (package.json sits one level above both src/ and dist/).
const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

const server = new McpServer({
  name: "website-intelligence-mcp",
  version,
});

server.registerTool(
  "analyze_title",
  {
    description: "Analyze the title tag of a webpage",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzeTitle(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_meta",
  {
    description: "Analyze the meta description of a webpage",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzeMeta(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_headings",
  {
    description: "Analyze the heading structure of a webpage",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzeHeadings(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_images",
  {
    description: "Analyze images and their alt attributes on a webpage",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzeImages(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_links",
  {
    description: "Analyze the links on a webpage",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzeLinks(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_canonical",
  {
    description: "Analyze the canonical URL of a webpage",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzeCanonical(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_robots",
  {
    description: "Analyze the robots meta directive of a webpage",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzeRobots(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_open_graph",
  {
    description: "Analyze Open Graph metadata of a webpage",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzeOpenGraph(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_schema",
  {
    description: "Validate JSON-LD schema objects of a webpage and count valid and invalid schemas",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzeSchema(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_viewport",
  {
    description: "Analyze the viewport meta tag of a webpage",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzeViewport(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_lang",
  {
    description: "Analyze the HTML lang attribute of a webpage",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzeLang(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_favicon",
  {
    description: "Analyze the favicon of a webpage",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzeFavicon(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_hreflang",
  {
    description: "Analyze hreflang declarations of a webpage",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzeHreflang(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_charset",
  {
    description: "Analyze the character encoding of a webpage",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzeCharset(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_ssl",
  {
    description: "Analyze whether a webpage uses HTTPS",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzeSsl(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_sitemap",
  {
    description: "Analyze the sitemap availability of a webpage",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzeSitemap(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_robots_txt",
  {
    description: "Analyze the robots.txt file of a webpage",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzeRobotsTxt(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_performance",
  {
    description: "Analyze basic page performance metrics",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzePerformance(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_security",
  {
    description: "Analyze basic HTTPS and security headers",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzeSecurity(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_social",
  {
    description: "Analyze Open Graph and Twitter Card metadata",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzeSocial(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_mobile",
  {
    description: "Analyze mobile viewport and responsive configuration",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzeMobile(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_technology",
  {
    description: "Analyze basic technology and platform signals",

    inputSchema: {
      url: z.string().url(),
    },
  },

  async ({ url }) => {
    const result = await analyzeTechnology(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_accessibility",
  {
    description: "Analyze basic accessibility issues",
    inputSchema: {
      url: z.string().url(),
    },
  },
  async ({ url }) => {
    const result = await analyzeAccessibility(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_content",
  {
    description: "Analyze basic content quality and structure",
    inputSchema: {
      url: z.string().url(),
    },
  },
  async ({ url }) => {
    const result = await analyzeContent(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_structured_data",
  {
    description: "Summarize JSON-LD structured data blocks of a webpage and flag empty or invalid blocks",
    inputSchema: {
      url: z.string().url(),
    },
  },
  async ({ url }) => {
    const result = await analyzeStructuredData(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_technical",
  {
    description: "Analyze basic technical SEO configuration",
    inputSchema: {
      url: z.string().url(),
    },
  },
  async ({ url }) => {
    const result = await analyzeTechnical(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.registerTool(
  "analyze_website",
  {
    description: "Run a complete website intelligence analysis",
    inputSchema: {
      url: z.string().url(),
    },
  },
  async ({ url }) => {
    const result = await analyzeWebsite(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();

await server.connect(transport);

console.error("Website Intelligence MCP Server started");
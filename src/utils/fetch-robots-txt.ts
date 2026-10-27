import { discardBody, safeFetch } from "./fetch-page.js";

export interface FetchedRobotsTxt {
  robotsTxtUrl: string;
  // null when the file is missing or unreadable; robots.txt is optional, so that is not an error.
  content: string | null;
}

// Fetches /robots.txt at the page's origin. analyze_website fetches it once and shares it with the
// robotsTxt and sitemap analyzers, so a full run still makes a single robots.txt request.
export async function fetchRobotsTxt(origin: string): Promise<FetchedRobotsTxt> {
  const robotsTxtUrl = `${origin}/robots.txt`;

  console.error(`Fetching robots.txt: ${robotsTxtUrl}`);

  try {
    const response = await safeFetch(robotsTxtUrl);

    if (!response.ok) {
      await discardBody(response);
      return { robotsTxtUrl, content: null };
    }

    const content = await response.text();

    console.error(`robots.txt received: ${content.length} characters`);

    return { robotsTxtUrl, content };
  } catch {
    return { robotsTxtUrl, content: null };
  }
}

// Reads the `Sitemap:` directives of a robots.txt file, in the order they appear.
export function sitemapUrlsFromRobotsTxt(content: string | null): string[] {
  if (!content) return [];

  return content
    .split(/\r?\n/)
    .map((line) => /^\s*sitemap\s*:\s*(\S.*?)\s*$/i.exec(line)?.[1])
    .filter((value): value is string => Boolean(value));
}

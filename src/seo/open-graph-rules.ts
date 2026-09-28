export type OpenGraphStatus =
  | "good"
  | "needs_improvement"
  | "missing";

export interface OpenGraphAnalysis {
  title: string | null;
  description: string | null;
  image: string | null;
  ogUrl: string | null;
  presentTags: number;
  missingTags: string[];
  status: OpenGraphStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeOpenGraphRules(
  tags: Record<string, string>,
): OpenGraphAnalysis {
  const requiredTags = [
    "og:title",
    "og:description",
    "og:image",
    "og:url",
  ];

  const missingTags = requiredTags.filter(
    (tag) => !tags[tag]?.trim(),
  );

  const presentTags = requiredTags.length - missingTags.length;

  let status: OpenGraphStatus;
  const issues: string[] = [];
  let recommendation = "";

  if (presentTags === 0) {
    status = "missing";

    issues.push("Page is missing Open Graph metadata");

    recommendation =
      "Add og:title, og:description, og:image, and og:url metadata.";
  } else if (missingTags.length > 0) {
    status = "needs_improvement";

    issues.push(
      `Missing Open Graph tags: ${missingTags.join(", ")}`,
    );

    recommendation =
      "Add the missing Open Graph tags to improve social sharing previews.";
  } else {
    status = "good";

    recommendation =
      "Required Open Graph metadata is present.";
  }

  return {
    title: tags["og:title"] ?? null,
    description: tags["og:description"] ?? null,
    image: tags["og:image"] ?? null,
    ogUrl: tags["og:url"] ?? null,
    presentTags,
    missingTags,
    status,
    issues,
    recommendation,
  };
}
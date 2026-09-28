export type SocialStatus =
  | "good"
  | "needs_improvement"
  | "poor";

export interface SocialAnalysis {
  hasOpenGraph: boolean;
  hasTwitterCard: boolean;
  hasOgTitle: boolean;
  hasOgDescription: boolean;
  hasOgImage: boolean;
  hasOgUrl: boolean;
  twitterCard: string | null;
  status: SocialStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeSocialRules(
  getMeta: (name: string) => string | null,
): SocialAnalysis {
  const ogTitle = getMeta("og:title");
  const ogDescription = getMeta("og:description");
  const ogImage = getMeta("og:image");
  const ogUrl = getMeta("og:url");
  const twitterCard = getMeta("twitter:card");

  const hasOgTitle = Boolean(ogTitle);
  const hasOgDescription = Boolean(ogDescription);
  const hasOgImage = Boolean(ogImage);
  const hasOgUrl = Boolean(ogUrl);

  const hasOpenGraph =
    hasOgTitle ||
    hasOgDescription ||
    hasOgImage ||
    hasOgUrl;

  const hasTwitterCard = Boolean(twitterCard);

  const issues: string[] = [];

  if (!hasOpenGraph) {
    issues.push("Open Graph metadata is missing");
  } else {
    if (!hasOgTitle) {
      issues.push("og:title is missing");
    }

    if (!hasOgDescription) {
      issues.push("og:description is missing");
    }

    if (!hasOgImage) {
      issues.push("og:image is missing");
    }

    if (!hasOgUrl) {
      issues.push("og:url is missing");
    }
  }

  if (!hasTwitterCard) {
    issues.push("Twitter Card metadata is missing");
  }

  let status: SocialStatus;

  if (!hasOpenGraph && !hasTwitterCard) {
    status = "poor";
  } else if (issues.length > 2) {
    status = "needs_improvement";
  } else {
    status = "good";
  }

  let recommendation =
    "Social sharing metadata is configured.";

  if (status === "needs_improvement") {
    recommendation =
      "Complete the missing Open Graph and Twitter Card metadata.";
  }

  if (status === "poor") {
    recommendation =
      "Add Open Graph and Twitter Card metadata to improve social sharing previews.";
  }

  return {
    hasOpenGraph,
    hasTwitterCard,
    hasOgTitle,
    hasOgDescription,
    hasOgImage,
    hasOgUrl,
    twitterCard,
    status,
    issues,
    recommendation,
  };
}
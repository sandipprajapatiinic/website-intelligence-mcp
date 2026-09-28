export type ImageStatus =
  | "good"
  | "needs_improvement"
  | "critical";

export interface ImageAnalysis {
  totalImages: number;
  imagesWithAlt: number;
  imagesWithoutAlt: number;
  altPercentage: number;
  status: ImageStatus;
  issues: string[];
  recommendation: string;
}

export function analyzeImageRules(
  totalImages: number,
  imagesWithAlt: number,
): ImageAnalysis {
  const imagesWithoutAlt = totalImages - imagesWithAlt;

  const altPercentage =
    totalImages === 0
      ? 100
      : Math.round((imagesWithAlt / totalImages) * 100);

  let status: ImageStatus;
  const issues: string[] = [];
  let recommendation = "";

  if (totalImages === 0) {
    status = "good";

    recommendation = "No images were found on the page.";
  } else if (imagesWithoutAlt === totalImages) {
    status = "critical";

    issues.push("All images are missing alt attributes");

    recommendation =
      "Add descriptive alt text to images that convey meaningful information.";
  } else if (imagesWithoutAlt > 0) {
    status = "needs_improvement";

    issues.push(`${imagesWithoutAlt} image(s) are missing alt attributes`);

    recommendation =
      "Add descriptive alt text to images that convey meaningful information.";
  } else {
    status = "good";

    recommendation =
      "All images have alt attributes.";
  }

  return {
    totalImages,
    imagesWithAlt,
    imagesWithoutAlt,
    altPercentage,
    status,
    issues,
    recommendation,
  };
}
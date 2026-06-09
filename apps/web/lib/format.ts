import type { SocialPlatform } from "@/types/api";

const platformLabels: Record<SocialPlatform, string> = {
  ARTSTATION: "ArtStation",
  BEHANCE: "Behance",
  DEVIANTART: "DeviantArt",
  DRIBBBLE: "Dribbble",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  MEDIUM: "Medium",
  PERSONAL_WEBSITE: "Website",
  PDF: "PDF",
  PINTEREST: "Pinterest",
  TELEGRAM: "Telegram",
  THREADS: "Threads",
  VIMEO: "Vimeo",
  X_TWITTER: "X / Twitter",
  YOUTUBE: "YouTube",
};

export function formatPlatformLabel(platform: SocialPlatform) {
  return platformLabels[platform];
}

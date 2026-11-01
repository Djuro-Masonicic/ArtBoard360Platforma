import type { CardConfig } from "@artboard/qr-card-renderer";
export type QrVersion = {
  id: string;
  versionNumber: number;
  status: "PROCESSING" | "READY" | "FAILED";
  kind: string;
  config: CardConfig;
  createdAt: string;
  completedAt: string | null;
  errorCode: string | null;
  downloadCount: number;
  lastDownloadedAt: string | null;
};
export type QrCardState = {
  artist: { name: string; avatar: string | null };
  profileUrl: string;
  publicAvailable: boolean;
  storageAvailable: boolean;
  choices: Array<{ id: string; title: string; url: string }>;
  theme: "light" | "dark";
  draft: { config: CardConfig; revision: number; savedAt: string | null };
  qrSvg: string;
  entitlement: {
    state: "PREMIUM" | "FORMER_PREMIUM" | "FREE_USED" | "FREE_AVAILABLE";
    premium: boolean;
    available: boolean;
    processing: boolean;
  };
  history: {
    items: QrVersion[];
    page: number;
    total: number;
    totalPages: number;
  };
};

export type CardConfig = {
  name: string;
  contacts: {
    email: string;
    phone: string;
    instagram: string;
    behance: string;
  };
  selectedContacts: Array<"email" | "phone" | "instagram" | "behance">;
  imageId: string;
  templateId:
    | "basic"
    | "artboard"
    | "classic"
    | "no-cover"
    | "portrait"
    | "portrait-artwork";
  variant: "standard" | "branded";
  cardColor: "light" | "dark";
  language: "ME" | "EN";
  backTitle: "profile" | "portfolio";
};
export type CardRenderModel = {
  config: CardConfig;
  profileUrl: string;
  avatar?: string | null;
  cover?: string | null;
  qrSvg: string;
  fontCss?: string;
};
export const cardTemplates: ReadonlyArray<{
  id: CardConfig["templateId"];
  label: string;
  provisional: boolean;
}>;
export function usesCover(id: CardConfig["templateId"]): boolean;
export function usesAvatar(id: CardConfig["templateId"]): boolean;
export function supportsBranded(id: CardConfig["templateId"]): boolean;
export function hasNativeBleed(id: CardConfig["templateId"]): boolean;
export function normalizeCardSocialContact(platform: "instagram" | "behance", value: string): string | null;
export function renderCard(
  model: CardRenderModel,
  side: "front" | "back",
  options?: { mode?: "trim" | "bleed"; guides?: boolean },
): string;

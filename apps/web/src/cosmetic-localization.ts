import type { CosmeticItem } from "./api";

export const localizedCosmeticName = (
  item: CosmeticItem,
  locale: string,
): string =>
  item.localizedNames[locale]
  ?? item.localizedNames[locale.split("-")[0] ?? ""]
  ?? (locale === "ko" ? item.nameKo : item.nameEn);

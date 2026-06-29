import type { CosmeticItem } from "./api";

export const cosmeticBackground = (item: CosmeticItem): string => {
  const colors = item.colors.length > 0 ? item.colors : ["#777"];
  if (item.visualKind === "solid") return colors[0] ?? "#777";
  if (item.visualKind === "split") {
    return `linear-gradient(90deg, ${colors[0] ?? "#777"} 0 50%, ${colors[1] ?? colors[0] ?? "#777"} 50% 100%)`;
  }
  if (item.visualKind === "gradient") {
    return `linear-gradient(135deg, ${colors.join(", ")})`;
  }
  if (item.pattern === "cosmos") {
    return `radial-gradient(circle at 24% 25%, #fff 0 2%, transparent 3%), radial-gradient(circle at 72% 64%, #8ff 0 2%, transparent 3%), linear-gradient(135deg, ${colors.join(", ")})`;
  }
  if (item.pattern === "stained-glass") {
    return `conic-gradient(from 35deg, ${colors.join(", ")}, ${colors[0] ?? "#777"})`;
  }
  if (item.pattern === "kintsugi") {
    return `linear-gradient(35deg, transparent 43%, ${colors[1] ?? "#d7ad45"} 44% 48%, transparent 49%), linear-gradient(145deg, ${colors[0] ?? "#202124"}, ${colors[2] ?? "#6e5524"})`;
  }
  return `linear-gradient(115deg, ${colors.join(", ")})`;
};

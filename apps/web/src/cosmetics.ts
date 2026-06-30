import type { CosmeticItem } from "./api";

export const cosmeticBackground = (item: CosmeticItem): string => {
  const colors = item.colors.length > 0 ? item.colors : ["#777"];
  if (item.visualKind === "solid") return colors[0] ?? "#777";
  if (item.visualKind === "split") {
    return `linear-gradient(${item.splitAngle ?? 90}deg, ${colors[0] ?? "#777"} 0 50%, ${colors[1] ?? colors[0] ?? "#777"} 50% 100%)`;
  }
  if (item.visualKind === "gradient") {
    return `linear-gradient(135deg, ${colors.map((color, index) => `${color} ${(index / Math.max(1, colors.length - 1)) * 100}%`).join(", ")})`;
  }
  if (item.pattern === "cosmos") {
    return `radial-gradient(circle at 22% 24%, #fff 0 2%, transparent 3%), radial-gradient(circle at 72% 30%, #8ff 0 1.5%, transparent 2.5%), radial-gradient(circle at 62% 74%, #fff 0 1.5%, transparent 2.5%), radial-gradient(ellipse at 50% 50%, ${colors[1] ?? "#5c46a6"}, transparent 58%), linear-gradient(135deg, ${colors.join(", ")})`;
  }
  if (item.pattern === "stained-glass") {
    return `linear-gradient(32deg, transparent 46%, rgba(24,20,27,.78) 47% 51%, transparent 52%), linear-gradient(145deg, transparent 42%, rgba(24,20,27,.78) 43% 48%, transparent 49%), conic-gradient(from 35deg, ${colors.join(", ")}, ${colors[0] ?? "#777"})`;
  }
  if (item.pattern === "kintsugi") {
    return `linear-gradient(68deg, transparent 44%, ${colors[1] ?? "#d7ad45"} 45% 48%, transparent 49%), linear-gradient(22deg, transparent 57%, ${colors[1] ?? "#d7ad45"} 58% 60%, transparent 61%), radial-gradient(circle at 72% 30%, ${colors[2] ?? "#6e5524"}, transparent 42%), ${colors[0] ?? "#202124"}`;
  }
  if (item.pattern === "founder") {
    return `linear-gradient(62deg, transparent 35%, ${colors[1] ?? "#d3a052"} 36% 42%, transparent 43%), radial-gradient(circle at 70% 24%, ${colors[2] ?? "#f1d39a"}, transparent 38%), ${colors[0] ?? "#541f2c"}`;
  }
  return `linear-gradient(115deg, ${colors.map((color, index) => `${color} ${(index / Math.max(1, colors.length - 1)) * 100}%`).join(", ")})`;
};

import type { CosmeticItem } from "./api";

export type CosmeticVisual = Pick<
  CosmeticItem,
  "visualKind" | "colors" | "pattern" | "splitAngle"
>;

export const cosmeticBackground = (item: CosmeticVisual): string => {
  const colors = item.colors.length > 0 ? item.colors : ["#777"];
  if (item.visualKind === "solid") return colors[0] ?? "#777";
  if (item.visualKind === "split") {
    return `linear-gradient(${item.splitAngle ?? 90}deg, ${colors[0] ?? "#777"} 0 50%, ${colors[1] ?? colors[0] ?? "#777"} 50% 100%)`;
  }
  if (item.visualKind === "gradient") {
    return `linear-gradient(135deg, ${colors.map((color, index) => `${color} ${(index / Math.max(1, colors.length - 1)) * 100}%`).join(", ")})`;
  }
  if (item.pattern === "cosmos") {
    return `radial-gradient(circle at 18% 22%, #fff 0 1.4%, transparent 2.2%), radial-gradient(circle at 76% 18%, #bff 0 1.1%, transparent 2%), radial-gradient(circle at 68% 72%, #fff 0 1.2%, transparent 2.1%), radial-gradient(circle at 30% 80%, #e4c8ff 0 0.9%, transparent 1.8%), radial-gradient(ellipse at 64% 38%, ${colors[2] ?? "#39b8b3"} 0, transparent 38%), radial-gradient(ellipse at 35% 68%, ${colors[1] ?? "#5c46a6"} 0, transparent 48%), linear-gradient(145deg, ${colors[0] ?? "#17162f"}, #25204c 48%, ${colors[0] ?? "#17162f"})`;
  }
  if (item.pattern === "stained-glass") {
    return `radial-gradient(circle at 24% 18%, rgba(255,255,255,.65) 0 3%, transparent 24%), radial-gradient(circle at 78% 74%, rgba(255,255,255,.28) 0 2%, transparent 28%), conic-gradient(from 32deg at 46% 54%, ${colors[0] ?? "#e85a6b"} 0 16%, #a873c6 16% 31%, ${colors[2] ?? "#45a7c6"} 31% 48%, #55bd9c 48% 63%, ${colors[1] ?? "#e8c84f"} 63% 79%, #ef8b6f 79% 100%)`;
  }
  if (item.pattern === "kintsugi") {
    return `radial-gradient(ellipse at 74% 20%, rgba(224,190,91,.32) 0 2%, transparent 25%), linear-gradient(64deg, transparent 0 48%, ${colors[1] ?? "#d7ad45"} 48.5% 49.4%, transparent 50% 100%), linear-gradient(22deg, transparent 0 66%, ${colors[2] ?? "#6e5524"} 66.4% 67.1%, transparent 67.7% 100%), linear-gradient(145deg, #0f1215, ${colors[0] ?? "#202124"} 48%, #353027)`;
  }
  if (item.pattern === "tango-spectrum") {
    return `radial-gradient(ellipse at 20% 72%, ${colors[0] ?? "#d84d63"} 0 13%, transparent 46%), radial-gradient(ellipse at 54% 28%, ${colors[1] ?? "#36a173"} 0 15%, transparent 48%), radial-gradient(ellipse at 86% 72%, ${colors[2] ?? "#4d6ed7"} 0 15%, transparent 47%), linear-gradient(135deg, #311d42 0%, #705077 46%, #20385f 100%)`;
  }
  if (item.pattern === "founder") {
    return `linear-gradient(62deg, transparent 35%, ${colors[1] ?? "#d3a052"} 36% 42%, transparent 43%), radial-gradient(circle at 70% 24%, ${colors[2] ?? "#f1d39a"}, transparent 38%), ${colors[0] ?? "#541f2c"}`;
  }
  return `linear-gradient(115deg, ${colors.map((color, index) => `${color} ${(index / Math.max(1, colors.length - 1)) * 100}%`).join(", ")})`;
};

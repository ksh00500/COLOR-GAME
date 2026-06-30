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
    return `radial-gradient(circle at 18% 22%, #fff 0 1.4%, transparent 2.2%), radial-gradient(circle at 76% 18%, #bff 0 1.1%, transparent 2%), radial-gradient(circle at 68% 72%, #fff 0 1.2%, transparent 2.1%), radial-gradient(circle at 30% 80%, #e4c8ff 0 0.9%, transparent 1.8%), radial-gradient(ellipse at 64% 38%, ${colors[2] ?? "#39b8b3"} 0, transparent 38%), radial-gradient(ellipse at 35% 68%, ${colors[1] ?? "#5c46a6"} 0, transparent 48%), linear-gradient(145deg, ${colors[0] ?? "#17162f"}, #25204c 48%, ${colors[0] ?? "#17162f"})`;
  }
  if (item.pattern === "stained-glass") {
    return `linear-gradient(27deg, transparent 0 47%, rgba(25,22,29,.78) 48% 49.5%, transparent 50.5% 100%), linear-gradient(108deg, transparent 0 57%, rgba(25,22,29,.78) 58% 59.5%, transparent 60.5% 100%), linear-gradient(154deg, transparent 0 31%, rgba(25,22,29,.72) 32% 33.2%, transparent 34.2% 100%), conic-gradient(from 18deg at 54% 46%, ${colors[0] ?? "#e85a6b"} 0 17%, ${colors[1] ?? "#e8c84f"} 17% 36%, ${colors[2] ?? "#45a7c6"} 36% 57%, #8d67b5 57% 73%, ${colors[0] ?? "#e85a6b"} 73% 87%, ${colors[1] ?? "#e8c84f"} 87% 100%)`;
  }
  if (item.pattern === "kintsugi") {
    return `linear-gradient(67deg, transparent 0 46%, ${colors[1] ?? "#d7ad45"} 47% 48.2%, transparent 49.2% 100%), linear-gradient(24deg, transparent 0 61%, ${colors[1] ?? "#d7ad45"} 62% 63%, transparent 64% 100%), linear-gradient(132deg, transparent 0 26%, ${colors[2] ?? "#6e5524"} 27% 28.2%, transparent 29.2% 100%), radial-gradient(circle at 72% 28%, rgba(215,173,69,.22) 0, transparent 35%), linear-gradient(145deg, #111315, ${colors[0] ?? "#202124"} 52%, #2c2924)`;
  }
  if (item.pattern === "tango-spectrum") {
    return `radial-gradient(circle at 72% 24%, rgba(255,255,255,.32) 0 5%, transparent 24%), repeating-linear-gradient(118deg, ${colors[0] ?? "#d84d63"} 0 14%, #f08b78 14% 20%, ${colors[1] ?? "#36a173"} 20% 34%, #55c5aa 34% 40%, ${colors[2] ?? "#4d6ed7"} 40% 54%, #8d70d8 54% 60%)`;
  }
  if (item.pattern === "founder") {
    return `linear-gradient(62deg, transparent 35%, ${colors[1] ?? "#d3a052"} 36% 42%, transparent 43%), radial-gradient(circle at 70% 24%, ${colors[2] ?? "#f1d39a"}, transparent 38%), ${colors[0] ?? "#541f2c"}`;
  }
  return `linear-gradient(115deg, ${colors.map((color, index) => `${color} ${(index / Math.max(1, colors.length - 1)) * 100}%`).join(", ")})`;
};

export type PlacementFxDesign =
  | "settle"
  | "maple-tap"
  | "walnut-shadow"
  | "ivory-click"
  | "charcoal-stamp"
  | "moss-leaf"
  | "coastal-ripple"
  | "brass-ring"
  | "moonlight-bloom"
  | "ember-seal"
  | "prism-fold"
  | "cosmos-orbit"
  | "tango-trinity";
export type ScoreFxDesign = "trace" | "maple-resolve" | "cosmos-fold";

export interface BoardFxDesign {
  placement: PlacementFxDesign;
  score: ScoreFxDesign;
}

export const PLACEMENT_FX_DURATION_MS: Readonly<Record<PlacementFxDesign, number>> = {
  settle: 280,
  "maple-tap": 320,
  "walnut-shadow": 380,
  "ivory-click": 420,
  "charcoal-stamp": 560,
  "moss-leaf": 640,
  "coastal-ripple": 500,
  "brass-ring": 780,
  "moonlight-bloom": 760,
  "ember-seal": 780,
  "prism-fold": 860,
  "cosmos-orbit": 720,
  "tango-trinity": 900,
};

export function placementFxUsesTileSurface(design: PlacementFxDesign) {
  return design === "maple-tap"
    || design === "walnut-shadow"
    || design === "moss-leaf"
    || design === "coastal-ripple"
    || design === "prism-fold";
}

export function resolveBoardFxDesign(
  placementPreset: string | undefined,
  scorePreset: string | undefined,
): BoardFxDesign {
  return {
    placement: ({
      tap: "maple-tap",
      shadow: "walnut-shadow",
      edge: "ivory-click",
      "ivory-edge": "ivory-click",
      "ivory-click": "ivory-click",
      stamp: "charcoal-stamp",
      leaf: "moss-leaf",
      ripple: "coastal-ripple",
      ring: "brass-ring",
      bloom: "moonlight-bloom",
      seal: "ember-seal",
      fold: "prism-fold",
      orbit: "cosmos-orbit",
      trinity: "tango-trinity",
    } as Record<string, PlacementFxDesign>)[placementPreset ?? ""] ?? "settle",
    score: scorePreset === "fade"
      ? "maple-resolve"
      : scorePreset === "cosmos-fold"
        ? "cosmos-fold"
        : "trace",
  };
}

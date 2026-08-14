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
export type ScoreFxDesign =
  | "trace"
  | "maple-fade"
  | "walnut-sweep"
  | "ivory-lift"
  | "charcoal-dust"
  | "forest-scatter"
  | "coastal-wash"
  | "brass-glint"
  | "moonlight-dissolve"
  | "ember-ash"
  | "prism-ribbon"
  | "cosmos-fold"
  | "tango-flow";

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

export const SCORE_FX_DURATION_MS: Readonly<Record<ScoreFxDesign, number>> = {
  trace: 450,
  "maple-fade": 460,
  "walnut-sweep": 520,
  "ivory-lift": 520,
  "charcoal-dust": 580,
  "forest-scatter": 640,
  "coastal-wash": 680,
  "brass-glint": 640,
  "moonlight-dissolve": 760,
  "ember-ash": 780,
  "prism-ribbon": 800,
  "cosmos-fold": 860,
  "tango-flow": 860,
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
    score: ({
      fade: "maple-fade",
      sweep: "walnut-sweep",
      lift: "ivory-lift",
      dust: "charcoal-dust",
      scatter: "forest-scatter",
      wash: "coastal-wash",
      glint: "brass-glint",
      dissolve: "moonlight-dissolve",
      ash: "ember-ash",
      ribbon: "prism-ribbon",
      "cosmos-fold": "cosmos-fold",
      "tango-flow": "tango-flow",
    } as Record<string, ScoreFxDesign>)[scorePreset ?? ""] ?? "trace",
  };
}

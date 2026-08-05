export type PlacementFxDesign = "settle" | "maple-press" | "cosmos-orbit";
export type ScoreFxDesign = "trace" | "maple-resolve" | "cosmos-fold";

export interface BoardFxDesign {
  placement: PlacementFxDesign;
  score: ScoreFxDesign;
}

export function resolveBoardFxDesign(
  placementPreset: string | undefined,
  scorePreset: string | undefined,
): BoardFxDesign {
  return {
    placement: placementPreset === "tap"
      ? "maple-press"
      : placementPreset === "orbit"
        ? "cosmos-orbit"
        : "settle",
    score: scorePreset === "fade"
      ? "maple-resolve"
      : scorePreset === "cosmos-fold"
        ? "cosmos-fold"
        : "trace",
  };
}

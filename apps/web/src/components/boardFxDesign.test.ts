import { describe, expect, it } from "vitest";
import {
  PLACEMENT_FX_DURATION_MS,
  SCORE_FX_DURATION_MS,
  placementFxUsesTileSurface,
  resolveBoardFxDesign,
} from "./boardFxDesign";

describe("resolveBoardFxDesign", () => {
  it("gives the representative placement cosmetics distinct visual languages", () => {
    expect(resolveBoardFxDesign("tap", undefined).placement).toBe("maple-tap");
    expect(resolveBoardFxDesign("orbit", undefined).placement).toBe("cosmos-orbit");
  });

  it("maps every placement catalog preset to a distinct renderer", () => {
    const presets = ["tap", "shadow", "edge", "stamp", "leaf", "ripple", "ring", "bloom", "seal", "fold", "orbit", "trinity"];
    const designs = presets.map((preset) => resolveBoardFxDesign(preset, undefined).placement);
    expect(new Set(designs).size).toBe(presets.length);
    expect(designs).not.toContain("settle");
  });

  it("keeps placement and scoring presets independent", () => {
    expect(resolveBoardFxDesign("orbit", "fade")).toEqual({
      placement: "cosmos-orbit",
      score: "maple-fade",
    });
    expect(resolveBoardFxDesign("tap", "cosmos-fold")).toEqual({
      placement: "maple-tap",
      score: "cosmos-fold",
    });
  });

  it("maps every scoring catalog preset to its own renderer", () => {
    const presets = ["fade", "sweep", "lift", "dust", "scatter", "wash", "glint", "dissolve", "ash", "ribbon", "cosmos-fold", "tango-flow"];
    const designs = presets.map((preset) => resolveBoardFxDesign(undefined, preset).score);
    expect(new Set(designs).size).toBe(presets.length);
    expect(designs).not.toContain("trace");
  });

  it("falls back to restrained generic feedback for unknown presets", () => {
    expect(resolveBoardFxDesign("unknown-placement", "unknown-score")).toEqual({
      placement: "settle",
      score: "trace",
    });
  });

  it("keeps the approved duration contract and legacy Ivory aliases", () => {
    expect(PLACEMENT_FX_DURATION_MS).toEqual({
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
    });
    expect(resolveBoardFxDesign("edge", undefined).placement).toBe("ivory-click");
    expect(resolveBoardFxDesign("ivory-edge", undefined).placement).toBe("ivory-click");
  });

  it("keeps the scoring duration contract within the board resolution budget", () => {
    expect(SCORE_FX_DURATION_MS).toEqual({
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
    });
  });

  it("only routes physical tile effects through the tile surface", () => {
    expect(placementFxUsesTileSurface("maple-tap")).toBe(true);
    expect(placementFxUsesTileSurface("walnut-shadow")).toBe(true);
    expect(placementFxUsesTileSurface("moss-leaf")).toBe(true);
    expect(placementFxUsesTileSurface("coastal-ripple")).toBe(true);
    expect(placementFxUsesTileSurface("prism-fold")).toBe(true);
    expect(placementFxUsesTileSurface("moonlight-bloom")).toBe(false);
  });
});

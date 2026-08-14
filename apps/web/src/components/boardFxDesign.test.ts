import { describe, expect, it } from "vitest";
import {
  PLACEMENT_FX_DURATION_MS,
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
      score: "maple-resolve",
    });
    expect(resolveBoardFxDesign("tap", "cosmos-fold")).toEqual({
      placement: "maple-tap",
      score: "cosmos-fold",
    });
  });

  it("falls back to restrained generic feedback for unknown presets", () => {
    expect(resolveBoardFxDesign("unknown-placement", "glint")).toEqual({
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

  it("only routes physical tile effects through the tile surface", () => {
    expect(placementFxUsesTileSurface("maple-tap")).toBe(true);
    expect(placementFxUsesTileSurface("walnut-shadow")).toBe(true);
    expect(placementFxUsesTileSurface("moss-leaf")).toBe(true);
    expect(placementFxUsesTileSurface("coastal-ripple")).toBe(true);
    expect(placementFxUsesTileSurface("prism-fold")).toBe(true);
    expect(placementFxUsesTileSurface("moonlight-bloom")).toBe(false);
  });
});

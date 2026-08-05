import { describe, expect, it } from "vitest";
import { resolveBoardFxDesign } from "./boardFxDesign";

describe("resolveBoardFxDesign", () => {
  it("gives the representative placement cosmetics distinct visual languages", () => {
    expect(resolveBoardFxDesign("tap", undefined).placement).toBe("maple-press");
    expect(resolveBoardFxDesign("orbit", undefined).placement).toBe("cosmos-orbit");
  });

  it("keeps placement and scoring presets independent", () => {
    expect(resolveBoardFxDesign("orbit", "fade")).toEqual({
      placement: "cosmos-orbit",
      score: "maple-resolve",
    });
    expect(resolveBoardFxDesign("tap", "cosmos-fold")).toEqual({
      placement: "maple-press",
      score: "cosmos-fold",
    });
  });

  it("falls back to restrained generic feedback for the remaining catalog", () => {
    expect(resolveBoardFxDesign("edge", "glint")).toEqual({
      placement: "settle",
      score: "trace",
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  tutorialFullAfterCellClass,
  tutorialFullBeforeCellClass,
  tutorialSteps,
} from "./TutorialPanel";

describe("full-board tutorial", () => {
  it("labels the comparison as just before the board fills", () => {
    expect(tutorialSteps.find((step) => step.preview === "full")?.title).toBe(
      "보드가 꽉 차면 마지막 색이 정리됩니다",
    );
  });

  it("shows the final empty cell as a blue placement and then clears blue", () => {
    expect(tutorialFullBeforeCellClass(12).split(" ")).toEqual(
      expect.arrayContaining(["blue-tile", "placing"]),
    );
    expect(tutorialFullAfterCellClass(12).split(" ")).toContain("full-cleared");
  });
});

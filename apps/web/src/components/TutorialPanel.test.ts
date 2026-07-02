import { describe, expect, it } from "vitest";
import {
  tutorialFullAfterCellClass,
  tutorialFullBeforeLabel,
  tutorialFullBeforeCellClass,
  tutorialSteps,
} from "./TutorialPanel";

describe("full-board tutorial", () => {
  it("labels the comparison as just before the board fills", () => {
    expect(tutorialFullBeforeLabel).toBe("가득 차기 직전");
    expect(tutorialSteps.find((step) => step.preview === "full")?.title).toBe(
      "보드가 꽉 차면 마지막 색이 정리됩니다",
    );
  });

  it("shows all 25 before-cells as solid colors and then clears blue", () => {
    for (let index = 0; index < 25; index += 1) {
      expect(tutorialFullBeforeCellClass(index)).toMatch(
        /\b(red|blue|green)-tile\b/,
      );
    }
    expect(tutorialFullBeforeCellClass(12).split(" ")).toEqual(
      expect.arrayContaining(["blue-tile", "full-last-blue"]),
    );
    expect(tutorialFullBeforeCellClass(12).split(" ")).not.toContain("placing");
    expect(tutorialFullAfterCellClass(12).split(" ")).toContain("full-cleared");
  });
});

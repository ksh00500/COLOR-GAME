import { describe, expect, it } from "vitest";
import {
  defaultColorShortcuts,
  formatShortcutCode,
  isConfigurableShortcutCode,
  resolveColorShortcutIndex,
  type ColorShortcuts,
} from "./settings";

describe("color selection shortcuts", () => {
  it("uses 1, 2, and 3 by default", () => {
    expect(defaultColorShortcuts.map(formatShortcutCode)).toEqual(["1", "2", "3"]);
    expect(resolveColorShortcutIndex("Digit1", defaultColorShortcuts)).toBe(0);
    expect(resolveColorShortcutIndex("Digit2", defaultColorShortcuts)).toBe(1);
    expect(resolveColorShortcutIndex("Digit3", defaultColorShortcuts)).toBe(2);
  });

  it("supports user-assigned letter keys", () => {
    const shortcuts: ColorShortcuts = ["KeyA", "KeyS", "KeyD"];
    expect(resolveColorShortcutIndex("KeyA", shortcuts)).toBe(0);
    expect(resolveColorShortcutIndex("KeyS", shortcuts)).toBe(1);
    expect(resolveColorShortcutIndex("KeyD", shortcuts)).toBe(2);
    expect(resolveColorShortcutIndex("KeyQ", shortcuts)).toBeNull();
  });

  it("treats number-row and numeric-keypad shortcuts as equivalents", () => {
    expect(resolveColorShortcutIndex("Numpad2", defaultColorShortcuts)).toBe(1);
    expect(resolveColorShortcutIndex("Digit3", ["KeyQ", "KeyW", "Numpad3"])).toBe(2);
  });

  it("only accepts letter and number keys for configuration", () => {
    expect(isConfigurableShortcutCode("KeyZ")).toBe(true);
    expect(isConfigurableShortcutCode("Digit0")).toBe(true);
    expect(isConfigurableShortcutCode("Numpad7")).toBe(true);
    expect(isConfigurableShortcutCode("Space")).toBe(false);
    expect(isConfigurableShortcutCode("ArrowLeft")).toBe(false);
  });
});

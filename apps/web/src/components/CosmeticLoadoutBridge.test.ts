import { describe, expect, it } from "vitest";
import type { CosmeticItem, EconomyOverview } from "../api";
import { applyLoadout, clearLoadout } from "./CosmeticLoadoutBridge";

const cosmetic = (id: string, colors: string[]): CosmeticItem => ({
  id,
  category: "tile_color",
  equipSlot: "tile_color",
  rarity: "common",
  nameKo: id,
  nameEn: id,
  localizedNames: {},
  descriptionKo: "",
  chipPrice: 150,
  visualKind: "solid",
  colors,
  pattern: null,
  splitAngle: null,
  representativeColor: colors[0] ?? null,
  availability: "active",
  owned: true,
  isNew: false,
  equippedSlots: [],
});

const target = () => {
  const dataset: Record<string, string | undefined> = {};
  const properties = new Map<string, string>();
  return {
    dataset,
    properties,
    style: {
      setProperty(name: string, value: string) {
        properties.set(name, value);
      },
      removeProperty(name: string) {
        const previous = properties.get(name) ?? "";
        properties.delete(name);
        return previous;
      },
    },
  };
};

describe("cosmetic loadout bridge", () => {
  it("applies the server loadout and clears it on logout", () => {
    const indigo = cosmetic("indigo", ["#3344aa"]);
    const economy = {
      inventory: [indigo],
      loadout: { colorA: indigo.id },
    } as EconomyOverview;
    const root = target();

    applyLoadout(economy, root);

    expect(root.dataset.tangoTileColorA).toBe(indigo.id);
    expect(root.properties.get("--equipped-tile-a-background")).toBe("#3344aa");
    expect(root.properties.get("--equipped-tile-a-accent")).toBe("#3344aa");

    clearLoadout(root);

    expect(root.dataset.tangoTileColorA).toBeUndefined();
    expect(root.dataset.tangoBoardTheme).toBe("default");
    expect(root.dataset.tangoPlacementEffect).toBe("default");
    expect(root.dataset.tangoScoreEffect).toBe("default");
    expect(root.dataset.tangoVictoryEffect).toBe("default");
    expect(root.properties.size).toBe(0);
  });

  it("applies board and effect presets from the style loadout", () => {
    const board = {
      ...cosmetic("board-maple", ["#d49a5b", "#70452c"]),
      category: "board_theme" as const,
      equipSlot: "board_theme" as const,
      visualKind: "board" as const,
      preset: "maple",
      durationMs: 0,
    };
    const placement = {
      ...cosmetic("placement-maple", ["#f2c078", "#9b5d32"]),
      category: "placement_effect" as const,
      equipSlot: "placement_effect" as const,
      visualKind: "placement" as const,
      preset: "maple",
      durationMs: 180,
    };
    const economy = {
      inventory: [board, placement],
      loadout: {},
      styleLoadout: {
        boardTheme: board.id,
        placementEffect: placement.id,
      },
    } as EconomyOverview;
    const root = target();

    applyLoadout(economy, root);

    expect(root.dataset.tangoBoardTheme).toBe("maple");
    expect(root.dataset.tangoPlacementEffect).toBe("maple");
    expect(root.properties.get("--equipped-boardTheme-a")).toBe("#d49a5b");
    expect(root.properties.get("--equipped-placementEffect-duration")).toBe("180ms");
  });
});

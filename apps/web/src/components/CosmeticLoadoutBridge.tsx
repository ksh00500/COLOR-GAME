import { useEffect } from "react";
import {
  authChangedEvent,
  fetchEconomy,
  getAuthToken,
  type EconomyOverview,
  type TileLoadoutSlot,
} from "../api";
import { cosmeticBackground } from "../cosmetics";

export const loadoutChangedEvent = "tango:loadout-changed";

interface LoadoutTarget {
  dataset: Record<string, string | undefined>;
  style: Pick<CSSStyleDeclaration, "removeProperty" | "setProperty">;
}

export const applyLoadout = (
  economy: EconomyOverview,
  root: LoadoutTarget = document.documentElement,
): void => {
  const slots: TileLoadoutSlot[] = ["colorA", "colorB", "colorC"];
  for (const slot of slots) {
    const item = economy.inventory.find((entry) => entry.id === economy.loadout[slot]);
    const cssSlot = slot.replace("color", "").toLowerCase();
    root.dataset[`tangoTileColor${slot.slice(-1)}`] = item?.id ?? "";
    if (item) {
      root.style.setProperty(`--equipped-tile-${cssSlot}-background`, cosmeticBackground(item));
      root.style.setProperty(`--equipped-tile-${cssSlot}-accent`, item.colors[1] ?? item.colors[0] ?? "#777");
    } else {
      root.style.removeProperty(`--equipped-tile-${cssSlot}-background`);
      root.style.removeProperty(`--equipped-tile-${cssSlot}-accent`);
    }
  }
  const styleSlots = [
    ["boardTheme", "BoardTheme"],
    ["placementEffect", "PlacementEffect"],
    ["scoreEffect", "ScoreEffect"],
    ["victoryEffect", "VictoryEffect"],
  ] as const;
  for (const [slot, datasetName] of styleSlots) {
    const item = economy.inventory.find((entry) => entry.id === economy.styleLoadout?.[slot]);
    root.dataset[`tango${datasetName}`] = item?.preset ?? "default";
    root.style.setProperty(`--equipped-${slot}-a`, item?.colors[0] ?? "#c39358");
    root.style.setProperty(`--equipped-${slot}-b`, item?.colors[1] ?? item?.colors[0] ?? "#755139");
    root.style.setProperty(`--equipped-${slot}-c`, item?.colors[2] ?? item?.colors[1] ?? "#e0b875");
    root.style.setProperty(`--equipped-${slot}-duration`, `${item?.durationMs ?? 240}ms`);
  }
};

export const clearLoadout = (
  root: LoadoutTarget = document.documentElement,
): void => {
  for (const slot of ["a", "b", "c"]) {
    delete root.dataset[`tangoTileColor${slot.toUpperCase()}`];
    root.style.removeProperty(`--equipped-tile-${slot}-background`);
    root.style.removeProperty(`--equipped-tile-${slot}-accent`);
  }
  for (const datasetName of ["BoardTheme", "PlacementEffect", "ScoreEffect", "VictoryEffect"]) {
    delete root.dataset[`tango${datasetName}`];
  }
  for (const slot of ["boardTheme", "placementEffect", "scoreEffect", "victoryEffect"]) {
    for (const suffix of ["a", "b", "c", "duration"]) {
      root.style.removeProperty(`--equipped-${slot}-${suffix}`);
    }
  }
};

export function CosmeticLoadoutBridge() {
  useEffect(() => {
    let refreshId = 0;
    const refresh = () => {
      const currentRefreshId = ++refreshId;
      if (getAuthToken() === null) {
        clearLoadout();
        return;
      }
      void fetchEconomy({ force: true })
        .then((economy) => {
          if (currentRefreshId === refreshId && getAuthToken() !== null) {
            applyLoadout(economy);
          }
        })
        .catch(() => undefined);
    };
    const handleAuthChanged = () => {
      clearLoadout();
      refresh();
    };
    const handleLoadoutChanged = (event: Event) => {
      const economy = (event as CustomEvent<EconomyOverview>).detail;
      if (economy !== undefined && getAuthToken() !== null) {
        refreshId += 1;
        applyLoadout(economy);
        return;
      }
      refresh();
    };
    refresh();
    window.addEventListener(authChangedEvent, handleAuthChanged);
    window.addEventListener(loadoutChangedEvent, handleLoadoutChanged);
    return () => {
      refreshId += 1;
      window.removeEventListener(authChangedEvent, handleAuthChanged);
      window.removeEventListener(loadoutChangedEvent, handleLoadoutChanged);
    };
  }, []);
  return null;
}

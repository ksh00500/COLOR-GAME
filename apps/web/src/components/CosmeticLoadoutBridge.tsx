import { useEffect } from "react";
import {
  fetchEconomy,
  getAuthToken,
  type EconomyOverview,
  type TileLoadoutSlot,
} from "../api";
import { cosmeticBackground } from "../cosmetics";

const applyLoadout = (economy: EconomyOverview): void => {
  const root = document.documentElement;
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
};

export function CosmeticLoadoutBridge() {
  useEffect(() => {
    const refresh = () => {
      if (getAuthToken() !== null) {
        void fetchEconomy().then(applyLoadout).catch(() => undefined);
      }
    };
    refresh();
    window.addEventListener("tango:loadout-changed", refresh);
    return () => window.removeEventListener("tango:loadout-changed", refresh);
  }, []);
  return null;
}

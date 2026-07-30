import { Capacitor, registerPlugin } from "@capacitor/core";

interface BannerAdsPlugin {
  showFixed(options: { adUnitId: string }): Promise<{ visible: boolean; heightDp: number }>;
  hide(): Promise<void>;
}

type BannerPlacement = "lobby" | "result";

const BannerAds = registerPlugin<BannerAdsPlugin>("BannerAds");
const activePlacements = new Set<BannerPlacement>();
let updateSequence = 0;

function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

function setLayoutVisible(visible: boolean, heightDp = 0) {
  if (visible && heightDp > 0) {
    document.documentElement.style.setProperty("--native-banner-height", `${heightDp}px`);
  } else {
    document.documentElement.style.removeProperty("--native-banner-height");
  }
  document.documentElement.classList.toggle("native-fixed-banner-visible", visible);
}

async function updateBanner() {
  if (!isNativeAndroid()) return;
  const sequence = ++updateSequence;

  if (activePlacements.size === 0) {
    setLayoutVisible(false);
    await BannerAds.hide().catch(() => undefined);
    return;
  }

  try {
    const result = await BannerAds.showFixed({
      adUnitId: import.meta.env.VITE_ADMOB_BANNER_AD_UNIT_ID ?? "",
    });
    if (sequence === updateSequence) setLayoutVisible(result.visible, result.heightDp);
  } catch {
    if (sequence === updateSequence) setLayoutVisible(false);
  }
}

export function setNativeFixedBannerPlacement(placement: BannerPlacement, visible: boolean) {
  if (visible) activePlacements.add(placement);
  else activePlacements.delete(placement);
  void updateBanner();
}

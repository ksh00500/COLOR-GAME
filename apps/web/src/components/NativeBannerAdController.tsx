import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { setNativeFixedBannerPlacement } from "../bannerAds";

export function NativeBannerAdController() {
  const { pathname } = useLocation();
  const showOnLobby = pathname === "/";

  useEffect(() => {
    setNativeFixedBannerPlacement("lobby", showOnLobby);
    return () => setNativeFixedBannerPlacement("lobby", false);
  }, [showOnLobby]);

  return null;
}

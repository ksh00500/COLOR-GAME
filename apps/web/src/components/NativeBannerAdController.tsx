import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  setNativeFixedBannerPlacement,
  setNativeFixedBannerSuppressed,
} from "../bannerAds";

export function NativeBannerAdController() {
  const { pathname } = useLocation();
  const showOnLobby = pathname === "/";
  const gameRoute = pathname === "/game" || pathname === "/match" || pathname === "/private";

  useEffect(() => {
    setNativeFixedBannerPlacement("lobby", showOnLobby);
    return () => setNativeFixedBannerPlacement("lobby", false);
  }, [showOnLobby]);

  useEffect(() => {
    let gameVisible = false;
    let modalVisible = false;

    const sync = () => {
      const nextGameVisible = gameRoute && document.querySelector(".game-page .game-shell") !== null;
      if (nextGameVisible !== gameVisible) {
        gameVisible = nextGameVisible;
        setNativeFixedBannerPlacement("game", gameVisible);
      }

      const nextModalVisible =
        document.querySelector(".modal-backdrop:not(.tango-result-backdrop)") !== null;
      if (nextModalVisible !== modalVisible) {
        modalVisible = nextModalVisible;
        setNativeFixedBannerSuppressed(modalVisible);
      }
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (gameVisible) setNativeFixedBannerPlacement("game", false);
      if (modalVisible) setNativeFixedBannerSuppressed(false);
    };
  }, [gameRoute]);

  return null;
}

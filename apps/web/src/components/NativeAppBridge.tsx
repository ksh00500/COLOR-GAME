import { useEffect, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useLocation, useNavigate } from "react-router-dom";
import { nativeBackEvent, resolveAppLinkRoute } from "../nativeApp";

export function NativeAppBridge() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathnameRef = useRef(location.pathname);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    document.documentElement.dataset.nativePlatform = Capacitor.getPlatform();
    let disposed = false;
    const handles: PluginListenerHandle[] = [];
    const syncStatusBar = () => {
      const style = document.documentElement.dataset.theme === "dark"
        ? Style.Light
        : Style.Dark;
      void StatusBar.setStyle({ style });
    };
    syncStatusBar();
    const themeObserver = new MutationObserver(syncStatusBar);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const register = async () => {
      const urlHandle = await CapacitorApp.addListener("appUrlOpen", ({ url }) => {
        const route = resolveAppLinkRoute(url);
        if (route !== null) navigate(route);
      });
      const backHandle = await CapacitorApp.addListener("backButton", ({ canGoBack }) => {
        const backEvent = new Event(nativeBackEvent, { cancelable: true });
        if (!window.dispatchEvent(backEvent)) return;

        if (pathnameRef.current !== "/") {
          if (canGoBack) navigate(-1);
          else navigate("/", { replace: true });
          return;
        }
        void CapacitorApp.exitApp();
      });

      if (disposed) {
        await urlHandle.remove();
        await backHandle.remove();
        return;
      }
      handles.push(urlHandle, backHandle);

      const launchUrl = await CapacitorApp.getLaunchUrl();
      const route = launchUrl === undefined ? null : resolveAppLinkRoute(launchUrl.url);
      if (route !== null) navigate(route, { replace: true });
    };

    void register();
    return () => {
      disposed = true;
      themeObserver.disconnect();
      delete document.documentElement.dataset.nativePlatform;
      handles.forEach((handle) => {
        void handle.remove();
      });
    };
  }, [navigate]);

  return null;
}

import { Capacitor } from "@capacitor/core";

export const nativeBackEvent = "tango:native-back";

const appLinkHosts = new Set(["tangogame.kro.kr", "colortile.kro.kr"]);

export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

export const resolveAppLinkRoute = (rawUrl: string): string | null => {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || !appLinkHosts.has(url.hostname)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
};

export const publicAppUrl = (path: string): string => {
  const configured = import.meta.env.VITE_PUBLIC_URL?.trim().replace(/\/+$/, "");
  const origin = configured === undefined || configured === ""
    ? window.location.origin
    : configured;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
};

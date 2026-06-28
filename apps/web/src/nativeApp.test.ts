import { describe, expect, it, vi } from "vitest";
import { publicAppUrl, resolveAppLinkRoute } from "./nativeApp";

describe("resolveAppLinkRoute", () => {
  it("maps Tango HTTPS links to an in-app route", () => {
    expect(resolveAppLinkRoute("https://tangogame.kro.kr/private?code=ROOM01"))
      .toBe("/private?code=ROOM01");
  });

  it("rejects links from untrusted hosts or insecure protocols", () => {
    expect(resolveAppLinkRoute("https://example.com/private?code=ROOM01")).toBeNull();
    expect(resolveAppLinkRoute("http://tangogame.kro.kr/private?code=ROOM01")).toBeNull();
  });
});

describe("publicAppUrl", () => {
  it("uses the current origin when no public URL is configured", () => {
    vi.stubGlobal("window", { location: { origin: "https://example.com" } });
    expect(publicAppUrl("/replay/game-1")).toBe("https://example.com/replay/game-1");
    vi.unstubAllGlobals();
  });
});

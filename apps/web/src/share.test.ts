import { afterEach, describe, expect, it, vi } from "vitest";
import { shareUrl } from "./share";

describe("shareUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("copies without opening native sharing when copyOnly is set", async () => {
    const share = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, clipboard: { writeText } });

    const result = await shareUrl({
      title: "Match",
      text: "Watch",
      url: "https://example.com/spectate/ROOM01",
      copyOnly: true,
    });

    expect(result).toBe("copied");
    expect(writeText).toHaveBeenCalledWith("https://example.com/spectate/ROOM01");
    expect(share).not.toHaveBeenCalled();
  });

  it("uses native sharing outside an active match", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });

    const result = await shareUrl({ title: "Match", text: "Watch", url: "https://example.com" });

    expect(result).toBe("shared");
    expect(share).toHaveBeenCalledOnce();
  });
});

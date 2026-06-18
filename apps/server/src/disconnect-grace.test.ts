import { afterEach, describe, expect, it, vi } from "vitest";
import { DisconnectGracePeriod } from "./disconnect-grace.js";

describe("DisconnectGracePeriod", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not mark a player disconnected when reconnecting within the grace period", () => {
    vi.useFakeTimers();
    const expired: string[] = [];
    const grace = new DisconnectGracePeriod(5_000, (playerId) => expired.push(playerId));

    grace.schedule("player-1");
    vi.advanceTimersByTime(2_000);
    grace.cancel("player-1");
    vi.advanceTimersByTime(5_000);

    expect(expired).toEqual([]);
  });

  it("marks a player disconnected after the grace period", () => {
    vi.useFakeTimers();
    const expired: string[] = [];
    const grace = new DisconnectGracePeriod(5_000, (playerId) => expired.push(playerId));

    grace.schedule("player-1");
    vi.advanceTimersByTime(5_000);

    expect(expired).toEqual(["player-1"]);
  });
});

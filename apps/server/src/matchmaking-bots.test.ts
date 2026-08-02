import { describe, expect, it } from "vitest";
import {
  MATCHMAKING_BOTS,
  botFallbackDelayMs,
  chooseMatchmakingBot,
  isMatchmakingBotAccountId,
  matchmakingBotPool,
  randomBotMoveDelayMs,
} from "./matchmaking-bots.js";

describe("matchmaking bots", () => {
  it("keeps the requested casual and ranked difficulty pools", () => {
    expect(MATCHMAKING_BOTS.filter((bot) => bot.mode === "casual").map((bot) => bot.difficulty))
      .toEqual(["easy", "easy", "normal", "normal", "hard"]);
    expect(MATCHMAKING_BOTS.filter((bot) => bot.mode === "ranked").map((bot) => bot.difficulty))
      .toEqual(["hard", "hard"]);
  });

  it("does not select an occupied bot account", () => {
    const occupied = new Set(["tango-bot-casual-easy-jeti"]);
    expect(matchmakingBotPool("casual", occupied)).toHaveLength(4);
    expect(chooseMatchmakingBot("casual", occupied, () => 0)?.accountId)
      .toBe("tango-bot-casual-easy-el");
  });

  it("recognizes reserved bot accounts", () => {
    expect(isMatchmakingBotAccountId("tango-bot-ranked-hard-kimsin")).toBe(true);
    expect(isMatchmakingBotAccountId("regular-account")).toBe(false);
  });

  it("waits twice the estimate and delays moves between one and ten seconds", () => {
    expect(botFallbackDelayMs(20)).toBe(40_000);
    expect(randomBotMoveDelayMs(() => 0)).toBe(1_000);
    expect(randomBotMoveDelayMs(() => 0.999999)).toBe(10_000);
  });
});

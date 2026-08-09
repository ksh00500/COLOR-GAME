import { describe, expect, it } from "vitest";
import { createInitialGame, DEFAULT_GAME_CONFIG, placeTile } from "@color-game/game-core";
import {
  MATCHMAKING_BOTS,
  MATCHMAKING_BOT_RESOLUTION_GRACE_MS,
  botFallbackDelayMs,
  botMoveResolutionGraceMs,
  chooseMatchmakingBot,
  isScheduledBotTurnCurrent,
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

  it("waits twice the estimate and quantizes every human-paced delay to half seconds", () => {
    expect(botFallbackDelayMs(20)).toBe(40_000);
    const samples = [0, 0.09, 0.19, 0.49, 0.5, 0.79, 0.8, 0.999999];
    for (const occupiedCells of [0, 5, 6, 10, 11, 17, 18, 25]) {
      for (const sample of samples) {
        const delay = randomBotMoveDelayMs(occupiedCells, () => sample);
        expect(delay).toBeGreaterThanOrEqual(1_000);
        expect(delay % 500).toBe(0);
      }
    }
  });

  it("uses progressively more deliberate distributions as the board fills", () => {
    expect(randomBotMoveDelayMs(5, () => 0)).toBe(1_000);
    expect(randomBotMoveDelayMs(5, () => 0.999999)).toBe(2_000);

    expect(randomBotMoveDelayMs(6, () => 0.499999)).toBe(2_000);
    expect(randomBotMoveDelayMs(6, () => 0.5)).toBe(2_000);
    expect(randomBotMoveDelayMs(6, () => 0.799999)).toBe(3_000);
    expect(randomBotMoveDelayMs(6, () => 0.8)).toBe(3_000);
    expect(randomBotMoveDelayMs(10, () => 0.999999)).toBe(4_000);

    expect(randomBotMoveDelayMs(11, () => 0)).toBe(1_500);
    expect(randomBotMoveDelayMs(17, () => 0.999999)).toBe(5_000);
    expect(randomBotMoveDelayMs(18, () => 0)).toBe(2_000);
    expect(randomBotMoveDelayMs(25, () => 0.999999)).toBe(6_000);
  });

  it("adds a resolution barrier only after tiles are removed", () => {
    const initial = createInitialGame({
      ...DEFAULT_GAME_CONFIG,
      colors: [...DEFAULT_GAME_CONFIG.colors],
      scoreRules: { ...DEFAULT_GAME_CONFIG.scoreRules },
      turnTimeLimitSeconds: null,
    }, { now: 1_000 });
    expect(botMoveResolutionGraceMs(initial)).toBe(0);

    const first = placeTile(initial, {
      playerId: "player1",
      row: 0,
      col: 0,
      color: "colorA",
      createdAt: 2_000,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(botMoveResolutionGraceMs(first.state)).toBe(0);

    const scoringState = {
      ...first.state,
      lastMove: {
        ...first.state.lastMove!,
        removedCells: [{ row: 0, col: 0 }],
      },
    };
    expect(botMoveResolutionGraceMs(scoringState)).toBe(MATCHMAKING_BOT_RESOLUTION_GRACE_MS);
  });

  it("discards a scheduled move after the game or turn advances", () => {
    const game = createInitialGame({
      ...DEFAULT_GAME_CONFIG,
      colors: [...DEFAULT_GAME_CONFIG.colors],
      scoreRules: { ...DEFAULT_GAME_CONFIG.scoreRules },
      turnTimeLimitSeconds: null,
    }, { now: 1_000 });

    expect(isScheduledBotTurnCurrent(game, game.id, game.turnNumber)).toBe(true);
    expect(isScheduledBotTurnCurrent(game, "other-game", game.turnNumber)).toBe(false);
    expect(isScheduledBotTurnCurrent(game, game.id, game.turnNumber + 1)).toBe(false);
  });
});

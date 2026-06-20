import { describe, expect, it } from "vitest";
import { createInitialGame, DEFAULT_GAME_CONFIG } from "@color-game/game-core";
import type { GameState } from "@color-game/shared-types";
import { chooseAiMove } from "./index";

const aiState = (): GameState => ({
  ...createInitialGame(
    { ...DEFAULT_GAME_CONFIG, turnTimeLimitSeconds: null },
    { firstPlayerId: "player2" },
  ),
  board: [
    ["colorA", "colorA", null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
  ],
});

describe("chooseAiMove", () => {
  it("uses the former trained Normal policy as Easy and takes an immediate scoring move", () => {
    expect(chooseAiMove(aiState(), "easy", () => 0)).toEqual({
      row: 0,
      col: 2,
      color: "colorA",
    });
  });

  it("always returns a valid empty position", () => {
    const state = aiState();
    const move = chooseAiMove(state, "easy", () => 0.5);

    expect(move).not.toBeNull();
    if (move === null) return;
    expect(state.board[move.row]?.[move.col]).toBeNull();
  });

  it("uses the trained Normal policy to prefer the center on an empty board", () => {
    const state = createInitialGame(
      { ...DEFAULT_GAME_CONFIG, turnTimeLimitSeconds: null },
      { firstPlayerId: "player2" },
    );

    expect(chooseAiMove(state, "easy", () => 0)).toMatchObject({ row: 2, col: 2 });
  });
});

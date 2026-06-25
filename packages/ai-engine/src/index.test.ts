import { describe, expect, it } from "vitest";
import { createInitialGame, DEFAULT_GAME_CONFIG } from "@color-game/game-core";
import type { GameState } from "@color-game/shared-types";
import { chooseAiMove, isHardAiAvailable } from "./index";

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
  it("uses the algorithmic Easy policy and takes an immediate scoring move", () => {
    expect(chooseAiMove(aiState(), "easy", () => 0.2)).toEqual({
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

  it("uses a simple center preference for algorithmic Easy", () => {
    const state = createInitialGame(
      { ...DEFAULT_GAME_CONFIG, turnTimeLimitSeconds: null },
      { firstPlayerId: "player2" },
    );

    expect(chooseAiMove(state, "easy", () => 0)).toMatchObject({ row: 2, col: 2 });
  });

  it("can miss one-move reply risk so Easy stays beginner-friendly", () => {
    const state: GameState = {
      ...createInitialGame(
        { ...DEFAULT_GAME_CONFIG, turnTimeLimitSeconds: null },
        { firstPlayerId: "player2" },
      ),
      board: [
        ["colorA", null, null, null, null],
        [null, null, null, null, null],
        [null, null, null, null, null],
        [null, null, null, null, null],
        [null, null, null, null, null],
      ],
    };
    const move = chooseAiMove(state, "easy", () => 0);
    expect(move).not.toBeNull();
    if (move !== null) expect(state.board[move.row]?.[move.col]).toBeNull();
  });

  it("occasionally uses the shallower Easy policy while keeping the move valid", () => {
    const state = aiState();
    state.board = [
      ["colorA", null, null, null, null],
      [null, "colorB", null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
    ];

    const move = chooseAiMove(state, "easy", () => 0.99);
    expect(move).not.toBeNull();
    if (move !== null) expect(state.board[move.row]?.[move.col]).toBeNull();
  });

  it("uses the promoted AlphaZero-lite model for Normal moves", () => {
    const state = aiState();
    const move = chooseAiMove(state, "normal", () => 0);
    expect(move).not.toBeNull();
    if (move !== null) expect(state.board[move.row]?.[move.col]).toBeNull();
  });

  it("keeps Hard locked while still returning a safe fallback move if called directly", () => {
    expect(isHardAiAvailable).toBe(false);
    const state = aiState();
    const move = chooseAiMove(state, "hard", () => 0);
    expect(move).not.toBeNull();
    if (move !== null) expect(state.board[move.row]?.[move.col]).toBeNull();
  });
});

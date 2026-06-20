import { describe, expect, it } from "vitest";
import { createInitialGame, DEFAULT_GAME_CONFIG, getValidMoves, placeTile } from "@color-game/game-core";
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

  it("uses a simple center preference for algorithmic Easy", () => {
    const state = createInitialGame(
      { ...DEFAULT_GAME_CONFIG, turnTimeLimitSeconds: null },
      { firstPlayerId: "player2" },
    );

    expect(chooseAiMove(state, "easy", () => 0)).toMatchObject({ row: 2, col: 2 });
  });

  it("does not create an immediate scoring move for the opponent when a safe move exists", () => {
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
    if (move === null || state.currentPlayerId === null) return;
    const placed = placeTile(state, { ...move, playerId: state.currentPlayerId, createdAt: 0 });
    expect(placed.ok).toBe(true);
    if (!placed.ok || placed.state.currentPlayerId === null) return;
    const scoringReplies = getValidMoves(placed.state).filter((reply) => {
      const result = placeTile(placed.state, {
        ...reply,
        playerId: placed.state.currentPlayerId!,
        createdAt: 0,
      });
      return result.ok && result.move.earnedScore > 0;
    });
    expect(scoringReplies).toHaveLength(0);
  });

  it("uses the 626-move trained model for Normal moves", () => {
    const state = aiState();
    const move = chooseAiMove(state, "normal", () => 0);
    expect(move).not.toBeNull();
    if (move !== null) expect(state.board[move.row]?.[move.col]).toBeNull();
  });

  it("loads the promoted AlphaZero-lite model for Hard moves", () => {
    expect(isHardAiAvailable).toBe(true);
    const state = aiState();
    const move = chooseAiMove(state, "hard", () => 0);
    expect(move).not.toBeNull();
    if (move !== null) expect(state.board[move.row]?.[move.col]).toBeNull();
  });
});

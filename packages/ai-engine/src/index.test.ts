import { describe, expect, it } from "vitest";
import {
  createInitialGame,
  DEFAULT_GAME_CONFIG,
  getValidMoves,
  placeTile,
} from "@color-game/game-core";
import type { GameState } from "@color-game/shared-types";
import { chooseAiMove, isHardAiAvailable, normalAiSettings } from "./index";

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

  it("keeps Normal between Easy and Hard with probabilistic tactical decisions", () => {
    expect(normalAiSettings).toMatchObject({
      immediateScoreChance: 0.85,
      threatBlockChance: 0.6,
      replyRiskCheckChance: 0.5,
      finalCandidateLimit: 3,
    });
  });

  it("lets Normal choose among several strong candidates instead of always taking one move", () => {
    const state = createInitialGame(
      { ...DEFAULT_GAME_CONFIG, turnTimeLimitSeconds: null },
      { firstPlayerId: "player2" },
    );
    const first = chooseAiMove(state, "normal", () => 0);
    const alternate = chooseAiMove(state, "normal", () => 0.99);

    expect(first).not.toBeNull();
    expect(alternate).not.toBeNull();
    expect(alternate).not.toEqual(first);
  });

  it("enables the promoted policy-value Hard model", () => {
    expect(isHardAiAvailable).toBe(true);
    const state = aiState();
    const move = chooseAiMove(state, "hard", () => 0);
    expect(move).not.toBeNull();
    if (move !== null) expect(state.board[move.row]?.[move.col]).toBeNull();
  });

  it("rejects a tempting immediate score when deeper search finds a safer line", () => {
    const state: GameState = {
      ...createInitialGame(
        { ...DEFAULT_GAME_CONFIG, turnTimeLimitSeconds: null },
        { firstPlayerId: "player2" },
      ),
      board: [
        ["colorA", "colorC", null, "colorC", "colorC"],
        ["colorB", "colorA", "colorC", null, "colorB"],
        ["colorC", "colorA", "colorC", "colorA", null],
        ["colorB", "colorC", "colorB", "colorB", null],
        ["colorB", "colorB", "colorA", "colorB", null],
      ],
      players: [
        { ...aiState().players[0], score: 6 },
        { ...aiState().players[1], score: 5 },
      ],
      currentPlayerId: "player2",
      turnNumber: 45,
    };
    const moves = getValidMoves(state);
    const immediateScores = moves.map((move) => {
      const result = placeTile(state, {
        ...move,
        playerId: state.currentPlayerId!,
        createdAt: 1,
      });
      return result.ok ? result.move.earnedScore : -1;
    });
    const move = chooseAiMove(state, "hard", () => 0);
    expect(move).not.toBeNull();
    if (move === null) return;
    const selectedIndex = moves.findIndex((candidate) =>
      candidate.row === move.row
      && candidate.col === move.col
      && candidate.color === move.color);

    expect(Math.max(...immediateScores)).toBe(3);
    expect(immediateScores[selectedIndex]).toBe(2);
  });

  it("keeps a Hard decision within the bounded mobile move budget", () => {
    const startedAt = performance.now();
    expect(chooseAiMove(aiState(), "hard", () => 0)).not.toBeNull();
    expect(performance.now() - startedAt).toBeLessThan(250);
  });
});

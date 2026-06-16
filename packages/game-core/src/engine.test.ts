import { describe, expect, it } from "vitest";
import type { Board, GameConfig, GameState, TileColorId } from "@color-game/shared-types";
import {
  DEFAULT_GAME_CONFIG,
  createInitialGame,
  expireTurn,
  findScoringLines,
  getValidMoves,
  placeTile,
} from "./engine";

const noTimerConfig: GameConfig = {
  ...DEFAULT_GAME_CONFIG,
  colors: [...DEFAULT_GAME_CONFIG.colors],
  scoreRules: { ...DEFAULT_GAME_CONFIG.scoreRules },
  turnTimeLimitSeconds: null,
};

const boardFrom = (rows: Array<Array<TileColorId | null>>): Board =>
  rows.map((row) => [...row]);

const gameWithBoard = (board: Board, overrides: Partial<GameState> = {}): GameState => ({
  ...createInitialGame(noTimerConfig, { now: 1_000 }),
  board,
  ...overrides,
});

describe("move validation", () => {
  it("places one tile and switches the turn", () => {
    const state = createInitialGame(noTimerConfig, { now: 1_000 });
    const result = placeTile(state, {
      playerId: "player1",
      row: 2,
      col: 2,
      color: "colorA",
      createdAt: 2_000,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.board[2]?.[2]).toBe("colorA");
    expect(result.state.currentPlayerId).toBe("player2");
    expect(result.state.turnNumber).toBe(2);
  });

  it.each([
    ["occupied cell", { row: 0, col: 0, color: "colorB" as const }, "CELL_NOT_EMPTY"],
    ["outside board", { row: 9, col: 0, color: "colorA" as const }, "OUT_OF_BOUNDS"],
    ["wrong turn", { row: 0, col: 1, color: "colorA" as const }, "NOT_YOUR_TURN"],
  ])("rejects %s", (_name, move, errorCode) => {
    const state = gameWithBoard(
      boardFrom([
        ["colorA", null, null, null, null],
        [null, null, null, null, null],
        [null, null, null, null, null],
        [null, null, null, null, null],
        [null, null, null, null, null],
      ]),
    );
    const playerId = errorCode === "NOT_YOUR_TURN" ? "player2" : "player1";
    const result = placeTile(state, { playerId, ...move, createdAt: 2_000 });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe(errorCode);
  });

  it("returns one valid move per empty cell and color", () => {
    const state = createInitialGame(noTimerConfig);
    expect(getValidMoves(state)).toHaveLength(25 * 3);
  });
});

describe("scoring lines", () => {
  it("scores horizontal and vertical three-lines", () => {
    const horizontal = boardFrom([
      [null, null, null, null, null],
      [null, null, null, null, null],
      ["colorA", "colorA", "colorA", null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
    ]);
    const vertical = boardFrom([
      [null, "colorB", null, null, null],
      [null, "colorB", null, null, null],
      [null, "colorB", null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
    ]);

    expect(findScoringLines(horizontal, { row: 2, col: 1 }, "colorA")).toMatchObject([
      { direction: "horizontal", length: 3, score: 1 },
    ]);
    expect(findScoringLines(vertical, { row: 1, col: 1 }, "colorB")).toMatchObject([
      { direction: "vertical", length: 3, score: 1 },
    ]);
  });

  it("recognizes both diagonal directions", () => {
    const board = boardFrom([
      ["colorA", null, null, null, "colorA"],
      [null, "colorA", null, "colorA", null],
      [null, null, "colorA", null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
    ]);
    const lines = findScoringLines(board, { row: 2, col: 2 }, "colorA");

    expect(lines.map((line) => line.direction).sort()).toEqual([
      "diagonalDown",
      "diagonalUp",
    ]);
    expect(lines.every((line) => line.score === 1)).toBe(true);
  });

  it("counts only the longest four or five line per direction", () => {
    const four = boardFrom([
      ["colorB", "colorB", "colorB", "colorB", null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
    ]);
    const five = boardFrom([
      [null, null, null, null, null],
      ["colorC", "colorC", "colorC", "colorC", "colorC"],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
    ]);

    expect(findScoringLines(four, { row: 0, col: 2 }, "colorB")).toMatchObject([
      { length: 4, score: 3 },
    ]);
    expect(findScoringLines(five, { row: 1, col: 2 }, "colorC")).toMatchObject([
      { length: 5, score: 5 },
    ]);
  });
});

describe("scoring and removal", () => {
  it("adds scores from multiple directions and removes the shared tile once", () => {
    const state = gameWithBoard(
      boardFrom([
        [null, null, "colorA", null, null],
        [null, null, "colorA", null, null],
        ["colorA", "colorA", null, null, null],
        [null, null, null, null, null],
        [null, null, null, null, null],
      ]),
    );
    const result = placeTile(state, {
      playerId: "player1",
      row: 2,
      col: 2,
      color: "colorA",
      createdAt: 2_000,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.move.earnedScore).toBe(2);
    expect(result.move.scoringLines).toHaveLength(2);
    expect(result.move.removedCells).toHaveLength(5);
    expect(result.state.players[0].score).toBe(2);
    expect(result.state.board.flat().every((cell) => cell === null)).toBe(true);
  });

  it("awards the score to the player completing an ownerless pattern", () => {
    const state = gameWithBoard(
      boardFrom([
        ["colorC", "colorC", null, null, null],
        [null, null, null, null, null],
        [null, null, null, null, null],
        [null, null, null, null, null],
        [null, null, null, null, null],
      ]),
      { currentPlayerId: "player2" },
    );
    const result = placeTile(state, {
      playerId: "player2",
      row: 0,
      col: 2,
      color: "colorC",
      createdAt: 2_000,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0].score).toBe(0);
    expect(result.state.players[1].score).toBe(1);
  });

  it("does not mutate the previous state", () => {
    const state = createInitialGame(noTimerConfig, { now: 1_000 });
    const originalBoard = state.board.map((row) => [...row]);
    const result = placeTile(state, {
      playerId: "player1",
      row: 0,
      col: 0,
      color: "colorA",
      createdAt: 2_000,
    });

    expect(result.ok).toBe(true);
    expect(state.board).toEqual(originalBoard);
    expect(state.players[0].score).toBe(0);
  });
});

describe("game completion", () => {
  it("finishes immediately when a player reaches the target", () => {
    const state = gameWithBoard(
      boardFrom([
        ["colorA", "colorA", null, null, null],
        [null, null, null, null, null],
        [null, null, null, null, null],
        [null, null, null, null, null],
        [null, null, null, null, null],
      ]),
    );
    state.players[0].score = 9;
    const result = placeTile(state, {
      playerId: "player1",
      row: 0,
      col: 2,
      color: "colorA",
      createdAt: 2_000,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("finished");
    expect(result.state.winnerId).toBe("player1");
    expect(result.state.result).toBe("target-score");
  });

  it("clears every tile and keeps playing when the board fills without scoring", () => {
    const state = gameWithBoard(
      boardFrom([
        ["colorA", "colorB", "colorC", "colorA", "colorB"],
        ["colorB", "colorC", "colorA", "colorB", "colorC"],
        ["colorC", "colorA", "colorB", "colorC", "colorA"],
        ["colorA", "colorB", "colorC", "colorA", "colorB"],
        ["colorB", "colorC", "colorA", "colorB", null],
      ]),
    );
    const result = placeTile(state, {
      playerId: "player1",
      row: 4,
      col: 4,
      color: "colorC",
      createdAt: 2_000,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("playing");
    expect(result.state.result).toBeNull();
    expect(result.state.winnerId).toBeNull();
    expect(result.state.currentPlayerId).toBe("player2");
    expect(result.state.turnNumber).toBe(2);
    expect(result.move.earnedScore).toBe(0);
    expect(result.move.removedCells).toHaveLength(25);
    expect(result.state.board.flat().every((cell) => cell === null)).toBe(true);
  });

  it("awards a timeout win to the opponent", () => {
    const state = createInitialGame(DEFAULT_GAME_CONFIG, { now: 1_000 });
    const expired = expireTurn(state, 61_000);

    expect(expired.status).toBe("finished");
    expect(expired.result).toBe("timeout");
    expect(expired.winnerId).toBe("player2");
  });

  it("rejects moves after the game is finished", () => {
    const state = {
      ...createInitialGame(noTimerConfig),
      status: "finished" as const,
      currentPlayerId: null,
    };
    const result = placeTile(state, {
      playerId: "player1",
      row: 0,
      col: 0,
      color: "colorA",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe("GAME_ALREADY_FINISHED");
  });
});

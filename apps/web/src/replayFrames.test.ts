import { describe, expect, it } from "vitest";
import { createInitialGame, DEFAULT_GAME_CONFIG, placeTile } from "@color-game/game-core";
import type { GameReplay, GameState, Move, TileColorId } from "@color-game/shared-types";
import { buildReplayFrame } from "./replayFrames";

const createScoringReplay = (): GameReplay => {
  let state = createInitialGame(
    { ...DEFAULT_GAME_CONFIG, turnTimeLimitSeconds: null },
    { id: "replay-test", mode: "casual", firstPlayerId: "player1", now: 0 },
  );
  const moves: Move[] = [];
  const placements: Array<{ row: number; col: number; color: TileColorId }> = [
    { row: 0, col: 0, color: "colorA" },
    { row: 4, col: 4, color: "colorB" },
    { row: 0, col: 1, color: "colorA" },
    { row: 0, col: 2, color: "colorA" },
  ];

  for (const placement of placements) {
    const result = placeTile(state, {
      ...placement,
      playerId: state.currentPlayerId!,
      createdAt: state.turnNumber,
    });
    if (!result.ok) throw new Error(`Could not create replay move: ${result.errorCode}`);
    state = result.state;
    moves.push(result.move);
  }

  const finalState: GameState = { ...state, status: "finished", currentPlayerId: null };
  return {
    gameId: finalState.id,
    roomCode: "TEST01",
    mode: "casual",
    finalState,
    moves,
    startedAt: new Date(0).toISOString(),
    finishedAt: new Date(4).toISOString(),
  };
};

describe("buildReplayFrame", () => {
  it("shows the completed scoring line before removing its tiles", () => {
    const replay = createScoringReplay();
    const frame = buildReplayFrame(replay, 4, false);

    expect(frame.awaitingRemoval).toBe(true);
    expect(frame.board[0]?.slice(0, 3)).toEqual(["colorA", "colorA", "colorA"]);
    expect([...frame.scoringCells]).toEqual(["0:0", "0:1", "0:2"]);
    expect(frame.players[1].score).toBe(1);
  });

  it("removes the scoring line after the resolution phase", () => {
    const replay = createScoringReplay();
    const frame = buildReplayFrame(replay, 4, true);

    expect(frame.awaitingRemoval).toBe(false);
    expect(frame.board[0]?.slice(0, 3)).toEqual([null, null, null]);
    expect(frame.scoringCells.size).toBe(0);
    expect(frame.board).toEqual(replay.finalState.board);
    expect(frame.players.map((player) => player.score)).toEqual(
      replay.finalState.players.map((player) => player.score),
    );
  });

  it("clamps steps outside the available move range", () => {
    const replay = createScoringReplay();
    expect(buildReplayFrame(replay, -10).board.flat().every((cell) => cell === null)).toBe(true);
    expect(buildReplayFrame(replay, 99).board).toEqual(replay.finalState.board);
  });
});

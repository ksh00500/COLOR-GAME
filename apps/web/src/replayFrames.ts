import type { Board, GamePlayer, GameReplay, Position } from "@color-game/shared-types";

export interface ReplayFrame {
  board: Board;
  players: [GamePlayer, GamePlayer];
  lastPlaced: Position | null;
  scoringCells: Set<string>;
  awaitingRemoval: boolean;
}

export const buildReplayFrame = (
  replay: GameReplay,
  step: number,
  resolveCurrentScoring = true,
): ReplayFrame => {
  const size = replay.finalState.config.boardSize;
  const board: Board = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null),
  );
  const scores = new Map(replay.finalState.players.map((player) => [player.id, 0]));
  const clampedStep = Math.max(0, Math.min(replay.moves.length, step));
  const applied = replay.moves.slice(0, clampedStep);
  const currentMove = applied.at(-1) ?? null;
  const awaitingRemoval =
    !resolveCurrentScoring &&
    currentMove !== null &&
    currentMove.removedCells.length > 0;

  applied.forEach((move, index) => {
    board[move.row]![move.col] = move.color;
    scores.set(move.playerId, (scores.get(move.playerId) ?? 0) + move.earnedScore);

    const isCurrentMove = index === applied.length - 1;
    if (!isCurrentMove || !awaitingRemoval) {
      for (const cell of move.removedCells) {
        board[cell.row]![cell.col] = null;
      }
    }
  });

  return {
    board,
    players: replay.finalState.players.map((player) => ({
      ...player,
      score: scores.get(player.id) ?? 0,
    })) as [GamePlayer, GamePlayer],
    lastPlaced: currentMove === null ? null : { row: currentMove.row, col: currentMove.col },
    scoringCells: new Set(
      awaitingRemoval
        ? currentMove?.removedCells.map((cell) => `${cell.row}:${cell.col}`) ?? []
        : [],
    ),
    awaitingRemoval,
  };
};

import { getValidMoves, placeTile } from "@color-game/game-core";
import type { GameState, TileColorId, ValidMove } from "@color-game/shared-types";

export type AiDifficulty = "easy" | "normal" | "hard";

const adjacentPotential = (
  state: GameState,
  move: ValidMove,
  color: TileColorId,
): number => {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ] as const;

  return directions.reduce((total, [rowDelta, colDelta]) => {
    let matching = 0;
    for (const sign of [-1, 1]) {
      const row = move.row + rowDelta * sign;
      const col = move.col + colDelta * sign;
      if (state.board[row]?.[col] === color) matching += 1;
    }
    return total + matching;
  }, 0);
};

const opponentScoringCells = (state: GameState): Set<string> => {
  const opponent = state.players.find((player) => player.id !== state.currentPlayerId);
  if (opponent === undefined) return new Set();

  const opponentState: GameState = {
    ...state,
    currentPlayerId: opponent.id,
    turnTimer: null,
  };
  const cells = new Set<string>();
  const evaluationTime = state.turnTimer?.startedAt ?? Date.now();

  for (const move of getValidMoves(opponentState)) {
    const result = placeTile(opponentState, {
      ...move,
      playerId: opponent.id,
      createdAt: evaluationTime,
    });
    if (result.ok && result.move.earnedScore > 0) {
      cells.add(`${move.row}:${move.col}`);
    }
  }

  return cells;
};

export const chooseAiMove = (
  state: GameState,
  difficulty: AiDifficulty = "normal",
  random: () => number = Math.random,
): ValidMove | null => {
  const moves = getValidMoves(state);
  if (moves.length === 0 || state.currentPlayerId === null) return null;

  if (difficulty === "easy") {
    return moves[Math.floor(random() * moves.length)] ?? moves[0] ?? null;
  }

  const threatenedCells = opponentScoringCells(state);
  const evaluationTime = state.turnTimer?.startedAt ?? Date.now();
  const scored = moves.map((move) => {
    const result = placeTile(state, {
      ...move,
      playerId: state.currentPlayerId!,
      createdAt: evaluationTime,
    });
    const immediate = result.ok ? result.move.earnedScore : 0;
    const block = threatenedCells.has(`${move.row}:${move.col}`) ? 1 : 0;
    const potential = adjacentPotential(state, move, move.color);
    const centerDistance =
      Math.abs(move.row - (state.config.boardSize - 1) / 2) +
      Math.abs(move.col - (state.config.boardSize - 1) / 2);

    return {
      move,
      score:
        immediate * 1_000 +
        block * 120 +
        potential * (difficulty === "hard" ? 18 : 8) -
        centerDistance,
    };
  });

  const bestScore = Math.max(...scored.map((candidate) => candidate.score));
  const bestMoves = scored.filter((candidate) => candidate.score === bestScore);
  return bestMoves[Math.floor(random() * bestMoves.length)]?.move ?? bestMoves[0]?.move ?? null;
};

import { getValidMoves, placeTile } from "@color-game/game-core";
import type { GameState, TileColorId, ValidMove } from "@color-game/shared-types";
import normalModel from "./normal-model.json";
import normalAlphaModel from "./normal-alpha-model.json";

export type AiDifficulty = "easy" | "normal" | "hard";
export const isNormalAiAvailable = normalAlphaModel.available === true;

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

export const getOpponentScoringCells = (state: GameState): Set<string> => {
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

export const AI_FEATURE_NAMES = [
  "immediateScore",
  "blocksScoringCell",
  "adjacentPotential",
  "centerPreference",
  "sameColorCount",
] as const;

export const extractAiMoveFeatures = (
  state: GameState,
  move: ValidMove,
  threatenedCells = getOpponentScoringCells(state),
): number[] => {
  if (state.currentPlayerId === null) return [0, 0, 0, 0, 0];
  const evaluationTime = state.turnTimer?.startedAt ?? Date.now();
  const result = placeTile(state, {
    ...move,
    playerId: state.currentPlayerId,
    createdAt: evaluationTime,
  });
  const center = (state.config.boardSize - 1) / 2;
  const centerDistance = Math.abs(move.row - center) + Math.abs(move.col - center);
  const sameColorCount = state.board.flat().filter((cell) => cell === move.color).length;

  return [
    result.ok ? result.move.earnedScore : 0,
    threatenedCells.has(`${move.row}:${move.col}`) ? 1 : 0,
    adjacentPotential(state, move, move.color),
    state.config.boardSize - centerDistance,
    sameColorCount,
  ];
};

const modelScore = (features: number[]): number =>
  normalModel.bias + normalModel.weights.reduce((score, weight, index) => {
    const mean = normalModel.means[index] ?? 0;
    const scale = normalModel.scales[index] ?? 1;
    return score + weight * (((features[index] ?? 0) - mean) / scale);
  }, 0);

const dense = (input: number[], weights: number[][], bias: number[], relu = false): number[] =>
  weights.map((row, output) => {
    const value = (bias[output] ?? 0) + row.reduce(
      (sum, weight, index) => sum + weight * (input[index] ?? 0), 0,
    );
    return relu ? Math.max(0, value) : value;
  });

const normalAlphaPolicy = (state: GameState): number[] | null => {
  if (!isNormalAiAvailable) return null;
  const parameters = normalAlphaModel.state as Record<string, number[] | number[][]>;
  const currentIndex = state.players.findIndex((player) => player.id === state.currentPlayerId);
  if (currentIndex < 0) return null;
  const board = state.board;
  const input: number[] = [];
  for (const color of state.config.colors) {
    for (const row of board) for (const cell of row) input.push(cell === color ? 1 : 0);
  }
  for (let index = 0; index < 25; index += 1) input.push(currentIndex);
  for (let index = 0; index < 25; index += 1) input.push(state.players[currentIndex]!.score / state.config.targetScore);
  for (let index = 0; index < 25; index += 1) input.push(state.players[1 - currentIndex]!.score / state.config.targetScore);
  const hidden1 = dense(input, parameters["trunk.1.weight"] as number[][], parameters["trunk.1.bias"] as number[], true);
  const hidden2 = dense(hidden1, parameters["trunk.3.weight"] as number[][], parameters["trunk.3.bias"] as number[], true);
  return dense(hidden2, parameters["policy.weight"] as number[][], parameters["policy.bias"] as number[]);
};

export const chooseAiMove = (
  state: GameState,
  difficulty: AiDifficulty = "normal",
  random: () => number = Math.random,
): ValidMove | null => {
  const moves = getValidMoves(state);
  if (moves.length === 0 || state.currentPlayerId === null) return null;

  if (difficulty === "easy" || (difficulty === "normal" && !isNormalAiAvailable)) {
    const threatenedCells = getOpponentScoringCells(state);
    const candidates = moves.map((move) => ({
      move,
      features: extractAiMoveFeatures(state, move, threatenedCells),
    }));
    const bestImmediate = Math.max(...candidates.map((candidate) => candidate.features[0] ?? 0));
    const tactical = bestImmediate > 0
      ? candidates.filter((candidate) => candidate.features[0] === bestImmediate)
      : candidates.some((candidate) => candidate.features[1] === 1)
        ? candidates.filter((candidate) => candidate.features[1] === 1)
        : candidates;
    const scored = tactical.map((candidate) => ({
      move: candidate.move,
      score: modelScore(candidate.features),
    }));
    const bestScore = Math.max(...scored.map((candidate) => candidate.score));
    const bestMoves = scored.filter((candidate) => Math.abs(candidate.score - bestScore) < 1e-9);
    return bestMoves[Math.floor(random() * bestMoves.length)]?.move ?? bestMoves[0]?.move ?? null;
  }

  const learnedPolicy = normalAlphaPolicy(state);
  if (difficulty === "normal" && learnedPolicy !== null) {
    const scored = moves.map((move) => ({
      move,
      score: learnedPolicy[(move.row * state.config.boardSize + move.col) * state.config.colors.length
        + state.config.colors.indexOf(move.color)] ?? Number.NEGATIVE_INFINITY,
    }));
    const bestScore = Math.max(...scored.map((candidate) => candidate.score));
    const bestMoves = scored.filter((candidate) => candidate.score === bestScore);
    return bestMoves[Math.floor(random() * bestMoves.length)]?.move ?? bestMoves[0]?.move ?? null;
  }

  const threatenedCells = getOpponentScoringCells(state);
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

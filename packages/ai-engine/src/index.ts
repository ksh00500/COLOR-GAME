import { getValidMoves, placeTile } from "@color-game/game-core";
import type { GameState, TileColorId, ValidMove } from "@color-game/shared-types";
import hardAlphaModel from "./hard-alpha-model.json";

export type AiDifficulty = "easy" | "normal" | "hard";
const isPromotedAiAvailable = hardAlphaModel.available === true;
export const isHardAiAvailable = false;

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

const decodeFloat32 = (encoded: string): Float32Array => {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Float32Array(bytes.buffer);
};

let cachedHardAlphaState: Record<string, Float32Array> | null = null;
const hardAlphaState = (): Record<string, Float32Array> => {
  if (cachedHardAlphaState !== null) return cachedHardAlphaState;
  cachedHardAlphaState = Object.fromEntries(
    Object.entries(hardAlphaModel.state as Record<string, string>)
      .map(([name, encoded]) => [name, decodeFloat32(encoded)]),
  );
  return cachedHardAlphaState;
};

const denseFloat32 = (
  input: ArrayLike<number>,
  weights: Float32Array,
  bias: Float32Array,
  outputs: number,
  relu = false,
): number[] => Array.from({ length: outputs }, (_, output) => {
  let value = bias[output] ?? 0;
  const offset = output * input.length;
  for (let index = 0; index < input.length; index += 1) {
    value += (weights[offset + index] ?? 0) * (input[index] ?? 0);
  }
  return relu ? Math.max(0, value) : value;
});

const hardAlphaPolicy = (state: GameState): number[] | null => {
  if (!isPromotedAiAvailable) return null;
  const parameters = hardAlphaState();
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
  const hidden1 = denseFloat32(input, parameters["trunk.1.weight"]!, parameters["trunk.1.bias"]!, 128, true);
  const hidden2 = denseFloat32(hidden1, parameters["trunk.3.weight"]!, parameters["trunk.3.bias"]!, 128, true);
  return denseFloat32(hidden2, parameters["policy.weight"]!, parameters["policy.bias"]!, 75);
};

const opponentReplyRisk = (state: GameState, move: ValidMove): number => {
  const evaluationTime = state.turnTimer?.startedAt ?? Date.now();
  const result = placeTile(state, { ...move, playerId: state.currentPlayerId!, createdAt: evaluationTime });
  if (!result.ok || result.state.status === "finished" || result.state.currentPlayerId === null) return -1;
  const opponentId = result.state.currentPlayerId;
  return getValidMoves(result.state).reduce((risk, reply) => {
    const replyResult = placeTile(result.state, {
      ...reply,
      playerId: opponentId,
      createdAt: result.state.turnTimer?.startedAt ?? evaluationTime,
    });
    return Math.max(risk, replyResult.ok ? replyResult.move.earnedScore : 0);
  }, 0);
};

export const chooseAiMove = (
  state: GameState,
  difficulty: AiDifficulty = "normal",
  random: () => number = Math.random,
): ValidMove | null => {
  const moves = getValidMoves(state);
  if (moves.length === 0 || state.currentPlayerId === null) return null;

  const threatenedCells = getOpponentScoringCells(state);
  const candidates = moves.map((move) => ({
    move,
    features: extractAiMoveFeatures(state, move, threatenedCells),
  }));

  if (difficulty === "easy") {
    const bestImmediate = Math.max(...candidates.map((candidate) => candidate.features[0] ?? 0));
    if (bestImmediate > 0 && random() < 0.65) {
      const scoringMoves = candidates.filter((candidate) => candidate.features[0] === bestImmediate);
      return scoringMoves[Math.floor(random() * scoringMoves.length)]?.move ?? scoringMoves[0]?.move ?? null;
    }

    // Easy is intentionally beatable: it has a light center preference, only
    // sometimes blocks threats, and often ignores one-move reply risk.
    const noticesThreat = random() < 0.25;
    const scored = candidates.map((candidate) => ({
      move: candidate.move,
      score:
        (candidate.features[1] ?? 0) * (noticesThreat ? 18 : 0) +
        (candidate.features[2] ?? 0) * 0.18 +
        (candidate.features[3] ?? 0) * 0.42 +
        random() * 1.6,
    }));
    const bestScore = Math.max(...scored.map((candidate) => candidate.score));
    const bestMoves = scored.filter((candidate) => Math.abs(candidate.score - bestScore) < 1e-9);
    return bestMoves[Math.floor(random() * bestMoves.length)]?.move ?? bestMoves[0]?.move ?? null;
  }

  const learnedPolicy = hardAlphaPolicy(state);
  if (learnedPolicy !== null) {
    const policyCandidates = candidates.map((candidate) => ({
      ...candidate,
      score: learnedPolicy[(candidate.move.row * state.config.boardSize + candidate.move.col) * state.config.colors.length
        + state.config.colors.indexOf(candidate.move.color)] ?? Number.NEGATIVE_INFINITY,
    }));
    const bestImmediate = Math.max(...policyCandidates.map((candidate) => candidate.features[0] ?? 0));
    const tactical = bestImmediate > 0
      ? policyCandidates.filter((candidate) => candidate.features[0] === bestImmediate)
      : policyCandidates.some((candidate) => candidate.features[1] === 1)
        ? policyCandidates.filter((candidate) => candidate.features[1] === 1)
        : policyCandidates;
    const withRisk = tactical.map((candidate) => ({
      ...candidate,
      risk: opponentReplyRisk(state, candidate.move),
    }));
    const minimumRisk = Math.min(...withRisk.map((candidate) => candidate.risk));
    const scored = withRisk.filter((candidate) => candidate.risk === minimumRisk);
    const bestScore = Math.max(...scored.map((candidate) => candidate.score));
    const bestMoves = scored.filter((candidate) => candidate.score === bestScore);
    return bestMoves[Math.floor(random() * bestMoves.length)]?.move ?? bestMoves[0]?.move ?? null;
  }
  const bestImmediate = Math.max(...candidates.map((candidate) => candidate.features[0] ?? 0));
  const tactical = bestImmediate > 0
    ? candidates.filter((candidate) => candidate.features[0] === bestImmediate)
    : candidates.some((candidate) => candidate.features[1] === 1)
      ? candidates.filter((candidate) => candidate.features[1] === 1)
      : candidates;
  return tactical[Math.floor(random() * tactical.length)]?.move ?? tactical[0]?.move ?? null;
};

import { getValidMoves, placeTile } from "@color-game/game-core";
import type { GameState, TileColorId, ValidMove } from "@color-game/shared-types";
import hardAlphaModel from "./hard-alpha-model.json";

export type AiDifficulty = "easy" | "normal" | "hard";
const isPromotedAiAvailable = hardAlphaModel.available === true;
export const isHardAiAvailable = isPromotedAiAvailable && hardAlphaModel.version >= 2;
export const normalAiSettings = {
  immediateScoreChance: 0.72,
  threatBlockChance: 0.38,
  replyRiskCheckChance: 0.32,
  riskCandidateLimit: 6,
  finalCandidateLimit: 3,
  rankWeights: [0.5, 0.3, 0.2],
} as const;

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

const hardAlphaInference = (state: GameState): { policy: number[]; value: number } | null => {
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
  const policy = denseFloat32(hidden2, parameters["policy.weight"]!, parameters["policy.bias"]!, 75);
  const valueHiddenWeights = parameters["value.0.weight"];
  const valueHiddenBias = parameters["value.0.bias"];
  const valueOutputWeights = parameters["value.2.weight"];
  const valueOutputBias = parameters["value.2.bias"];
  const value = valueHiddenWeights && valueHiddenBias && valueOutputWeights && valueOutputBias
    ? Math.tanh(denseFloat32(
      denseFloat32(hidden2, valueHiddenWeights, valueHiddenBias, 64, true),
      valueOutputWeights,
      valueOutputBias,
      1,
    )[0] ?? 0)
    : 0;
  return { policy, value };
};

const hardAlphaPolicy = (state: GameState): number[] | null =>
  hardAlphaInference(state)?.policy ?? null;

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

const chooseWeightedRankedMove = (
  candidates: Array<{ move: ValidMove; score: number }>,
  random: () => number,
): ValidMove | null => {
  const ranked = [...candidates]
    .sort((left, right) => right.score - left.score)
    .slice(0, normalAiSettings.finalCandidateLimit);
  if (ranked.length === 0) return null;

  const weights = normalAiSettings.rankWeights.slice(0, ranked.length);
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);
  let roll = random() * totalWeight;
  for (let index = 0; index < ranked.length; index += 1) {
    roll -= weights[index] ?? 0;
    if (roll <= 0) return ranked[index]?.move ?? ranked[0]!.move;
  }
  return ranked.at(-1)?.move ?? ranked[0]!.move;
};

const hardSearchSettings = {
  depth: 3,
  rootCandidateLimit: 10,
  branchCandidateLimit: 7,
  timeBudgetMs: 140,
} as const;

const movePolicyIndex = (state: GameState, move: ValidMove): number =>
  (move.row * state.config.boardSize + move.col) * state.config.colors.length
    + state.config.colors.indexOf(move.color);

const hardSearchCandidates = (
  state: GameState,
  limit: number,
  evaluationTime: number,
): ValidMove[] => {
  if (state.currentPlayerId === null) return [];
  const policy = hardAlphaPolicy(state);
  const ranked = getValidMoves(state).map((move) => {
    const result = placeTile(state, {
      ...move,
      playerId: state.currentPlayerId!,
      createdAt: evaluationTime,
    });
    return {
      move,
      earnedScore: result.ok ? result.move.earnedScore : 0,
      wins: result.ok && result.state.status === "finished" ? 1 : 0,
      policy: policy?.[movePolicyIndex(state, move)] ?? 0,
    };
  }).sort((left, right) =>
    right.wins - left.wins
    || right.policy - left.policy
    || right.earnedScore - left.earnedScore);

  const bestImmediate = Math.max(0, ...ranked.map((candidate) => candidate.earnedScore));
  const mustConsider = ranked.filter((candidate) =>
    candidate.wins === 1
    || (bestImmediate > 0 && candidate.earnedScore === bestImmediate));
  const selected = [...mustConsider, ...ranked.slice(0, limit)];
  const seen = new Set<string>();
  return selected.filter(({ move }) => {
    const key = `${move.row}:${move.col}:${move.color}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, Math.max(limit, mustConsider.length)).map((candidate) => candidate.move);
};

const hardLeafValue = (state: GameState, rootPlayerId: string): number => {
  if (state.status === "finished") {
    return state.winnerId === rootPlayerId ? 100_000 : -100_000;
  }
  const rootIndex = state.players.findIndex((player) => player.id === rootPlayerId);
  if (rootIndex < 0) return 0;
  const opponentIndex = 1 - rootIndex;
  const scoreDifference =
    state.players[rootIndex]!.score - state.players[opponentIndex]!.score;
  const inference = hardAlphaInference(state);
  const currentPerspective = state.currentPlayerId === rootPlayerId ? 1 : -1;
  return scoreDifference * 1_000 + (inference?.value ?? 0) * currentPerspective * 120;
};

const hardMinimax = (
  state: GameState,
  rootPlayerId: string,
  depth: number,
  evaluationTime: number,
  deadline: number,
  alpha: number,
  beta: number,
): number => {
  if (depth === 0 || state.status === "finished" || Date.now() >= deadline) {
    return hardLeafValue(state, rootPlayerId);
  }
  const maximizing = state.currentPlayerId === rootPlayerId;
  const candidates = hardSearchCandidates(
    state,
    hardSearchSettings.branchCandidateLimit,
    evaluationTime,
  );
  if (candidates.length === 0 || state.currentPlayerId === null) {
    return hardLeafValue(state, rootPlayerId);
  }

  let best = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  for (const move of candidates) {
    const result = placeTile(state, {
      ...move,
      playerId: state.currentPlayerId,
      createdAt: evaluationTime,
    });
    if (!result.ok) continue;
    const value = hardMinimax(
      result.state,
      rootPlayerId,
      depth - 1,
      evaluationTime,
      deadline,
      alpha,
      beta,
    );
    if (maximizing) {
      best = Math.max(best, value);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, value);
      beta = Math.min(beta, best);
    }
    if (beta <= alpha || Date.now() >= deadline) break;
  }
  return Number.isFinite(best) ? best : hardLeafValue(state, rootPlayerId);
};

const chooseHardMove = (
  state: GameState,
  random: () => number,
): ValidMove | null => {
  const rootPlayerId = state.currentPlayerId;
  if (rootPlayerId === null) return null;
  const evaluationTime = state.turnTimer?.startedAt ?? Date.now();
  const deadline = Date.now() + hardSearchSettings.timeBudgetMs;
  const candidates = hardSearchCandidates(
    state,
    hardSearchSettings.rootCandidateLimit,
    evaluationTime,
  );
  let bestValue = Number.NEGATIVE_INFINITY;
  let bestMoves: ValidMove[] = [];
  for (const move of candidates) {
    const result = placeTile(state, {
      ...move,
      playerId: rootPlayerId,
      createdAt: evaluationTime,
    });
    if (!result.ok) continue;
    const value = hardMinimax(
      result.state,
      rootPlayerId,
      hardSearchSettings.depth - 1,
      evaluationTime,
      deadline,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
    );
    if (value > bestValue) {
      bestValue = value;
      bestMoves = [move];
    } else if (value === bestValue) {
      bestMoves.push(move);
    }
    if (Date.now() >= deadline && bestMoves.length > 0) break;
  }
  return bestMoves[Math.floor(random() * bestMoves.length)] ?? candidates[0] ?? null;
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
  const policyCandidates = candidates.map((candidate) => ({
    ...candidate,
    score: learnedPolicy === null
      ? (candidate.features[0] ?? 0) * 8
        + (candidate.features[1] ?? 0) * 3
        + (candidate.features[2] ?? 0) * 0.5
        + (candidate.features[3] ?? 0) * 0.1
      : learnedPolicy[
        (candidate.move.row * state.config.boardSize + candidate.move.col) * state.config.colors.length
          + state.config.colors.indexOf(candidate.move.color)
      ] ?? Number.NEGATIVE_INFINITY,
  }));

  if (difficulty === "normal") {
    const bestImmediate = Math.max(...policyCandidates.map((candidate) => candidate.features[0] ?? 0));
    const scoringMoves = bestImmediate > 0
      ? policyCandidates.filter((candidate) => candidate.features[0] === bestImmediate)
      : [];
    const blockingMoves = policyCandidates.filter((candidate) => candidate.features[1] === 1);
    const focused = scoringMoves.length > 0 && random() < normalAiSettings.immediateScoreChance
      ? scoringMoves
      : blockingMoves.length > 0 && random() < normalAiSettings.threatBlockChance
        ? blockingMoves
        : policyCandidates;
    let considered = [...focused]
      .sort((left, right) => right.score - left.score)
      .slice(0, normalAiSettings.riskCandidateLimit);

    if (considered.length > 1 && random() < normalAiSettings.replyRiskCheckChance) {
      const withRisk = considered.map((candidate) => ({
        ...candidate,
        risk: opponentReplyRisk(state, candidate.move),
      }));
      const minimumRisk = Math.min(...withRisk.map((candidate) => candidate.risk));
      considered = withRisk.filter((candidate) => candidate.risk === minimumRisk);
    }

    return chooseWeightedRankedMove(considered, random);
  }

  if (difficulty === "hard") {
    return chooseHardMove(state, random);
  }
  return null;
};

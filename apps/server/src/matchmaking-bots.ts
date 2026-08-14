import type { AiDifficulty } from "@color-game/ai-engine";
import type { GameState } from "@color-game/shared-types";
import type { MatchmakingMode } from "./matchmaking-wait-store.js";

export interface MatchmakingBotDefinition {
  accountId: string;
  displayName: string;
  avatarId: string;
  difficulty: AiDifficulty;
  mode: MatchmakingMode;
}

export const MATCHMAKING_BOTS = [
  { accountId: "tango-bot-casual-easy-jeti", displayName: "제티", avatarId: "orbit", difficulty: "easy", mode: "casual" },
  { accountId: "tango-bot-casual-easy-el", displayName: "엘", avatarId: "prism", difficulty: "easy", mode: "casual" },
  { accountId: "tango-bot-casual-normal-daesanghyeok", displayName: "대상혁", avatarId: "orbit", difficulty: "normal", mode: "casual" },
  { accountId: "tango-bot-casual-normal-gommungchi", displayName: "곰뭉치", avatarId: "prism", difficulty: "normal", mode: "casual" },
  { accountId: "tango-bot-casual-hard-byeongchan", displayName: "병찬", avatarId: "orbit", difficulty: "hard", mode: "casual" },
  { accountId: "tango-bot-ranked-hard-kimsin", displayName: "김신", avatarId: "prism", difficulty: "hard", mode: "ranked" },
  { accountId: "tango-bot-ranked-hard-waterlion", displayName: "waterlion", avatarId: "orbit", difficulty: "hard", mode: "ranked" },
] as const satisfies readonly MatchmakingBotDefinition[];

const botAccountIds = new Set<string>(MATCHMAKING_BOTS.map((bot) => bot.accountId));

export const isMatchmakingBotAccountId = (
  accountId: string | null | undefined,
): accountId is string =>
  accountId !== null && accountId !== undefined && botAccountIds.has(accountId);

export const matchmakingBotPool = (
  mode: MatchmakingMode,
  unavailableAccountIds: ReadonlySet<string>,
): MatchmakingBotDefinition[] => MATCHMAKING_BOTS.filter(
  (bot) => bot.mode === mode && !unavailableAccountIds.has(bot.accountId),
);

export const chooseMatchmakingBot = (
  mode: MatchmakingMode,
  unavailableAccountIds: ReadonlySet<string>,
  random: () => number = Math.random,
): MatchmakingBotDefinition | null => {
  const pool = matchmakingBotPool(mode, unavailableAccountIds);
  if (pool.length === 0) return null;
  const index = Math.min(pool.length - 1, Math.floor(Math.max(0, random()) * pool.length));
  return pool[index] ?? null;
};

export const botFallbackDelayMs = (estimatedWaitSeconds: number, multiplier = 2): number =>
  Math.max(1_000, Math.round(estimatedWaitSeconds * multiplier * 1_000));

interface BotMoveDelayBucket {
  cumulativeProbability: number;
  minMs: number;
  maxMs: number;
}

const delayBucketsForOccupiedCells = (occupiedCells: number): readonly BotMoveDelayBucket[] => {
  if (occupiedCells <= 5) {
    return [{ cumulativeProbability: 1, minMs: 1_000, maxMs: 2_000 }];
  }
  if (occupiedCells <= 10) {
    return [
      { cumulativeProbability: 0.5, minMs: 1_000, maxMs: 2_000 },
      { cumulativeProbability: 0.8, minMs: 2_000, maxMs: 3_000 },
      { cumulativeProbability: 1, minMs: 3_000, maxMs: 4_000 },
    ];
  }
  if (occupiedCells <= 17) {
    return [
      { cumulativeProbability: 0.2, minMs: 1_500, maxMs: 2_000 },
      { cumulativeProbability: 0.75, minMs: 2_500, maxMs: 4_000 },
      { cumulativeProbability: 1, minMs: 4_500, maxMs: 5_000 },
    ];
  }
  return [
    { cumulativeProbability: 0.1, minMs: 2_000, maxMs: 2_500 },
    { cumulativeProbability: 0.65, minMs: 3_000, maxMs: 4_000 },
    { cumulativeProbability: 1, minMs: 4_500, maxMs: 6_000 },
  ];
};

const quantizedDelay = (minMs: number, maxMs: number, progress: number): number => {
  const stepCount = Math.floor((maxMs - minMs) / 500) + 1;
  const step = Math.min(stepCount - 1, Math.floor(progress * stepCount));
  return minMs + step * 500;
};

export const occupiedCellCount = (game: GameState): number =>
  game.board.reduce(
    (count, row) => count + row.filter((cell) => cell !== null).length,
    0,
  );

export const MATCHMAKING_BOT_RESOLUTION_GRACE_MS = 1_500;

export const botMoveResolutionGraceMs = (game: GameState): number =>
  (game.lastMove?.removedCells.length ?? 0) > 0
    ? MATCHMAKING_BOT_RESOLUTION_GRACE_MS
    : 0;

export const isScheduledBotTurnCurrent = (
  game: GameState,
  scheduledGameId: string,
  scheduledTurnNumber: number,
): boolean => game.id === scheduledGameId && game.turnNumber === scheduledTurnNumber;

export const randomBotMoveDelayMs = (
  occupiedCells: number,
  random: () => number = Math.random,
): number => {
  const botMoveDelayBuckets = delayBucketsForOccupiedCells(
    Math.max(0, Math.min(25, Math.floor(occupiedCells))),
  );
  const sample = Math.max(0, Math.min(0.999999999, random()));
  let previousProbability = 0;

  for (const bucket of botMoveDelayBuckets) {
    if (sample < bucket.cumulativeProbability) {
      const progress = (sample - previousProbability)
        / (bucket.cumulativeProbability - previousProbability);
      return quantizedDelay(bucket.minMs, bucket.maxMs, progress);
    }
    previousProbability = bucket.cumulativeProbability;
  }

  return botMoveDelayBuckets.at(-1)?.maxMs ?? 1_000;
};

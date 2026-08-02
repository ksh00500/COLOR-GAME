import type { AiDifficulty } from "@color-game/ai-engine";
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

export const randomBotMoveDelayMs = (random: () => number = Math.random): number =>
  1_000 + Math.floor(Math.max(0, Math.min(0.999999999, random())) * 9_001);

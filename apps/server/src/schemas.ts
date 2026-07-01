import { z } from "zod";
import { TILE_COLORS } from "@color-game/shared-types";

export const playerProfileSchema = z.object({
  nickname: z.string().trim().min(1).max(24).default("Guest"),
  avatarId: z.string().trim().min(1).max(32).default("orbit"),
  isGuest: z.boolean().default(true),
});

export const roomCodeSchema = z
  .string()
  .trim()
  .min(4)
  .max(12)
  .transform((value) => value.toUpperCase());

export const roomCreateSchema = z.object({
  player: playerProfileSchema.optional(),
  settings: z.object({
    targetScore: z.union([z.literal(5), z.literal(7), z.literal(10)]),
    turnTimeLimitSeconds: z.union([z.literal(30), z.literal(60), z.literal(90)]),
    spectatorsAllowed: z.boolean().default(true),
  }).optional(),
});

export const roomJoinSchema = z.object({
  code: roomCodeSchema,
  player: playerProfileSchema.optional(),
});

export const roomReadySchema = z.object({
  code: roomCodeSchema,
  playerId: z.string().min(1),
  ready: z.boolean(),
});

export const gameMoveSchema = z.object({
  code: roomCodeSchema,
  playerId: z.string().min(1),
  row: z.number().int().min(0).max(24),
  col: z.number().int().min(0).max(24),
  color: z.enum(TILE_COLORS),
});

export const gameResignSchema = z.object({
  code: roomCodeSchema,
  playerId: z.string().min(1),
});

export const gameRematchSchema = z.object({
  code: roomCodeSchema,
  playerId: z.string().min(1),
});

export type PlayerProfileInput = z.input<typeof playerProfileSchema>;


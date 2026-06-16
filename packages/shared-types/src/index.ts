export const TILE_COLORS = ["colorA", "colorB", "colorC"] as const;

export type TileColorId = (typeof TILE_COLORS)[number];
export type Cell = TileColorId | null;
export type Board = Cell[][];
export type PlayerId = string;
export type GameStatus = "waiting" | "countdown" | "playing" | "finished";
export type GameMode = "ai" | "casual" | "ranked" | "private";
export type GameResultReason =
  | "target-score"
  | "draw"
  | "timeout"
  | "resignation"
  | "disconnect"
  | null;

export interface Position {
  row: number;
  col: number;
}

export type ScoringDirection =
  | "horizontal"
  | "vertical"
  | "diagonalDown"
  | "diagonalUp";

export interface ScoringLine {
  color: TileColorId;
  length: number;
  score: number;
  direction: ScoringDirection;
  cells: Position[];
}

export interface GameConfig {
  boardSize: number;
  targetScore: number;
  colors: TileColorId[];
  scoreRules: Record<number, number>;
  turnTimeLimitSeconds: number | null;
}

export interface TurnTimer {
  startedAt: number;
  expiresAt: number;
}

export interface GamePlayer {
  id: PlayerId;
  nickname: string;
  avatarId: string;
  score: number;
  connectionStatus: "connected" | "unstable" | "disconnected";
  isGuest: boolean;
}

export interface Move {
  playerId: PlayerId;
  row: number;
  col: number;
  color: TileColorId;
  scoringLines: ScoringLine[];
  earnedScore: number;
  removedCells: Position[];
  turnNumber: number;
  createdAt: number;
}

export interface GameState {
  id: string;
  status: GameStatus;
  mode: GameMode;
  board: Board;
  players: [GamePlayer, GamePlayer];
  currentPlayerId: PlayerId | null;
  turnNumber: number;
  winnerId: PlayerId | null;
  result: GameResultReason;
  lastMove: Move | null;
  turnTimer: TurnTimer | null;
  config: GameConfig;
}

export interface MoveInput extends Position {
  playerId: PlayerId;
  color: TileColorId;
  createdAt?: number;
}

export type GameErrorCode =
  | "GAME_NOT_PLAYING"
  | "NOT_YOUR_TURN"
  | "OUT_OF_BOUNDS"
  | "CELL_NOT_EMPTY"
  | "INVALID_COLOR"
  | "GAME_ALREADY_FINISHED"
  | "TURN_TIME_EXPIRED"
  | "PLAYER_DISCONNECTED";

export interface ValidationResult {
  valid: boolean;
  errorCode?: GameErrorCode;
}

export interface MoveSuccess {
  ok: true;
  state: GameState;
  move: Move;
}

export interface MoveFailure {
  ok: false;
  state: GameState;
  errorCode: GameErrorCode;
}

export type MoveResult = MoveSuccess | MoveFailure;

export interface ValidMove extends Position {
  color: TileColorId;
}

export type RoomStatus = "waiting" | "playing" | "finished";

export interface RoomPlayerSnapshot {
  id: PlayerId;
  nickname: string;
  avatarId: string;
  isGuest: boolean;
  ready: boolean;
  connected: boolean;
}

export interface RoomSnapshot {
  code: string;
  status: RoomStatus;
  hostPlayerId: PlayerId;
  players: [RoomPlayerSnapshot, RoomPlayerSnapshot | null];
  game: GameState | null;
  createdAt: number;
  updatedAt: number;
}

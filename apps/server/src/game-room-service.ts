import {
  DEFAULT_GAME_CONFIG,
  createInitialGame,
  expireTurn,
  placeTile,
  resignGame,
} from "@color-game/game-core";
import type {
  GameConfig,
  GameErrorCode,
  GameMode,
  GamePlayer,
  GameState,
  Move,
  MatchCosmetics,
  RoomPlayerSnapshot,
  RoomSnapshot,
  RoomStatus,
  TileColorId,
} from "@color-game/shared-types";

export interface RoomPlayer {
  id: string;
  accountId?: string | null;
  guestId?: string | null;
  nickname: string;
  avatarId: string;
  isGuest: boolean;
  ready: boolean;
  connected: boolean;
  socketId: string | null;
  cosmetics?: MatchCosmetics;
}

export interface PlayerProfile {
  accountId?: string | null;
  guestId?: string | null;
  nickname: string;
  avatarId: string;
  isGuest: boolean;
  socketId?: string | null;
  cosmetics?: MatchCosmetics;
}

export type RoomErrorCode =
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "PLAYER_NOT_IN_ROOM"
  | "GAME_NOT_STARTED"
  | "GAME_ALREADY_STARTED"
  | "ROOM_NOT_READY"
  | "REMATCH_NOT_AVAILABLE"
  | "MOVE_REJECTED";

export interface RoomError {
  code: RoomErrorCode;
  message: string;
  gameErrorCode?: GameErrorCode;
}

export type ServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: RoomError };

interface RoomSession {
  code: string;
  mode: GameMode;
  status: RoomStatus;
  hostPlayerId: string;
  spectatorsAllowed: boolean;
  players: [RoomPlayer, RoomPlayer | null];
  game: GameState | null;
  config: GameConfig;
  createdAt: number;
  updatedAt: number;
  rematch: {
    requestedPlayerIds: string[];
    expiresAt: number | null;
  } | null;
}

export interface GameRoomServiceOptions {
  config?: GameConfig;
  codeGenerator?: () => string;
  idGenerator?: () => string;
  now?: () => number;
}

export interface MoveApplication {
  room: RoomSnapshot;
  move: Move | null;
}

const cloneConfig = (config: GameConfig): GameConfig => ({
  ...config,
  colors: [...config.colors],
  scoreRules: { ...config.scoreRules },
});

const toGamePlayer = (player: RoomPlayer): GamePlayer => ({
  id: player.id,
  accountId: player.accountId ?? null,
  nickname: player.nickname,
  avatarId: player.avatarId,
  score: 0,
  connectionStatus: player.connected ? "connected" : "disconnected",
  isGuest: player.isGuest,
  ...(player.cosmetics === undefined ? {} : { cosmetics: player.cosmetics }),
});

const toPlayerSnapshot = (player: RoomPlayer) => ({
  id: player.id,
  accountId: player.accountId ?? null,
  nickname: player.nickname,
  avatarId: player.avatarId,
  isGuest: player.isGuest,
  ready: player.ready,
  connected: player.connected,
  ...(player.cosmetics === undefined ? {} : { cosmetics: player.cosmetics }),
});

const fromPlayerSnapshot = (player: RoomPlayerSnapshot): RoomPlayer => ({
  id: player.id,
  accountId: player.accountId ?? null,
  guestId: null,
  nickname: player.nickname,
  avatarId: player.avatarId,
  isGuest: player.isGuest,
  ready: player.ready,
  connected: false,
  socketId: null,
  ...(player.cosmetics === undefined ? {} : { cosmetics: player.cosmetics }),
});

const disconnectGamePlayers = (game: GameState | null): GameState | null => {
  if (game === null) return null;

  return {
    ...game,
    startedAt: game.startedAt ?? Date.now(),
    finishedAt: game.status === "finished" ? game.finishedAt ?? Date.now() : null,
    players: game.players.map((player) => ({
      ...player,
      connectionStatus: "disconnected",
    })) as [GamePlayer, GamePlayer],
  };
};

const cloneRoom = (room: RoomSession): RoomSnapshot => ({
  code: room.code,
  mode: room.mode,
  status: room.status,
  hostPlayerId: room.hostPlayerId,
  spectatorsAllowed: room.spectatorsAllowed,
  players: [
    toPlayerSnapshot(room.players[0]),
    room.players[1] === null ? null : toPlayerSnapshot(room.players[1]),
  ],
  game: structuredClone(room.game) as GameState | null,
  config: cloneConfig(room.config),
  createdAt: room.createdAt,
  updatedAt: room.updatedAt,
  rematch: room.rematch === null
    ? null
    : {
        requestedPlayerIds: [...room.rematch.requestedPlayerIds],
        expiresAt: room.rematch.expiresAt,
      },
});

const makeError = (
  code: RoomErrorCode,
  message: string,
  gameErrorCode?: GameErrorCode,
): RoomError => {
  if (gameErrorCode === undefined) {
    return { code, message };
  }
  return { code, message, gameErrorCode };
};

export class GameRoomService {
  private readonly rooms = new Map<string, RoomSession>();

  private readonly config: GameConfig;

  private readonly codeGenerator: () => string;

  private readonly idGenerator: () => string;

  private readonly now: () => number;

  constructor(options: GameRoomServiceOptions = {}) {
    this.config = cloneConfig(options.config ?? DEFAULT_GAME_CONFIG);
    this.codeGenerator = options.codeGenerator ?? (() => this.generateRoomCode());
    this.idGenerator = options.idGenerator ?? (() => crypto.randomUUID());
    this.now = options.now ?? (() => Date.now());
  }

  createRoom(
    profile: PlayerProfile,
    mode: GameMode = "private",
    config: GameConfig = this.config,
    spectatorsAllowed = true,
  ): RoomSnapshot {
    const now = this.now();
    let code = this.codeGenerator().toUpperCase();
    while (this.rooms.has(code)) {
      code = this.generateRoomCode();
    }

    const host: RoomPlayer = {
      id: this.idGenerator(),
      accountId: profile.accountId ?? null,
      guestId: profile.guestId ?? null,
      nickname: profile.nickname,
      avatarId: profile.avatarId,
      isGuest: profile.isGuest,
      ready: false,
      connected: true,
      socketId: profile.socketId ?? null,
      ...(profile.cosmetics === undefined ? {} : { cosmetics: profile.cosmetics }),
    };

    const room: RoomSession = {
      code,
      mode,
      status: "waiting",
      hostPlayerId: host.id,
      spectatorsAllowed,
      players: [host, null],
      game: null,
      config: cloneConfig(config),
      createdAt: now,
      updatedAt: now,
      rematch: null,
    };

    this.rooms.set(code, room);
    return cloneRoom(room);
  }

  createMatchedRoom(
    firstProfile: PlayerProfile,
    secondProfile: PlayerProfile,
    mode: Extract<GameMode, "casual" | "ranked">,
  ): RoomSnapshot {
    const now = this.now();
    let code = this.codeGenerator().toUpperCase();
    while (this.rooms.has(code)) {
      code = this.generateRoomCode();
    }

    const first: RoomPlayer = {
      id: this.idGenerator(),
      accountId: firstProfile.accountId ?? null,
      guestId: firstProfile.guestId ?? null,
      nickname: firstProfile.nickname,
      avatarId: firstProfile.avatarId,
      isGuest: firstProfile.isGuest,
      ready: true,
      connected: true,
      socketId: firstProfile.socketId ?? null,
      ...(firstProfile.cosmetics === undefined ? {} : { cosmetics: firstProfile.cosmetics }),
    };
    const second: RoomPlayer = {
      id: this.idGenerator(),
      accountId: secondProfile.accountId ?? null,
      guestId: secondProfile.guestId ?? null,
      nickname: secondProfile.nickname,
      avatarId: secondProfile.avatarId,
      isGuest: secondProfile.isGuest,
      ready: true,
      connected: true,
      socketId: secondProfile.socketId ?? null,
      ...(secondProfile.cosmetics === undefined ? {} : { cosmetics: secondProfile.cosmetics }),
    };

    const matchConfig = {
      ...cloneConfig(this.config),
      turnTimeLimitSeconds: mode === "casual" ? 30 : 60,
    };
    const room: RoomSession = {
      code,
      mode,
      status: "waiting",
      hostPlayerId: first.id,
      spectatorsAllowed: true,
      players: [first, second],
      game: null,
      config: matchConfig,
      createdAt: now,
      updatedAt: now,
      rematch: null,
    };

    this.startGame(room);
    this.rooms.set(code, room);
    return cloneRoom(room);
  }

  restoreRoom(snapshot: RoomSnapshot): RoomSnapshot {
    const room: RoomSession = {
      code: snapshot.code,
      mode: snapshot.mode ?? "private",
      status: snapshot.status,
      hostPlayerId: snapshot.hostPlayerId,
      spectatorsAllowed: snapshot.spectatorsAllowed ?? true,
      players: [
        fromPlayerSnapshot(snapshot.players[0]),
        snapshot.players[1] === null ? null : fromPlayerSnapshot(snapshot.players[1]),
      ],
      game: disconnectGamePlayers(snapshot.game),
      config: cloneConfig(snapshot.config ?? snapshot.game?.config ?? this.config),
      createdAt: snapshot.createdAt,
      updatedAt: this.now(),
      rematch: snapshot.rematch === undefined
        ? null
        : snapshot.rematch === null
          ? null
          : {
              requestedPlayerIds: [...snapshot.rematch.requestedPlayerIds],
              expiresAt: snapshot.rematch.expiresAt,
            },
    };

    this.rooms.set(room.code, room);
    return cloneRoom(room);
  }

  joinRoom(code: string, profile: PlayerProfile): ServiceResult<RoomSnapshot> {
    const room = this.rooms.get(code);
    if (room === undefined) {
      return { ok: false, error: makeError("ROOM_NOT_FOUND", "Room was not found.") };
    }
    if (room.players[1] !== null) {
      return { ok: false, error: makeError("ROOM_FULL", "Room already has two players.") };
    }
    if (room.status !== "waiting") {
      return {
        ok: false,
        error: makeError("GAME_ALREADY_STARTED", "Room already started a game."),
      };
    }

    room.players[1] = {
      id: this.idGenerator(),
      accountId: profile.accountId ?? null,
      guestId: profile.guestId ?? null,
      nickname: profile.nickname,
      avatarId: profile.avatarId,
      isGuest: profile.isGuest,
      ready: false,
      connected: true,
      socketId: profile.socketId ?? null,
      ...(profile.cosmetics === undefined ? {} : { cosmetics: profile.cosmetics }),
    };
    room.updatedAt = this.now();

    return { ok: true, value: cloneRoom(room) };
  }

  getRoom(code: string): ServiceResult<RoomSnapshot> {
    const room = this.rooms.get(code);
    if (room === undefined) {
      return { ok: false, error: makeError("ROOM_NOT_FOUND", "Room was not found.") };
    }
    return { ok: true, value: cloneRoom(room) };
  }

  getRewardIdentities(code: string): Record<string, string> {
    const room = this.rooms.get(code);
    if (room === undefined) return {};
    return Object.fromEntries(
      room.players
        .filter((player): player is RoomPlayer => player !== null)
        .map((player) => [
          player.id,
          player.accountId
            ? `account:${player.accountId}`
            : `guest:${player.guestId ?? player.id}`,
        ]),
    );
  }

  setReady(
    code: string,
    playerId: string,
    ready: boolean,
  ): ServiceResult<RoomSnapshot> {
    const room = this.rooms.get(code);
    if (room === undefined) {
      return { ok: false, error: makeError("ROOM_NOT_FOUND", "Room was not found.") };
    }
    if (room.status !== "waiting") {
      return {
        ok: false,
        error: makeError("GAME_ALREADY_STARTED", "Room already started a game."),
      };
    }

    const player = this.findPlayer(room, playerId);
    if (player === null) {
      return {
        ok: false,
        error: makeError("PLAYER_NOT_IN_ROOM", "Player is not in this room."),
      };
    }

    player.ready = ready;
    room.updatedAt = this.now();

    const opponent = room.players[1];
    if (room.players[0].ready && opponent?.ready === true) {
      this.startGame(room);
    }

    return { ok: true, value: cloneRoom(room) };
  }

  applyMove(
    code: string,
    playerId: string,
    row: number,
    col: number,
    color: TileColorId,
  ): ServiceResult<MoveApplication> {
    const room = this.rooms.get(code);
    if (room === undefined) {
      return { ok: false, error: makeError("ROOM_NOT_FOUND", "Room was not found.") };
    }
    if (this.findPlayer(room, playerId) === null) {
      return {
        ok: false,
        error: makeError("PLAYER_NOT_IN_ROOM", "Player is not in this room."),
      };
    }
    if (room.game === null) {
      return {
        ok: false,
        error: makeError("GAME_NOT_STARTED", "Game has not started."),
      };
    }

    const now = this.now();
    const expired = expireTurn(room.game, now);
    if (expired !== room.game && expired.status === "finished") {
      room.game = expired;
      room.status = "finished";
      room.updatedAt = now;
      return { ok: true, value: { room: cloneRoom(room), move: null } };
    }

    const result = placeTile(room.game, {
      playerId,
      row,
      col,
      color,
      createdAt: now,
    });

    if (!result.ok) {
      room.game = result.state;
      if (result.state.status === "finished") {
        room.status = "finished";
      }
      room.updatedAt = now;
      return {
        ok: false,
        error: makeError("MOVE_REJECTED", "Move was rejected.", result.errorCode),
      };
    }

    room.game = result.state;
    if (result.state.status === "finished") {
      room.status = "finished";
    }
    room.updatedAt = now;

    return { ok: true, value: { room: cloneRoom(room), move: result.move } };
  }

  resign(code: string, playerId: string): ServiceResult<RoomSnapshot> {
    const room = this.rooms.get(code);
    if (room === undefined) {
      return { ok: false, error: makeError("ROOM_NOT_FOUND", "Room was not found.") };
    }
    if (this.findPlayer(room, playerId) === null) {
      return {
        ok: false,
        error: makeError("PLAYER_NOT_IN_ROOM", "Player is not in this room."),
      };
    }
    if (room.game === null) {
      return {
        ok: false,
        error: makeError("GAME_NOT_STARTED", "Game has not started."),
      };
    }

    room.game = resignGame(room.game, playerId, this.now());
    room.status = room.game.status === "finished" ? "finished" : room.status;
    room.updatedAt = this.now();
    return { ok: true, value: cloneRoom(room) };
  }

  requestRematch(code: string, playerId: string): ServiceResult<RoomSnapshot> {
    const room = this.rooms.get(code);
    if (
      room === undefined
      || room.mode !== "casual"
      || room.status !== "finished"
      || room.game?.status !== "finished"
    ) {
      return {
        ok: false,
        error: makeError("REMATCH_NOT_AVAILABLE", "A casual rematch is not available."),
      };
    }
    if (this.findPlayer(room, playerId) === null) {
      return {
        ok: false,
        error: makeError("PLAYER_NOT_IN_ROOM", "Player is not in this room."),
      };
    }

    const now = this.now();
    if (room.rematch?.expiresAt !== null && room.rematch?.expiresAt !== undefined && room.rematch.expiresAt <= now) {
      room.rematch = null;
    }
    const requested = new Set(room.rematch?.requestedPlayerIds ?? []);
    requested.add(playerId);
    room.rematch = {
      requestedPlayerIds: [...requested],
      expiresAt: room.rematch?.expiresAt ?? now + 20_000,
    };

    const players = room.players.filter((player): player is RoomPlayer => player !== null);
    if (players.length === 2 && players.every((player) => requested.has(player.id))) {
      const nextHost = players.find((player) => player.id !== room.hostPlayerId) ?? players[0]!;
      room.hostPlayerId = nextHost.id;
      room.players[0].ready = true;
      if (room.players[1] !== null) room.players[1].ready = true;
      room.rematch = null;
      this.startGame(room);
    } else {
      room.updatedAt = now;
    }
    return { ok: true, value: cloneRoom(room) };
  }

  declineRematch(code: string, playerId: string): ServiceResult<RoomSnapshot> {
    const room = this.rooms.get(code);
    if (room === undefined) {
      return { ok: false, error: makeError("ROOM_NOT_FOUND", "Room was not found.") };
    }
    if (this.findPlayer(room, playerId) === null) {
      return {
        ok: false,
        error: makeError("PLAYER_NOT_IN_ROOM", "Player is not in this room."),
      };
    }
    room.rematch = null;
    room.updatedAt = this.now();
    return { ok: true, value: cloneRoom(room) };
  }

  expireRematchRequests(): RoomSnapshot[] {
    const now = this.now();
    const changed: RoomSnapshot[] = [];
    for (const room of this.rooms.values()) {
      if (room.rematch?.expiresAt !== null && room.rematch?.expiresAt !== undefined && room.rematch.expiresAt <= now) {
        room.rematch = null;
        room.updatedAt = now;
        changed.push(cloneRoom(room));
      }
    }
    return changed;
  }

  markDisconnected(playerId: string): RoomSnapshot[] {
    const changedRooms: RoomSnapshot[] = [];
    for (const room of this.rooms.values()) {
      const player = this.findPlayer(room, playerId);
      if (player !== null) {
        player.connected = false;
        player.socketId = null;
        if (room.game !== null) {
          room.game = {
            ...room.game,
            players: room.game.players.map((gamePlayer) =>
              gamePlayer.id === playerId
                ? { ...gamePlayer, connectionStatus: "disconnected" }
                : gamePlayer,
            ) as [GamePlayer, GamePlayer],
          };
        }
        room.updatedAt = this.now();
        changedRooms.push(cloneRoom(room));
      }
    }
    return changedRooms;
  }

  expireActiveTurns(): RoomSnapshot[] {
    const changedRooms: RoomSnapshot[] = [];
    const now = this.now();

    for (const room of this.rooms.values()) {
      if (room.game === null || room.status !== "playing") {
        continue;
      }

      const expired = expireTurn(room.game, now);
      if (expired !== room.game && expired.status === "finished") {
        room.game = expired;
        room.status = "finished";
        room.updatedAt = now;
        changedRooms.push(cloneRoom(room));
      }
    }

    return changedRooms;
  }

  reconnect(
    code: string,
    playerId: string,
    socketId: string | null,
  ): ServiceResult<RoomSnapshot> {
    const room = this.rooms.get(code);
    if (room === undefined) {
      return { ok: false, error: makeError("ROOM_NOT_FOUND", "Room was not found.") };
    }

    const player = this.findPlayer(room, playerId);
    if (player === null) {
      return {
        ok: false,
        error: makeError("PLAYER_NOT_IN_ROOM", "Player is not in this room."),
      };
    }

    player.connected = true;
    player.socketId = socketId;
    if (room.game !== null) {
      room.game = {
        ...room.game,
        players: room.game.players.map((gamePlayer) =>
          gamePlayer.id === playerId
            ? { ...gamePlayer, connectionStatus: "connected" }
            : gamePlayer,
        ) as [GamePlayer, GamePlayer],
      };
    }
    room.updatedAt = this.now();

    return { ok: true, value: cloneRoom(room) };
  }

  private startGame(room: RoomSession): void {
    const guest = room.players[1];
    if (guest === null) {
      throw new Error("Cannot start a private room without two players.");
    }

    const now = this.now();
    room.game = createInitialGame(room.config, {
      id: `${room.mode}-${room.code}-${now}`,
      mode: room.mode,
      firstPlayerId: room.hostPlayerId,
      now,
      players: [toGamePlayer(room.players[0]), toGamePlayer(guest)],
    });
    room.status = "playing";
    room.rematch = null;
    room.updatedAt = now;
  }

  private findPlayer(room: RoomSession, playerId: string): RoomPlayer | null {
    return room.players.find((player) => player?.id === playerId) ?? null;
  }

  private generateRoomCode(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 }, () => {
      const index = Math.floor(Math.random() * alphabet.length);
      return alphabet[index] ?? "A";
    }).join("");
  }
}

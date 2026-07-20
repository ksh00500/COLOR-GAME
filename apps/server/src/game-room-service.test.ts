import { describe, expect, it } from "vitest";
import { GameRoomService, type PlayerProfile } from "./game-room-service.js";

const profile = (nickname: string): PlayerProfile => ({
  nickname,
  avatarId: nickname.toLowerCase(),
  isGuest: true,
  socketId: null,
});

const createDeterministicService = () => {
  let now = 1_000;
  let id = 0;
  return {
    service: new GameRoomService({
      codeGenerator: () => "ABCD12",
      idGenerator: () => `player-${++id}`,
      now: () => now,
    }),
    advance: (ms: number) => {
      now += ms;
    },
    setNow: (value: number) => {
      now = value;
    },
  };
};

const startRoom = () => {
  const harness = createDeterministicService();
  const { service } = harness;
  const room = service.createRoom(profile("Host"));
  const joined = service.joinRoom(room.code, profile("Guest"));
  expect(joined.ok).toBe(true);
  if (!joined.ok) throw new Error("join failed");

  const hostId = room.players[0].id;
  const guestId = joined.value.players[1]?.id;
  if (guestId === undefined) throw new Error("guest missing");

  const hostReady = service.setReady(room.code, hostId, true);
  expect(hostReady.ok).toBe(true);
  const guestReady = service.setReady(room.code, guestId, true);
  expect(guestReady.ok).toBe(true);
  if (!guestReady.ok) throw new Error("ready failed");

  return { ...harness, code: room.code, hostId, guestId, room: guestReady.value };
};

describe("GameRoomService", () => {
  it("creates a private room and starts only after both players are ready", () => {
    const { service } = createDeterministicService();
    const room = service.createRoom(profile("Host"));

    expect(room.code).toBe("ABCD12");
    expect(room.status).toBe("waiting");
    expect(room.players[1]).toBeNull();

    const joined = service.joinRoom(room.code, profile("Guest"));
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;
    expect(joined.value.status).toBe("waiting");
    expect(joined.value.players[1]?.nickname).toBe("Guest");

    const hostReady = service.setReady(room.code, room.players[0].id, true);
    expect(hostReady.ok).toBe(true);
    if (!hostReady.ok) return;
    expect(hostReady.value.game).toBeNull();

    const guestId = joined.value.players[1]?.id;
    expect(guestId).toBeDefined();
    if (guestId === undefined) return;
    const guestReady = service.setReady(room.code, guestId, true);
    expect(guestReady.ok).toBe(true);
    if (!guestReady.ok) return;
    expect(guestReady.value.status).toBe("playing");
    expect(guestReady.value.game?.mode).toBe("private");
    expect(guestReady.value.game?.currentPlayerId).toBe(room.players[0].id);
  });

  it("stores premium spectator settings and private reward identities", () => {
    const { service } = createDeterministicService();
    const room = service.createRoom(
      { ...profile("Host"), accountId: "account-1", isGuest: false },
      "private",
      undefined,
      false,
    );
    const joined = service.joinRoom(room.code, {
      ...profile("Guest"),
      guestId: "guest-device-1",
    });
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;
    expect(joined.value.spectatorsAllowed).toBe(false);
    expect(service.getRewardIdentities(room.code)).toEqual({
      "player-1": "account:account-1",
      "player-2": "guest:guest-device-1",
    });
  });

  it("rejects a move before the game starts", () => {
    const { service } = createDeterministicService();
    const room = service.createRoom(profile("Host"));
    const result = service.applyMove(room.code, room.players[0].id, 0, 0, "colorA");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("GAME_NOT_STARTED");
  });

  it("creates an immediately started ranked matchmaking room", () => {
    const { service } = createDeterministicService();
    const room = service.createMatchedRoom(
      { ...profile("RankedOne"), accountId: "account-1" },
      { ...profile("RankedTwo"), accountId: "account-2" },
      "ranked",
    );

    expect(room.mode).toBe("ranked");
    expect(room.status).toBe("playing");
    expect(room.players[0].accountId).toBe("account-1");
    expect(room.players[1]?.accountId).toBe("account-2");
    expect(room.game?.mode).toBe("ranked");
    expect(room.game?.config.turnTimeLimitSeconds).toBe(60);
  });

  it("snapshots the performers' public placement and score effects", () => {
    const { service } = createDeterministicService();
    const cosmetics = {
      placementEffect: {
        id: "placement-maple",
        preset: "maple",
        colors: ["#d49a5b", "#7f4c2c"],
        durationMs: 180,
      },
      scoreEffect: {
        id: "score-maple",
        preset: "maple",
        colors: ["#f2c078", "#9b5d32"],
        durationMs: 350,
      },
    };
    const room = service.createMatchedRoom(
      { ...profile("Styled"), accountId: "account-1", cosmetics },
      { ...profile("Plain"), accountId: "account-2" },
      "casual",
    );

    expect(room.players[0].cosmetics).toEqual(cosmetics);
    expect(room.game?.players[0]?.cosmetics).toEqual(cosmetics);
    expect(room.players[1]?.cosmetics).toBeUndefined();
    expect(room.game?.players[1]?.cosmetics).toBeUndefined();
  });

  it("uses a 30 second turn timer for casual matchmaking", () => {
    const { service } = createDeterministicService();
    const room = service.createMatchedRoom(
      profile("CasualOne"),
      profile("CasualTwo"),
      "casual",
    );

    expect(room.game?.config.turnTimeLimitSeconds).toBe(30);
  });

  it("uses game-core to enforce turns and award server-side scores", () => {
    const { service, code, hostId, guestId, advance } = startRoom();

    advance(1_000);
    const firstMove = service.applyMove(code, hostId, 0, 0, "colorA");
    expect(firstMove.ok).toBe(true);

    const outOfTurn = service.applyMove(code, hostId, 0, 1, "colorA");
    expect(outOfTurn.ok).toBe(false);
    if (!outOfTurn.ok) {
      expect(outOfTurn.error.gameErrorCode).toBe("NOT_YOUR_TURN");
    }

    advance(1_000);
    expect(service.applyMove(code, guestId, 4, 4, "colorB").ok).toBe(true);
    advance(1_000);
    expect(service.applyMove(code, hostId, 0, 1, "colorA").ok).toBe(true);
    advance(1_000);
    expect(service.applyMove(code, guestId, 4, 3, "colorB").ok).toBe(true);
    advance(1_000);
    const scoring = service.applyMove(code, hostId, 0, 2, "colorA");

    expect(scoring.ok).toBe(true);
    if (!scoring.ok) return;
    expect(scoring.value.move?.earnedScore).toBe(1);
    expect(scoring.value.room.game?.players[0].score).toBe(1);
    expect(scoring.value.room.game?.board[0]?.slice(0, 3)).toEqual([null, null, null]);
  });

  it("expires turns on the server clock", () => {
    const { service, code, hostId, setNow } = startRoom();

    setNow(61_000);
    const expired = service.applyMove(code, hostId, 0, 0, "colorA");

    expect(expired.ok).toBe(true);
    if (!expired.ok) return;
    expect(expired.value.move).toBeNull();
    expect(expired.value.room.status).toBe("finished");
    expect(expired.value.room.game?.result).toBe("timeout");
    expect(expired.value.room.game?.winnerId).toBe("player-2");
  });

  it("expires active rooms without waiting for another move", () => {
    const { service, setNow } = startRoom();

    setNow(61_000);
    const changed = service.expireActiveTurns();

    expect(changed).toHaveLength(1);
    expect(changed[0]?.status).toBe("finished");
    expect(changed[0]?.game?.result).toBe("timeout");
  });

  it("marks disconnects and allows reconnecting without losing game state", () => {
    const { service, code, guestId } = startRoom();

    const changed = service.markDisconnected(guestId);
    expect(changed).toHaveLength(1);
    expect(changed[0]?.players[1]?.connected).toBe(false);
    expect(changed[0]?.game?.players[1].connectionStatus).toBe("disconnected");

    const reconnected = service.reconnect(code, guestId, "socket-next");
    expect(reconnected.ok).toBe(true);
    if (!reconnected.ok) return;
    expect(reconnected.value.players[1]?.connected).toBe(true);
    expect(reconnected.value.game?.players[1].connectionStatus).toBe("connected");
  });

  it("restores an active room snapshot after a server restart", () => {
    const { room, code, hostId } = startRoom();
    const restoredService = new GameRoomService();

    const restored = restoredService.restoreRoom(room);
    expect(restored.status).toBe("playing");
    expect(restored.players[0].connected).toBe(false);
    expect(restored.game?.players[0].connectionStatus).toBe("disconnected");

    const reconnected = restoredService.reconnect(code, hostId, "socket-next");
    expect(reconnected.ok).toBe(true);
    if (!reconnected.ok) return;
    expect(reconnected.value.players[0].connected).toBe(true);
    expect(reconnected.value.game?.players[0].connectionStatus).toBe("connected");
  });

  it("finishes the game when a player resigns", () => {
    const { service, code, hostId, guestId } = startRoom();
    const resigned = service.resign(code, guestId);

    expect(resigned.ok).toBe(true);
    if (!resigned.ok) return;
    expect(resigned.value.status).toBe("finished");
    expect(resigned.value.game?.result).toBe("resignation");
    expect(resigned.value.game?.winnerId).toBe(hostId);
  });

  it("starts a casual rematch only after both players agree and alternates first player", () => {
    const { service, advance } = createDeterministicService();
    const room = service.createMatchedRoom(profile("One"), profile("Two"), "casual");
    const firstId = room.players[0].id;
    const secondId = room.players[1]?.id;
    if (secondId === undefined) throw new Error("second player missing");

    const finished = service.resign(room.code, secondId);
    expect(finished.ok).toBe(true);
    if (!finished.ok) return;
    const firstRequest = service.requestRematch(room.code, firstId);
    expect(firstRequest.ok).toBe(true);
    if (!firstRequest.ok) return;
    expect(firstRequest.value.status).toBe("finished");
    expect(firstRequest.value.rematch?.requestedPlayerIds).toEqual([firstId]);

    advance(1_000);
    const secondRequest = service.requestRematch(room.code, secondId);
    expect(secondRequest.ok).toBe(true);
    if (!secondRequest.ok) return;
    expect(secondRequest.value.status).toBe("playing");
    expect(secondRequest.value.hostPlayerId).toBe(secondId);
    expect(secondRequest.value.game?.currentPlayerId).toBe(secondId);
    expect(secondRequest.value.rematch).toBeNull();
  });

  it("expires an unanswered casual rematch request after 20 seconds", () => {
    const { service, advance } = createDeterministicService();
    const room = service.createMatchedRoom(profile("One"), profile("Two"), "casual");
    const firstId = room.players[0].id;
    const secondId = room.players[1]?.id;
    if (secondId === undefined) throw new Error("second player missing");
    service.resign(room.code, secondId);
    service.requestRematch(room.code, firstId);

    advance(20_001);
    const changed = service.expireRematchRequests();
    expect(changed).toHaveLength(1);
    expect(changed[0]?.rematch).toBeNull();
  });

  it("does not offer rematches for ranked games", () => {
    const { service } = createDeterministicService();
    const room = service.createMatchedRoom(profile("One"), profile("Two"), "ranked");
    const secondId = room.players[1]?.id;
    if (secondId === undefined) throw new Error("second player missing");
    service.resign(room.code, secondId);

    const result = service.requestRematch(room.code, room.players[0].id);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("REMATCH_NOT_AVAILABLE");
  });

  it("rejects game actions from players outside the room", () => {
    const { service, code } = startRoom();

    const move = service.applyMove(code, "outsider", 0, 0, "colorA");
    expect(move.ok).toBe(false);
    if (!move.ok) {
      expect(move.error.code).toBe("PLAYER_NOT_IN_ROOM");
    }

    const resigned = service.resign(code, "outsider");
    expect(resigned.ok).toBe(false);
    if (!resigned.ok) {
      expect(resigned.error.code).toBe("PLAYER_NOT_IN_ROOM");
    }
  });
});

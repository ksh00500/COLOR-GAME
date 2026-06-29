import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Socket } from "socket.io-client";
import type {
  Board,
  Position,
  RoomSnapshot,
  TileColorId,
} from "@color-game/shared-types";
import { AppSidebar } from "../components/AppSidebar";
import { ColorPicker } from "../components/ColorPicker";
import { GameBoard } from "../components/GameBoard";
import { HelpPanel } from "../components/HelpPanel";
import { PlayerCard } from "../components/PlayerCard";
import { ResultPanel } from "../components/ResultPanel";
import { SettingsPanel } from "../components/SettingsPanel";
import { fetchEconomy, getAuthToken } from "../api";
import { playOpponentTurnCue } from "../audio";
import { shareUrl } from "../share";
import { nativeBackEvent, publicAppUrl } from "../nativeApp";
import { notifyInvalidMove, notifyTilePlaced } from "../nativeFeedback";
import { useSettings } from "../settings";
import { useI18n } from "../i18n";
import { createAppSocket } from "../socket";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface ServerError {
  code: string;
  message?: string;
  gameErrorCode?: string | null;
}

interface RoomAck {
  ok: boolean;
  room?: RoomSnapshot;
  playerId?: string;
  error?: ServerError;
}

interface MoveAck {
  ok: boolean;
  room?: RoomSnapshot;
  error?: ServerError;
}

interface PlayerProfile {
  nickname: string;
  avatarId: string;
  isGuest: boolean;
}

const profileKey = "color-game-player-profile";
const roomPlayerPrefix = "color-game-room-player:";
const roomSnapshotPrefix = "color-game-room-snapshot:";

const defaultProfile = (): PlayerProfile => ({
  nickname: `Guest-${Math.floor(1000 + Math.random() * 9000)}`,
  avatarId: "orbit",
  isGuest: true,
});

const readProfile = (): PlayerProfile => {
  const fallback = defaultProfile();
  try {
    const raw = window.localStorage.getItem(profileKey);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    return {
      nickname: parsed.nickname?.trim() || fallback.nickname,
      avatarId: parsed.avatarId === "prism" ? "prism" : "orbit",
      isGuest: true,
    };
  } catch {
    return fallback;
  }
};

const saveProfile = (profile: PlayerProfile) => {
  window.localStorage.setItem(profileKey, JSON.stringify(profile));
};

const saveRoomPlayer = (code: string, playerId: string) => {
  window.localStorage.setItem(`${roomPlayerPrefix}${code}`, playerId);
};

const readRoomPlayer = (code: string): string | null =>
  window.localStorage.getItem(`${roomPlayerPrefix}${code}`);

const saveRoomSnapshot = (room: RoomSnapshot) => {
  try {
    window.sessionStorage.setItem(`${roomSnapshotPrefix}${room.code}`, JSON.stringify(room));
  } catch {
    // A snapshot is only a reconnect convenience; live server state remains authoritative.
  }
};

const readRoomSnapshot = (code: string): RoomSnapshot | null => {
  if (code === "") return null;
  try {
    const raw = window.sessionStorage.getItem(`${roomSnapshotPrefix}${code}`);
    if (raw === null) return null;
    const snapshot = JSON.parse(raw) as RoomSnapshot;
    return snapshot.code === code ? snapshot : null;
  } catch {
    return null;
  }
};

const boardWithPlacement = (
  board: Board,
  position: Position,
  color: TileColorId,
): Board => {
  const preview = board.map((row) => [...row]);
  preview[position.row]![position.col] = color;
  return preview;
};

const describeError = (error: ServerError | undefined): string => {
  if (error === undefined) return "REQUEST_FAILED";
  return error.gameErrorCode ?? error.code ?? "REQUEST_FAILED";
};

export function OnlineRoomPage({ matchmakingEntry = false }: { matchmakingEntry?: boolean }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get("code")?.trim().toUpperCase() ?? "";
  const matchmakingMode = searchParams.get("mode") === "ranked" ? "ranked" : "casual";
  const { settings } = useSettings();
  const initialPlayerId = initialCode === "" ? null : readRoomPlayer(initialCode);
  const socketRef = useRef<Socket | null>(null);
  const roomCodeRef = useRef(initialCode);
  const playerIdRef = useRef<string | null>(initialPlayerId);
  const effectTimers = useRef<number[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [profile, setProfile] = useState(readProfile);
  const [hasPremium, setHasPremium] = useState(false);
  const [targetScore, setTargetScore] = useState<5 | 7 | 10>(7);
  const [turnTimeLimitSeconds, setTurnTimeLimitSeconds] = useState<30 | 60 | 90>(60);
  const [spectatorsAllowed, setSpectatorsAllowed] = useState(true);
  const [joinCode, setJoinCode] = useState(initialCode);
  const [room, setRoom] = useState<RoomSnapshot | null>(() => readRoomSnapshot(initialCode));
  const [playerId, setPlayerId] = useState<string | null>(initialPlayerId);
  const [selectedColors, setSelectedColors] = useState<Record<string, TileColorId>>({});
  const [visualBoard, setVisualBoard] = useState<Board | null>(null);
  const [scoringCells, setScoringCells] = useState<Set<string>>(new Set());
  const [lastPlaced, setLastPlaced] = useState<Position | null>(null);
  const [opponentLastPlaced, setOpponentLastPlaced] = useState<Position | null>(null);
  const [invalidCell, setInvalidCell] = useState<Position | null>(null);
  const [scoreNotice, setScoreNotice] = useState<{ playerId: string; score: number } | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(12);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [isBoardClearing, setIsBoardClearing] = useState(false);
  const [turnCueActive, setTurnCueActive] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [shareDialog, setShareDialog] = useState<{
    kind: "invite" | "spectate";
    url: string;
  } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [resignOpen, setResignOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [matchStartedAt, setMatchStartedAt] = useState(0);
  const animatedMoveKey = useRef<string | null>(null);
  const previousBoardRef = useRef<Board | null>(null);

  const game = room?.game ?? null;
  const roomPlayer = room?.players.find((player) => player?.id === playerId) ?? null;
  const opponentRoomPlayer = room?.players.find((player) => player !== null && player.id !== playerId) ?? null;
  const currentPlayerId = game?.currentPlayerId ?? null;
  const myTurn = playerId !== null && currentPlayerId === playerId;
  const selectedColor = playerId === null ? "colorA" : selectedColors[playerId] ?? "colorA";
  const showColorShapes = settings.colorBlindPalette && settings.showShapes;
  const canPlay =
    game?.status === "playing" &&
    myTurn &&
    busyLabel === null &&
    visualBoard === null &&
    !isBoardClearing &&
    connectionStatus === "connected";

  useEffect(() => {
    if (getAuthToken() === null) return;
    void fetchEconomy()
      .then((economy) => setHasPremium(
        economy.entitlements.includes("premium") || economy.entitlements.includes("founder"),
      ))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const handleNativeBack = (event: Event) => {
      if (game?.status !== "playing") return;
      event.preventDefault();
      setResignOpen(true);
    };
    window.addEventListener(nativeBackEvent, handleNativeBack);
    return () => window.removeEventListener(nativeBackEvent, handleNativeBack);
  }, [game?.status]);

  const clearEffectTimers = useCallback(() => {
    effectTimers.current.forEach((timer) => window.clearTimeout(timer));
    effectTimers.current = [];
  }, []);

  const triggerOpponentTurnComplete = useCallback(() => {
    if (settings.soundEnabled) {
      void playOpponentTurnCue();
    }

    if (settings.animationLevel === "off") return;
    setTurnCueActive(true);
    const timer = window.setTimeout(() => setTurnCueActive(false), 1_200);
    effectTimers.current.push(timer);
  }, [settings.animationLevel, settings.soundEnabled]);

  const applyRoom = useCallback((nextRoom: RoomSnapshot) => {
    roomCodeRef.current = nextRoom.code;
    saveRoomSnapshot(nextRoom);
    setRoom((current) => {
      previousBoardRef.current = current?.game?.board ?? null;
      return nextRoom;
    });
    if (nextRoom.game !== null) {
      setMatchStartedAt((current) => (current === 0 ? Date.now() : current));
    }
  }, []);

  const rememberPlayer = useCallback((code: string, nextPlayerId: string) => {
    roomCodeRef.current = code;
    playerIdRef.current = nextPlayerId;
    setPlayerId(nextPlayerId);
    saveRoomPlayer(code, nextPlayerId);
  }, []);

  useEffect(() => clearEffectTimers, [clearEffectTimers]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const socket = createAppSocket({
      auth: { token: getAuthToken() },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionStatus("connected");
      setMessage(null);
      const reconnectCode = roomCodeRef.current || initialCode;
      const reconnectPlayerId = playerIdRef.current
        ?? (reconnectCode === "" ? null : readRoomPlayer(reconnectCode));
      if (reconnectCode !== "" && reconnectPlayerId !== null) {
        socket.emit("game:reconnect", { code: reconnectCode, playerId: reconnectPlayerId }, (response: RoomAck) => {
          if (response.ok && response.room !== undefined) {
            rememberPlayer(response.room.code, reconnectPlayerId);
            applyRoom(response.room);
            return;
          }
          setMessage(describeError(response.error));
        });
      } else if (matchmakingEntry) {
        setMessage("매칭 정보를 찾지 못했습니다. 다시 매칭을 시작해 주세요.");
      }
    });
    socket.on("disconnect", () => setConnectionStatus("disconnected"));
    socket.on("connect_error", () => {
      setConnectionStatus("error");
      setMessage("온라인 서버에 연결하지 못했습니다. 서버가 실행 중인지 확인해 주세요.");
    });
    socket.on("game:state", (nextRoom: RoomSnapshot) => applyRoom(nextRoom));
    socket.on("game:error", (error: ServerError) => setMessage(describeError(error)));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [applyRoom, initialCode, matchmakingEntry, rememberPlayer]);

  useEffect(() => {
    if (shareNotice === null) return undefined;
    const timer = window.setTimeout(() => setShareNotice(null), 2_500);
    return () => window.clearTimeout(timer);
  }, [shareNotice]);

  useEffect(() => {
    if (game?.lastMove === null || game?.lastMove === undefined) {
      setOpponentLastPlaced(null);
      return;
    }
    if (playerId !== null && game.lastMove.playerId !== playerId) {
      setOpponentLastPlaced({ row: game.lastMove.row, col: game.lastMove.col });
    }
    const moveKey = `${game.lastMove.turnNumber}:${game.lastMove.playerId}:${game.lastMove.row}:${game.lastMove.col}`;
    if (animatedMoveKey.current === moveKey) return;
    animatedMoveKey.current = moveKey;
    const shouldCueOpponentTurn =
      playerId !== null &&
      game.status === "playing" &&
      game.currentPlayerId === playerId &&
      game.lastMove.playerId !== playerId;
    const removalDelay = game.lastMove.removedCells.length > 0
      ? game.lastMove.earnedScore === 0 ? 420 : 620
      : 150;

    setLastPlaced({ row: game.lastMove.row, col: game.lastMove.col });
    if (game.lastMove.removedCells.length > 0) {
      const previousBoard = previousBoardRef.current;
      if (previousBoard !== null) {
        setVisualBoard(boardWithPlacement(
          previousBoard,
          { row: game.lastMove.row, col: game.lastMove.col },
          game.lastMove.color,
        ));
      }
      setIsBoardClearing(game.lastMove.earnedScore === 0);
      setScoringCells(
        new Set(game.lastMove.removedCells.map((cell) => `${cell.row}:${cell.col}`)),
      );
      const timer = window.setTimeout(() => {
        setVisualBoard(null);
        setScoringCells(new Set());
        setIsBoardClearing(false);
      }, game.lastMove.earnedScore === 0 ? 420 : 620);
      effectTimers.current.push(timer);
    }
    if (shouldCueOpponentTurn) {
      const timer = window.setTimeout(triggerOpponentTurnComplete, removalDelay);
      effectTimers.current.push(timer);
    }
    if (game.lastMove.earnedScore > 0) {
      setScoreNotice({ playerId: game.lastMove.playerId, score: game.lastMove.earnedScore });
      const timer = window.setTimeout(() => setScoreNotice(null), 900);
      effectTimers.current.push(timer);
    }
  }, [game, playerId, triggerOpponentTurnComplete]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!canPlay || playerId === null) return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT") return;
      const color = ({ "1": "colorA", "2": "colorB", "3": "colorC" } as const)[event.key as "1" | "2" | "3"];
      if (color !== undefined) {
        setSelectedColors((current) => ({ ...current, [playerId]: color }));
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [canPlay, playerId]);

  const remainingSeconds = useMemo(() => {
    if (game?.turnTimer === null || game?.turnTimer === undefined) return null;
    return Math.max(0, Math.ceil((game.turnTimer.expiresAt - now) / 1_000));
  }, [game?.turnTimer, now]);

  const updateProfile = (patch: Partial<PlayerProfile>) => {
    setProfile((current) => {
      const next = { ...current, ...patch, isGuest: true };
      saveProfile(next);
      return next;
    });
  };

  const createRoom = () => {
    const socket = socketRef.current;
    if (socket === null) return;
    setBusyLabel("방 생성 중");
    setMessage(null);
    socket.emit("room:create", {
      player: profile,
      settings: hasPremium ? { targetScore, turnTimeLimitSeconds, spectatorsAllowed } : undefined,
    }, (response: RoomAck) => {
      setBusyLabel(null);
      if (!response.ok || response.room === undefined || response.playerId === undefined) {
        setMessage(describeError(response.error));
        return;
      }
      rememberPlayer(response.room.code, response.playerId);
      applyRoom(response.room);
      navigate(`/private?code=${response.room.code}`, { replace: true });
    });
  };

  const joinRoom = () => {
    const socket = socketRef.current;
    const code = joinCode.trim().toUpperCase();
    if (socket === null || code.length < 4) return;
    setBusyLabel("방 참가 중");
    setMessage(null);
    socket.emit("room:join", { code, player: profile }, (response: RoomAck) => {
      setBusyLabel(null);
      if (!response.ok || response.room === undefined || response.playerId === undefined) {
        setMessage(describeError(response.error));
        return;
      }
      rememberPlayer(response.room.code, response.playerId);
      applyRoom(response.room);
      navigate(`/private?code=${response.room.code}`, { replace: true });
    });
  };

  const toggleReady = () => {
    const socket = socketRef.current;
    if (socket === null || room === null || playerId === null || roomPlayer === null) return;
    setBusyLabel("준비 상태 변경 중");
    socket.emit(
      "room:ready",
      { code: room.code, playerId, ready: !roomPlayer.ready },
      (response: RoomAck) => {
        setBusyLabel(null);
        if (!response.ok || response.room === undefined) {
          setMessage(describeError(response.error));
          return;
        }
        applyRoom(response.room);
      },
    );
  };

  const placeTileOnline = (position: Position) => {
    const socket = socketRef.current;
    if (socket === null || room === null || playerId === null || game === null) return;
    if (game.board[position.row]?.[position.col] !== null) {
      void notifyInvalidMove();
      setInvalidCell(position);
      const timer = window.setTimeout(() => setInvalidCell(null), 320);
      effectTimers.current.push(timer);
      return;
    }

    setBusyLabel("수 전송 중");
    void notifyTilePlaced();
    setVisualBoard(boardWithPlacement(game.board, position, selectedColor));
    socket.emit(
      "game:move",
      { code: room.code, playerId, row: position.row, col: position.col, color: selectedColor },
      (response: MoveAck) => {
        setBusyLabel(null);
        if (!response.ok) {
          setVisualBoard(null);
          setInvalidCell(position);
          setMessage(describeError(response.error));
          const timer = window.setTimeout(() => setInvalidCell(null), 320);
          effectTimers.current.push(timer);
          return;
        }
        const lastMove = response.room?.game?.lastMove;
        if (lastMove !== undefined && lastMove !== null && lastMove.removedCells.length > 0) {
          animatedMoveKey.current = `${lastMove.turnNumber}:${lastMove.playerId}:${lastMove.row}:${lastMove.col}`;
          setLastPlaced(position);
          setScoringCells(
            new Set(lastMove.removedCells.map((cell) => `${cell.row}:${cell.col}`)),
          );
          setIsBoardClearing(lastMove.earnedScore === 0);
          if (lastMove.earnedScore > 0) {
            setScoreNotice({ playerId, score: lastMove.earnedScore });
          }
          const timer = window.setTimeout(() => {
            setVisualBoard(null);
            setScoringCells(new Set());
            setIsBoardClearing(false);
            if (response.room !== undefined) applyRoom(response.room);
          }, lastMove.earnedScore === 0 ? 420 : 620);
          effectTimers.current.push(timer);
          return;
        }
        setVisualBoard(null);
        if (response.room !== undefined) applyRoom(response.room);
      },
    );
  };

  const resignOnline = () => {
    const socket = socketRef.current;
    if (socket === null || room === null || playerId === null) return;
    setBusyLabel("기권 처리 중");
    socket.emit("game:resign", { code: room.code, playerId }, (response: RoomAck) => {
      setBusyLabel(null);
      setResignOpen(false);
      if (!response.ok || response.room === undefined) {
        setMessage(describeError(response.error));
        return;
      }
      applyRoom(response.room);
    });
  };

  const shareRoomLink = async (kind: "invite" | "spectate") => {
    if (room === null) return;
    const path = kind === "invite"
      ? `/private?code=${encodeURIComponent(room.code)}`
      : `/spectate/${encodeURIComponent(room.code)}`;
    const url = publicAppUrl(path);
    if (game?.status === "playing") {
      setShareDialog({ kind, url });
      return;
    }

    try {
      const result = await shareUrl({
        title: kind === "invite" ? t("Tango 초대") : t("Tango 관전"),
        text: kind === "invite" ? t("초대 링크로 대전에 참가하세요.") : t("진행 중인 대전을 함께 보세요."),
        url,
      });
      setShareNotice(result === "copied"
        ? kind === "invite" ? "초대 링크를 복사했습니다." : "관전 링크를 복사했습니다."
        : "공유했습니다.");
    } catch {
      setShareNotice("공유를 완료하지 못했습니다.");
    }
  };

  const copyShareDialogLink = async () => {
    if (shareDialog === null) return;
    try {
      await shareUrl({
        title: shareDialog.kind === "invite" ? t("Tango 초대") : t("Tango 관전"),
        text: shareDialog.kind === "invite" ? t("초대 링크로 대전에 참가하세요.") : t("진행 중인 대전을 함께 보세요."),
        url: shareDialog.url,
        copyOnly: true,
      });
      setShareNotice(
        shareDialog.kind === "invite" ? "초대 링크를 복사했습니다." : "관전 링크를 복사했습니다.",
      );
      setShareDialog(null);
    } catch {
      setShareNotice("공유 링크를 직접 선택해 복사해 주세요.");
    }
  };

  if (matchmakingEntry && (room === null || game === null)) {
    const entryMessage = message ?? (
      connectionStatus === "connected"
        ? "매칭 정보를 동기화하고 있습니다."
        : connectionStatus === "connecting"
          ? "게임 서버에 연결하고 있습니다."
          : "게임 서버와 다시 연결하고 있습니다."
    );

    return (
      <main className="online-page app-frame">
        <AppSidebar onSettings={() => setSettingsOpen(true)} />

        <section className="match-entry-shell" aria-labelledby="match-entry-title">
          <div className="match-entry-card" role="status" aria-live="polite">
            <span className="match-entry-pulse" aria-hidden="true" />
            <p className="eyebrow">{matchmakingMode === "ranked" ? "RANKED MATCH" : "CASUAL MATCH"}</p>
            <h1 id="match-entry-title">{t("게임을 준비하고 있습니다")}</h1>
            <p>{t(entryMessage)}</p>
            {message !== null && (
              <button
                className="secondary-action"
                type="button"
                onClick={() => navigate(`/matchmaking?mode=${matchmakingMode}`, { replace: true })}
              >
                {t("매칭으로 돌아가기")}
              </button>
            )}
          </div>
        </section>

        <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </main>
    );
  }

  if (room === null || game === null) {
    return (
      <main className="online-page app-frame">
        <AppSidebar onSettings={() => setSettingsOpen(true)} />

        <section className="online-shell app-content-shell" aria-labelledby="private-title">
          <div className="online-copy">
            <p className="eyebrow">PRIVATE ONLINE ROOM</p>
            <h1 id="private-title">{t("친구와 같은 색을 두고, 서로 다른 순간을 노리세요.")}</h1>
            <p>{t("방을 만들면 6자리 초대 코드가 생성됩니다. 두 플레이어가 모두 준비하면 서버가 선공, 턴, 점수, 승패를 처리합니다.")}</p>
          </div>

          <div className="online-card">
            <label className="online-field">
              <span>{t("닉네임")}</span>
              <input
                value={profile.nickname}
                maxLength={24}
                onChange={(event) => updateProfile({ nickname: event.target.value })}
              />
            </label>
            <fieldset>
              <legend>{t("아바타")}</legend>
              <div className="segmented-control two-up">
                {(["orbit", "prism"] as const).map((avatarId) => (
                  <button
                    key={avatarId}
                    type="button"
                    className={profile.avatarId === avatarId ? "active" : ""}
                    onClick={() => updateProfile({ avatarId })}
                  >
                    {avatarId === "orbit" ? "Orbit" : "Prism"}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="premium-room-settings">
              <legend>{t("커스텀 방 설정")} {!hasPremium && <span>🔒 PREMIUM</span>}</legend>
              <label>
                <span>{t("목표 점수")}</span>
                <div className="segmented-control three-up">
                  {([5, 7, 10] as const).map((score) => (
                    <button
                      key={score}
                      type="button"
                      className={targetScore === score ? "active" : ""}
                      disabled={!hasPremium}
                      onClick={() => setTargetScore(score)}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </label>
              <label>
                <span>{t("턴 제한시간")}</span>
                <div className="segmented-control three-up">
                  {([30, 60, 90] as const).map((seconds) => (
                    <button
                      key={seconds}
                      type="button"
                      className={turnTimeLimitSeconds === seconds ? "active" : ""}
                      disabled={!hasPremium}
                      onClick={() => setTurnTimeLimitSeconds(seconds)}
                    >
                      {seconds}{t("초")}
                    </button>
                  ))}
                </div>
              </label>
              <label className="premium-toggle-row">
                <span>{t("관전 허용")}</span>
                <input
                  type="checkbox"
                  checked={spectatorsAllowed}
                  disabled={!hasPremium}
                  onChange={(event) => setSpectatorsAllowed(event.target.checked)}
                />
              </label>
              {!hasPremium && <small>{t("기본 사설방은 무료이며, 시간과 목표 점수 설정은 프리미엄 전용입니다.")}</small>}
            </fieldset>

            <button className="primary-action" type="button" onClick={createRoom} disabled={connectionStatus !== "connected" || busyLabel !== null}>
              {t("새 사설방 만들기")} <span aria-hidden="true">↗</span>
            </button>

            <div className="join-row">
              <input
                value={joinCode}
                placeholder={t("초대 코드")}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              />
              <button className="secondary-action" type="button" onClick={joinRoom} disabled={connectionStatus !== "connected" || busyLabel !== null}>
                {t("참가")}
              </button>
            </div>

            {room !== null && (
              <section className="waiting-room" aria-live="polite">
                <span>ROOM CODE</span>
                <strong>{room.code}</strong>
                <div className="waiting-players">
                  {room.players.map((player, index) => (
                    <p key={player?.id ?? `empty-${index}`}>
                      <b>{player?.nickname ?? t("대기 중")}</b>
                      <small>{player === null ? t("초대 코드를 공유하세요") : player.ready ? "READY" : "NOT READY"}</small>
                    </p>
                  ))}
                </div>
                <div className="room-share-actions">
                  <button className="secondary-action" type="button" onClick={() => void shareRoomLink("invite")}>{t("초대 링크 공유")}</button>
                  <button className="secondary-action" type="button" onClick={() => void shareRoomLink("spectate")}>{t("관전 링크 공유")}</button>
                </div>
                <button className="primary-action" type="button" onClick={toggleReady} disabled={busyLabel !== null || roomPlayer === null || opponentRoomPlayer === null}>
                  {roomPlayer?.ready ? t("준비 취소") : t("준비 완료")} <span aria-hidden="true">✓</span>
                </button>
              </section>
            )}

            {(message !== null || busyLabel !== null) && (
              <p className="online-message">{t(busyLabel ?? message ?? "")}</p>
            )}
          </div>
        </section>

        <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </main>
    );
  }

  const me = game.players.find((player) => player.id === playerId) ?? game.players[0];
  const opponent = game.players.find((player) => player.id !== me.id) ?? game.players[1];
  const opponentTurn = currentPlayerId === opponent.id;
  const turnLabel = game.status === "finished"
    ? t("대전 종료")
    : myTurn
      ? t("내 차례")
      : t("{name} 차례", { name: opponent.nickname });
  const matchLabel = room.mode === "ranked"
    ? "RANKED MATCH"
    : room.mode === "casual"
      ? "CASUAL MATCH"
      : `PRIVATE ROOM ${room.code}`;

  return (
    <main className="game-page app-frame">
      <AppSidebar onSettings={() => setSettingsOpen(true)} />

      {message !== null && <p className="online-toast" role="alert">{t(message)}</p>}
      {shareNotice !== null && <p className="online-toast share-toast" role="status">{t(shareNotice)}</p>}

      <section className="game-shell">
        <header className="game-topbar">
          <button className="icon-button labeled" type="button" onClick={() => navigate("/")}>
            <span>←</span><small>{t("로비")}</small>
          </button>
          <div className="match-label">
            <span>{matchLabel}</span>
            <strong>TURN {game.turnNumber}</strong>
          </div>
          <div className="header-actions">
            <button className="icon-button labeled" type="button" onClick={() => void shareRoomLink("spectate")}><span>◎</span><small>{t("관전 공유")}</small></button>
            <button className="icon-button labeled" type="button" onClick={() => setHelpOpen(true)}><span>?</span><small>{t("규칙")}</small></button>
            <button className="icon-button labeled" type="button" onClick={() => setSettingsOpen(true)}><span>◌</span><small>{t("설정")}</small></button>
          </div>
        </header>

        <section className="game-layout">
          <div className="board-stage">
            <div className="board-caption">
              <span><i /> SERVER AUTHORITATIVE FIELD</span>
              <small>ROOM {room.code}</small>
            </div>
            <GameBoard
              board={visualBoard ?? game.board}
              selectedColor={selectedColor}
              canPlay={canPlay}
              isClearing={isBoardClearing}
              showShapes={showColorShapes}
              focusedIndex={focusedIndex}
              scoringCells={scoringCells}
              lastPlaced={lastPlaced}
              opponentLastPlaced={opponentLastPlaced}
              invalidCell={invalidCell}
              onFocusedIndexChange={setFocusedIndex}
              onPlace={placeTileOnline}
            />
          </div>

          <aside className="game-control-panel" aria-label={t("온라인 대전 정보")}>
            <PlayerCard
              player={opponent}
              active={opponentTurn}
              targetScore={game.config.targetScore}
              remainingSeconds={opponentTurn ? remainingSeconds : null}
              scoreDelta={scoreNotice?.playerId === opponent.id ? scoreNotice.score : null}
              descriptor={opponent.connectionStatus === "connected" ? t("온라인 상대") : t("연결 끊김")}
            />

            <div className={`turn-banner ${myTurn ? "mine" : "theirs"}${turnCueActive ? " turn-ready-effect" : ""}`} role="status" aria-live="polite">
              <span className="turn-indicator" />
              <strong>{turnLabel}</strong>
              <small>{myTurn ? t("서버가 수를 검증합니다.") : t("상대의 수를 기다리는 중입니다.")}</small>
            </div>

            <ColorPicker
              selected={selectedColor}
              disabled={!canPlay || playerId === null}
              showShapes={showColorShapes}
              onSelect={(color) => {
                if (playerId === null) return;
                setSelectedColors((current) => ({ ...current, [playerId]: color }));
              }}
            />

            <PlayerCard
              player={me}
              active={myTurn}
              targetScore={game.config.targetScore}
              remainingSeconds={myTurn ? remainingSeconds : null}
              scoreDelta={scoreNotice?.playerId === me.id ? scoreNotice.score : null}
              descriptor={t("나")}
            />
            <button className="resign-button" type="button" onClick={() => setResignOpen(true)} disabled={game.status !== "playing" || busyLabel !== null}>
              {t("대전 포기")}
            </button>
          </aside>
        </section>
      </section>

      {resignOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setResignOpen(false)}>
          <section className="confirm-panel" role="dialog" aria-modal="true" aria-labelledby="resign-title" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">CONFIRM RESIGNATION</p>
            <h2 id="resign-title">{t("게임을 포기하시겠습니까?")}</h2>
            <p>{t("현재 온라인 대전은 패배로 종료됩니다.")}</p>
            <div className="result-actions">
              <button className="secondary-action" type="button" onClick={() => setResignOpen(false)}>{t("계속하기")}</button>
              <button className="danger-action" type="button" onClick={resignOnline}>{t("기권하기")}</button>
            </div>
          </section>
        </div>
      )}

      {shareDialog !== null && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShareDialog(null)}>
          <section
            className="confirm-panel share-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">SHARE MATCH</p>
            <h2 id="share-dialog-title">{t("관전 링크 공유")}</h2>
            <p>{t("경기를 유지한 채 링크를 복사할 수 있습니다.")}</p>
            <input
              className="share-link-field"
              aria-label={t("공유 링크")}
              readOnly
              value={shareDialog.url}
              onFocus={(event) => event.currentTarget.select()}
            />
            <div className="result-actions">
              <button className="secondary-action" type="button" onClick={() => setShareDialog(null)}>{t("닫기")}</button>
              <button className="primary-action" type="button" onClick={() => void copyShareDialogLink()}>{t("링크 복사")}</button>
            </div>
          </section>
        </div>
      )}

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ResultPanel
        game={game}
        elapsedSeconds={Math.max(0, Math.floor((now - matchStartedAt) / 1_000))}
        perspectivePlayerId={me.id}
        rematchLabel={t("새 방 만들기")}
        onRematch={() => navigate("/private")}
        onLobby={() => navigate("/")}
      />
      {game.status === "finished" && (
        <button className="floating-replay-link" type="button" onClick={() => navigate(`/replay/${encodeURIComponent(game.id)}`)}>
          {t("대전 리플레이 보기")}
        </button>
      )}
    </main>
  );
}

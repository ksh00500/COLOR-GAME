import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
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
import { getAuthToken } from "../api";
import { useSettings } from "../settings";

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

const socketUrl = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:8080";
const profileKey = "color-game-player-profile";
const roomPlayerPrefix = "color-game-room-player:";

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
  if (error === undefined) return "요청을 처리하지 못했습니다.";
  if (error.gameErrorCode === "NOT_YOUR_TURN") return "아직 내 차례가 아닙니다.";
  if (error.gameErrorCode === "CELL_NOT_EMPTY") return "이미 타일이 놓인 칸입니다.";
  if (error.gameErrorCode === "TURN_TIME_EXPIRED") return "제한 시간이 끝났습니다.";
  if (error.code === "ROOM_NOT_FOUND") return "방을 찾을 수 없습니다.";
  if (error.code === "ROOM_FULL") return "이미 두 명이 들어온 방입니다.";
  if (error.code === "PLAYER_NOT_IN_ROOM") return "현재 연결된 플레이어와 요청 정보가 맞지 않습니다.";
  return error.message ?? "요청을 처리하지 못했습니다.";
};

export function OnlineRoomPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get("code")?.trim().toUpperCase() ?? "";
  const { settings } = useSettings();
  const socketRef = useRef<Socket | null>(null);
  const effectTimers = useRef<number[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [profile, setProfile] = useState(readProfile);
  const [joinCode, setJoinCode] = useState(initialCode);
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<Record<string, TileColorId>>({});
  const [visualBoard, setVisualBoard] = useState<Board | null>(null);
  const scoringCells = useMemo(() => new Set<string>(), []);
  const [lastPlaced, setLastPlaced] = useState<Position | null>(null);
  const [invalidCell, setInvalidCell] = useState<Position | null>(null);
  const [scoreNotice, setScoreNotice] = useState<{ playerId: string; score: number } | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(12);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [resignOpen, setResignOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [matchStartedAt, setMatchStartedAt] = useState(0);

  const game = room?.game ?? null;
  const roomPlayer = room?.players.find((player) => player?.id === playerId) ?? null;
  const opponentRoomPlayer = room?.players.find((player) => player !== null && player.id !== playerId) ?? null;
  const currentPlayerId = game?.currentPlayerId ?? null;
  const myTurn = playerId !== null && currentPlayerId === playerId;
  const selectedColor = playerId === null ? "colorA" : selectedColors[playerId] ?? "colorA";
  const showColorShapes = settings.colorBlindPalette && settings.showShapes;
  const canPlay = game?.status === "playing" && myTurn && busyLabel === null && connectionStatus === "connected";

  const clearEffectTimers = useCallback(() => {
    effectTimers.current.forEach((timer) => window.clearTimeout(timer));
    effectTimers.current = [];
  }, []);

  const applyRoom = useCallback((nextRoom: RoomSnapshot) => {
    setRoom(nextRoom);
    if (nextRoom.game !== null) {
      setMatchStartedAt((current) => (current === 0 ? Date.now() : current));
    }
  }, []);

  useEffect(() => clearEffectTimers, [clearEffectTimers]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const socket = io(socketUrl, {
      auth: { token: getAuthToken() },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionStatus("connected");
      setMessage(null);
      const storedPlayerId = initialCode === "" ? null : readRoomPlayer(initialCode);
      if (storedPlayerId !== null) {
        socket.emit("game:reconnect", { code: initialCode, playerId: storedPlayerId }, (response: RoomAck) => {
          if (response.ok && response.room !== undefined) {
            setPlayerId(storedPlayerId);
            applyRoom(response.room);
          }
        });
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
  }, [applyRoom, initialCode]);

  useEffect(() => {
    if (game?.lastMove === null || game?.lastMove === undefined) return;
    setLastPlaced({ row: game.lastMove.row, col: game.lastMove.col });
    if (game.lastMove.earnedScore > 0) {
      setScoreNotice({ playerId: game.lastMove.playerId, score: game.lastMove.earnedScore });
      const timer = window.setTimeout(() => setScoreNotice(null), 900);
      effectTimers.current.push(timer);
    }
  }, [game?.lastMove]);

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
    socket.emit("room:create", { player: profile }, (response: RoomAck) => {
      setBusyLabel(null);
      if (!response.ok || response.room === undefined || response.playerId === undefined) {
        setMessage(describeError(response.error));
        return;
      }
      setPlayerId(response.playerId);
      saveRoomPlayer(response.room.code, response.playerId);
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
      setPlayerId(response.playerId);
      saveRoomPlayer(response.room.code, response.playerId);
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
      setInvalidCell(position);
      const timer = window.setTimeout(() => setInvalidCell(null), 320);
      effectTimers.current.push(timer);
      return;
    }

    setBusyLabel("수 전송 중");
    setVisualBoard(boardWithPlacement(game.board, position, selectedColor));
    socket.emit(
      "game:move",
      { code: room.code, playerId, row: position.row, col: position.col, color: selectedColor },
      (response: MoveAck) => {
        setBusyLabel(null);
        setVisualBoard(null);
        if (!response.ok) {
          setInvalidCell(position);
          setMessage(describeError(response.error));
          const timer = window.setTimeout(() => setInvalidCell(null), 320);
          effectTimers.current.push(timer);
          return;
        }
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

  if (room === null || game === null) {
    return (
      <main className="online-page app-frame">
        <AppSidebar onSettings={() => setSettingsOpen(true)} />

        <section className="online-shell app-content-shell" aria-labelledby="private-title">
          <div className="online-copy">
            <p className="eyebrow">PRIVATE ONLINE ROOM</p>
            <h1 id="private-title">친구와 같은 색을 두고, 서로 다른 순간을 노리세요.</h1>
            <p>
              방을 만들면 6자리 초대 코드가 생성됩니다. 두 플레이어가 모두 준비하면 서버가
              선공, 턴, 점수, 승패를 권위 있게 처리합니다.
            </p>
          </div>

          <div className="online-card">
            <label className="online-field">
              <span>닉네임</span>
              <input
                value={profile.nickname}
                maxLength={24}
                onChange={(event) => updateProfile({ nickname: event.target.value })}
              />
            </label>
            <fieldset>
              <legend>아바타</legend>
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

            <button className="primary-action" type="button" onClick={createRoom} disabled={connectionStatus !== "connected" || busyLabel !== null}>
              새 사설방 만들기 <span aria-hidden="true">↗</span>
            </button>

            <div className="join-row">
              <input
                value={joinCode}
                placeholder="초대 코드"
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              />
              <button className="secondary-action" type="button" onClick={joinRoom} disabled={connectionStatus !== "connected" || busyLabel !== null}>
                참가
              </button>
            </div>

            {room !== null && (
              <section className="waiting-room" aria-live="polite">
                <span>ROOM CODE</span>
                <strong>{room.code}</strong>
                <div className="waiting-players">
                  {room.players.map((player, index) => (
                    <p key={player?.id ?? `empty-${index}`}>
                      <b>{player?.nickname ?? "대기 중"}</b>
                      <small>{player === null ? "초대 코드를 공유하세요" : player.ready ? "READY" : "NOT READY"}</small>
                    </p>
                  ))}
                </div>
                <button className="primary-action" type="button" onClick={toggleReady} disabled={busyLabel !== null || roomPlayer === null || opponentRoomPlayer === null}>
                  {roomPlayer?.ready ? "준비 취소" : "준비 완료"} <span aria-hidden="true">✓</span>
                </button>
              </section>
            )}

            {(message !== null || busyLabel !== null) && (
              <p className="online-message">{busyLabel ?? message}</p>
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
    ? "대전 종료"
    : myTurn
      ? "내 차례"
      : `${opponent.nickname} 차례`;

  return (
    <main className="game-page app-frame">
      <AppSidebar onSettings={() => setSettingsOpen(true)} />

      {message !== null && <p className="online-toast" role="status">{message}</p>}

      <section className="game-shell">
        <header className="game-topbar">
          <button className="icon-button labeled" type="button" onClick={() => navigate("/")}>
            <span>←</span><small>로비</small>
          </button>
          <div className="match-label">
            <span>PRIVATE ROOM {room.code}</span>
            <strong>TURN {game.turnNumber}</strong>
          </div>
          <div className="header-actions">
            <button className="icon-button labeled" type="button" onClick={() => setHelpOpen(true)}><span>?</span><small>규칙</small></button>
            <button className="icon-button labeled" type="button" onClick={() => setSettingsOpen(true)}><span>◌</span><small>설정</small></button>
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
              showShapes={showColorShapes}
              focusedIndex={focusedIndex}
              scoringCells={scoringCells}
              lastPlaced={lastPlaced}
              invalidCell={invalidCell}
              onFocusedIndexChange={setFocusedIndex}
              onPlace={placeTileOnline}
            />
          </div>

          <aside className="game-control-panel" aria-label="온라인 대전 정보">
            <PlayerCard
              player={opponent}
              active={opponentTurn}
              targetScore={game.config.targetScore}
              remainingSeconds={opponentTurn ? remainingSeconds : null}
              scoreDelta={scoreNotice?.playerId === opponent.id ? scoreNotice.score : null}
              descriptor={opponent.connectionStatus === "connected" ? "온라인 상대" : "연결 끊김"}
            />

            <div className={`turn-banner ${myTurn ? "mine" : "theirs"}`} role="status" aria-live="polite">
              <span className="turn-indicator" />
              <strong>{turnLabel}</strong>
              <small>{myTurn ? "서버가 수를 검증합니다." : "상대의 수를 기다리는 중입니다."}</small>
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
              descriptor="나"
            />
            <button className="resign-button" type="button" onClick={() => setResignOpen(true)} disabled={game.status !== "playing" || busyLabel !== null}>
              대전 포기
            </button>
          </aside>
        </section>
      </section>

      {resignOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setResignOpen(false)}>
          <section className="confirm-panel" role="dialog" aria-modal="true" aria-labelledby="resign-title" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">CONFIRM RESIGNATION</p>
            <h2 id="resign-title">게임을 포기하시겠습니까?</h2>
            <p>현재 온라인 대전은 패배로 종료됩니다.</p>
            <div className="result-actions">
              <button className="secondary-action" type="button" onClick={() => setResignOpen(false)}>계속하기</button>
              <button className="danger-action" type="button" onClick={resignOnline}>기권하기</button>
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
        rematchLabel="새 방 만들기"
        onRematch={() => navigate("/private")}
        onLobby={() => navigate("/")}
      />
    </main>
  );
}

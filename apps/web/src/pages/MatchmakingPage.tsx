import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Socket } from "socket.io-client";
import type { RoomSnapshot } from "@color-game/shared-types";
import { getAuthToken } from "../api";
import { AppSidebar } from "../components/AppSidebar";
import { SettingsPanel } from "../components/SettingsPanel";
import { createAppSocket } from "../socket";

const roomPlayerPrefix = "color-game-room-player:";

interface MatchAck {
  ok: boolean;
  status?: "queued" | "matched";
  error?: { code: string; message?: string };
}

interface MatchEvent {
  ok: boolean;
  room: RoomSnapshot;
  playerId: string;
}

export function MatchmakingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "ranked" ? "ranked" : "casual";
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState("서버 연결 중");
  const [queued, setQueued] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const token = useMemo(() => getAuthToken(), []);

  useEffect(() => {
    const socket = createAppSocket({ auth: { token } });
    socketRef.current = socket;

    socket.on("connect", () => setStatus("매칭을 시작할 수 있습니다."));
    socket.on("connect_error", () => setStatus("매칭 서버에 연결하지 못했습니다."));
    socket.on("matchmaking:queued", () => {
      setQueued(true);
      setStatus("상대를 찾는 중입니다.");
    });
    socket.on("matchmaking:matched", (event: MatchEvent) => {
      window.localStorage.setItem(`${roomPlayerPrefix}${event.room.code}`, event.playerId);
      navigate(`/private?code=${event.room.code}`, { replace: true });
    });

    return () => {
      socket.emit("matchmaking:leave");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [navigate, mode, token]);

  const joinQueue = () => {
    if (mode === "ranked" && token === null) {
      setStatus("경쟁 게임은 로그인이 필요합니다.");
      return;
    }

    socketRef.current?.emit(
      "matchmaking:join",
      {
        mode,
        player: {
          nickname: `Guest-${Math.floor(1000 + Math.random() * 9000)}`,
          avatarId: "orbit",
          isGuest: true,
        },
      },
      (response: MatchAck) => {
        if (!response.ok) {
          setStatus(response.error?.message ?? "매칭에 참가하지 못했습니다.");
          return;
        }
        if (response.status === "queued") {
          setQueued(true);
          setStatus("상대를 찾는 중입니다.");
        }
      },
    );
  };

  const leaveQueue = () => {
    socketRef.current?.emit("matchmaking:leave", () => {
      setQueued(false);
      setStatus("매칭을 취소했습니다.");
    });
  };

  return (
    <main className="online-page app-frame">
      <AppSidebar onSettings={() => setSettingsOpen(true)} />

      <section className="online-shell app-content-shell" aria-labelledby="matchmaking-title">
        <div className="online-copy">
          <p className="eyebrow">{mode === "ranked" ? "RANKED MATCH" : "CASUAL MATCH"}</p>
          <h1 id="matchmaking-title">{mode === "ranked" ? "레이팅이 걸린 경쟁 게임" : "가볍게 만나는 일반 게임"}</h1>
          <p>
            매칭 큐에 들어가면 같은 모드의 다른 플레이어와 자동으로 방이 만들어집니다.
            경쟁 게임은 계정 레이팅과 전적에 반영됩니다.
          </p>
        </div>

        <div className="online-card matchmaking-card">
          <p className="eyebrow">MATCHMAKING STATUS</p>
          <h2>{queued ? "대기 중" : "준비됨"}</h2>
          <p className="online-message">{status}</p>
          {queued ? (
            <button className="secondary-action" type="button" onClick={leaveQueue}>매칭 취소</button>
          ) : (
            <button className="primary-action" type="button" onClick={joinQueue}>
              {mode === "ranked" ? "경쟁 매칭 시작" : "일반 매칭 시작"} <span aria-hidden="true">↗</span>
            </button>
          )}
        </div>
      </section>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}

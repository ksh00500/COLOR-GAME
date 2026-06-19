import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Socket } from "socket.io-client";
import type { MatchmakingSegment, RoomSnapshot } from "@color-game/shared-types";
import { getAuthToken } from "../api";
import { AppSidebar } from "../components/AppSidebar";
import { SettingsPanel } from "../components/SettingsPanel";
import { createAppSocket } from "../socket";
import { useI18n } from "../i18n";

const roomPlayerPrefix = "color-game-room-player:";

const segmentLabels: Record<MatchmakingSegment, string> = {
  guest: "게스트",
  blank: "빈 팔레트",
  red: "레드",
  orange: "오렌지",
  yellow: "옐로",
  green: "그린",
  blue: "블루",
  navy: "네이비",
  violet: "보라",
};

interface MatchAck {
  ok: boolean;
  status?: "queued" | "matched";
  estimatedWaitSeconds?: number;
  estimateBasis?: "segment" | "mode" | "default";
  estimateSegment?: MatchmakingSegment;
  estimateSampleCount?: number;
  error?: { code: string; message?: string };
}

interface QueuedEvent {
  mode: "casual" | "ranked";
  estimatedWaitSeconds: number;
  estimateBasis: "segment" | "mode" | "default";
  estimateSegment: MatchmakingSegment;
  estimateSampleCount: number;
}

interface MatchEvent {
  ok: boolean;
  room: RoomSnapshot;
  playerId: string;
}

export function MatchmakingPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "ranked" ? "ranked" : "casual";
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState("서버 연결 중");
  const [queued, setQueued] = useState(false);
  const [queuedAt, setQueuedAt] = useState<number | null>(null);
  const [estimatedWaitSeconds, setEstimatedWaitSeconds] = useState<number | null>(null);
  const [estimateBasis, setEstimateBasis] = useState<"segment" | "mode" | "default">("default");
  const [estimateSegment, setEstimateSegment] = useState<MatchmakingSegment>("guest");
  const [estimateSampleCount, setEstimateSampleCount] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const token = useMemo(() => getAuthToken(), []);

  useEffect(() => {
    const socket = createAppSocket({ auth: { token } });
    socketRef.current = socket;

    socket.on("connect", () => setStatus("매칭을 시작할 수 있습니다."));
    socket.on("connect_error", () => setStatus("매칭 서버에 연결하지 못했습니다."));
    socket.on("matchmaking:queued", (event: QueuedEvent) => {
      setQueued(true);
      setQueuedAt((current) => current ?? Date.now());
      setEstimatedWaitSeconds(event.estimatedWaitSeconds);
      setEstimateBasis(event.estimateBasis);
      setEstimateSegment(event.estimateSegment);
      setEstimateSampleCount(event.estimateSampleCount);
      setStatus("상대를 찾는 중입니다.");
    });
    socket.on("matchmaking:matched", (event: MatchEvent) => {
      window.localStorage.setItem(`${roomPlayerPrefix}${event.room.code}`, event.playerId);
      navigate(`/match?code=${event.room.code}&mode=${mode}`, { replace: true });
    });

    return () => {
      socket.emit("matchmaking:leave");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [navigate, mode, token]);

  useEffect(() => {
    if (!queued) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [queued]);

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
          setStatus(response.error?.code ?? "매칭에 참가하지 못했습니다.");
          return;
        }
        if (response.status === "queued") {
          setQueued(true);
          setQueuedAt(Date.now());
          setEstimatedWaitSeconds(response.estimatedWaitSeconds ?? null);
          setEstimateBasis(response.estimateBasis ?? "default");
          setEstimateSegment(response.estimateSegment ?? "guest");
          setEstimateSampleCount(response.estimateSampleCount ?? 0);
          setStatus("상대를 찾는 중입니다.");
        }
      },
    );
  };

  const leaveQueue = () => {
    socketRef.current?.emit("matchmaking:leave", () => {
      setQueued(false);
      setQueuedAt(null);
      setEstimatedWaitSeconds(null);
      setEstimateBasis("default");
      setEstimateSampleCount(0);
      setStatus("매칭을 취소했습니다.");
    });
  };

  return (
    <main className="online-page app-frame">
      <AppSidebar onSettings={() => setSettingsOpen(true)} />

      <section className="online-shell app-content-shell" aria-labelledby="matchmaking-title">
        <div className="online-copy">
          <p className="eyebrow">{mode === "ranked" ? "RANKED MATCH" : "CASUAL MATCH"}</p>
          <h1 id="matchmaking-title">{mode === "ranked" ? t("레이팅이 걸린 경쟁 게임") : t("가볍게 만나는 일반 게임")}</h1>
          <p>
            {mode === "ranked"
              ? t("경쟁 게임은 로그인한 플레이어만 참가할 수 있습니다. 결과는 레이팅과 전적에 반영됩니다.")
              : t("매칭 큐에 들어가면 부담 없이 다른 플레이어와 자동으로 방이 만들어집니다.")}
          </p>
        </div>

        <div className="online-card matchmaking-card">
          <p className="eyebrow">MATCHMAKING STATUS</p>
          <h2>{queued ? t("대기 중") : t("준비됨")}</h2>
          <p className="online-message">{t(status)}</p>
          {queued && queuedAt !== null && (
            <div className="queue-estimate" role="status">
              <span>{t("현재 대기 {seconds}초", { seconds: Math.max(0, Math.floor((now - queuedAt) / 1_000)) })}</span>
              <strong>{estimatedWaitSeconds === null ? t("예상 시간 계산 중") : t("예상 약 {seconds}초", { seconds: estimatedWaitSeconds })}</strong>
              <small>
                {estimateBasis === "segment"
                  ? t("{segment} 최근 {count}건 기준", { segment: t(segmentLabels[estimateSegment]), count: estimateSampleCount })
                  : estimateBasis === "mode"
                    ? t("전체 {mode} 최근 {count}건 기준", { mode: mode === "ranked" ? t("경쟁") : t("일반"), count: estimateSampleCount })
                    : t("표본이 쌓이기 전 기본 예상치입니다.")}
              </small>
            </div>
          )}
          {queued ? (
            <button className="secondary-action" type="button" onClick={leaveQueue}>{t("매칭 취소")}</button>
          ) : (
            <button className="primary-action" type="button" onClick={joinQueue}>
              {mode === "ranked" ? t("경쟁 매칭 시작") : t("일반 매칭 시작")} <span aria-hidden="true">↗</span>
            </button>
          )}
        </div>
      </section>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}

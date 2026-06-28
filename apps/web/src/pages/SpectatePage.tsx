import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Socket } from "socket.io-client";
import type { RoomSnapshot } from "@color-game/shared-types";
import { AppSidebar } from "../components/AppSidebar";
import { GameBoard } from "../components/GameBoard";
import { PlayerCard } from "../components/PlayerCard";
import { SettingsPanel } from "../components/SettingsPanel";
import { shareUrl } from "../share";
import { publicAppUrl } from "../nativeApp";
import { useSettings } from "../settings";
import { createAppSocket } from "../socket";
import { useI18n } from "../i18n";

interface SpectateAck {
  ok: boolean;
  room?: RoomSnapshot;
  error?: { code?: string; message?: string };
}

export function SpectatePage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { code = "" } = useParams();
  const { settings } = useSettings();
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(12);
  const [message, setMessage] = useState("관전 서버에 연결하는 중입니다.");
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const socket: Socket = createAppSocket();
    socket.on("connect", () => {
      socket.emit("room:spectate", { code }, (response: SpectateAck) => {
        if (!response.ok || response.room === undefined) {
          setMessage(response.error?.code ?? "관전할 방을 찾지 못했습니다.");
          return;
        }
        setRoom(response.room);
        setMessage("");
      });
    });
    socket.on("game:state", (nextRoom: RoomSnapshot) => setRoom(nextRoom));
    socket.on("connect_error", () => setMessage("관전 서버에 연결하지 못했습니다."));
    return () => {
      socket.disconnect();
    };
  }, [code]);

  const shareSpectate = async () => {
    const url = publicAppUrl(`/spectate/${encodeURIComponent(code.toUpperCase())}`);
    try {
      const result = await shareUrl({ title: t("Tango 관전"), text: t("진행 중인 대전을 함께 보세요."), url });
      setMessage(result === "copied" ? "관전 링크를 복사했습니다." : "공유했습니다.");
    } catch {
      setMessage("공유를 완료하지 못했습니다.");
    }
  };

  const game = room?.game ?? null;
  if (room === null || game === null) {
    return (
      <main className="online-page app-frame">
        <AppSidebar onSettings={() => setSettingsOpen(true)} />
        <section className="replay-shell app-content-shell"><p className="online-message">{t(message || "경기 시작을 기다리는 중입니다.")}</p></section>
        <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </main>
    );
  }

  return (
    <main className="game-page app-frame">
      <AppSidebar onSettings={() => setSettingsOpen(true)} />
      <section className="replay-shell app-content-shell">
        <header className="replay-header">
          <div>
            <p className="eyebrow">LIVE SPECTATE · ROOM {room.code}</p>
            <h1>{game.players[0].nickname} vs {game.players[1].nickname}</h1>
            <p>{game.status === "finished" ? t("대전이 종료되었습니다.") : t("현재 {turn}턴을 관전하고 있습니다.", { turn: game.turnNumber })}</p>
          </div>
          <div className="replay-header-actions">
            <button className="secondary-action" type="button" onClick={shareSpectate}>{t("관전 링크 공유")}</button>
            {game.status === "finished" && (
              <button className="primary-action" type="button" onClick={() => navigate(`/replay/${encodeURIComponent(game.id)}`)}>{t("리플레이 보기")}</button>
            )}
          </div>
        </header>
        <section className="replay-layout">
          <PlayerCard player={game.players[0]} active={game.currentPlayerId === game.players[0].id} targetScore={game.config.targetScore} remainingSeconds={null} scoreDelta={null} descriptor={t("플레이어 1")} />
          <div className="replay-board-column">
            <GameBoard
              board={game.board}
              selectedColor="colorA"
              canPlay={false}
              showShapes={settings.colorBlindPalette && settings.showShapes}
              focusedIndex={focusedIndex}
              scoringCells={new Set()}
              lastPlaced={game.lastMove === null ? null : { row: game.lastMove.row, col: game.lastMove.col }}
              invalidCell={null}
              onFocusedIndexChange={setFocusedIndex}
              onPlace={() => undefined}
            />
            {message !== "" && <p className="online-message">{t(message)}</p>}
          </div>
          <PlayerCard player={game.players[1]} active={game.currentPlayerId === game.players[1].id} targetScore={game.config.targetScore} remainingSeconds={null} scoreDelta={null} descriptor={t("플레이어 2")} />
        </section>
      </section>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}

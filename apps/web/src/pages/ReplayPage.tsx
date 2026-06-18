import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { Board, GamePlayer, GameReplay, Position } from "@color-game/shared-types";
import { AppSidebar } from "../components/AppSidebar";
import { GameBoard } from "../components/GameBoard";
import { PlayerCard } from "../components/PlayerCard";
import { SettingsPanel } from "../components/SettingsPanel";
import { ApiError, fetchReplay } from "../api";
import { shareUrl } from "../share";
import { useSettings } from "../settings";
import { useI18n } from "../i18n";

interface ReplayFrame {
  board: Board;
  players: [GamePlayer, GamePlayer];
  lastPlaced: Position | null;
  scoringCells: Set<string>;
}

const buildFrame = (replay: GameReplay, step: number): ReplayFrame => {
  const size = replay.finalState.config.boardSize;
  const board: Board = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null),
  );
  const scores = new Map(replay.finalState.players.map((player) => [player.id, 0]));
  const applied = replay.moves.slice(0, step);

  for (const move of applied) {
    board[move.row]![move.col] = move.color;
    scores.set(move.playerId, (scores.get(move.playerId) ?? 0) + move.earnedScore);
    for (const cell of move.removedCells) {
      board[cell.row]![cell.col] = null;
    }
  }

  const currentMove = applied.at(-1) ?? null;
  return {
    board,
    players: replay.finalState.players.map((player) => ({
      ...player,
      score: scores.get(player.id) ?? 0,
    })) as [GamePlayer, GamePlayer],
    lastPlaced: currentMove === null ? null : { row: currentMove.row, col: currentMove.col },
    scoringCells: new Set(
      currentMove?.removedCells.map((cell) => `${cell.row}:${cell.col}`) ?? [],
    ),
  };
};

export function ReplayPage() {
  const navigate = useNavigate();
  const { t, formatDate } = useI18n();
  const { gameId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useSettings();
  const [replay, setReplay] = useState<GameReplay | null>(null);
  const [step, setStepState] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState(12);
  const [message, setMessage] = useState("리플레이를 불러오는 중입니다.");
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchReplay(gameId)
      .then((nextReplay) => {
        if (cancelled) return;
        setReplay(nextReplay);
        const requested = Number(searchParams.get("move") ?? nextReplay.moves.length);
        const initial = Number.isFinite(requested)
          ? Math.max(0, Math.min(nextReplay.moves.length, Math.floor(requested)))
          : nextReplay.moves.length;
        setStepState(initial);
        setMessage("");
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(error instanceof ApiError ? error.code : "리플레이를 불러오지 못했습니다.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const setStep = (next: number) => {
    if (replay === null) return;
    const clamped = Math.max(0, Math.min(replay.moves.length, next));
    setStepState(clamped);
    setSearchParams({ move: String(clamped) }, { replace: true });
  };

  const frame = useMemo(
    () => replay === null ? null : buildFrame(replay, step),
    [replay, step],
  );

  const shareCurrentMove = async () => {
    if (replay === null) return;
    const url = `${window.location.origin}/replay/${encodeURIComponent(replay.gameId)}?move=${step}`;
    try {
      const result = await shareUrl({
        title: t("Color Line 리플레이"),
        text: t("{step}번째 수를 확인해 보세요.", { step }),
        url,
      });
      setMessage(result === "copied" ? "현재 수의 공유 링크를 복사했습니다." : "공유했습니다.");
    } catch {
      setMessage("공유를 완료하지 못했습니다.");
    }
  };

  if (replay === null || frame === null) {
    return (
      <main className="online-page app-frame">
        <AppSidebar onSettings={() => setSettingsOpen(true)} />
        <section className="replay-shell app-content-shell"><p className="online-message">{t(message)}</p></section>
        <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </main>
    );
  }

  const currentMove = step === 0 ? null : replay.moves[step - 1] ?? null;
  const showShapes = settings.colorBlindPalette && settings.showShapes;

  return (
    <main className="game-page app-frame">
      <AppSidebar onSettings={() => setSettingsOpen(true)} />
      <section className="replay-shell app-content-shell">
        <header className="replay-header">
          <div>
            <p className="eyebrow">MATCH REPLAY · {replay.mode.toUpperCase()}</p>
            <h1>{frame.players[0].nickname} vs {frame.players[1].nickname}</h1>
            <p>{t("수순을 앞뒤로 이동하고 원하는 장면의 링크를 공유할 수 있습니다.")} · {formatDate(replay.startedAt)}</p>
          </div>
          <div className="replay-header-actions">
            <button className="secondary-action" type="button" onClick={() => navigate(-1)}>{t("돌아가기")}</button>
            <button className="primary-action" type="button" onClick={shareCurrentMove}>{t("현재 수 공유")}</button>
          </div>
        </header>

        <section className="replay-layout">
          <PlayerCard player={frame.players[0]} active={currentMove?.playerId === frame.players[0].id} targetScore={replay.finalState.config.targetScore} remainingSeconds={null} scoreDelta={null} descriptor={t("플레이어 1")} />
          <div className="replay-board-column">
            <GameBoard
              board={frame.board}
              selectedColor="colorA"
              canPlay={false}
              showShapes={showShapes}
              focusedIndex={focusedIndex}
              scoringCells={frame.scoringCells}
              lastPlaced={frame.lastPlaced}
              invalidCell={null}
              onFocusedIndexChange={setFocusedIndex}
              onPlace={() => undefined}
            />
            <div className="replay-controls">
              <div className="replay-step-label">
                <strong>{step} / {replay.moves.length}</strong>
                <span>{currentMove === null ? t("게임 시작") : `${currentMove.turnNumber} TURN · +${currentMove.earnedScore} PT`}</span>
              </div>
              <input
                type="range"
                min={0}
                max={replay.moves.length}
                value={step}
                aria-label={t("리플레이 수순")}
                onChange={(event) => setStep(Number(event.target.value))}
              />
              <div className="replay-buttons">
                <button type="button" onClick={() => setStep(0)} disabled={step === 0}>{t("처음")}</button>
                <button type="button" onClick={() => setStep(step - 1)} disabled={step === 0}>{t("이전 수")}</button>
                <button type="button" onClick={() => setStep(step + 1)} disabled={step === replay.moves.length}>{t("다음 수")}</button>
                <button type="button" onClick={() => setStep(replay.moves.length)} disabled={step === replay.moves.length}>{t("마지막")}</button>
              </div>
              {message !== "" && <p className="online-message">{t(message)}</p>}
            </div>
          </div>
          <PlayerCard player={frame.players[1]} active={currentMove?.playerId === frame.players[1].id} targetScore={replay.finalState.config.targetScore} remainingSeconds={null} scoreDelta={null} descriptor={t("플레이어 2")} />
        </section>
      </section>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}

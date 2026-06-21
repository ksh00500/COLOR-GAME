import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { GameReplay } from "@color-game/shared-types";
import { AppSidebar } from "../components/AppSidebar";
import { GameBoard } from "../components/GameBoard";
import { PlayerCard } from "../components/PlayerCard";
import { SettingsPanel } from "../components/SettingsPanel";
import { ApiError, fetchReplay } from "../api";
import { shareUrl } from "../share";
import { useSettings } from "../settings";
import { useI18n } from "../i18n";
import { buildReplayFrame } from "../replayFrames";

type PlaybackSpeed = 0.5 | 1 | 2;
const replayRetryDelays = [0, 250, 600, 1_200];

export function ReplayPage() {
  const navigate = useNavigate();
  const { t, formatDate } = useI18n();
  const { gameId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useSettings();
  const [replay, setReplay] = useState<GameReplay | null>(null);
  const [step, setStepState] = useState(0);
  const [currentScoringResolved, setCurrentScoringResolved] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [focusedIndex, setFocusedIndex] = useState(12);
  const [message, setMessage] = useState("리플레이를 불러오는 중입니다.");
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadReplay = async () => {
      let lastError: unknown = null;
      for (const delay of replayRetryDelays) {
        if (delay > 0) await new Promise((resolve) => window.setTimeout(resolve, delay));
        if (cancelled) return;
        try {
          const nextReplay = await fetchReplay(gameId);
          if (cancelled) return;
          const requestedParam = searchParams.get("move");
          const requested = Number(requestedParam ?? 0);
          const initial = Number.isFinite(requested)
            ? Math.max(0, Math.min(nextReplay.moves.length, Math.floor(requested)))
            : 0;
          setReplay(nextReplay);
          setStepState(initial);
          setCurrentScoringResolved(true);
          setIsPlaying(requestedParam === null && nextReplay.moves.length > 0);
          setMessage("");
          return;
        } catch (error) {
          lastError = error;
          if (!(error instanceof ApiError) || error.code !== "REPLAY_NOT_FOUND") break;
        }
      }
      if (!cancelled) {
        setMessage(lastError instanceof ApiError ? lastError.code : "리플레이를 불러오지 못했습니다.");
      }
    };
    void loadReplay();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const setStep = useCallback((next: number, pausePlayback = true) => {
    if (replay === null) return;
    const clamped = Math.max(0, Math.min(replay.moves.length, next));
    if (pausePlayback) setIsPlaying(false);
    setStepState(clamped);
    setCurrentScoringResolved(clamped === 0);
    setSearchParams({ move: String(clamped) }, { replace: true });
  }, [replay, setSearchParams]);

  useEffect(() => {
    if (replay === null) return undefined;
    const currentMove = step === 0 ? null : replay.moves[step - 1] ?? null;

    if (!currentScoringResolved) {
      if (currentMove !== null && currentMove.removedCells.length > 0) {
        const timer = window.setTimeout(
          () => setCurrentScoringResolved(true),
          Math.round(650 / playbackSpeed),
        );
        return () => window.clearTimeout(timer);
      }
      setCurrentScoringResolved(true);
      return undefined;
    }

    if (!isPlaying) return undefined;
    if (step >= replay.moves.length) {
      setIsPlaying(false);
      return undefined;
    }

    const timer = window.setTimeout(
      () => setStep(step + 1, false),
      Math.round(820 / playbackSpeed),
    );
    return () => window.clearTimeout(timer);
  }, [currentScoringResolved, isPlaying, playbackSpeed, replay, setStep, step]);

  const frame = useMemo(
    () => replay === null ? null : buildReplayFrame(replay, step, currentScoringResolved),
    [currentScoringResolved, replay, step],
  );

  const togglePlayback = () => {
    if (replay === null || replay.moves.length === 0) return;
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (step >= replay.moves.length) {
      setStep(0, false);
    }
    setIsPlaying(true);
  };

  const shareCurrentMove = async () => {
    if (replay === null) return;
    const url = `${window.location.origin}/replay/${encodeURIComponent(replay.gameId)}?move=${step}`;
    try {
      const result = await shareUrl({
        title: t("Tango 리플레이"),
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
  const playbackLabel = isPlaying
    ? t("일시정지")
    : step >= replay.moves.length
      ? t("처음부터 재생")
      : t("재생");

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
                <span aria-live="polite">
                  {currentMove === null
                    ? t("게임 시작")
                    : `${currentMove.turnNumber} TURN · +${currentMove.earnedScore} PT${frame.awaitingRemoval ? ` · ${t("득점 연결")}` : ""}`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={replay.moves.length}
                value={step}
                aria-label={t("리플레이 수순")}
                onChange={(event) => setStep(Number(event.target.value))}
              />
              <div className="replay-playback-row">
                <button className="replay-play-toggle" type="button" onClick={togglePlayback} disabled={replay.moves.length === 0}>
                  <span aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span> {playbackLabel}
                </button>
                <div className="replay-speed" role="group" aria-label={t("재생 속도")}>
                  {([0.5, 1, 2] as const).map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      className={playbackSpeed === speed ? "active" : ""}
                      aria-pressed={playbackSpeed === speed}
                      onClick={() => setPlaybackSpeed(speed)}
                    >
                      {speed}×
                    </button>
                  ))}
                </div>
              </div>
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

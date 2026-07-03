import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { chooseAiMove, isHardAiAvailable, type AiDifficulty } from "@color-game/ai-engine";
import {
  DEFAULT_GAME_CONFIG,
  createInitialGame,
  expireTurn,
  placeTile,
  resignGame,
} from "@color-game/game-core";
import { fetchMe, getAuthToken, getCachedAccount, type Account } from "../api";
import { notifyInvalidMove, notifyTilePlaced } from "../nativeFeedback";
import type { Board, GamePlayer, GameState, Position, TileColorId } from "@color-game/shared-types";
import { AppSidebar } from "../components/AppSidebar";
import { ColorPicker } from "../components/ColorPicker";
import { GameBoard } from "../components/GameBoard";
import { HelpPanel } from "../components/HelpPanel";
import { PlayerCard } from "../components/PlayerCard";
import { ResultPanel } from "../components/ResultPanel";
import { SettingsPanel } from "../components/SettingsPanel";
import { playOpponentTurnCue } from "../audio";
import { useSettings } from "../settings";
import { useI18n } from "../i18n";

const HUMAN_ID = "player1";
const AI_ID = "player2";
const aiNames: Record<AiDifficulty, string> = {
  easy: "Rookie",
  normal: "Mastermind",
  hard: "Mastermind",
};

const aiDescriptors: Record<AiDifficulty, string> = {
  easy: "AI · 쉬운 전술",
  normal: "AI · 학습 모델",
  hard: "AI · 심화 전술",
};

const createPlayers = (
  difficulty: AiDifficulty,
  account: Account | null = null,
): [GamePlayer, GamePlayer] => [
  {
    id: HUMAN_ID,
    accountId: account?.id ?? null,
    nickname: account?.displayName ?? "Guest-4821",
    avatarId: account?.avatarId ?? "orbit",
    score: 0,
    connectionStatus: "connected",
    isGuest: account === null,
  },
  {
    id: AI_ID,
    nickname: aiNames[difficulty],
    avatarId: "prism",
    score: 0,
    connectionStatus: "connected",
    isGuest: false,
  },
];

const resolveFirstPlayer = (preference: string | null): string => {
  if (preference === "ai") return AI_ID;
  if (preference === "random") return Math.random() < 0.5 ? HUMAN_ID : AI_ID;
  return HUMAN_ID;
};

const resolveDifficulty = (value: string | null): AiDifficulty =>
  value === "hard" && isHardAiAvailable ? "hard" : value === "normal" || value === "hard" ? "normal" : "easy";

const createMatch = (
  difficulty: AiDifficulty,
  firstPreference: string | null,
  account: Account | null = null,
): GameState => {
  const now = Date.now();
  return createInitialGame(DEFAULT_GAME_CONFIG, {
    id: `ai-match-${now}`,
    mode: "ai",
    firstPlayerId: resolveFirstPlayer(firstPreference),
    now,
    players: createPlayers(difficulty, account),
  });
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

export function GamePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const difficulty = resolveDifficulty(searchParams.get("difficulty"));
  const firstPreference = searchParams.get("first");
  const { settings } = useSettings();
  const [account, setAccount] = useState<Account | null>(() => getCachedAccount());
  const [game, setGame] = useState(() => createMatch(difficulty, firstPreference, getCachedAccount()));
  const [selectedColors, setSelectedColors] = useState<Record<string, TileColorId>>({
    [HUMAN_ID]: "colorA",
    [AI_ID]: "colorB",
  });
  const [visualBoard, setVisualBoard] = useState<Board | null>(null);
  const [scoringCells, setScoringCells] = useState<Set<string>>(new Set());
  const [lastPlaced, setLastPlaced] = useState<Position | null>(null);
  const [opponentLastPlaced, setOpponentLastPlaced] = useState<Position | null>(null);
  const [invalidCell, setInvalidCell] = useState<Position | null>(null);
  const [scoreNotice, setScoreNotice] = useState<{ playerId: string; score: number } | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(12);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isBoardClearing, setIsBoardClearing] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [turnCueActive, setTurnCueActive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [resignOpen, setResignOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [matchStartedAt, setMatchStartedAt] = useState(Date.now());
  const effectTimers = useRef<number[]>([]);

  const human = game.players[0];
  const ai = game.players[1];
  const showColorShapes = settings.colorBlindPalette && settings.showShapes;
  const humanTurn = game.currentPlayerId === HUMAN_ID;
  const aiTurn = game.currentPlayerId === AI_ID;
  const canHumanPlay = game.status === "playing" && humanTurn && !isAnimating;

  useEffect(() => {
    if (getAuthToken() === null) return;
    void fetchMe().then((nextAccount) => {
      setAccount(nextAccount);
      setGame((current) => ({
        ...current,
        players: current.players.map((player) => player.id === HUMAN_ID
          ? {
              ...player,
              accountId: nextAccount.id,
              nickname: nextAccount.displayName,
              avatarId: nextAccount.avatarId,
              isGuest: false,
            }
          : player) as [GamePlayer, GamePlayer],
      }));
    }).catch(() => undefined);
  }, []);

  const clearEffectTimers = useCallback(() => {
    effectTimers.current.forEach((timer) => window.clearTimeout(timer));
    effectTimers.current = [];
  }, []);

  useEffect(() => clearEffectTimers, [clearEffectTimers]);

  const triggerOpponentTurnComplete = useCallback(() => {
    if (settings.soundEnabled) {
      void playOpponentTurnCue();
    }

    if (settings.animationLevel === "off") return;
    setTurnCueActive(true);
    const timer = window.setTimeout(() => setTurnCueActive(false), 1_200);
    effectTimers.current.push(timer);
  }, [settings.animationLevel, settings.soundEnabled]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (!isAnimating) setGame((current) => expireTurn(current, currentTime));
    }, 250);
    return () => window.clearInterval(timer);
  }, [isAnimating]);

  const applyMove = useCallback(
    (playerId: string, position: Position, color: TileColorId) => {
      if (isAnimating || game.status !== "playing") return;

      if (game.board[position.row]?.[position.col] !== null) {
        void notifyInvalidMove();
        setInvalidCell(position);
        const timer = window.setTimeout(() => setInvalidCell(null), 320);
        effectTimers.current.push(timer);
        return;
      }

      const result = placeTile(game, {
        ...position,
        playerId,
        color,
        createdAt: Date.now(),
      });

      if (!result.ok) {
        if (playerId === HUMAN_ID) void notifyInvalidMove();
        setGame(result.state);
        return;
      }

      if (playerId === HUMAN_ID) void notifyTilePlaced();
      setLastPlaced(position);
      if (playerId === AI_ID) setOpponentLastPlaced(position);
      const shouldCueOpponentTurn =
        playerId !== HUMAN_ID &&
        result.state.status === "playing" &&
        result.state.currentPlayerId === HUMAN_ID;
      const removedCells = result.move.removedCells;
      const shouldAnimateRemoval = removedCells.length > 0;
      if (!shouldAnimateRemoval) {
        setGame(result.state);
        if (shouldCueOpponentTurn) triggerOpponentTurnComplete();
        return;
      }

      const isFullBoardClear = result.move.earnedScore === 0;
      const animationDuration = isFullBoardClear
        ? settings.animationLevel === "off"
          ? 40
          : settings.presentationSpeed === "fast"
            ? 260
            : 420
        : settings.animationLevel === "off"
          ? 40
          : settings.presentationSpeed === "fast"
            ? 280
            : settings.animationLevel === "reduced"
              ? 360
              : 620;

      setIsAnimating(true);
      setIsBoardClearing(isFullBoardClear);
      setVisualBoard(boardWithPlacement(game.board, position, color));
      setScoringCells(
        new Set(removedCells.map((cell) => `${cell.row}:${cell.col}`)),
      );
      if (result.move.earnedScore > 0) {
        setScoreNotice({ playerId, score: result.move.earnedScore });
      }

      const commitTimer = window.setTimeout(() => {
        setGame(result.state);
        setVisualBoard(null);
        setScoringCells(new Set());
        setIsBoardClearing(false);
        setIsAnimating(false);
        if (shouldCueOpponentTurn) triggerOpponentTurnComplete();
      }, animationDuration);
      const timers = [commitTimer];
      if (result.move.earnedScore > 0) {
        const noticeTimer = window.setTimeout(() => setScoreNotice(null), animationDuration + 700);
        timers.push(noticeTimer);
      }
      effectTimers.current.push(...timers);
    },
    [game, isAnimating, settings.animationLevel, settings.presentationSpeed, triggerOpponentTurnComplete],
  );

  useEffect(() => {
    if (!aiTurn || game.status !== "playing" || isAnimating) {
      setIsAiThinking(false);
      return undefined;
    }

    setIsAiThinking(true);
    const delay = settings.presentationSpeed === "fast" ? 360 : 720;
    const timer = window.setTimeout(() => {
      const move = chooseAiMove(game, difficulty);
      setIsAiThinking(false);
      if (move === null) return;
      setSelectedColors((current) => ({ ...current, [AI_ID]: move.color }));
      applyMove(AI_ID, move, move.color);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [aiTurn, applyMove, difficulty, game, isAnimating, settings.presentationSpeed]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!canHumanPlay) return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT") return;
      const color = ({ "1": "colorA", "2": "colorB", "3": "colorC" } as const)[event.key as "1" | "2" | "3"];
      if (color !== undefined) {
        setSelectedColors((current) => ({ ...current, [HUMAN_ID]: color }));
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [canHumanPlay]);

  const remainingSeconds = useMemo(() => {
    if (game.turnTimer === null) return null;
    return Math.max(0, Math.ceil((game.turnTimer.expiresAt - now) / 1_000));
  }, [game.turnTimer, now]);

  const resetMatch = () => {
    clearEffectTimers();
    const startedAt = Date.now();
    setGame(createMatch(difficulty, firstPreference, account));
    setSelectedColors({ [HUMAN_ID]: "colorA", [AI_ID]: "colorB" });
    setVisualBoard(null);
    setScoringCells(new Set());
    setLastPlaced(null);
    setOpponentLastPlaced(null);
    setInvalidCell(null);
    setScoreNotice(null);
    setIsAnimating(false);
    setIsBoardClearing(false);
    setIsAiThinking(false);
    setTurnCueActive(false);
    setMatchStartedAt(startedAt);
    setNow(startedAt);
  };

  const turnLabel = game.status === "finished"
    ? t("대전 종료")
    : humanTurn
      ? t("내 차례")
      : isAiThinking
        ? `${ai.nickname} 생각 중 ···`
        : t("상대 차례");
  return (
    <main className="game-page app-frame">
      <AppSidebar onSettings={() => setSettingsOpen(true)} />

      <section className="game-shell">
        <header className="game-topbar">
          <button className="icon-button labeled" type="button" onClick={() => navigate("/")}>
            <span>←</span><small>{t("로비")}</small>
          </button>
          <div className="match-label">
            <span>AI MATCH</span>
            <strong>TURN {game.turnNumber}</strong>
          </div>
          <div className="header-actions">
            <button className="icon-button labeled" type="button" onClick={() => setHelpOpen(true)}><span>?</span><small>{t("규칙")}</small></button>
            <button className="icon-button labeled game-settings-action" type="button" onClick={() => setSettingsOpen(true)}><span>◌</span><small>{t("설정")}</small></button>
          </div>
        </header>

        <section className="game-layout">
          <div className="board-stage">
            <div className="board-caption">
              <span><i /> SHARED COLOR FIELD</span>
              <small>3 = 1PT · 4 = 2PT · 5 = 4PT</small>
            </div>
            <GameBoard
              board={visualBoard ?? game.board}
              selectedColor={selectedColors[HUMAN_ID] ?? "colorA"}
              canPlay={canHumanPlay}
              isClearing={isBoardClearing}
              showShapes={showColorShapes}
              focusedIndex={focusedIndex}
              scoringCells={scoringCells}
              lastPlaced={lastPlaced}
              opponentLastPlaced={opponentLastPlaced}
              invalidCell={invalidCell}
              onFocusedIndexChange={setFocusedIndex}
              onPlace={(position) => applyMove(HUMAN_ID, position, selectedColors[HUMAN_ID] ?? "colorA")}
            />
          </div>

          <aside className="game-control-panel" aria-label={t("대전 정보")}>
            <PlayerCard
              player={ai}
              active={aiTurn}
              targetScore={game.config.targetScore}
              remainingSeconds={aiTurn ? remainingSeconds : null}
              scoreDelta={scoreNotice?.playerId === AI_ID ? scoreNotice.score : null}
              descriptor={t(aiDescriptors[difficulty])}
            />

            <div className={`turn-banner ${humanTurn ? "mine" : "theirs"}${turnCueActive ? " turn-ready-effect" : ""}`} role="status" aria-live="polite">
              <span className="turn-indicator" />
              <strong>{turnLabel}</strong>
              <small>{humanTurn ? t("색상을 고르고 빈칸에 놓으세요.") : t("상대 수를 기다리는 중입니다.")}</small>
            </div>

            <ColorPicker
              selected={selectedColors[HUMAN_ID] ?? "colorA"}
              disabled={!canHumanPlay}
              showShapes={showColorShapes}
              onSelect={(color) => setSelectedColors((current) => ({ ...current, [HUMAN_ID]: color }))}
            />

            <PlayerCard
              player={human}
              active={humanTurn}
              targetScore={game.config.targetScore}
              remainingSeconds={humanTurn ? remainingSeconds : null}
              scoreDelta={scoreNotice?.playerId === HUMAN_ID ? scoreNotice.score : null}
              descriptor={t("게스트 플레이어")}
            />

            <button className="resign-button" type="button" onClick={() => setResignOpen(true)} disabled={game.status !== "playing"}>
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
            <p>{t("현재 대전은 패배로 종료됩니다.")}</p>
            <div className="result-actions">
              <button className="secondary-action" type="button" onClick={() => setResignOpen(false)}>{t("계속하기")}</button>
              <button className="danger-action" type="button" onClick={() => {
                setGame((current) => resignGame(current, HUMAN_ID));
                setResignOpen(false);
              }}>{t("기권하기")}</button>
            </div>
          </section>
        </div>
      )}

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ResultPanel
        game={game}
        elapsedSeconds={Math.max(
          0,
          Math.floor(((game.finishedAt ?? now) - (game.startedAt ?? matchStartedAt)) / 1_000),
        )}
        onRematch={resetMatch}
        onLobby={() => navigate("/")}
      />
    </main>
  );
}

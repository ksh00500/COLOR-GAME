import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { chooseAiMove, type AiDifficulty } from "@color-game/ai-engine";
import {
  DEFAULT_GAME_CONFIG,
  createInitialGame,
  expireTurn,
  placeTile,
  resignGame,
} from "@color-game/game-core";
import type { Board, GamePlayer, GameState, Position, TileColorId } from "@color-game/shared-types";
import { BrandMark } from "../components/BrandMark";
import { ColorPicker } from "../components/ColorPicker";
import { GameBoard } from "../components/GameBoard";
import { HelpPanel } from "../components/HelpPanel";
import { PlayerCard } from "../components/PlayerCard";
import { ResultPanel } from "../components/ResultPanel";
import { SettingsPanel } from "../components/SettingsPanel";
import { useSettings } from "../settings";

const HUMAN_ID = "player1";
const AI_ID = "player2";

const aiNames: Record<AiDifficulty, string> = {
  easy: "Apprentice",
  normal: "Tactician",
  hard: "Mastermind",
};

const aiDescriptors: Record<AiDifficulty, string> = {
  easy: "AI · 기초 전술",
  normal: "AI · 균형 전술",
  hard: "AI · 심화 전술",
};

const createPlayers = (difficulty: AiDifficulty): [GamePlayer, GamePlayer] => [
  {
    id: HUMAN_ID,
    nickname: "Guest-4821",
    avatarId: "orbit",
    score: 0,
    connectionStatus: "connected",
    isGuest: true,
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
  value === "easy" || value === "hard" ? value : "normal";

const createMatch = (difficulty: AiDifficulty, firstPreference: string | null): GameState => {
  const now = Date.now();
  return createInitialGame(DEFAULT_GAME_CONFIG, {
    id: `ai-match-${now}`,
    mode: "ai",
    firstPlayerId: resolveFirstPlayer(firstPreference),
    now,
    players: createPlayers(difficulty),
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const difficulty = resolveDifficulty(searchParams.get("difficulty"));
  const firstPreference = searchParams.get("first");
  const { settings } = useSettings();
  const [game, setGame] = useState(() => createMatch(difficulty, firstPreference));
  const [selectedColors, setSelectedColors] = useState<Record<string, TileColorId>>({
    [HUMAN_ID]: "colorA",
    [AI_ID]: "colorB",
  });
  const [visualBoard, setVisualBoard] = useState<Board | null>(null);
  const [scoringCells, setScoringCells] = useState<Set<string>>(new Set());
  const [lastPlaced, setLastPlaced] = useState<Position | null>(null);
  const [invalidCell, setInvalidCell] = useState<Position | null>(null);
  const [scoreNotice, setScoreNotice] = useState<{ playerId: string; score: number } | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(12);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [resignOpen, setResignOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [matchStartedAt, setMatchStartedAt] = useState(Date.now());
  const effectTimers = useRef<number[]>([]);

  const human = game.players[0];
  const ai = game.players[1];
  const humanTurn = game.currentPlayerId === HUMAN_ID;
  const aiTurn = game.currentPlayerId === AI_ID;
  const canHumanPlay = game.status === "playing" && humanTurn && !isAnimating;

  const clearEffectTimers = useCallback(() => {
    effectTimers.current.forEach((timer) => window.clearTimeout(timer));
    effectTimers.current = [];
  }, []);

  useEffect(() => clearEffectTimers, [clearEffectTimers]);

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
        setGame(result.state);
        return;
      }

      setLastPlaced(position);
      if (result.move.earnedScore === 0) {
        setGame(result.state);
        return;
      }

      const animationDuration = settings.animationLevel === "off"
        ? 40
        : settings.presentationSpeed === "fast"
          ? 280
          : settings.animationLevel === "reduced"
            ? 360
            : 620;

      setIsAnimating(true);
      setVisualBoard(boardWithPlacement(game.board, position, color));
      setScoringCells(
        new Set(result.move.removedCells.map((cell) => `${cell.row}:${cell.col}`)),
      );
      setScoreNotice({ playerId, score: result.move.earnedScore });

      const commitTimer = window.setTimeout(() => {
        setGame(result.state);
        setVisualBoard(null);
        setScoringCells(new Set());
        setIsAnimating(false);
      }, animationDuration);
      const noticeTimer = window.setTimeout(() => setScoreNotice(null), animationDuration + 700);
      effectTimers.current.push(commitTimer, noticeTimer);
    },
    [game, isAnimating, settings.animationLevel, settings.presentationSpeed],
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
    setGame(createMatch(difficulty, firstPreference));
    setSelectedColors({ [HUMAN_ID]: "colorA", [AI_ID]: "colorB" });
    setVisualBoard(null);
    setScoringCells(new Set());
    setLastPlaced(null);
    setInvalidCell(null);
    setScoreNotice(null);
    setIsAnimating(false);
    setIsAiThinking(false);
    setMatchStartedAt(startedAt);
    setNow(startedAt);
  };

  const turnLabel = game.status === "finished"
    ? "대전 종료"
    : humanTurn
      ? "내 차례"
      : isAiThinking
        ? `${ai.nickname} 생각 중 ···`
        : "상대 차례";

  return (
    <main className="game-page">
      <header className="game-header">
        <button className="brand-button" type="button" onClick={() => navigate("/")} aria-label="메인 화면으로">
          <BrandMark />
        </button>
        <div className="match-label">
          <span>AI MATCH</span>
          <strong>TURN {game.turnNumber}</strong>
        </div>
        <div className="header-actions">
          <button className="icon-button labeled" type="button" onClick={() => setHelpOpen(true)}><span>?</span><small>규칙</small></button>
          <button className="icon-button labeled" type="button" onClick={() => setSettingsOpen(true)}><span>◌</span><small>설정</small></button>
        </div>
      </header>

      <div className={`turn-banner ${humanTurn ? "mine" : "theirs"}`} role="status" aria-live="polite">
        <span className="turn-indicator" />
        <strong>{turnLabel}</strong>
        <small>{humanTurn ? "색상을 고르고 빈칸에 타일을 놓으세요." : "보드는 잠시 입력할 수 없습니다."}</small>
      </div>

      <section className="game-layout">
        <div className="player-slot opponent-slot">
          <PlayerCard
            player={ai}
            active={aiTurn}
            targetScore={game.config.targetScore}
            remainingSeconds={aiTurn ? remainingSeconds : null}
            scoreDelta={scoreNotice?.playerId === AI_ID ? scoreNotice.score : null}
            descriptor={aiDescriptors[difficulty]}
          />
        </div>

        <div className="board-stage">
          <div className="board-caption">
            <span><i /> SHARED COLOR FIELD</span>
            <small>3 = 1PT · 4 = 3PT · 5 = 5PT</small>
          </div>
          <GameBoard
            board={visualBoard ?? game.board}
            selectedColor={selectedColors[HUMAN_ID] ?? "colorA"}
            canPlay={canHumanPlay}
            showShapes={settings.showShapes}
            focusedIndex={focusedIndex}
            scoringCells={scoringCells}
            lastPlaced={lastPlaced}
            invalidCell={invalidCell}
            onFocusedIndexChange={setFocusedIndex}
            onPlace={(position) => applyMove(HUMAN_ID, position, selectedColors[HUMAN_ID] ?? "colorA")}
          />
        </div>

        <div className="player-slot human-slot">
          <PlayerCard
            player={human}
            active={humanTurn}
            targetScore={game.config.targetScore}
            remainingSeconds={humanTurn ? remainingSeconds : null}
            scoreDelta={scoreNotice?.playerId === HUMAN_ID ? scoreNotice.score : null}
            descriptor="게스트 플레이어"
          />
          <button className="resign-button" type="button" onClick={() => setResignOpen(true)} disabled={game.status !== "playing"}>
            대전 포기
          </button>
        </div>

        <div className="picker-slot">
          <ColorPicker
            selected={selectedColors[HUMAN_ID] ?? "colorA"}
            disabled={!canHumanPlay}
            onSelect={(color) => setSelectedColors((current) => ({ ...current, [HUMAN_ID]: color }))}
          />
        </div>
      </section>

      <div className="game-footnote">
        <span>ARROW KEYS TO MOVE · ENTER TO PLACE</span>
        <span>목표 점수 {game.config.targetScore} · 턴당 60초</span>
      </div>

      {resignOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setResignOpen(false)}>
          <section className="confirm-panel" role="dialog" aria-modal="true" aria-labelledby="resign-title" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">CONFIRM RESIGNATION</p>
            <h2 id="resign-title">게임을 포기하시겠습니까?</h2>
            <p>현재 대전은 패배로 종료됩니다.</p>
            <div className="result-actions">
              <button className="secondary-action" type="button" onClick={() => setResignOpen(false)}>계속하기</button>
              <button className="danger-action" type="button" onClick={() => {
                setGame((current) => resignGame(current, HUMAN_ID));
                setResignOpen(false);
              }}>기권하기</button>
            </div>
          </section>
        </div>
      )}

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ResultPanel
        game={game}
        elapsedSeconds={Math.max(0, Math.floor((now - matchStartedAt) / 1_000))}
        onRematch={resetMatch}
        onLobby={() => navigate("/")}
      />
    </main>
  );
}

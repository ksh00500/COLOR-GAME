import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AiDifficulty } from "@color-game/ai-engine";
import { fetchEconomy, getAuthToken, type EconomyOverview } from "../api";
import { AppSidebar } from "../components/AppSidebar";
import { EconomyQuestGrid } from "../components/EconomyQuestGrid";
import { SettingsPanel } from "../components/SettingsPanel";
import { openTutorial } from "../components/TutorialPanel";
import { useVisitorAnalytics } from "../visitorAnalytics";
import { useI18n } from "../i18n";

type FirstPlayer = "human" | "ai" | "random";
const aiSettingsKey = "tango-ai-settings-v1";

const readAiSettings = (): { difficulty: AiDifficulty; firstPlayer: FirstPlayer } => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(aiSettingsKey) ?? "{}") as {
      difficulty?: AiDifficulty;
      firstPlayer?: FirstPlayer;
    };
    return {
      difficulty: parsed.difficulty === "normal" ? "normal" : "easy",
      firstPlayer: parsed.firstPlayer === "ai" || parsed.firstPlayer === "random"
        ? parsed.firstPlayer
        : "human",
    };
  } catch {
    return { difficulty: "easy", firstPlayer: "human" };
  }
};

const modes = [
  {
    id: "ai",
    index: "01",
    title: "AI 대전",
    description: "쉬운 Easy와 학습 모델 Normal을 플레이할 수 있습니다.",
    state: "PLAYABLE",
    accent: "burgundy",
  },
  {
    id: "casual",
    index: "02",
    title: "일반 게임",
    description: "레이팅 부담 없이 새로운 상대와 한 판.",
    state: "MATCHING",
    accent: "navy",
  },
  {
    id: "ranked",
    index: "03",
    title: "경쟁 게임",
    description: "도에서 모까지. 시즌 순위를 향한 승부.",
    state: "RANKED",
    accent: "green",
  },
  {
    id: "private",
    index: "04",
    title: "사설방",
    description: "초대 코드로 만나는 프라이빗 매치.",
    state: "ONLINE",
    accent: "bronze",
  },
] as const;

export function LobbyPage() {
  const navigate = useNavigate();
  const { t, formatNumber } = useI18n();
  const [difficulty, setDifficulty] = useState<AiDifficulty>(() => readAiSettings().difficulty);
  const [firstPlayer, setFirstPlayer] = useState<FirstPlayer>(() => readAiSettings().firstPlayer);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const visitorCounts = useVisitorAnalytics();
  const signedIn = getAuthToken() !== null;
  const [economy, setEconomy] = useState<EconomyOverview | null>(null);

  useEffect(() => {
    if (signedIn) {
      void fetchEconomy().then(setEconomy).catch(() => undefined);
    }
  }, [signedIn]);

  useEffect(() => {
    try {
      window.localStorage.setItem(aiSettingsKey, JSON.stringify({ difficulty, firstPlayer }));
    } catch {
      // The game remains usable when browser storage is unavailable.
    }
  }, [difficulty, firstPlayer]);

  const startGame = () => {
    navigate(`/game?difficulty=${difficulty}&first=${firstPlayer}`);
  };

  const openMode = (modeId: (typeof modes)[number]["id"]) => {
    if (modeId === "ai") {
      startGame();
      return;
    }

    if (modeId === "private") {
      navigate("/private");
      return;
    }

    navigate(`/matchmaking?mode=${modeId}`);
  };

  return (
    <main className="lobby-page app-frame">
      <AppSidebar onSettings={() => setSettingsOpen(true)} />

      <section className="home-stage">
        <header className="home-intro">
          <p className="eyebrow">TANGO</p>
          <h1>{t("색을 이어 점수를 완성하세요")}</h1>
          <p>{t("5×5 보드에서 같은 색 3개 이상을 만들면 점수를 얻습니다.")}</p>
        </header>

        <div className="home-play-layout">
          <div className="home-board-card" aria-hidden="true">
            <div className="hero-board">
              {Array.from({ length: 25 }, (_, index) => (
                <i key={index} className={[6, 7, 8].includes(index) ? "tile-a" : [12, 17].includes(index) ? "tile-b" : index === 18 ? "tile-c" : ""} />
              ))}
            </div>
          </div>

          <section className="home-play-panel" aria-label={t("게임 모드")}>
            <div className="home-play-panel-heading">
              <div>
                <p className="eyebrow">PLAY</p>
                <h2>{t("게임 모드")}</h2>
              </div>
              <div className="home-utility-links">
                <button type="button" onClick={openTutorial}>{t("튜토리얼 보기")}</button>
                <button type="button" onClick={() => navigate("/patch-notes")}>{t("패치노트")}</button>
              </div>
            </div>

            <div className="home-quick-configs">
              <div className="quick-config" aria-label={t("AI 대전 설정")}>
                <span>AI</span>
                {(["easy", "normal", "hard"] as const).map((level) => {
                  const locked = level === "hard";
                  return (
                    <button
                      key={level}
                      type="button"
                      className={`${difficulty === level ? "active" : ""}${locked ? " locked" : ""}`}
                      aria-disabled={locked}
                      title={locked ? t("아직 준비중입니다.") : undefined}
                      data-tooltip={locked ? t("아직 준비중입니다.") : undefined}
                      onClick={() => {
                        if (!locked) setDifficulty(level);
                      }}
                    >
                      {level === "easy" ? "Easy" : level === "normal" ? "Normal" : "Hard"}
                      {locked && <small>{t("준비중")}</small>}
                    </button>
                  );
                })}
              </div>

              <div className="quick-config" aria-label={t("선공 설정")}>
                <span>{t("선공")}</span>
                {(["human", "ai", "random"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={firstPlayer === option ? "active" : ""}
                    onClick={() => setFirstPlayer(option)}
                  >
                    {option === "human" ? t("나") : option === "ai" ? "AI" : t("랜덤")}
                  </button>
                ))}
              </div>
            </div>

            <section className="home-mode-actions" aria-label={t("게임 모드")}>
              {modes.map((mode) => (
                <button key={mode.id} className={`home-mode ${mode.accent}`} type="button" onClick={() => openMode(mode.id)}>
                  <small>{mode.state}</small>
                  <strong>{t(mode.title)}</strong>
                  <span>{mode.id === "ai" ? t("바로 시작") : mode.id === "private" ? t("방 만들기") : t("매칭")}</span>
                </button>
              ))}
            </section>
          </section>
        </div>

        <div className="home-dashboard">
          <div className="home-dashboard-side">
            <section className="home-account-card" aria-label={t("계정")}>
              <div>
                <small>{signedIn ? t("계정 연결됨") : t("로그인하면 더 좋아요")}</small>
                <strong>{signedIn ? t("전적과 출석을 확인하세요") : t("로그인하고 랭크 기록을 저장하세요")}</strong>
              </div>
              <button type="button" onClick={() => navigate("/account")}>
                {signedIn ? t("마이 페이지") : t("로그인")} <span aria-hidden="true">↗</span>
              </button>
            </section>

            <section className="visitor-strip" aria-label={t("접속자 현황")}>
              <span>
                <small>{t("실시간")}</small>
                <strong>{visitorCounts?.realtime === undefined ? "-" : formatNumber(visitorCounts.realtime)}</strong>
              </span>
              <span>
                <small>{t("일간")}</small>
                <strong>{visitorCounts?.daily === undefined ? "-" : formatNumber(visitorCounts.daily)}</strong>
              </span>
              <span>
                <small>{t("월간")}</small>
                <strong>{visitorCounts?.monthly === undefined ? "-" : formatNumber(visitorCounts.monthly)}</strong>
              </span>
            </section>
          </div>

          <section className="home-quests" aria-label={t("퀘스트")}>
            <div className="home-section-heading">
              <strong>{t("오늘의 퀘스트")}</strong>
              <button type="button" onClick={() => navigate("/account")}>{t("전체 관리")} ↗</button>
            </div>
            {economy !== null ? (
              <EconomyQuestGrid economy={economy} onEconomyChange={setEconomy} compact />
            ) : (
              <button className="home-quest-login" type="button" onClick={() => navigate("/account")}>
                {signedIn ? t("퀘스트를 불러오는 중입니다.") : t("로그인하고 퀘스트 보상을 받으세요.")}
              </button>
            )}
          </section>
        </div>
      </section>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}

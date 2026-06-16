import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AiDifficulty } from "@color-game/ai-engine";
import { BrandMark } from "../components/BrandMark";
import { SettingsPanel } from "../components/SettingsPanel";

type FirstPlayer = "human" | "ai" | "random";

const modes = [
  {
    id: "ai",
    index: "01",
    title: "AI 대전",
    description: "세 단계의 사고 깊이. 나만의 수를 설계하세요.",
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
  const [difficulty, setDifficulty] = useState<AiDifficulty>("normal");
  const [firstPlayer, setFirstPlayer] = useState<FirstPlayer>("human");
  const [settingsOpen, setSettingsOpen] = useState(false);

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
    <main className="lobby-page">
      <header className="site-header">
        <BrandMark />
        <nav aria-label="주요 메뉴">
          <span className="service-status"><i /> AWS SERVICE BUILD</span>
          <button className="header-button" type="button" onClick={() => navigate("/account")}>
            계정
          </button>
          <button className="header-button" type="button" onClick={() => navigate("/leaderboard")}>
            리더보드
          </button>
          <button className="header-button" type="button" onClick={() => setSettingsOpen(true)}>
            <span aria-hidden="true">◌</span> 설정
          </button>
        </nav>
      </header>

      <section className="lobby-hero">
        <div className="hero-copy">
          <p className="eyebrow">SHARED COLORS · CLAIMED MOMENTS</p>
          <h1>
            색은 누구의 것도 아니다.
            <span>완성한 순간만이 당신의 것이다.</span>
          </h1>
          <p>
            같은 색을 이어 점수를 만들고, 상대가 남긴 패턴까지 당신의 수로 완성하세요.
            한 칸이 여러 방향을 잇는 순간, 판 전체의 흐름이 바뀝니다.
          </p>
        </div>
        <div className="hero-board" aria-hidden="true">
          {Array.from({ length: 25 }, (_, index) => (
            <i key={index} className={[6, 7, 8].includes(index) ? "tile-a" : [12, 17].includes(index) ? "tile-b" : index === 18 ? "tile-c" : ""} />
          ))}
          <span className="hero-line" />
        </div>
      </section>

      <section className="mode-section" aria-labelledby="mode-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CHOOSE YOUR TABLE</p>
            <h2 id="mode-title">게임 모드</h2>
          </div>
          <p>AI 대전, 사설방, 일반 자동 매칭, 경쟁 매칭까지 같은 규칙 엔진으로 플레이합니다.</p>
        </div>

        <div className="mode-grid">
          {modes.map((mode) => {
            return (
              <article key={mode.id} className={`mode-card ${mode.accent} featured`}>
                <div className="mode-card-top">
                  <span>{mode.index}</span>
                  <small>{mode.state}</small>
                </div>
                <div className="mode-glyph" aria-hidden="true"><i /><i /><i /><i /></div>
                <h3>{mode.title}</h3>
                <p>{mode.description}</p>
                <button className="mode-action" type="button" onClick={() => openMode(mode.id)}>
                  {mode.id === "ai" ? "대전 준비" : mode.id === "private" ? "방 만들기" : "매칭 시작"} <span aria-hidden="true">→</span>
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="match-config" aria-labelledby="config-title">
        <div>
          <p className="eyebrow">AI MATCH CONFIGURATION</p>
          <h2 id="config-title">첫 대전을 준비하세요</h2>
          <p>선택한 설정으로 즉시 5×5 전략 보드가 열립니다.</p>
        </div>
        <div className="config-controls">
          <fieldset>
            <legend>AI 난이도</legend>
            <div className="choice-row">
              {(["easy", "normal", "hard"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  className={difficulty === level ? "active" : ""}
                  onClick={() => setDifficulty(level)}
                >
                  {level === "easy" ? "Apprentice" : level === "normal" ? "Tactician" : "Mastermind"}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>선공</legend>
            <div className="choice-row">
              {(["human", "ai", "random"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={firstPlayer === option ? "active" : ""}
                  onClick={() => setFirstPlayer(option)}
                >
                  {option === "human" ? "내가 먼저" : option === "ai" ? "AI 먼저" : "무작위"}
                </button>
              ))}
            </div>
          </fieldset>
          <button className="primary-action" type="button" onClick={startGame}>
            AI 대전 시작
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </section>

      <footer className="lobby-footer">
        <span>COLOR LINE STRATEGY · PROTOTYPE 0.1</span>
        <span>5 × 5 · TARGET 10 · THREE SHARED COLORS</span>
      </footer>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}

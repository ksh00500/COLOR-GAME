import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AiDifficulty } from "@color-game/ai-engine";
import { AppSidebar } from "../components/AppSidebar";
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
    <main className="lobby-page app-frame">
      <AppSidebar onSettings={() => setSettingsOpen(true)} />

      <section className="home-stage">
        <div className="home-board-card" aria-hidden="true">
          <div className="hero-board">
            {Array.from({ length: 25 }, (_, index) => (
              <i key={index} className={[6, 7, 8].includes(index) ? "tile-a" : [12, 17].includes(index) ? "tile-b" : index === 18 ? "tile-c" : ""} />
            ))}
            <span className="hero-line" />
          </div>
        </div>

        <div className="home-copy">
          <p className="eyebrow">COLOR LINE STRATEGY</p>
          <h1>색을 이어 점수를 완성하세요</h1>
          <p>5×5 보드에서 같은 색 3개 이상을 만들면 점수를 얻습니다.</p>

          <div className="home-actions">
            <button className="home-primary" type="button" onClick={startGame}>
              시작하세요
            </button>
            <button className="home-secondary" type="button" onClick={() => navigate("/matchmaking?mode=casual")}>
              온라인 매칭
            </button>
          </div>

          <div className="quick-config" aria-label="AI 대전 설정">
            <span>AI</span>
            {(["easy", "normal", "hard"] as const).map((level) => (
              <button
                key={level}
                type="button"
                className={difficulty === level ? "active" : ""}
                onClick={() => setDifficulty(level)}
              >
                {level === "easy" ? "Easy" : level === "normal" ? "Normal" : "Hard"}
              </button>
            ))}
          </div>

          <div className="quick-config" aria-label="선공 설정">
            <span>선공</span>
            {(["human", "ai", "random"] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={firstPlayer === option ? "active" : ""}
                onClick={() => setFirstPlayer(option)}
              >
                {option === "human" ? "나" : option === "ai" ? "AI" : "랜덤"}
              </button>
            ))}
          </div>

          <section className="home-mode-strip" aria-label="게임 모드">
            {modes.map((mode) => (
              <button key={mode.id} className={`home-mode ${mode.accent}`} type="button" onClick={() => openMode(mode.id)}>
                <small>{mode.state}</small>
                <strong>{mode.title}</strong>
                <span>{mode.id === "ai" ? "바로 시작" : mode.id === "private" ? "방 만들기" : "매칭"}</span>
              </button>
            ))}
          </section>
        </div>
      </section>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}

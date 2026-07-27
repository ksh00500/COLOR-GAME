import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { GameState } from "@color-game/shared-types";
import { ResultPanel } from "./ResultPanel";

vi.mock("../i18n", () => ({
  useI18n: () => ({
    t: (key: string, values?: Record<string, string | number>) =>
      Object.entries(values ?? {}).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
        key,
      ),
  }),
}));

const finishedGame = (winnerId: string | null, result: GameState["result"]): GameState => ({
  id: "game-1",
  status: "finished",
  mode: "ai",
  board: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => null)),
  players: [
    {
      id: "player",
      nickname: "Tango",
      avatarId: "orbit",
      score: winnerId === "player" ? 7 : 3,
      connectionStatus: "connected",
      isGuest: false,
    },
    {
      id: "opponent",
      nickname: "Rookie",
      avatarId: "prism",
      score: winnerId === "opponent" ? 7 : 3,
      connectionStatus: "connected",
      isGuest: true,
    },
  ],
  currentPlayerId: null,
  turnNumber: 21,
  winnerId,
  result,
  lastMove: null,
  turnTimer: null,
  config: {
    boardSize: 5,
    targetScore: 7,
    colors: ["colorA", "colorB", "colorC"],
    scoreRules: { 3: 1, 4: 2, 5: 4 },
    turnTimeLimitSeconds: null,
  },
});

describe("neutral match result", () => {
  it.each([
    ["player", "target-score", "win", "승리"],
    ["opponent", "target-score", "loss", "패배"],
    [null, "draw", "draw", "무승부"],
  ] as const)("renders %s without a retired victory preset", (winnerId, result, status, label) => {
    const html = renderToStaticMarkup(
      <ResultPanel
        game={finishedGame(winnerId, result)}
        elapsedSeconds={65}
        perspectivePlayerId="player"
        onLobby={() => undefined}
        onRematch={() => undefined}
      />,
    );

    expect(html).toContain(`data-result-status="${status}"`);
    expect(html).toContain(label);
    expect(html).toContain("1:05");
    expect(html).not.toContain("data-victory-preset");
    expect(html).not.toContain("result-victory-emblem");
    if (status === "win") {
      expect(html).not.toContain("마지막 연결이 목표 점수를 완성했습니다.");
    }
  });
});

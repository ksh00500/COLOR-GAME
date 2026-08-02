import { beforeEach, describe, expect, it, vi } from "vitest";

const poolMocks = vi.hoisted(() => ({
  query: vi.fn(),
  end: vi.fn(),
}));

vi.mock("pg", () => ({
  Pool: class {
    query = poolMocks.query;
    end = poolMocks.end;
  },
}));

import { PostgresAccountStore } from "./auth-store.js";

describe("PostgresAccountStore leaderboard", () => {
  beforeEach(() => {
    poolMocks.query.mockReset();
    poolMocks.end.mockReset();
  });

  it("includes matchmaking bot accounts in the public ranking", async () => {
    poolMocks.query.mockResolvedValue({
      rows: [{
        id: "tango-bot-ranked-hard-kimsin",
        display_name: "김신",
        avatar_id: "prism",
        rating: 1_024,
        games_played: 3,
        ranked_wins: 2,
        ranked_losses: 1,
        ranked_draws: 0,
        is_matchmaking_bot: true,
      }],
    });
    const store = new PostgresAccountStore({ connectionString: "postgres://test" });

    const players = await store.getLeaderboard(100);

    const [query, parameters] = poolMocks.query.mock.calls[0] as [string, unknown[]];
    expect(query).not.toContain("not is_matchmaking_bot");
    expect(parameters).toEqual([100]);
    expect(players).toEqual([{
      id: "tango-bot-ranked-hard-kimsin",
      displayName: "김신",
      avatarId: "prism",
      rating: 1_024,
      gamesPlayed: 3,
      rankedWins: 2,
      rankedLosses: 1,
      rankedDraws: 0,
    }]);
  });
});

import { writeFile } from "node:fs/promises";
import { Pool } from "pg";
import { AI_FEATURE_NAMES, extractAiMoveFeatures, getOpponentScoringCells } from "@color-game/ai-engine";
import { createInitialGame, getValidMoves, placeTile } from "@color-game/game-core";
import type { GameState, Move, ValidMove } from "@color-game/shared-types";

interface GameRow {
  id: string;
  state: GameState;
}

interface MoveRow {
  game_id: string;
  player_id: string;
  row_index: number;
  col_index: number;
  color: Move["color"];
  turn_number: number;
  created_at: Date;
}

const outputPath = process.argv[2];
if (outputPath === undefined) {
  throw new Error("Usage: pnpm ai:export-training <output.json>");
}
if (process.env.DATABASE_URL === undefined) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

const alphaEncodedState = (state: GameState): number[][][] => {
  const currentIndex = state.players.findIndex((player) => player.id === state.currentPlayerId);
  const plane = (value: number) => Array.from(
    { length: state.config.boardSize },
    () => Array.from({ length: state.config.boardSize }, () => value),
  );
  return [
    ...state.config.colors.map((color) => state.board.map((row) => row.map((cell) => cell === color ? 1 : 0))),
    plane(currentIndex),
    plane(state.players[currentIndex]?.score ?? 0).map((row) => row.map((score) => score / state.config.targetScore)),
    plane(state.players[1 - currentIndex]?.score ?? 0).map((row) => row.map((score) => score / state.config.targetScore)),
  ];
};

try {
  const games = await pool.query<GameRow>(
    `select id, state from games where mode <> 'ai' order by started_at asc`,
  );
  const moves = await pool.query<MoveRow>(
    `select game_id, player_id, row_index, col_index, color, turn_number, created_at
     from game_moves order by game_id, turn_number`,
  );
  const movesByGame = new Map<string, MoveRow[]>();
  for (const move of moves.rows) {
    const group = movesByGame.get(move.game_id) ?? [];
    group.push(move);
    movesByGame.set(move.game_id, group);
  }

  const positions: Array<{
    gameId: string;
    turnNumber: number;
    candidates: Array<{ move: ValidMove; features: number[] }>;
    chosenIndex: number;
    encodedState: number[][][];
    chosenAction: number;
    value: number;
  }> = [];
  let gameCount = 0;

  for (const game of games.rows) {
    const gameMoves = movesByGame.get(game.id) ?? [];
    const firstMove = gameMoves[0];
    if (firstMove === undefined) continue;
    let state = createInitialGame(
      { ...game.state.config, turnTimeLimitSeconds: null },
      {
        id: game.id,
        mode: game.state.mode,
        firstPlayerId: firstMove.player_id,
        players: game.state.players.map((player) => ({
          ...player,
          score: 0,
          connectionStatus: "connected" as const,
        })) as GameState["players"],
      },
    );
    let used = false;

    for (const actual of gameMoves) {
      if (state.status !== "playing" || state.currentPlayerId !== actual.player_id) break;
      const threatenedCells = getOpponentScoringCells(state);
      const candidates = getValidMoves(state).map((move) => ({
        move,
        features: extractAiMoveFeatures(state, move, threatenedCells),
      }));
      const chosenIndex = candidates.findIndex(({ move }) =>
        move.row === actual.row_index && move.col === actual.col_index && move.color === actual.color);
      if (chosenIndex < 0) break;
      const chosenAction = (actual.row_index * state.config.boardSize + actual.col_index)
        * state.config.colors.length + state.config.colors.indexOf(actual.color);
      const value = game.state.winnerId === null ? 0 : game.state.winnerId === actual.player_id ? 1 : -1;
      positions.push({
        gameId: game.id,
        turnNumber: actual.turn_number,
        candidates,
        chosenIndex,
        encodedState: alphaEncodedState(state),
        chosenAction,
        value,
      });
      used = true;
      const result = placeTile(state, {
        playerId: actual.player_id,
        row: actual.row_index,
        col: actual.col_index,
        color: actual.color,
        createdAt: actual.created_at.getTime(),
      });
      if (!result.ok) break;
      state = result.state;
    }
    if (used) gameCount += 1;
  }

  await writeFile(outputPath, JSON.stringify({
    version: 1,
    featureNames: AI_FEATURE_NAMES,
    gameCount,
    positions,
  }));
  console.log(JSON.stringify({ outputPath, gameCount, positions: positions.length }));
} finally {
  await pool.end();
}

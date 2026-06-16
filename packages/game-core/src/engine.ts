import type {
  Board,
  GameConfig,
  GamePlayer,
  GameState,
  Move,
  MoveInput,
  MoveResult,
  Position,
  ScoringDirection,
  ScoringLine,
  TileColorId,
  TurnTimer,
  ValidationResult,
  ValidMove,
} from "@color-game/shared-types";

export const DEFAULT_GAME_CONFIG: GameConfig = {
  boardSize: 5,
  targetScore: 10,
  colors: ["colorA", "colorB", "colorC"],
  scoreRules: {
    3: 1,
    4: 3,
    5: 5,
  },
  turnTimeLimitSeconds: 60,
};

const DIRECTIONS: ReadonlyArray<{
  row: number;
  col: number;
  type: ScoringDirection;
}> = [
  { row: 0, col: 1, type: "horizontal" },
  { row: 1, col: 0, type: "vertical" },
  { row: 1, col: 1, type: "diagonalDown" },
  { row: 1, col: -1, type: "diagonalUp" },
];

export interface CreateGameOptions {
  id?: string;
  mode?: GameState["mode"];
  firstPlayerId?: string;
  now?: number;
  players?: [GamePlayer, GamePlayer];
}

const defaultPlayers = (): [GamePlayer, GamePlayer] => [
  {
    id: "player1",
    nickname: "You",
    avatarId: "orbit",
    score: 0,
    connectionStatus: "connected",
    isGuest: true,
  },
  {
    id: "player2",
    nickname: "Tactician",
    avatarId: "prism",
    score: 0,
    connectionStatus: "connected",
    isGuest: false,
  },
];

const cloneConfig = (config: GameConfig): GameConfig => ({
  ...config,
  colors: [...config.colors],
  scoreRules: { ...config.scoreRules },
});

export const createEmptyBoard = (size: number): Board =>
  Array.from({ length: size }, () => Array.from({ length: size }, () => null));

export const createTurnTimer = (
  config: GameConfig,
  now: number,
): TurnTimer | null => {
  if (config.turnTimeLimitSeconds === null) {
    return null;
  }

  return {
    startedAt: now,
    expiresAt: now + config.turnTimeLimitSeconds * 1_000,
  };
};

export const createInitialGame = (
  config: GameConfig = DEFAULT_GAME_CONFIG,
  options: CreateGameOptions = {},
): GameState => {
  const now = options.now ?? Date.now();
  const players = options.players ?? defaultPlayers();
  const firstPlayerId = options.firstPlayerId ?? players[0].id;

  if (!players.some((player) => player.id === firstPlayerId)) {
    throw new Error("The first player must be part of the game.");
  }

  return {
    id: options.id ?? `game-${now}`,
    status: "playing",
    mode: options.mode ?? "ai",
    board: createEmptyBoard(config.boardSize),
    players: players.map((player) => ({ ...player, score: 0 })) as [
      GamePlayer,
      GamePlayer,
    ],
    currentPlayerId: firstPlayerId,
    turnNumber: 1,
    winnerId: null,
    result: null,
    lastMove: null,
    turnTimer: createTurnTimer(config, now),
    config: cloneConfig(config),
  };
};

const isInsideBoard = (board: Board, position: Position): boolean =>
  position.row >= 0 &&
  position.col >= 0 &&
  position.row < board.length &&
  position.col < (board[position.row]?.length ?? 0);

const collectDirection = (
  board: Board,
  origin: Position,
  color: TileColorId,
  rowDelta: number,
  colDelta: number,
): Position[] => {
  const cells: Position[] = [];
  let row = origin.row + rowDelta;
  let col = origin.col + colDelta;

  while (board[row]?.[col] === color) {
    cells.push({ row, col });
    row += rowDelta;
    col += colDelta;
  }

  return cells;
};

export const findScoringLines = (
  board: Board,
  position: Position,
  color: TileColorId,
  scoreRules: Record<number, number> = DEFAULT_GAME_CONFIG.scoreRules,
): ScoringLine[] => {
  if (!isInsideBoard(board, position) || board[position.row]?.[position.col] !== color) {
    return [];
  }

  return DIRECTIONS.flatMap((direction) => {
    const before = collectDirection(
      board,
      position,
      color,
      -direction.row,
      -direction.col,
    ).reverse();
    const after = collectDirection(
      board,
      position,
      color,
      direction.row,
      direction.col,
    );
    const cells = [...before, position, ...after];
    const score = scoreRules[cells.length] ?? 0;

    if (cells.length < 3 || score === 0) {
      return [];
    }

    return [
      {
        color,
        length: cells.length,
        score,
        direction: direction.type,
        cells,
      },
    ];
  });
};

export const calculateScore = (lines: ScoringLine[]): number =>
  lines.reduce((total, line) => total + line.score, 0);

export const getCellsToRemove = (lines: ScoringLine[]): Position[] => {
  const cells = new Map<string, Position>();

  for (const line of lines) {
    for (const cell of line.cells) {
      cells.set(`${cell.row}:${cell.col}`, cell);
    }
  }

  return [...cells.values()];
};

export const removeCells = (board: Board, positions: Position[]): Board => {
  const nextBoard = board.map((row) => [...row]);

  for (const position of positions) {
    if (isInsideBoard(nextBoard, position)) {
      nextBoard[position.row]![position.col] = null;
    }
  }

  return nextBoard;
};

const getAllCells = (board: Board): Position[] =>
  board.flatMap((row, rowIndex) =>
    row.map((_cell, colIndex) => ({ row: rowIndex, col: colIndex })),
  );

const isBoardFull = (board: Board): boolean =>
  board.every((row) => row.every((cell) => cell !== null));

export const validateMove = (
  state: GameState,
  input: MoveInput,
): ValidationResult => {
  if (state.status === "finished") {
    return { valid: false, errorCode: "GAME_ALREADY_FINISHED" };
  }

  if (state.status !== "playing") {
    return { valid: false, errorCode: "GAME_NOT_PLAYING" };
  }

  if (state.currentPlayerId !== input.playerId) {
    return { valid: false, errorCode: "NOT_YOUR_TURN" };
  }

  const player = state.players.find((candidate) => candidate.id === input.playerId);
  if (player?.connectionStatus === "disconnected") {
    return { valid: false, errorCode: "PLAYER_DISCONNECTED" };
  }

  const createdAt = input.createdAt ?? Date.now();
  if (state.turnTimer !== null && createdAt >= state.turnTimer.expiresAt) {
    return { valid: false, errorCode: "TURN_TIME_EXPIRED" };
  }

  if (!isInsideBoard(state.board, input)) {
    return { valid: false, errorCode: "OUT_OF_BOUNDS" };
  }

  if (!state.config.colors.includes(input.color)) {
    return { valid: false, errorCode: "INVALID_COLOR" };
  }

  if (state.board[input.row]?.[input.col] !== null) {
    return { valid: false, errorCode: "CELL_NOT_EMPTY" };
  }

  return { valid: true };
};

const getOtherPlayer = (state: GameState, playerId: string): GamePlayer => {
  const player = state.players.find((candidate) => candidate.id !== playerId);
  if (player === undefined) {
    throw new Error("A two-player game requires an opposing player.");
  }
  return player;
};

export const expireTurn = (state: GameState, now = Date.now()): GameState => {
  if (
    state.status !== "playing" ||
    state.currentPlayerId === null ||
    state.turnTimer === null ||
    now < state.turnTimer.expiresAt
  ) {
    return state;
  }

  const winner = getOtherPlayer(state, state.currentPlayerId);
  return {
    ...state,
    status: "finished",
    currentPlayerId: null,
    winnerId: winner.id,
    result: "timeout",
    turnTimer: null,
  };
};

export const switchTurn = (state: GameState, now = Date.now()): GameState => {
  if (state.status !== "playing" || state.currentPlayerId === null) {
    return state;
  }

  const nextPlayer = getOtherPlayer(state, state.currentPlayerId);
  return {
    ...state,
    currentPlayerId: nextPlayer.id,
    turnNumber: state.turnNumber + 1,
    turnTimer: createTurnTimer(state.config, now),
  };
};

export const getValidMoves = (state: GameState): ValidMove[] => {
  if (state.status !== "playing") {
    return [];
  }

  const moves: ValidMove[] = [];
  state.board.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell === null) {
        for (const color of state.config.colors) {
          moves.push({ row: rowIndex, col: colIndex, color });
        }
      }
    });
  });
  return moves;
};

export const placeTile = (state: GameState, input: MoveInput): MoveResult => {
  const createdAt = input.createdAt ?? Date.now();
  const validation = validateMove(state, { ...input, createdAt });

  if (!validation.valid) {
    return {
      ok: false,
      state:
        validation.errorCode === "TURN_TIME_EXPIRED"
          ? expireTurn(state, createdAt)
          : state,
      errorCode: validation.errorCode ?? "GAME_NOT_PLAYING",
    };
  }

  const placedBoard = state.board.map((row) => [...row]);
  placedBoard[input.row]![input.col] = input.color;

  const scoringLines = findScoringLines(
    placedBoard,
    input,
    input.color,
    state.config.scoreRules,
  );
  const earnedScore = calculateScore(scoringLines);
  const scoringRemovedCells = getCellsToRemove(scoringLines);
  const shouldClearFullBoard = scoringRemovedCells.length === 0 && isBoardFull(placedBoard);
  const removedCells = shouldClearFullBoard
    ? getAllCells(placedBoard)
    : scoringRemovedCells;
  const nextBoard = removeCells(placedBoard, removedCells);
  const players = state.players.map((player) =>
    player.id === input.playerId
      ? { ...player, score: player.score + earnedScore }
      : { ...player },
  ) as [GamePlayer, GamePlayer];

  const move: Move = {
    playerId: input.playerId,
    row: input.row,
    col: input.col,
    color: input.color,
    scoringLines,
    earnedScore,
    removedCells,
    turnNumber: state.turnNumber,
    createdAt,
  };

  const scoredPlayer = players.find((player) => player.id === input.playerId);
  const reachedTarget = (scoredPlayer?.score ?? 0) >= state.config.targetScore;
  if (reachedTarget) {
    return {
      ok: true,
      move,
      state: {
        ...state,
        board: nextBoard,
        players,
        status: "finished",
        currentPlayerId: null,
        winnerId: input.playerId,
        result: "target-score",
        lastMove: move,
        turnTimer: null,
      },
    };
  }

  const nextPlayer = getOtherPlayer(state, input.playerId);
  return {
    ok: true,
    move,
    state: {
      ...state,
      board: nextBoard,
      players,
      currentPlayerId: nextPlayer.id,
      turnNumber: state.turnNumber + 1,
      lastMove: move,
      turnTimer: createTurnTimer(state.config, createdAt),
    },
  };
};

export const resignGame = (state: GameState, playerId: string): GameState => {
  if (state.status !== "playing") {
    return state;
  }

  const winner = getOtherPlayer(state, playerId);
  return {
    ...state,
    status: "finished",
    currentPlayerId: null,
    winnerId: winner.id,
    result: "resignation",
    turnTimer: null,
  };
};

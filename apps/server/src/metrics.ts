export class ServerMetrics {
  private readonly startedAt = Date.now();

  private activeSockets = 0;

  private queuedCasual = 0;

  private queuedRanked = 0;

  private roomsCreated = 0;

  private matchesStarted = 0;

  private movesAccepted = 0;

  private gamesFinished = 0;

  socketConnected(): void {
    this.activeSockets += 1;
  }

  socketDisconnected(): void {
    this.activeSockets = Math.max(0, this.activeSockets - 1);
  }

  setQueueDepth(mode: "casual" | "ranked", depth: number): void {
    if (mode === "casual") {
      this.queuedCasual = depth;
    } else {
      this.queuedRanked = depth;
    }
  }

  roomCreated(): void {
    this.roomsCreated += 1;
  }

  matchStarted(): void {
    this.matchesStarted += 1;
  }

  moveAccepted(): void {
    this.movesAccepted += 1;
  }

  gameFinished(): void {
    this.gamesFinished += 1;
  }

  renderPrometheus(): string {
    const uptimeSeconds = Math.floor((Date.now() - this.startedAt) / 1_000);
    return [
      "# HELP color_game_uptime_seconds Server uptime in seconds.",
      "# TYPE color_game_uptime_seconds gauge",
      `color_game_uptime_seconds ${uptimeSeconds}`,
      "# HELP color_game_active_sockets Active Socket.IO connections.",
      "# TYPE color_game_active_sockets gauge",
      `color_game_active_sockets ${this.activeSockets}`,
      "# HELP color_game_matchmaking_queue_depth Players waiting in matchmaking.",
      "# TYPE color_game_matchmaking_queue_depth gauge",
      `color_game_matchmaking_queue_depth{mode="casual"} ${this.queuedCasual}`,
      `color_game_matchmaking_queue_depth{mode="ranked"} ${this.queuedRanked}`,
      "# HELP color_game_rooms_created_total Created private rooms.",
      "# TYPE color_game_rooms_created_total counter",
      `color_game_rooms_created_total ${this.roomsCreated}`,
      "# HELP color_game_matches_started_total Started matched games.",
      "# TYPE color_game_matches_started_total counter",
      `color_game_matches_started_total ${this.matchesStarted}`,
      "# HELP color_game_moves_accepted_total Accepted moves.",
      "# TYPE color_game_moves_accepted_total counter",
      `color_game_moves_accepted_total ${this.movesAccepted}`,
      "# HELP color_game_games_finished_total Finished games.",
      "# TYPE color_game_games_finished_total counter",
      `color_game_games_finished_total ${this.gamesFinished}`,
      "",
    ].join("\n");
  }
}

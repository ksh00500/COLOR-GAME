export class DisconnectGracePeriod {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly delayMs: number,
    private readonly onExpired: (playerId: string) => void,
  ) {}

  schedule(playerId: string): void {
    this.cancel(playerId);
    const timer = setTimeout(() => {
      this.timers.delete(playerId);
      this.onExpired(playerId);
    }, this.delayMs);
    this.timers.set(playerId, timer);
  }

  cancel(playerId: string): void {
    const timer = this.timers.get(playerId);
    if (timer === undefined) return;
    clearTimeout(timer);
    this.timers.delete(playerId);
  }

  clear(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }
}

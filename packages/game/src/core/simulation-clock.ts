export interface ClockConfig {
  ticksPerSecond: number;
  maxCatchUpTicks: number;
}

export class SimulationClock {
  readonly tickDurationMs: number;
  private accumulatorMs = 0;
  private paused = false;
  tick = 0;

  constructor(private readonly config: ClockConfig) {
    if (!Number.isFinite(config.ticksPerSecond) || config.ticksPerSecond <= 0 ||
      !Number.isSafeInteger(config.maxCatchUpTicks) || config.maxCatchUpTicks <= 0) {
      throw new RangeError('Clock requires a positive tick rate and catch-up bound');
    }
    this.tickDurationMs = 1000 / config.ticksPerSecond;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  advance(elapsedMs: number, onTick: (tick: number) => void): number {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError('Invalid elapsed time');
    if (this.paused) return 0;
    this.accumulatorMs += elapsedMs;
    let executed = 0;
    while (this.accumulatorMs + Number.EPSILON >= this.tickDurationMs && executed < this.config.maxCatchUpTicks) {
      this.accumulatorMs -= this.tickDurationMs;
      onTick(++this.tick);
      executed++;
    }
    return executed;
  }
}

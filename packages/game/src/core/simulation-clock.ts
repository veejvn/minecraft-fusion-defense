export interface ClockConfig {
  ticksPerSecond: number;
  maxCatchUpTicks: number;
}

export class SimulationClock {
  readonly tickDurationMs: number;
  private accumulatorMs = 0;
  private paused = false;
  private readonly maxCatchUpTicks: number;
  tick = 0;

  constructor(config: ClockConfig) {
    if (!Number.isFinite(config.ticksPerSecond) || config.ticksPerSecond <= 0 ||
      !Number.isSafeInteger(config.maxCatchUpTicks) || config.maxCatchUpTicks <= 0) {
      throw new RangeError('Clock requires a positive tick rate and catch-up bound');
    }
    this.tickDurationMs = 1000 / config.ticksPerSecond;
    if (!Number.isFinite(this.tickDurationMs)) throw new RangeError('Tick duration is out of range');
    this.maxCatchUpTicks = config.maxCatchUpTicks;
  }

  get isPaused(): boolean { return this.paused; }
  get accumulator(): number { return this.accumulatorMs; }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  /** Restore clock tick, accumulator remainder, and pause state atomically. */
  restore(state: { tick: number; paused?: boolean; accumulatorMs?: number }): void {
    if (!Number.isSafeInteger(state.tick) || state.tick < 0) {
      throw new RangeError('Invalid clock tick');
    }
    const acc = state.accumulatorMs ?? 0;
    if (typeof acc !== 'number' || !Number.isFinite(acc) || acc < 0 || acc >= this.tickDurationMs) {
      throw new RangeError('Invalid clock accumulatorMs');
    }
    this.tick = state.tick;
    this.accumulatorMs = Object.is(acc, -0) ? 0 : acc;
    if (state.paused !== undefined) {
      this.paused = Boolean(state.paused);
    }
  }

  advance(elapsedMs: number, onTick: (tick: number) => void): number {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError('Invalid elapsed time');
    if (this.paused) return 0;
    const step = this.tickDurationMs;
    const fraction = elapsedMs % step;
    // The quotient after removing the remainder is integral up to rounding.
    let wholeTicks = Math.round((elapsedMs - fraction) / step);
    const untilNextTick = step - this.accumulatorMs;
    // Combine only fractions so even a very large finite delta cannot overflow
    // the accumulator or lose the previously retained remainder.
    if (fraction >= untilNextTick) {
      wholeTicks++;
      this.accumulatorMs = fraction - untilNextTick;
    } else {
      this.accumulatorMs += fraction;
      // Addition can round up to one full interval.
      if (this.accumulatorMs >= step) {
        wholeTicks++;
        this.accumulatorMs = 0;
      }
    }
    const plannedTicks = Math.min(wholeTicks, this.maxCatchUpTicks);
    if (!Number.isSafeInteger(this.tick + plannedTicks)) throw new RangeError('Tick counter is out of range');
    let executed = 0;
    while (!this.paused && executed < plannedTicks) {
      onTick(++this.tick);
      executed++;
    }
    return executed;
  }
}

export type WavePhaseStatus = 'pending' | 'spawning' | 'active' | 'between-waves' | 'completed';

export interface WaveState {
  currentWaveIndex: number | null;
  status: WavePhaseStatus;
  spawnedInCurrentWave: number;
  plannedInCurrentWave: number;
  readonly startedWaves: Set<number>;
  readonly completedWaves: Set<number>;
  readonly processedSpawns: Set<string>;
  terminal: 'victory' | 'defeat' | null;
}

export type WaveEvent =
  | { readonly type: 'wave-start'; readonly waveIndex: number }
  | {
      readonly type: 'wave-spawn';
      readonly waveIndex: number;
      readonly groupIndex: number;
      readonly spawnIndex: number;
    };

/** Create initial per-battle wave progression and idempotency tracking state. */
export function createWaveState(): WaveState {
  return {
    currentWaveIndex: null,
    status: 'pending',
    spawnedInCurrentWave: 0,
    plannedInCurrentWave: 0,
    startedWaves: new Set(),
    completedWaves: new Set(),
    processedSpawns: new Set(),
    terminal: null,
  };
}

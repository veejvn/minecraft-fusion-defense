import {
  deserializeBattleCheckpoint,
  serializeBattleCheckpoint,
  type CheckpointSemanticContext,
  type CheckpointTriggerReason,
  type DecodedBattleCheckpoint,
  type SerializeBattleCheckpointInput,
} from './snapshot-codec';
import {
  clearWithBackup,
  readWithBackupFallback,
  writeWithBackup,
  type PersistenceStorageAdapter,
} from './storage-adapter';

export const ACTIVE_BATTLE_STORAGE_KEY = 'mfd.active_battle.v1';
export const MAX_RAM_CHECKPOINTS = 3;

export interface CheckpointRecord {
  readonly checkpointId: string;
  readonly tick: number;
  readonly battleGeneration: number;
  readonly paused: boolean;
  readonly queueNextSequence: number;
  readonly reason: CheckpointTriggerReason;
  readonly checksum: string;
  readonly json: string;
}

export interface CheckpointManagerOptions {
  readonly storage?: PersistenceStorageAdapter;
  readonly storageKey?: string;
  readonly maxRamCheckpoints?: number;
}

export interface RecoveredCheckpointMatch {
  readonly record: CheckpointRecord | null;
  readonly decoded: DecodedBattleCheckpoint;
  readonly source: 'ram' | 'storage-primary' | 'storage-backup';
}

/**
 * Manages the 3-slot newest-first RAM checkpoint ring buffer (G04) and optional
 * crash-safe primary + `.bak` active-battle persistence.
 *
 * Note: G04's 16 MiB soft and 32 MiB hard figures are unbenchmarked design thresholds,
 * not measured runtime performance guarantees.
 */
export class CheckpointManager {
  private readonly storage?: PersistenceStorageAdapter;
  private readonly storageKey: string;
  private readonly maxRamCheckpoints: number;
  private ramBuffer: CheckpointRecord[] = [];

  constructor(options: CheckpointManagerOptions = {}) {
    const maxSlots = options.maxRamCheckpoints ?? MAX_RAM_CHECKPOINTS;
    if (!Number.isSafeInteger(maxSlots) || maxSlots < 1) {
      throw new RangeError('maxRamCheckpoints must be a positive safe integer');
    }
    const key = options.storageKey ?? ACTIVE_BATTLE_STORAGE_KEY;
    if (typeof key !== 'string' || !key.trim()) {
      throw new TypeError('storageKey must be a non-empty string');
    }
    this.storage = options.storage;
    this.storageKey = key;
    this.maxRamCheckpoints = maxSlots;
  }

  /**
   * Serialize, validate fail-closed, buffer newest-first in RAM (max 3), and optionally
   * persist to primary + `.bak` storage. Coalesces duplicate non-manual captures at the
   * exact same `(tick, queueNextSequence, paused, battleGeneration)` boundary.
   */
  acceptCheckpoint(
    input: SerializeBattleCheckpointInput,
    semanticCtx?: CheckpointSemanticContext,
  ): CheckpointRecord {
    const newest = this.ramBuffer[0];
    if (
      input.reason !== 'manual' &&
      newest &&
      newest.tick === input.tick &&
      newest.queueNextSequence === input.queue.nextSequence &&
      newest.paused === input.paused &&
      newest.battleGeneration === input.battleGeneration
    ) {
      return { ...newest };
    }

    const { envelope, json } = serializeBattleCheckpoint(input);
    // Validate fail-closed before admitting the checkpoint into RAM or storage.
    deserializeBattleCheckpoint(json, semanticCtx);

    const record: CheckpointRecord = {
      checkpointId: envelope.checkpointId,
      tick: envelope.tick,
      battleGeneration: envelope.battleGeneration,
      paused: envelope.paused,
      queueNextSequence: input.queue.nextSequence,
      reason: envelope.reason,
      checksum: envelope.checksum,
      json,
    };

    this.ramBuffer = [record, ...this.ramBuffer].slice(0, this.maxRamCheckpoints);

    if (this.storage) {
      writeWithBackup(this.storage, this.storageKey, json, raw => {
        try {
          deserializeBattleCheckpoint(raw, semanticCtx);
          return true;
        } catch {
          return false;
        }
      });
    }

    return { ...record };
  }

  /** Return shallow copies of buffered RAM checkpoints ordered newest-first. */
  getCheckpoints(): CheckpointRecord[] {
    return this.ramBuffer.map(record => ({ ...record }));
  }

  /**
   * Search newest-first through RAM checkpoints, falling back to storage primary + `.bak`,
   * and return the first checkpoint passing checksum and semantic validation.
   */
  findNewestValidCheckpoint(semanticCtx?: CheckpointSemanticContext): RecoveredCheckpointMatch | null {
    for (const record of this.ramBuffer) {
      try {
        const decoded = deserializeBattleCheckpoint(record.json, semanticCtx);
        return {
          record: { ...record },
          decoded,
          source: 'ram',
        };
      } catch {
        // Skip corrupted RAM entries and continue to older buffered checkpoints.
      }
    }

    const stored = this.loadFromStorage(semanticCtx);
    if (!stored) return null;
    return {
      record: null,
      decoded: stored.decoded,
      source: stored.source === 'primary' ? 'storage-primary' : 'storage-backup',
    };
  }

  /** Load and validate the active-battle checkpoint from storage with `.bak` fallback. */
  loadFromStorage(
    semanticCtx?: CheckpointSemanticContext,
  ): { readonly decoded: DecodedBattleCheckpoint; readonly source: 'primary' | 'backup' } | null {
    if (!this.storage) return null;
    const loaded = readWithBackupFallback(this.storage, this.storageKey, raw =>
      deserializeBattleCheckpoint(raw, semanticCtx),
    );
    if (!loaded) return null;
    return { decoded: loaded.value, source: loaded.source };
  }

  /**
   * Test-only seam to replace a buffered RAM checkpoint JSON string for recovery verification
   * (e.g., G05 AC-07 fallback when the newest buffered entry is corrupted).
   */
  tamperRamJson(index: number, rawJson: string): void {
    if (!Number.isSafeInteger(index) || index < 0 || index >= this.ramBuffer.length) {
      throw new RangeError(`Checkpoint buffer index out of range: ${index}`);
    }
    this.ramBuffer[index] = {
      ...this.ramBuffer[index],
      json: rawJson,
    };
  }

  /** Clear primary and `.bak` active-battle entries from persistent storage. */
  clearPersistentSave(): void {
    if (!this.storage) return;
    clearWithBackup(this.storage, this.storageKey);
  }

  /** Clear the in-RAM checkpoint ring buffer. */
  clearRamCheckpoints(): void {
    this.ramBuffer = [];
  }
}

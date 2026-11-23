/** Pluggable synchronous key-value storage contract for persistence modules. */
export interface PersistenceStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Headless Map-backed storage adapter for deterministic tests and non-browser environments. */
export class InMemoryStorageAdapter implements PersistenceStorageAdapter {
  private readonly entries = new Map<string, string>();

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  getRawEntries(): ReadonlyArray<readonly [string, string]> {
    return Array.from(this.entries.entries());
  }

  clear(): void {
    this.entries.clear();
  }
}

interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function resolveLocalStorage(): WebStorageLike | null {
  try {
    const candidate = (globalThis as { localStorage?: WebStorageLike }).localStorage;
    if (!candidate || typeof candidate.getItem !== 'function' || typeof candidate.setItem !== 'function') {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
}

/** Browser localStorage adapter with defensive access and explicit write errors. */
export class BrowserLocalStorageAdapter implements PersistenceStorageAdapter {
  getItem(key: string): string | null {
    const storage = resolveLocalStorage();
    if (!storage) return null;
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    const storage = resolveLocalStorage();
    if (!storage) {
      throw new Error('Browser localStorage is unavailable');
    }
    try {
      storage.setItem(key, value);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to write localStorage key "${key}": ${reason}`);
    }
  }

  removeItem(key: string): void {
    const storage = resolveLocalStorage();
    if (!storage) return;
    try {
      storage.removeItem(key);
    } catch {
      // Ignore cleanup failures when storage is restricted or unavailable.
    }
  }
}

/** Return the backup storage key associated with a primary persistence key. */
export function backupKey(key: string): string {
  return `${key}.bak`;
}

/**
 * Persist a validated payload while rotating the previous valid primary entry into `.bak`.
 * Avoids overwriting the backup slot with a corrupted primary entry.
 */
export function writeWithBackup(
  storage: PersistenceStorageAdapter,
  key: string,
  nextJson: string,
  isValidJson: (raw: string) => boolean,
): void {
  const existing = storage.getItem(key);
  if (existing !== null && isValidJson(existing)) {
    storage.setItem(backupKey(key), existing);
  }
  storage.setItem(key, nextJson);
}

/** Result returned when loading from primary or backup storage succeeds. */
export interface ReadWithBackupResult<T> {
  readonly value: T;
  readonly source: 'primary' | 'backup';
}

/**
 * Read and validate the primary entry, falling back to `.bak` when primary is missing or invalid.
 * Returns `null` if neither primary nor backup exists and passes validation.
 */
export function readWithBackupFallback<T>(
  storage: PersistenceStorageAdapter,
  key: string,
  parseAndValidate: (raw: string) => T,
): ReadWithBackupResult<T> | null {
  const primary = storage.getItem(key);
  if (primary !== null) {
    try {
      return { value: parseAndValidate(primary), source: 'primary' };
    } catch {
      // Fall through to backup slot when primary is corrupted or fails validation.
    }
  }

  const backup = storage.getItem(backupKey(key));
  if (backup !== null) {
    try {
      return { value: parseAndValidate(backup), source: 'backup' };
    } catch {
      return null;
    }
  }

  return null;
}

/** Return true if either the primary key or its `.bak` key has a stored value. */
export function hasAnyStoredEntry(storage: PersistenceStorageAdapter, key: string): boolean {
  return storage.getItem(key) !== null || storage.getItem(backupKey(key)) !== null;
}

/** Remove both primary and `.bak` entries for the given persistence key. */
export function clearWithBackup(storage: PersistenceStorageAdapter, key: string): void {
  storage.removeItem(key);
  storage.removeItem(backupKey(key));
}

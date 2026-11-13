type Mode = 'owned' | 'failed' | 'free';

const scenario = new URLSearchParams(window.location.search).get('hardening');
let mode: Mode = scenario === 'owned' || scenario === 'stalled'
  ? 'owned'
  : 'free';
let attempts = 0;
let created = 0;
let destroyed = 0;

if (scenario === 'stalled') {
  // Mirrors the production adapter's failure report after its 5-second watchdog.
  window.setTimeout(() => { mode = 'failed'; }, 5_000);
}

export function setMode(next: Mode): void {
  mode = next;
}

export function getState() {
  return { mode, attempts, created, destroyed };
}

export function createGame(host: HTMLElement) {
  attempts++;
  if (mode !== 'free') {
    const error = new Error(mode === 'owned' ? 'Phaser host is still owned' : 'Previous Phaser cleanup could not be confirmed');
    error.name = mode === 'owned' ? 'HostOwnedError' : 'HostCleanupError';
    throw error;
  }
  created++;
  const canvas = document.createElement('canvas');
  host.append(canvas);
  let disposed = false;
  return {
    game: {} as never,
    ready: Promise.resolve(),
    destroy() {
      if (disposed) return;
      disposed = true;
      destroyed++;
      canvas.remove();
    },
  };
}

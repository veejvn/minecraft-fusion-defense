"use client";

import { useEffect, useRef, useState } from 'react';
import type { GameHandle } from '@mfd/game';

type Status = 'loading' | 'ready' | 'error';
const MAX_OWNED_WAIT_MS = 6_000;

export function PhaserHost() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let retryTimer: number | undefined;
    let firstOwnedAt: number | undefined;
    let retryDelayMs = 50;
    let handle: GameHandle | undefined;

    const showError = (error: unknown) => {
      if (cancelled) return;
      console.error('Failed to initialize Phaser:', error);
      setStatus('error');
    };

    void import('@mfd/game').then(({ createGame }) => {
      if (cancelled) return;

      const create = () => {
        if (cancelled) return;
        try {
          handle = createGame(host);
          void handle.ready.then(
            () => { if (!cancelled) setStatus('ready'); },
            showError,
          );
        } catch (error) {
          if (error instanceof Error && error.name === 'HostOwnedError') {
            firstOwnedAt ??= Date.now();
            if (Date.now() - firstOwnedAt >= MAX_OWNED_WAIT_MS) {
              // This reports a stuck host; it never releases ownership.
              showError(new Error('Phaser host ownership did not clear'));
              return;
            }
            // Timers remain available when animation frames are suspended.
            // Only verified adapter cleanup can make the next creation succeed.
            retryTimer = window.setTimeout(create, retryDelayMs);
            retryDelayMs = Math.min(retryDelayMs * 2, 500);
            return;
          }
          showError(error);
        }
      };

      create();
    }, showError);

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      if (handle) {
        try { handle.destroy(); } catch (error) { console.error('Phaser destroy request failed:', error); }
      }
    };
  }, []);

  return (
    <section style={{ width: '100%', maxWidth: 1280, marginInline: 'auto' }}>
      <div
        ref={hostRef}
        aria-label="Phaser game"
        style={{ width: '100%', aspectRatio: '16 / 9', marginInline: 'auto' }}
      />
      {status === 'loading' && <p role="status">Loading Phaser...</p>}
      {status === 'error' && <p role="alert">Failed to initialize Phaser.</p>}
    </section>
  );
}

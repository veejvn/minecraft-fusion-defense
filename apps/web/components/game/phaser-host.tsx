"use client";

import { useEffect, useRef, useState } from 'react';
import type { GameHandle } from '@mfd/game';

type Status = 'loading' | 'ready' | 'error';

export function PhaserHost() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let retryFrame = 0;
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
            // Retry only while the adapter still owns this host. A frame is a
            // scheduling opportunity, never proof that cleanup succeeded.
            retryFrame = requestAnimationFrame(create);
            return;
          }
          showError(error);
        }
      };

      create();
    }, showError);

    return () => {
      cancelled = true;
      cancelAnimationFrame(retryFrame);
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

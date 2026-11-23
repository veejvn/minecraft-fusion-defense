'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  CampaignController,
  CampaignGameHandle,
  CampaignSnapshot,
  CampaignTool,
  CampaignVisualStyle,
} from '@mfd/game';

type HostStatus = 'loading' | 'ready' | 'error';
const MAX_OWNED_WAIT_MS = 6_000;

interface CampaignHostProps {
  readonly controller: CampaignController;
  readonly activeTool: CampaignTool;
  readonly visualStyle: CampaignVisualStyle;
  readonly showGridCoords: boolean;
  readonly onSnapshot: (snapshot: CampaignSnapshot) => void;
}

export function CampaignHost({
  controller,
  activeTool,
  visualStyle,
  showGridCoords,
  onSnapshot,
}: CampaignHostProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<CampaignGameHandle | null>(null);
  const [status, setStatus] = useState<HostStatus>('loading');

  useEffect(() => {
    const unsub = controller.subscribe(onSnapshot);
    onSnapshot(controller.getSnapshot());
    return unsub;
  }, [controller, onSnapshot]);

  useEffect(() => {
    handleRef.current?.setTool(activeTool);
  }, [activeTool]);

  useEffect(() => {
    handleRef.current?.setVisualStyle(visualStyle);
  }, [visualStyle]);

  useEffect(() => {
    handleRef.current?.setShowGridCoords(showGridCoords);
  }, [showGridCoords]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let retryTimer: number | undefined;
    let firstOwnedAt: number | undefined;
    let retryDelayMs = 50;
    let handle: CampaignGameHandle | undefined;

    const showError = (error: unknown) => {
      if (cancelled) return;
      console.error('Failed to initialize Campaign Phaser Scene:', error);
      setStatus('error');
    };

    const handleBeforeUnload = () => {
      controller.saveCheckpointNow('manual');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    void import('@mfd/game').then(({ createCampaignGame }) => {
      if (cancelled) return;

      const mountGame = () => {
        if (cancelled) return;
        try {
          handle = createCampaignGame(host, controller);
          handleRef.current = handle;
          handle.setTool(activeTool);
          handle.setVisualStyle(visualStyle);
          handle.setShowGridCoords(showGridCoords);
          void handle.ready.then(
            () => {
              if (!cancelled) setStatus('ready');
            },
            showError,
          );
        } catch (error) {
          if (error instanceof Error && error.name === 'HostOwnedError') {
            firstOwnedAt ??= Date.now();
            if (Date.now() - firstOwnedAt >= MAX_OWNED_WAIT_MS) {
              showError(new Error('Phaser host ownership did not clear'));
              return;
            }
            retryTimer = window.setTimeout(mountGame, retryDelayMs);
            retryDelayMs = Math.min(retryDelayMs * 2, 500);
            return;
          }
          showError(error);
        }
      };

      mountGame();
    }, showError);

    return () => {
      cancelled = true;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.clearTimeout(retryTimer);
      handleRef.current = null;
      if (handle) {
        try {
          handle.destroy();
        } catch (error) {
          console.error('Phaser destroy request failed:', error);
        }
      }
    };
  }, [controller]);

  return (
    <div style={{ width: '100%', maxWidth: 1280, marginInline: 'auto', position: 'relative' }}>
      <div
        ref={hostRef}
        aria-label="Grassland 5x9 Battlefield"
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          borderRadius: 10,
          overflow: 'hidden',
          border: '3px solid #334155',
          background: '#0f172a',
        }}
      />
      {status === 'loading' && (
        <p role="status" style={{ textAlign: 'center', color: '#94A3B8', marginTop: 8 }}>
          Loading Grassland Battlefield...
        </p>
      )}
      {status === 'error' && (
        <p role="alert" style={{ textAlign: 'center', color: '#F87171', marginTop: 8 }}>
          Failed to initialize Phaser battlefield.
        </p>
      )}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import type { MvpCampaignLevelData } from '@mfd/game-data';
import type {
  PlaytestController,
  PlaytestGameHandle,
  PlaytestHudSnapshot,
  PlaytestSpeed,
  PlaytestTool,
} from '@mfd/game';

interface EditorTestPlayModalProps {
  readonly stage: MvpCampaignLevelData;
  readonly initialStartWaveIndex: number;
  readonly onClose: () => void;
}

const MAX_OWNED_WAIT_MS = 6_000;
const SPEED_OPTIONS: readonly PlaytestSpeed[] = [1, 2, 4, 0.5];

export function EditorTestPlayModal({
  stage,
  initialStartWaveIndex,
  onClose,
}: EditorTestPlayModalProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<PlaytestGameHandle | null>(null);
  const controllerRef = useRef<PlaytestController | null>(null);

  const [startWaveIndex, setStartWaveIndex] = useState<number>(initialStartWaveIndex);
  const [testEmeralds, setTestEmeralds] = useState<number>(stage.initialEmeralds);
  const [restartCounter, setRestartCounter] = useState<number>(0);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [snapshot, setSnapshot] = useState<PlaytestHudSnapshot | null>(null);
  const [tool, setTool] = useState<PlaytestTool>({ kind: 'select' });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let retryTimer: number | undefined;
    let firstOwnedAt: number | undefined;
    let retryDelayMs = 50;
    let handle: PlaytestGameHandle | undefined;
    let unsubscribe: (() => void) | undefined;

    setStatus('loading');

    const showError = (error: unknown) => {
      if (cancelled) return;
      console.error('Failed to launch Editor Test Play:', error);
      setStatus('error');
    };

    void import('@mfd/game').then(mod => {
      if (cancelled) return;

      const preset = mod.createPlaytestPresetFromLevel(stage, {
        startWaveIndex,
        overrideInitialEmeralds: testEmeralds,
      });

      const create = () => {
        if (cancelled) return;
        try {
          handle = mod.createPlaytestGame(host, {
            preset,
            mode: 'five-waves',
            showAuxLanes: true,
            allowMultiLaneWaves: true,
            onToolChange: nextTool => {
              if (!cancelled) setTool(nextTool);
            },
          });
          handleRef.current = handle;
          controllerRef.current = handle.controller;
          handle.setTool({ kind: 'select' });
          handle.setVisualStyle('pixel-art');
          setSnapshot(handle.controller.getSnapshot());

          unsubscribe = handle.controller.subscribe(next => {
            if (!cancelled) setSnapshot(next);
          });

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
      unsubscribe?.();
      handleRef.current = null;
      controllerRef.current = null;
      if (handle) {
        try {
          handle.destroy();
        } catch (err) {
          console.error('Failed to destroy Editor Test Play Phaser handle:', err);
        }
      }
    };
  }, [stage, startWaveIndex, testEmeralds, restartCounter]);

  const applyTool = (nextTool: PlaytestTool) => {
    setTool(nextTool);
    handleRef.current?.setTool(nextTool);
  };

  const controller = controllerRef.current;

  const cycleSpeed = () => {
    if (!controller || !snapshot) return;
    const idx = SPEED_OPTIONS.indexOf(snapshot.speedMultiplier);
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length] ?? 1;
    controller.setSpeed(next);
  };

  return (
    <div
      className="mfd-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Stage Test Play"
      style={{ zIndex: 70, padding: 14 }}
    >
      <div
        className="mfd-card"
        style={{
          width: 'min(1260px, 98vw)',
          maxHeight: '96vh',
          overflowY: 'auto',
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          borderColor: '#38bdf8',
        }}
      >
        {/* Top Control Strip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="mfd-badge mfd-badge-unlocked">TEST PLAY: {stage.name}</span>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ color: '#94A3B8' }}>Start Wave:</span>
              <select
                value={startWaveIndex}
                onChange={e => setStartWaveIndex(Number(e.target.value) || 0)}
                style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '4px 8px' }}
              >
                {stage.waves.map((w, idx) => (
                  <option key={w.id} value={idx}>
                    Wave {idx + 1} ({w.spawnGroups.reduce((s, g) => s + g.count, 0)} enemies)
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ color: '#94A3B8' }}>Test EM:</span>
              <input
                type="number"
                min={0}
                max={99999}
                step={50}
                value={testEmeralds}
                onChange={e => setTestEmeralds(Math.max(0, Number(e.target.value) || 0))}
                style={{ width: 84, background: '#0f172a', color: '#A7F3D0', border: '1px solid #475569', borderRadius: 6, padding: '4px 8px' }}
              />
            </label>

            <button
              type="button"
              className="mfd-btn mfd-btn-primary"
              style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={() => setRestartCounter(c => c + 1)}
            >
              ↻ Restart Test
            </button>
          </div>

          <button
            type="button"
            className="mfd-btn mfd-btn-danger"
            style={{ padding: '5px 12px', fontSize: 12 }}
            onClick={onClose}
          >
            ✕ Back to Editor
          </button>
        </div>

        {/* Live Match HUD Strip */}
        {snapshot && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 8,
              padding: '6px 10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ color: '#A7F3D0', fontSize: 13 }}>EM: {snapshot.energy}</strong>
              <strong style={{ color: '#7DD3FC', fontSize: 13 }}>
                Crystals: {snapshot.crystals}/{snapshot.maxCrystals}
              </strong>
              <span style={{ fontSize: 12, color: '#CBD5E1' }}>
                Wave {(snapshot.currentWaveIndex ?? 0) + 1}/{snapshot.totalWaves}
              </span>
              {snapshot.terminal && (
                <span
                  className="mfd-badge"
                  style={{
                    background: snapshot.terminal === 'victory' ? '#15803d' : '#991b1b',
                    color: '#fff',
                  }}
                >
                  {snapshot.terminal.toUpperCase()}
                </span>
              )}
              <button
                type="button"
                className="mfd-btn"
                style={{ padding: '3px 8px', fontSize: 11 }}
                onClick={() => controller?.grantEnergy()}
              >
                +500 EM
              </button>
              <button
                type="button"
                className="mfd-btn"
                style={{ padding: '3px 8px', fontSize: 11 }}
                onClick={() => controller?.grantCrystals()}
              >
                +5 Crystals
              </button>
              {snapshot.villageChest.enabled && snapshot.villageChest.ready && (
                <button
                  type="button"
                  className="mfd-btn mfd-btn-gold"
                  style={{ padding: '3px 8px', fontSize: 11 }}
                  onClick={() => controller?.claimVillageChest()}
                >
                  Open Chest (+{snapshot.villageChest.amount} EM)
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {snapshot.baseDefenderCards.map(card => {
                const selected = tool.kind === 'place' && tool.definitionId === card.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    className="mfd-btn"
                    disabled={!card.unlocked}
                    onClick={() =>
                      applyTool(
                        selected
                          ? { kind: 'select' }
                          : { kind: 'place', definitionId: card.id, freeSandbox: false },
                      )
                    }
                    style={{
                      padding: '3px 7px',
                      fontSize: 11,
                      borderColor: selected ? '#facc15' : card.unlocked ? '#4ade80' : '#475569',
                      opacity: card.unlocked ? 1 : 0.4,
                    }}
                    title={card.unlocked ? `${card.name} (${card.cost} EM)` : card.requirement}
                  >
                    {card.name} ({card.cost})
                  </button>
                );
              })}
              <button
                type="button"
                className="mfd-btn"
                style={{
                  padding: '3px 7px',
                  fontSize: 11,
                  borderColor: tool.kind === 'glove' ? '#facc15' : '#38bdf8',
                }}
                onClick={() => applyTool(tool.kind === 'glove' ? { kind: 'select' } : { kind: 'glove' })}
              >
                Glove
              </button>
              <button
                type="button"
                className="mfd-btn"
                style={{
                  padding: '3px 7px',
                  fontSize: 11,
                  borderColor: tool.kind === 'shovel' ? '#f87171' : '#64748b',
                }}
                onClick={() => applyTool(tool.kind === 'shovel' ? { kind: 'select' } : { kind: 'shovel' })}
              >
                Shovel
              </button>
              <button
                type="button"
                className="mfd-btn"
                style={{
                  padding: '3px 7px',
                  fontSize: 11,
                  borderColor: tool.kind === 'crystal' ? '#38bdf8' : '#64748b',
                }}
                onClick={() => applyTool(tool.kind === 'crystal' ? { kind: 'select' } : { kind: 'crystal' })}
              >
                Cast Crystal
              </button>
              <button
                type="button"
                className="mfd-btn"
                style={{ padding: '3px 8px', fontSize: 11 }}
                onClick={cycleSpeed}
              >
                {snapshot.speedMultiplier}x
              </button>
              <button
                type="button"
                className="mfd-btn mfd-btn-gold"
                style={{ padding: '3px 8px', fontSize: 11 }}
                onClick={() => controller?.setPaused(!snapshot.paused)}
              >
                {snapshot.paused ? 'Resume' : 'Pause'}
              </button>
            </div>
          </div>
        )}

        {/* Phaser Battlefield Host */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 9',
            maxHeight: '62vh',
            background: '#0F172A',
            borderRadius: 10,
            overflow: 'hidden',
            border: '2px solid #334155',
          }}
        >
          <div ref={hostRef} style={{ width: '100%', height: '100%' }} />
          {status !== 'ready' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(15, 23, 42, 0.85)',
                color: status === 'error' ? '#F87171' : '#E2E8F0',
                fontSize: 14,
              }}
            >
              {status === 'error' ? 'Failed to mount Test Play runtime.' : 'Loading Test Play arena...'}
            </div>
          )}
        </div>

        {/* Recent Events */}
        {snapshot && snapshot.eventLog.length > 0 && (
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 11,
              color: '#CBD5E1',
              display: 'flex',
              gap: 12,
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            {snapshot.eventLog.slice(-4).map(entry => (
              <span key={entry.id}>
                [T{entry.tick}] {entry.message}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

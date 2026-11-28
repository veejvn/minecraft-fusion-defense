'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  CampaignDefenderCatalogItem,
  CampaignGameHandle,
  CampaignSnapshot,
  CampaignSpeed,
  CampaignTool,
  ExternalDragPayload,
} from '@mfd/game';
import { toggleLandscapeFullscreen } from '../layout/mobile-landscape-guard';

interface HudDragGesture {
  readonly payload: ExternalDragPayload;
  readonly spriteUrl?: string;
  readonly svgKind?: 'glove' | 'shovel';
  readonly label: string;
  readonly startX: number;
  readonly startY: number;
  readonly currentX: number;
  readonly currentY: number;
  readonly active: boolean;
  readonly pointerId: number;
}

const DRAG_ACTIVATION_PX = 8;
const USE_GENERATED_TOOL_PNGS = true;

function PixelToolIcon({ kind, size = 28 }: { readonly kind: 'glove' | 'shovel'; readonly size?: number }) {
  if (USE_GENERATED_TOOL_PNGS) {
    const src =
      kind === 'glove'
        ? '/assets/sprites/items/fusion_glove.png'
        : '/assets/sprites/items/shovel.png';
    return (
      <img
        src={src}
        alt={kind === 'glove' ? 'Fusion Glove' : 'Shovel'}
        width={size}
        height={size}
        draggable={false}
        className="mfd-pixel"
      />
    );
  }
  if (kind === 'glove') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <rect x="4" y="2" width="2" height="6" fill="#FACC15" />
        <rect x="6" y="1" width="2" height="7" fill="#FDE047" />
        <rect x="8" y="2" width="2" height="6" fill="#FACC15" />
        <rect x="10" y="3" width="2" height="5" fill="#EAB308" />
        <rect x="2" y="6" width="2" height="4" fill="#FDE047" />
        <rect x="4" y="7" width="8" height="4" fill="#CA8A04" />
        <rect x="4" y="11" width="7" height="3" fill="#38BDF8" />
        <rect x="6" y="8" width="4" height="2" fill="#7DD3FC" />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x="10" y="1" width="5" height="5" fill="#CBD5E1" />
      <rect x="11" y="2" width="3" height="3" fill="#F8FAFC" />
      <rect x="8" y="5" width="3" height="3" fill="#94A3B8" />
      <rect x="6" y="7" width="3" height="3" fill="#92400E" />
      <rect x="4" y="9" width="3" height="3" fill="#B45309" />
      <rect x="2" y="11" width="3" height="3" fill="#78350F" />
      <rect x="1" y="12" width="2" height="3" fill="#475569" />
    </svg>
  );
}

interface BattleHudOverlayProps {
  readonly snapshot: CampaignSnapshot;
  readonly activeTool: CampaignTool;
  readonly battleHandle: CampaignGameHandle | null;
  readonly defenderCatalog: readonly CampaignDefenderCatalogItem[];
  readonly onSelectTool: (tool: CampaignTool) => void;
  readonly onClaimPending: () => void;
  readonly onTogglePause: () => void;
  readonly onSetSpeed: (speed: CampaignSpeed) => void;
  readonly onOpenHowToPlay: () => void;
  readonly onRestartBattle: () => void;
  readonly onSaveAndExit: () => void;
  readonly onReturnToMenuTerminal: () => void;
}

export function BattleHudOverlay({
  snapshot,
  activeTool,
  battleHandle,
  defenderCatalog,
  onSelectTool,
  onClaimPending,
  onTogglePause,
  onSetSpeed,
  onOpenHowToPlay,
  onRestartBattle,
  onSaveAndExit,
  onReturnToMenuTerminal,
}: BattleHudOverlayProps) {
  const catalogById = new Map(defenderCatalog.map(d => [d.id, d]));
  const [dragGesture, setDragGesture] = useState<HudDragGesture | null>(null);
  const dragRef = useRef<HudDragGesture | null>(null);
  const suppressNextClickRef = useRef(false);

  useEffect(() => {
    dragRef.current = dragGesture;
  }, [dragGesture]);

  useEffect(() => {
    if (!dragGesture) return;

    const handlePointerMove = (e: PointerEvent) => {
      const current = dragRef.current;
      if (!current || e.pointerId !== current.pointerId) return;
      const dist = Math.hypot(e.clientX - current.startX, e.clientY - current.startY);
      const nowActive = current.active || dist >= DRAG_ACTIVATION_PX;
      const updated: HudDragGesture = {
        ...current,
        currentX: e.clientX,
        currentY: e.clientY,
        active: nowActive,
      };
      dragRef.current = updated;
      setDragGesture(updated);
      if (nowActive) {
        battleHandle?.setExternalDragAtClientPoint(current.payload, e.clientX, e.clientY);
      }
    };

    const finishDrag = (e: PointerEvent, isDrop: boolean) => {
      const current = dragRef.current;
      if (!current || e.pointerId !== current.pointerId) return;
      dragRef.current = null;
      setDragGesture(null);
      if (current.active) {
        suppressNextClickRef.current = true;
        window.setTimeout(() => {
          suppressNextClickRef.current = false;
        }, 0);
        if (isDrop) {
          battleHandle?.dropExternalDragAtClientPoint(current.payload, e.clientX, e.clientY);
        } else {
          battleHandle?.setExternalDragAtClientPoint(null, e.clientX, e.clientY);
        }
      }
    };

    const onUp = (e: PointerEvent) => finishDrag(e, true);
    const onCancel = (e: PointerEvent) => finishDrag(e, false);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [Boolean(dragGesture), battleHandle]);

  const startHudDrag = (
    e: React.PointerEvent<HTMLButtonElement>,
    payload: ExternalDragPayload,
    spriteUrl: string | undefined,
    label: string,
    svgKind?: 'glove' | 'shovel',
  ) => {
    if (e.button !== 0 || snapshot.status !== 'playing') return;
    suppressNextClickRef.current = false;
    const initial: HudDragGesture = {
      payload,
      spriteUrl,
      svgKind,
      label,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      active: false,
      pointerId: e.pointerId,
    };
    dragRef.current = initial;
    setDragGesture(initial);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Top Tactical HUD Bar */}
      <div
        className="mfd-card mfd-hud-bar"
        style={{
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {/* Resources: Energy & Power Crystal */}
        <div className="mfd-hud-resource-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            className="mfd-hud-resource"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#0f172a',
              border: '2px solid #ca8a04',
              borderRadius: 8,
              padding: '4px 8px',
            }}
            title="Emeralds used to summon Base Defenders"
          >
            <img src="/assets/sprites/items/emerald.png" alt="Emeralds" width={22} height={22} className="mfd-pixel" />
            <div>
              <div className="mfd-hud-label" style={{ fontSize: 9, color: '#6EE7B7', fontWeight: 700, lineHeight: 1.1 }}>
                EMERALDS
              </div>
              <div className="mfd-hud-value" style={{ fontSize: 14, fontWeight: 700, color: '#A7F3D0', lineHeight: 1.1 }}>
                {snapshot.energy}
              </div>
            </div>
          </div>

          <button
            type="button"
            className={`mfd-btn mfd-hud-crystal ${activeTool.kind === 'crystal' ? 'mfd-btn-crystal' : ''}`}
            style={{ padding: '3px 7px', touchAction: 'none', userSelect: 'none' }}
            disabled={snapshot.crystals < 1 || snapshot.status !== 'playing'}
            aria-label={`Power Crystals (${snapshot.crystals} of ${snapshot.maxCrystals})`}
            onPointerDown={e => {
              if (snapshot.crystals >= 1) {
                startHudDrag(e, { kind: 'crystal' }, '/assets/sprites/items/power_crystal.png', 'Power Crystal');
              }
            }}
            onClick={() => {
              if (suppressNextClickRef.current) {
                suppressNextClickRef.current = false;
                return;
              }
              onSelectTool(activeTool.kind === 'crystal' ? { kind: 'select' } : { kind: 'crystal' });
            }}
            title="Click or drag onto a Defender to cast its Special Ability (1 Crystal, 0s cooldown)"
          >
            <img src="/assets/sprites/items/power_crystal.png" alt="Crystal" width={24} height={24} className="mfd-pixel" />
            <div style={{ textAlign: 'left' }}>
              <div className="mfd-hud-label" style={{ fontSize: 9, color: '#BAE6FD', lineHeight: 1.1 }}>
                CRYSTALS
              </div>
              <div className="mfd-hud-value" style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.1 }}>
                {snapshot.crystals} / {snapshot.maxCrystals}
              </div>
            </div>
          </button>

          {snapshot.pendingWaveCrystals > 0 && (
            <button
              type="button"
              className="mfd-btn mfd-btn-gold mfd-hud-pending-crystal"
              style={{ padding: '5px 8px', fontSize: 12 }}
              disabled={snapshot.crystals >= snapshot.maxCrystals || snapshot.status !== 'playing'}
              onClick={onClaimPending}
              aria-label={`Claim ${snapshot.pendingWaveCrystals} pending Crystal`}
              title="Claim pending Wave Reward Power Crystals once storage has room"
            >
              +{snapshot.pendingWaveCrystals} Crystal
            </button>
          )}
        </div>

        {/* Base Defender Selection & Drag Bar + Glove & Shovel */}
        <div className="mfd-hud-cards-group" style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          {snapshot.baseDefenderCards.map(card => {
            const selected = activeTool.kind === 'place' && activeTool.definitionId === card.id;
            const unavailable = !card.unlocked || !card.canAfford || card.onCooldown || snapshot.status !== 'playing';
            const statusText = !card.unlocked
              ? card.requirement === 'Restricted in this stage'
                ? 'Banned'
                : 'Locked'
              : card.onCooldown
                ? `Cooldown ${card.cooldownRemainingSeconds.toFixed(1)}s`
                : `${card.cost} EM`;
            return (
              <button
                key={card.id}
                type="button"
                className="mfd-btn mfd-defender-card"
                disabled={!card.unlocked || card.onCooldown || snapshot.status !== 'playing'}
                aria-label={`${card.name} (${statusText})`}
                onPointerDown={e => {
                  if (card.unlocked && card.canAfford && !card.onCooldown) {
                    startHudDrag(e, { kind: 'place', definitionId: card.id }, card.spriteUrl, card.name);
                  }
                }}
                onClick={() => {
                  if (suppressNextClickRef.current) {
                    suppressNextClickRef.current = false;
                    return;
                  }
                  if (!card.unlocked || card.onCooldown) return;
                  onSelectTool(selected ? { kind: 'select' } : { kind: 'place', definitionId: card.id });
                }}
                style={{
                  padding: '3px 6px',
                  borderColor: selected
                    ? '#facc15'
                    : card.unlocked && card.canAfford && !card.onCooldown
                      ? '#4ade80'
                      : '#475569',
                  background: selected ? 'rgba(202, 138, 4, 0.25)' : '#0f172a',
                  opacity: card.unlocked ? (unavailable && !selected ? 0.78 : 1) : 0.45,
                }}
                title={
                  card.unlocked
                    ? `${card.name} (${card.cost} EM, ${card.cooldownTotalSeconds}s CD) — ${card.abilityName}. Click or drag onto empty cell or compatible Defender to Fuse.`
                    : `Locked: ${card.requirement}`
                }
              >
                {card.onCooldown && (
                  <>
                    <div className="mfd-cd-curtain" style={{ height: `${card.cooldownProgressPct}%` }} />
                    <div className="mfd-cd-badge">{card.cooldownRemainingSeconds.toFixed(1)}s</div>
                  </>
                )}
                <img
                  src={card.spriteUrl}
                  alt={card.name}
                  width={28}
                  height={28}
                  draggable={false}
                  className="mfd-pixel"
                  style={{ filter: card.unlocked ? 'none' : 'grayscale(100%)' }}
                />
                <div className="mfd-hud-card-meta" style={{ textAlign: 'left' }}>
                  <div className="mfd-hud-card-name" style={{ fontSize: 11, fontWeight: 700, color: '#F8FAFC', lineHeight: 1.15 }}>
                    {card.name}
                  </div>
                  <div
                    className="mfd-hud-card-cost"
                    style={{
                      fontSize: 10,
                      lineHeight: 1.15,
                      color: !card.unlocked
                        ? '#94A3B8'
                        : card.onCooldown
                          ? '#FACC15'
                          : card.canAfford
                            ? '#4ADE80'
                            : '#F87171',
                    }}
                  >
                    {!card.unlocked
                      ? card.requirement === 'Restricted in this stage'
                        ? 'BANNED'
                        : 'LOCKED'
                      : card.onCooldown
                        ? `CD ${card.cooldownRemainingSeconds.toFixed(1)}s`
                        : `${card.cost} EM`}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Fusion Glove (Move or Fuse placed Defenders, 0 EM, cooldown) */}
          <button
            type="button"
            className="mfd-btn mfd-defender-card mfd-hud-tool-btn"
            disabled={snapshot.gloveCooldown.onCooldown || snapshot.status !== 'playing'}
            aria-label={
              snapshot.gloveCooldown.onCooldown
                ? `Fusion Glove (CD ${snapshot.gloveCooldown.remainingSeconds.toFixed(1)}s)`
                : 'Fusion Glove'
            }
            onPointerDown={e => {
              if (!snapshot.gloveCooldown.onCooldown) {
                startHudDrag(e, { kind: 'glove' }, undefined, 'Fusion Glove', 'glove');
              }
            }}
            onClick={() => {
              if (suppressNextClickRef.current) {
                suppressNextClickRef.current = false;
                return;
              }
              if (snapshot.gloveCooldown.onCooldown) return;
              onSelectTool(activeTool.kind === 'glove' ? { kind: 'select' } : { kind: 'glove' });
            }}
            style={{
              padding: '3px 6px',
              borderColor: activeTool.kind === 'glove' ? '#facc15' : snapshot.gloveCooldown.onCooldown ? '#475569' : '#38bdf8',
              background: activeTool.kind === 'glove' ? 'rgba(202, 138, 4, 0.25)' : '#0f172a',
              opacity: snapshot.gloveCooldown.onCooldown && activeTool.kind !== 'glove' ? 0.78 : 1,
            }}
            title={`Fusion Glove (0 EM, ${snapshot.gloveCooldown.totalSeconds}s CD): Move a Defender or Fuse two Tier-1 Defenders`}
          >
            {snapshot.gloveCooldown.onCooldown && (
              <>
                <div className="mfd-cd-curtain" style={{ height: `${snapshot.gloveCooldown.progressPct}%` }} />
                <div className="mfd-cd-badge">{snapshot.gloveCooldown.remainingSeconds.toFixed(1)}s</div>
              </>
            )}
            <PixelToolIcon kind="glove" size={24} />
            <div className="mfd-hud-tool-text" style={{ textAlign: 'left' }}>
              <div className="mfd-hud-card-name" style={{ fontSize: 10, fontWeight: 700, color: '#F8FAFC', lineHeight: 1.15 }}>
                Glove
              </div>
              <div
                className="mfd-hud-card-cost"
                style={{
                  fontSize: 9,
                  lineHeight: 1.15,
                  color: snapshot.gloveCooldown.onCooldown ? '#FACC15' : '#38BDF8',
                }}
              >
                {snapshot.gloveCooldown.onCooldown
                  ? `CD ${snapshot.gloveCooldown.remainingSeconds.toFixed(1)}s`
                  : 'MOVE/FUSE'}
              </div>
            </div>
          </button>

          {/* Shovel (Remove Defender, 0 EM, 0% refund, 0s cooldown) */}
          <button
            type="button"
            className="mfd-btn mfd-defender-card mfd-hud-tool-btn"
            disabled={snapshot.status !== 'playing'}
            aria-label="Shovel"
            onPointerDown={e => startHudDrag(e, { kind: 'shovel' }, undefined, 'Shovel', 'shovel')}
            onClick={() => {
              if (suppressNextClickRef.current) {
                suppressNextClickRef.current = false;
                return;
              }
              onSelectTool(activeTool.kind === 'shovel' ? { kind: 'select' } : { kind: 'shovel' });
            }}
            style={{
              padding: '3px 6px',
              borderColor: activeTool.kind === 'shovel' ? '#f87171' : '#64748b',
              background: activeTool.kind === 'shovel' ? 'rgba(185, 28, 28, 0.35)' : '#0f172a',
            }}
            title="Shovel: Click or drag onto any Defender to remove it (0% refund)"
          >
            <PixelToolIcon kind="shovel" size={24} />
            <div className="mfd-hud-tool-text" style={{ textAlign: 'left' }}>
              <div className="mfd-hud-card-name" style={{ fontSize: 10, fontWeight: 700, color: '#F8FAFC', lineHeight: 1.15 }}>
                Shovel
              </div>
              <div className="mfd-hud-card-cost" style={{ fontSize: 9, lineHeight: 1.15, color: '#FCA5A5' }}>
                REMOVE
              </div>
            </div>
          </button>
        </div>

        {/* Wave Status & Match Controls */}
        <div className="mfd-hud-controls-group" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            className="mfd-hud-wave-box"
            style={{
              background: '#0f172a',
              border: '2px solid #334155',
              borderRadius: 8,
              padding: '3px 8px',
              textAlign: 'center',
            }}
            title={snapshot.activeLevelName}
          >
            <div className="mfd-hud-wave-main" style={{ fontSize: 10, color: '#38BDF8', fontWeight: 700, lineHeight: 1.15 }}>
              {snapshot.activeLevelId && snapshot.activeLevelId !== 'grassland' ? (
                <span className="mfd-hud-wave-prefix">{snapshot.activeLevelName} · </span>
              ) : null}
              WAVE {snapshot.waveNumber}/{snapshot.totalWaves}
            </div>
            <div className="mfd-hud-wave-sub" style={{ fontSize: 10, color: '#CBD5E1', lineHeight: 1.15 }}>
              E: {snapshot.enemiesRemaining} · K: {snapshot.enemiesKilled}
            </div>
          </div>

          <button
            type="button"
            className="mfd-btn mfd-hud-icon-btn"
            style={{ padding: '6px 10px', fontSize: 12 }}
            onClick={() => onSetSpeed(snapshot.speedMultiplier === 1 ? 2 : 1)}
            title="Toggle simulation speed (1x / 2x)"
          >
            {snapshot.speedMultiplier}x
          </button>

          <button
            type="button"
            className="mfd-btn mfd-hud-icon-btn"
            style={{ padding: '6px 10px', fontSize: 12 }}
            onClick={onOpenHowToPlay}
            aria-label="How to Play"
            title="How to Play"
          >
            ?
          </button>

          <button
            type="button"
            className="mfd-btn mfd-hud-icon-btn"
            style={{ padding: '6px 10px', fontSize: 12 }}
            onClick={() => void toggleLandscapeFullscreen()}
            aria-label="Toggle Fullscreen Landscape"
            title="Fullscreen & Xoay ngang (Mobile/Desktop)"
          >
            ⛶
          </button>

          <button
            type="button"
            className="mfd-btn mfd-btn-gold mfd-hud-pause-btn"
            style={{ padding: '6px 10px', fontSize: 12 }}
            disabled={snapshot.terminal !== null}
            onClick={onTogglePause}
          >
            {snapshot.status === 'paused' ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>

      {/* Floating Cursor Ghost while dragging card, crystal, glove, or shovel */}
      {dragGesture?.active && (
        <div
          className="mfd-drag-ghost"
          style={{ left: dragGesture.currentX, top: dragGesture.currentY }}
          aria-hidden="true"
        >
          {dragGesture.svgKind ? (
            <div style={{ opacity: 0.92 }}>
              <PixelToolIcon kind={dragGesture.svgKind} size={56} />
            </div>
          ) : (
            <img
              src={dragGesture.spriteUrl}
              alt={dragGesture.label}
              width={64}
              height={64}
              className="mfd-pixel"
              style={{ opacity: 0.9 }}
            />
          )}
        </div>
      )}

      {/* Floating Feedback Toast Overlay (0px vertical layout height) */}
      {snapshot.lastToast && (
        <div
          role="status"
          className="mfd-toast-float"
          style={{
            border: `1px solid ${
              snapshot.lastToast.kind === 'error'
                ? '#f87171'
                : snapshot.lastToast.kind === 'success'
                  ? '#4ade80'
                  : '#38bdf8'
            }`,
            background:
              snapshot.lastToast.kind === 'error'
                ? 'rgba(127, 29, 29, 0.92)'
                : snapshot.lastToast.kind === 'success'
                  ? 'rgba(20, 83, 45, 0.92)'
                  : 'rgba(12, 74, 110, 0.92)',
            color: '#F8FAFC',
          }}
        >
          {snapshot.lastToast.message}
        </div>
      )}

      {/* Pause Modal */}
      {snapshot.status === 'paused' && (
        <div className="mfd-modal-backdrop" role="dialog" aria-modal="true" aria-label="Game Paused">
          <div className="mfd-modal" style={{ maxWidth: 440, textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 26, color: '#FACC15' }}>Game Paused</h2>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: '#CBD5E1' }}>
              Wave {snapshot.waveNumber}/{snapshot.totalWaves} · Emeralds: {snapshot.energy} · Crystals: {snapshot.crystals}/{snapshot.maxCrystals}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button type="button" className="mfd-btn mfd-btn-primary" onClick={onTogglePause}>
                Resume Battle
              </button>
              <button type="button" className="mfd-btn" onClick={onOpenHowToPlay}>
                How to Play
              </button>
              <button type="button" className="mfd-btn" onClick={onRestartBattle}>
                Restart Battle
              </button>
              <button type="button" className="mfd-btn mfd-btn-gold" onClick={onSaveAndExit}>
                Save & Return to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory Modal */}
      {snapshot.status === 'victory' && (
        <div className="mfd-modal-backdrop" role="dialog" aria-modal="true" aria-label="Victory">
          <div className="mfd-modal" style={{ maxWidth: 560, textAlign: 'center', borderColor: '#4ade80' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 30, color: '#4ADE80' }}>{snapshot.activeLevelName} Victory!</h2>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#E2E8F0' }}>
              You defended all {snapshot.totalWaves} Waves and defeated <strong>{snapshot.enemiesKilled}</strong> Enemies!
            </p>

            {(snapshot.newlyUnlocked.defenders.length > 0 || snapshot.newlyUnlocked.recipes.length > 0) ? (
              <div
                style={{
                  background: '#1e293b',
                  border: '2px solid #facc15',
                  borderRadius: 8,
                  padding: 14,
                  marginBottom: 16,
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#FACC15', marginBottom: 10 }}>
                  New Unlocks Earned!
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {snapshot.newlyUnlocked.defenders.map(id => {
                    const item = catalogById.get(id);
                    return (
                      <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0f172a', padding: '6px 10px', borderRadius: 6 }}>
                        <img
                          src={item?.spriteUrl ?? `/assets/sprites/defenders/${id}.png`}
                          alt={item?.name ?? id}
                          width={32}
                          height={32}
                          className="mfd-pixel"
                        />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#4ADE80' }}>
                          Base: {item?.name ?? id}
                        </span>
                      </div>
                    );
                  })}
                  {snapshot.newlyUnlocked.recipes.map(recipeId => {
                    const item = defenderCatalog.find(d => d.recipeId === recipeId);
                    return (
                      <div key={recipeId} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0f172a', padding: '6px 10px', borderRadius: 6 }}>
                        {item && (
                          <img src={item.spriteUrl} alt={item.name} width={32} height={32} className="mfd-pixel" />
                        )}
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8' }}>
                          Recipe: {item?.name ?? recipeId}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p style={{ margin: '0 0 16px', fontSize: 12, color: '#94A3B8' }}>
                Victory recorded! Total Victories: {snapshot.progressionProfile.totalVictories} · Cumulative Kills: {snapshot.progressionProfile.totalVictoryKills}
              </p>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="mfd-btn mfd-btn-primary" onClick={onRestartBattle}>
                Play Again
              </button>
              <button type="button" className="mfd-btn" onClick={onReturnToMenuTerminal}>
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Defeat Modal */}
      {snapshot.status === 'defeat' && (
        <div className="mfd-modal-backdrop" role="dialog" aria-modal="true" aria-label="Defeat">
          <div className="mfd-modal" style={{ maxWidth: 460, textAlign: 'center', borderColor: '#f87171' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 30, color: '#F87171' }}>Defeat!</h2>
            <p style={{ margin: '0 0 10px', fontSize: 14, color: '#E2E8F0' }}>
              An Enemy crossed the defense line on Wave {snapshot.waveNumber}/{snapshot.totalWaves}.
            </p>
            <p style={{ margin: '0 0 18px', fontSize: 12, color: '#94A3B8' }}>
              Defeated matches add zero unlock progression. Adjust your strategy and try again!
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="mfd-btn mfd-btn-primary" onClick={onRestartBattle}>
                Retry Stage
              </button>
              <button type="button" className="mfd-btn" onClick={onReturnToMenuTerminal}>
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

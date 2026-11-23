"use client";

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  PlaytestController,
  PlaytestDefenderConfig,
  PlaytestDefenderMeta,
  PlaytestEnemyConfig,
  PlaytestEnemyMeta,
  PlaytestFusionRecipeMeta,
  PlaytestGameHandle,
  PlaytestHudSnapshot,
  PlaytestMode,
  PlaytestPresetConfig,
  PlaytestSpeed,
  PlaytestTool,
  PlaytestVisualStyle,
} from '@mfd/game';

type Status = 'loading' | 'ready' | 'error';
type InspectorTab = 'play' | 'tune' | 'log';
type PlacementMode = 'free' | 'summon';
type TuneTargetKind = 'defender' | 'enemy';

interface LoadedPlaytestModule {
  defenderMeta: readonly PlaytestDefenderMeta[];
  enemyMeta: readonly PlaytestEnemyMeta[];
  fusionMeta: readonly PlaytestFusionRecipeMeta[];
  clonePreset: (preset: PlaytestPresetConfig) => PlaytestPresetConfig;
  createDefaultPreset: () => PlaytestPresetConfig;
}

const MAX_OWNED_WAIT_MS = 6_000;
const SPEED_OPTIONS: readonly PlaytestSpeed[] = [0.5, 1, 2, 4];

function hexColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export function PlaytestHost() {
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<PlaytestGameHandle | null>(null);
  const controllerRef = useRef<PlaytestController | null>(null);

  const [status, setStatus] = useState<Status>('loading');
  const [modMeta, setModMeta] = useState<LoadedPlaytestModule | null>(null);
  const [snapshot, setSnapshot] = useState<PlaytestHudSnapshot | null>(null);
  const [draftPreset, setDraftPreset] = useState<PlaytestPresetConfig | null>(null);

  const [placementMode, setPlacementMode] = useState<PlacementMode>('free');
  const [tool, setTool] = useState<PlaytestTool>({ kind: 'select' });
  const toolRef = useRef<PlaytestTool>(tool);
  toolRef.current = tool;

  const [visualStyle, setVisualStyle] = useState<PlaytestVisualStyle>('ai-64');
  const visualStyleRef = useRef<PlaytestVisualStyle>(visualStyle);
  visualStyleRef.current = visualStyle;

  const [activeTab, setActiveTab] = useState<InspectorTab>('play');
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);

  const openPanelTab = (tab: InspectorTab) => {
    setActiveTab(tab);
    setIsPanelOpen(true);
  };

  // Wave Burst controls
  const [burstEnemyId, setBurstEnemyId] = useState<string>('zombie');
  const [burstCount, setBurstCount] = useState<number>(5);
  const [burstInterval, setBurstInterval] = useState<number>(1.5);
  const [spawnLane, setSpawnLane] = useState<number>(0);

  // Tune Balance controls
  const [tuneKind, setTuneKind] = useState<TuneTargetKind>('defender');
  const [tuneDefenderId, setTuneDefenderId] = useState<string>('iron_golem');
  const [tuneEnemyId, setTuneEnemyId] = useState<string>('zombie');
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let retryTimer: number | undefined;
    let firstOwnedAt: number | undefined;
    let retryDelayMs = 50;
    let handle: PlaytestGameHandle | undefined;
    let unsubscribe: (() => void) | undefined;

    const showError = (error: unknown) => {
      if (cancelled) return;
      console.error('Failed to initialize Playtest Phaser scene:', error);
      setStatus('error');
    };

    void import('@mfd/game').then(mod => {
      if (cancelled) return;

      setModMeta({
        defenderMeta: mod.PLAYTEST_DEFENDER_META,
        enemyMeta: mod.PLAYTEST_ENEMY_META,
        fusionMeta: mod.PLAYTEST_FUSION_RECIPES_META,
        clonePreset: mod.clonePlaytestPreset,
        createDefaultPreset: mod.createDefaultPlaytestPreset,
      });

      const create = () => {
        if (cancelled) return;
        try {
          handle = mod.createPlaytestGame(host, { mode: 'sandbox', showAuxLanes: false });
          handleRef.current = handle;
          controllerRef.current = handle.controller;
          handle.setTool(toolRef.current);
          handle.setVisualStyle(visualStyleRef.current);

          setSnapshot(handle.controller.getSnapshot());
          setDraftPreset(handle.controller.getPreset());
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
        } catch (error) {
          console.error('Playtest Phaser destroy request failed:', error);
        }
      }
    };
  }, []);

  useEffect(() => {
    handleRef.current?.setTool(tool);
  }, [tool]);

  useEffect(() => {
    handleRef.current?.setVisualStyle(visualStyle);
  }, [visualStyle]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Escape') {
        setIsPanelOpen(false);
        return;
      }
      if (isEditableTarget(event.target)) return;
      const controller = controllerRef.current;
      if (!controller) return;

      if (event.code === 'Space') {
        const snap = controller.getSnapshot();
        if (snap.selectedDefenderId) {
          event.preventDefault();
          controller.activateAbility(snap.selectedDefenderId);
        }
      } else if (event.key === 'p' || event.key === 'P') {
        event.preventDefault();
        const snap = controller.getSnapshot();
        controller.setPaused(!snap.paused);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Keep spawnLane clamped to 0 when auxiliary lanes are hidden
  useEffect(() => {
    if (snapshot && !snapshot.showAuxLanes && spawnLane !== 0) {
      setSpawnLane(0);
    }
  }, [snapshot, spawnLane]);

  const baseDefenders = useMemo(
    () => (modMeta ? modMeta.defenderMeta.filter(d => d.tier === 1) : []),
    [modMeta],
  );
  const fusionDefenders = useMemo(
    () => (modMeta ? modMeta.defenderMeta.filter(d => d.tier === 2) : []),
    [modMeta],
  );

  const selectedDefender = useMemo(() => {
    if (!snapshot || !snapshot.selectedDefenderId) return null;
    return snapshot.defenders.find(d => d.id === snapshot.selectedDefenderId) ?? null;
  }, [snapshot]);

  const defenderConfigMap = useMemo(() => {
    const map = new Map<string, PlaytestDefenderConfig>();
    if (draftPreset) {
      for (const d of draftPreset.defenders) map.set(d.id, d);
    }
    return map;
  }, [draftPreset]);

  const editedDefender = useMemo(() => {
    if (!draftPreset) return null;
    return draftPreset.defenders.find(d => d.id === tuneDefenderId) ?? null;
  }, [draftPreset, tuneDefenderId]);

  const editedEnemy = useMemo(() => {
    if (!draftPreset) return null;
    return draftPreset.enemies.find(e => e.id === tuneEnemyId) ?? null;
  }, [draftPreset, tuneEnemyId]);

  const switchPlacementMode = (nextMode: PlacementMode) => {
    setPlacementMode(nextMode);
    if (tool.kind === 'place') {
      const meta = modMeta?.defenderMeta.find(d => d.id === tool.definitionId);
      if (nextMode === 'summon' && meta?.tier === 2) {
        setTool({ kind: 'select' });
      } else {
        setTool({
          kind: 'place',
          definitionId: tool.definitionId,
          freeSandbox: nextMode === 'free',
        });
      }
    }
  };

  const switchGameMode = (mode: PlaytestMode) => {
    const controller = controllerRef.current;
    if (!controller) return;
    controller.reset(draftPreset ?? undefined, mode, snapshot?.showAuxLanes ?? false);
  };

  const handleReset = () => {
    const controller = controllerRef.current;
    if (!controller) return;
    controller.reset(draftPreset ?? undefined, snapshot?.mode ?? 'sandbox', snapshot?.showAuxLanes ?? false);
  };

  const updateDefenderField = (
    field: keyof Pick<
      PlaytestDefenderConfig,
      'maxHp' | 'damage' | 'attackSpeed' | 'attackRange' | 'armor' | 'summonEnergyCost'
    >,
    rawValue: string,
  ) => {
    if (!draftPreset || !modMeta) return;
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return;
    const minVal = field === 'maxHp' ? 1 : 0;
    const value = Math.max(minVal, parsed);
    const cloned = modMeta.clonePreset(draftPreset);
    const target = cloned.defenders.find(d => d.id === tuneDefenderId);
    if (!target) return;
    target[field] = value;
    setDraftPreset(cloned);
  };

  const updateEnemyField = (
    field: keyof Pick<
      PlaytestEnemyConfig,
      | 'maxHp'
      | 'damage'
      | 'attackSpeed'
      | 'attackRange'
      | 'armor'
      | 'moveSpeed'
      | 'fireResistancePct'
      | 'freezeResistancePct'
      | 'energyReward'
      | 'crystalReward'
    >,
    rawValue: string,
  ) => {
    if (!draftPreset || !modMeta) return;
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return;
    const minVal = field === 'maxHp' ? 1 : 0;
    const value =
      field === 'fireResistancePct' || field === 'freezeResistancePct'
        ? Math.min(100, Math.max(0, parsed))
        : Math.max(minVal, parsed);
    const cloned = modMeta.clonePreset(draftPreset);
    const target = cloned.enemies.find(e => e.id === tuneEnemyId);
    if (!target) return;
    target[field] = value;
    setDraftPreset(cloned);
  };

  const updateEnemyFreezeImmune = (checked: boolean) => {
    if (!draftPreset || !modMeta) return;
    const cloned = modMeta.clonePreset(draftPreset);
    const target = cloned.enemies.find(e => e.id === tuneEnemyId);
    if (!target) return;
    target.freezeImmune = checked;
    setDraftPreset(cloned);
  };

  const handleApplyAndRestart = () => {
    const controller = controllerRef.current;
    if (!controller || !draftPreset) return;
    controller.reset(draftPreset, snapshot?.mode ?? 'sandbox', snapshot?.showAuxLanes ?? false);
  };

  const handleResetDefaultPreset = () => {
    const controller = controllerRef.current;
    if (!controller || !modMeta) return;
    const fresh = modMeta.createDefaultPreset();
    setDraftPreset(fresh);
    controller.reset(fresh, snapshot?.mode ?? 'sandbox', snapshot?.showAuxLanes ?? false);
  };

  const handleCopyTunedJson = async () => {
    if (!draftPreset) return;
    const json = JSON.stringify(draftPreset, null, 2);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = json;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedJson(true);
    window.setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleSendWaveBurst = () => {
    const controller = controllerRef.current;
    if (!controller) return;
    const clampedCount = Math.max(1, Math.min(15, Math.round(burstCount)));
    const clampedInterval = Math.max(0.2, Math.min(3.0, Number(burstInterval.toFixed(2))));
    controller.spawnWaveBurst(burstEnemyId, clampedCount, clampedInterval, spawnLane);
  };

  const btnStyle = (active = false, accent = '#10B981'): React.CSSProperties => ({
    padding: '6px 10px',
    borderRadius: 6,
    border: `1px solid ${active ? accent : '#334155'}`,
    backgroundColor: active ? accent : '#1E293B',
    color: active ? '#0F172A' : '#F1F5F9',
    fontWeight: 700,
    fontSize: 12,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  });

  const panelStyle: React.CSSProperties = {
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    borderRadius: 10,
    padding: 12,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid #475569',
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    fontSize: 12,
    boxSizing: 'border-box',
  };

  const controller = controllerRef.current;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0F172A',
        color: '#F8FAFC',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        padding: '10px 14px 20px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Control & Telemetry Bar */}
      <header
        style={{
          ...panelStyle,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <Link
            href="/"
            style={{
              color: '#94A3B8',
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 700,
              padding: '5px 8px',
              borderRadius: 6,
              border: '1px solid #334155',
              backgroundColor: '#0F172A',
            }}
          >
            ← Home
          </Link>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#4ADE80', letterSpacing: 0.4 }}>
            MFD 1-Lane Playtest Sandbox
          </span>

          <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
            <button
              type="button"
              onClick={() => switchGameMode('sandbox')}
              style={btnStyle(snapshot?.mode === 'sandbox', '#4ADE80')}
            >
              Sandbox 1-Lane
            </button>
            <button
              type="button"
              onClick={() => switchGameMode('five-waves')}
              style={btnStyle(snapshot?.mode === 'five-waves', '#4ADE80')}
            >
              5-Wave Sequence
            </button>
          </div>

          <button
            type="button"
            onClick={() => controller?.setShowAuxLanes(!(snapshot?.showAuxLanes ?? false))}
            style={btnStyle(Boolean(snapshot?.showAuxLanes), '#38BDF8')}
          >
            {snapshot?.showAuxLanes ? '5 Lanes: ON' : 'Show 5 Lanes'}
          </button>

          <div
            style={{ display: 'flex', gap: 3 }}
            title="So sánh 3 kiểu hiển thị thử nghiệm cho 5 Base Defenders, 4 Base Enemies và nền Grassland"
          >
            <button
              type="button"
              onClick={() => setVisualStyle('ai-64')}
              style={btnStyle(visualStyle === 'ai-64', '#A855F7')}
            >
              AI 64×64
            </button>
            <button
              type="button"
              onClick={() => setVisualStyle('pixel-code')}
              style={btnStyle(visualStyle === 'pixel-code', '#A855F7')}
            >
              Pixel Code
            </button>
            <button
              type="button"
              onClick={() => setVisualStyle('blocks')}
              style={btnStyle(visualStyle === 'blocks', '#A855F7')}
            >
              Blocks
            </button>
          </div>
        </div>

        {/* Playback + Resource Grants */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={() => controller?.setPaused(!(snapshot?.paused ?? false))}
            style={btnStyle(Boolean(snapshot?.paused), '#FBBF24')}
          >
            {snapshot?.paused ? 'Resume [P]' : 'Pause [P]'}
          </button>

          <div style={{ display: 'flex', gap: 3 }}>
            {SPEED_OPTIONS.map(spd => (
              <button
                key={spd}
                type="button"
                onClick={() => controller?.setSpeed(spd)}
                style={btnStyle(snapshot?.speedMultiplier === spd, '#38BDF8')}
              >
                {spd}×
              </button>
            ))}
          </div>

          <button type="button" onClick={() => controller?.stepOneTick()} style={btnStyle(false)}>
            +1 Tick
          </button>
          <button type="button" onClick={handleReset} style={btnStyle(false, '#F87171')}>
            Reset
          </button>

          <span style={{ width: 1, height: 22, backgroundColor: '#334155', marginInline: 2 }} />

          <button
            type="button"
            onClick={() => controller?.grantEnergy()}
            style={{ ...btnStyle(false), borderColor: '#CA8A04', color: '#FDE047' }}
          >
            +500 Energy
          </button>
          <button
            type="button"
            onClick={() => controller?.grantCrystals()}
            style={{ ...btnStyle(false), borderColor: '#0284C7', color: '#7DD3FC' }}
          >
            +5 Crystals
          </button>
          <button
            type="button"
            disabled={!snapshot || snapshot.pendingCrystals === 0}
            onClick={() => controller?.claimPendingCrystals()}
            style={{
              ...btnStyle(false),
              opacity: snapshot && snapshot.pendingCrystals > 0 ? 1 : 0.45,
              cursor: snapshot && snapshot.pendingCrystals > 0 ? 'pointer' : 'not-allowed',
              borderColor: '#38BDF8',
            }}
          >
            Claim Pending ({snapshot?.pendingCrystals ?? 0})
          </button>
        </div>

        {/* Live Telemetry */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 12,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'monospace',
          }}
        >
          <span style={{ color: '#FDE047' }}>⚡ Energy: {snapshot?.energy ?? 0}</span>
          <span style={{ color: '#38BDF8' }}>
            💎 Crystals: {snapshot?.crystals ?? 0}/5
            {snapshot && snapshot.pendingCrystals > 0 ? ` (+${snapshot.pendingCrystals})` : ''}
          </span>
          <span style={{ color: '#A7F3D0' }}>
            🌊{' '}
            {snapshot?.mode === 'five-waves'
              ? `Wave ${(snapshot.currentWaveIndex ?? 0) + 1}/${snapshot.totalWaves} (${snapshot.waveStatus})`
              : 'Sandbox'}
          </span>
          <span style={{ color: '#CBD5E1' }}>
            ⏱ T{snapshot?.tick ?? 0} · {(snapshot?.elapsedSeconds ?? 0).toFixed(1)}s
          </span>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => setIsPanelOpen(prev => !prev)}
              style={btnStyle(isPanelOpen, '#38BDF8')}
            >
              ⚙ {isPanelOpen ? 'Đóng Thiết lập' : 'Thiết lập / Waves / Balance'}
            </button>
            <button
              type="button"
              onClick={() => openPanelTab('log')}
              style={btnStyle(isPanelOpen && activeTab === 'log', '#FBBF24')}
            >
              Log ({snapshot?.eventLog.length ?? 0})
            </button>
          </div>
        </div>
      </header>

      {/* Terminal Callout */}
      {snapshot?.terminal && (
        <div
          role="status"
          style={{
            marginBottom: 14,
            padding: '10px 14px',
            borderRadius: 10,
            border: `2px solid ${snapshot.terminal === 'victory' ? '#4ADE80' : '#F87171'}`,
            backgroundColor: snapshot.terminal === 'victory' ? '#064E3B' : '#7F1D1D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <strong style={{ fontSize: 16 }}>
              {snapshot.terminal === 'victory' ? 'VICTORY — Waves Cleared!' : 'DEFEAT — Base Breached!'}
            </strong>
            <span style={{ marginLeft: 10, fontSize: 13, color: '#E2E8F0' }}>
              Click Reset to run another playtest iteration.
            </span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            style={btnStyle(true, snapshot.terminal === 'victory' ? '#4ADE80' : '#FCA5A5')}
          >
            Reset Playtest
          </button>
        </div>
      )}

      {/* Main Full-Width Layout: Top Defender Palette + Full-Screen Battlefield */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Placement Mode, Canvas Tools & Inline Selected Cast */}
        <div
          style={{
            ...panelStyle,
            padding: '8px 12px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
              Placement:
            </span>
            <button
              type="button"
              onClick={() => switchPlacementMode('free')}
              style={btnStyle(placementMode === 'free', '#4ADE80')}
            >
              Free Place T1/T2
            </button>
            <button
              type="button"
              onClick={() => switchPlacementMode('summon')}
              style={btnStyle(placementMode === 'summon', '#FBBF24')}
            >
              Summon T1 (Energy) + Drag Fuse
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
              Tool:
            </span>
            <button
              type="button"
              onClick={() => setTool({ kind: 'select' })}
              style={btnStyle(tool.kind === 'select', '#38BDF8')}
            >
              Select / Drag-Fuse
            </button>
            <button
              type="button"
              onClick={() => setTool({ kind: 'crystal' })}
              style={btnStyle(tool.kind === 'crystal', '#0EA5E9')}
            >
              Cast Ability
            </button>
            <button
              type="button"
              onClick={() => setTool({ kind: 'remove' })}
              style={btnStyle(tool.kind === 'remove', '#F87171')}
            >
              Remove
            </button>

            {selectedDefender && (
              <>
                <span style={{ width: 1, height: 20, backgroundColor: '#334155', marginInline: 2 }} />
                <span style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 700 }}>
                  {selectedDefender.name} (R{selectedDefender.row}·C{selectedDefender.column})
                </span>
                <button
                  type="button"
                  onClick={() => controller?.activateAbility(selectedDefender.id)}
                  style={btnStyle(true, '#38BDF8')}
                >
                  Cast {selectedDefender.abilityName} [Space]
                </button>
                <button
                  type="button"
                  onClick={() => controller?.removeDefender(selectedDefender.id)}
                  style={{ ...btnStyle(false), borderColor: '#EF4444', color: '#FCA5A5' }}
                >
                  ✕
                </button>
              </>
            )}
          </div>
        </div>

        {/* Top 12-Defender Palette */}
        <section style={{ ...panelStyle, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', marginBottom: 5, textTransform: 'uppercase' }}>
              5 Base Defenders (Tier-1)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(152px, 1fr))',
                gap: 6,
              }}
            >
              {baseDefenders.map(def => {
                const cfg = defenderConfigMap.get(def.id);
                const active = tool.kind === 'place' && tool.definitionId === def.id;
                return (
                  <button
                    key={def.id}
                    type="button"
                    title={def.abilitySummary}
                    onClick={() =>
                      setTool({
                        kind: 'place',
                        definitionId: def.id,
                        freeSandbox: placementMode === 'free',
                      })
                    }
                    style={{
                      textAlign: 'left',
                      padding: '6px 8px',
                      borderRadius: 7,
                      border: `2px solid ${active ? '#4ADE80' : '#334155'}`,
                      backgroundColor: active ? '#064E3B' : '#0F172A',
                      color: '#F8FAFC',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: 10,
                            height: 10,
                            borderRadius: 3,
                            backgroundColor: hexColor(def.color),
                            border: `1px solid ${hexColor(def.accentColor)}`,
                          }}
                        />
                        {def.name}
                      </span>
                      <span style={{ fontSize: 10, color: '#FDE047', fontWeight: 700 }}>
                        {placementMode === 'free' ? 'FREE' : `${cfg?.summonEnergyCost ?? 0}⚡`}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                      [{def.shortLabel}] {def.abilityName}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', marginBottom: 5, textTransform: 'uppercase' }}>
              7 Fusion Defenders (Tier-2){' '}
              {placementMode === 'summon' && (
                <span style={{ fontWeight: 500, color: '#FBBF24', textTransform: 'none' }}>
                  — Drag-Fuse two Base Defenders on the lane
                </span>
              )}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(152px, 1fr))',
                gap: 6,
              }}
            >
              {fusionDefenders.map(def => {
                const disabled = placementMode === 'summon';
                const active = !disabled && tool.kind === 'place' && tool.definitionId === def.id;
                return (
                  <button
                    key={def.id}
                    type="button"
                    disabled={disabled}
                    title={disabled ? 'Drag-Fuse two Base Defenders on the lane' : def.abilitySummary}
                    onClick={() =>
                      setTool({
                        kind: 'place',
                        definitionId: def.id,
                        freeSandbox: true,
                      })
                    }
                    style={{
                      textAlign: 'left',
                      padding: '6px 8px',
                      borderRadius: 7,
                      border: `2px solid ${active ? '#38BDF8' : '#334155'}`,
                      backgroundColor: active ? '#0C4A6E' : '#0F172A',
                      color: '#F8FAFC',
                      opacity: disabled ? 0.45 : 1,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: 10,
                            height: 10,
                            borderRadius: 3,
                            backgroundColor: hexColor(def.color),
                            border: `1px solid ${hexColor(def.accentColor)}`,
                          }}
                        />
                        {def.name}
                      </span>
                      <span style={{ fontSize: 10, color: '#38BDF8', fontWeight: 700 }}>
                        {disabled ? 'FUSE' : 'FREE'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                      [{def.shortLabel}] {def.abilityName}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Full-Width Battlefield Stage */}
        <section style={{ ...panelStyle, padding: 8, width: '100%', boxSizing: 'border-box' }}>
          <div
            ref={hostRef}
            aria-label="Phaser playtest battlefield"
            style={{
              width: '100%',
              aspectRatio: '16 / 9',
              backgroundColor: '#0F172A',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          />
          {status === 'loading' && (
            <p role="status" style={{ margin: '8px 0 0', fontSize: 12, color: '#94A3B8' }}>
              Loading Phaser PlaytestScene...
            </p>
          )}
          {status === 'error' && (
            <p role="alert" style={{ margin: '8px 0 0', fontSize: 12, color: '#FCA5A5' }}>
              Failed to initialize Playtest Phaser canvas.
            </p>
          )}
        </section>
      </main>

      {/* Toggleable Modal: Waves, Selected Unit, Balance Tuning & Event Log */}
      {isPanelOpen && (
        <div
          onClick={() => setIsPanelOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            backgroundColor: 'rgba(2, 6, 23, 0.74)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Thiết lập Playtest — Waves, Balance & Log"
            onClick={e => e.stopPropagation()}
            style={{
              ...panelStyle,
              width: 'min(94vw, 620px)',
              maxHeight: '88vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                paddingBottom: 8,
                borderBottom: '1px solid #334155',
              }}
            >
              <strong style={{ fontSize: 15, color: '#F8FAFC' }}>
                Thiết lập Playtest — Waves, Balance &amp; Log
              </strong>
              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                style={btnStyle(false, '#F87171')}
              >
                ✕ Đóng [Esc]
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              <button
                type="button"
                onClick={() => setActiveTab('play')}
                style={btnStyle(activeTab === 'play', '#4ADE80')}
              >
                Play &amp; Cast
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tune')}
                style={btnStyle(activeTab === 'tune', '#38BDF8')}
              >
                Tune Balance
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('log')}
                style={btnStyle(activeTab === 'log', '#FBBF24')}
            >
              Event Log ({snapshot?.eventLog.length ?? 0})
            </button>
          </div>

          {activeTab === 'play' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Selected Defender Card */}
              <div
                style={{
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: '#0F172A',
                  border: '1px solid #334155',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', marginBottom: 6 }}>
                  SELECTED DEFENDER
                </div>
                {selectedDefender ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 15 }}>
                        {selectedDefender.name}{' '}
                        <span style={{ fontSize: 12, color: '#38BDF8' }}>T{selectedDefender.tier}</span>
                      </strong>
                      <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>
                        R{selectedDefender.row} · C{selectedDefender.column}
                      </span>
                    </div>

                    <div style={{ fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span>HP</span>
                        <span style={{ fontFamily: 'monospace' }}>
                          {Math.ceil(selectedDefender.hp)} / {selectedDefender.maxHp}
                        </span>
                      </div>
                      <div style={{ height: 7, backgroundColor: '#1E293B', borderRadius: 4, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${
                              selectedDefender.maxHp > 0
                                ? Math.max(0, Math.min(100, (selectedDefender.hp / selectedDefender.maxHp) * 100))
                                : 0
                            }%`,
                            height: '100%',
                            backgroundColor: '#22C55E',
                          }}
                        />
                      </div>
                    </div>

                    {selectedDefender.shieldAmount > 0 && (
                      <div style={{ fontSize: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ color: '#67E8F9' }}>Shield</span>
                          <span style={{ fontFamily: 'monospace', color: '#67E8F9' }}>
                            {Math.ceil(selectedDefender.shieldAmount)} / {selectedDefender.shieldMaxAmount}
                          </span>
                        </div>
                        <div style={{ height: 6, backgroundColor: '#1E293B', borderRadius: 4, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${
                                selectedDefender.shieldMaxAmount > 0
                                  ? Math.max(
                                      0,
                                      Math.min(
                                        100,
                                        (selectedDefender.shieldAmount / selectedDefender.shieldMaxAmount) * 100,
                                      ),
                                    )
                                  : 0
                              }%`,
                              height: '100%',
                              backgroundColor:
                                selectedDefender.definitionId === 'frost_guardian' ? '#22D3EE' : '#FBBF24',
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {selectedDefender.badges.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {selectedDefender.badges.map(b => (
                          <span
                            key={b.label}
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: '#1E293B',
                              color: '#FDE047',
                              border: '1px solid #475569',
                            }}
                          >
                            {b.label}
                          </span>
                        ))}
                      </div>
                    )}

                    <div
                      style={{
                        padding: 8,
                        borderRadius: 6,
                        backgroundColor: '#1E293B',
                        fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#38BDF8' }}>{selectedDefender.abilityName}</div>
                      <div style={{ color: '#CBD5E1', marginTop: 2 }}>{selectedDefender.abilitySummary}</div>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => controller?.activateAbility(selectedDefender.id)}
                        style={{ ...btnStyle(true, '#38BDF8'), flex: 1 }}
                      >
                        Cast Ability (1 Crystal) [Space]
                      </button>
                      <button
                        type="button"
                        onClick={() => controller?.removeDefender(selectedDefender.id)}
                        style={{ ...btnStyle(false), borderColor: '#EF4444', color: '#FCA5A5' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 12, color: '#94A3B8', lineHeight: 1.5 }}>
                    Click a Defender on the grid to inspect stats and cast its Special Ability. Drag one Defender onto
                    another to Fuse, drag the top-bar Crystal Orb onto a Defender to cast, or right-click to remove.
                  </p>
                )}
              </div>

              {/* Enemy Wave Spawner */}
              <div
                style={{
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: '#0F172A',
                  border: '1px solid #334155',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8' }}>ENEMY WAVE SPAWNER</div>

                {snapshot?.showAuxLanes && (
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <span>Target Lane</span>
                    <select
                      value={spawnLane}
                      onChange={e => setSpawnLane(Number(e.target.value))}
                      style={{ ...inputStyle, width: 120 }}
                    >
                      {[0, 1, 2, 3, 4].map(lane => (
                        <option key={lane} value={lane}>
                          Lane {lane + 1} (R{lane})
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 5 }}>Quick Single Spawn</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                    {(modMeta?.enemyMeta ?? []).map(enemy => (
                      <button
                        key={enemy.id}
                        type="button"
                        onClick={() => controller?.spawnEnemy(enemy.id, spawnLane)}
                        style={{
                          ...btnStyle(false),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          textAlign: 'left',
                        }}
                      >
                        <span>+ {enemy.name}</span>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 2,
                            backgroundColor: hexColor(enemy.color),
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    borderTop: '1px solid #1E293B',
                    paddingTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>Wave Burst Sender</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 80px', gap: 6 }}>
                    <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                      Enemy
                      <select
                        value={burstEnemyId}
                        onChange={e => setBurstEnemyId(e.target.value)}
                        style={{ ...inputStyle, marginTop: 2 }}
                      >
                        {(modMeta?.enemyMeta ?? []).map(e => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                      Count
                      <input
                        type="number"
                        min={1}
                        max={15}
                        step={1}
                        value={burstCount}
                        onChange={e => setBurstCount(Number(e.target.value))}
                        style={{ ...inputStyle, marginTop: 2 }}
                      />
                    </label>
                    <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                      Interval (s)
                      <input
                        type="number"
                        min={0.2}
                        max={3.0}
                        step={0.1}
                        value={burstInterval}
                        onChange={e => setBurstInterval(Number(e.target.value))}
                        style={{ ...inputStyle, marginTop: 2 }}
                      />
                    </label>
                  </div>
                  <button type="button" onClick={handleSendWaveBurst} style={btnStyle(true, '#F87171')}>
                    Send Wave ({Math.max(1, Math.min(15, Math.round(burstCount)))}× on Lane {spawnLane + 1})
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tune' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setTuneKind('defender')}
                  style={btnStyle(tuneKind === 'defender', '#4ADE80')}
                >
                  Defenders (12)
                </button>
                <button
                  type="button"
                  onClick={() => setTuneKind('enemy')}
                  style={btnStyle(tuneKind === 'enemy', '#F87171')}
                >
                  Enemies (4)
                </button>
              </div>

              {tuneKind === 'defender' ? (
                <>
                  <label style={{ fontSize: 12, color: '#CBD5E1' }}>
                    Defender Unit
                    <select
                      value={tuneDefenderId}
                      onChange={e => setTuneDefenderId(e.target.value)}
                      style={{ ...inputStyle, marginTop: 4 }}
                    >
                      {(modMeta?.defenderMeta ?? []).map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} (T{d.tier})
                        </option>
                      ))}
                    </select>
                  </label>
                  {editedDefender && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <label style={{ fontSize: 11, color: '#94A3B8' }}>
                        Max HP
                        <input
                          type="number"
                          min={1}
                          step={10}
                          value={editedDefender.maxHp}
                          onChange={e => updateDefenderField('maxHp', e.target.value)}
                          style={{ ...inputStyle, marginTop: 2 }}
                        />
                      </label>
                      <label style={{ fontSize: 11, color: '#94A3B8' }}>
                        Damage
                        <input
                          type="number"
                          min={0}
                          step={5}
                          value={editedDefender.damage}
                          onChange={e => updateDefenderField('damage', e.target.value)}
                          style={{ ...inputStyle, marginTop: 2 }}
                        />
                      </label>
                      <label style={{ fontSize: 11, color: '#94A3B8' }}>
                        Attack Speed
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={editedDefender.attackSpeed}
                          onChange={e => updateDefenderField('attackSpeed', e.target.value)}
                          style={{ ...inputStyle, marginTop: 2 }}
                        />
                      </label>
                      <label style={{ fontSize: 11, color: '#94A3B8' }}>
                        Attack Range
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={editedDefender.attackRange}
                          onChange={e => updateDefenderField('attackRange', e.target.value)}
                          style={{ ...inputStyle, marginTop: 2 }}
                        />
                      </label>
                      <label style={{ fontSize: 11, color: '#94A3B8' }}>
                        Armor
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={editedDefender.armor}
                          onChange={e => updateDefenderField('armor', e.target.value)}
                          style={{ ...inputStyle, marginTop: 2 }}
                        />
                      </label>
                      <label style={{ fontSize: 11, color: '#94A3B8' }}>
                        Summon Energy Cost
                        <input
                          type="number"
                          min={0}
                          step={25}
                          value={editedDefender.summonEnergyCost}
                          onChange={e => updateDefenderField('summonEnergyCost', e.target.value)}
                          style={{ ...inputStyle, marginTop: 2 }}
                        />
                      </label>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <label style={{ fontSize: 12, color: '#CBD5E1' }}>
                    Enemy Unit
                    <select
                      value={tuneEnemyId}
                      onChange={e => setTuneEnemyId(e.target.value)}
                      style={{ ...inputStyle, marginTop: 4 }}
                    >
                      {(modMeta?.enemyMeta ?? []).map(e => (
                        <option key={e.id} value={e.id}>
                          {e.name} — {e.role}
                        </option>
                      ))}
                    </select>
                  </label>
                  {editedEnemy && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <label style={{ fontSize: 11, color: '#94A3B8' }}>
                        Max HP
                        <input
                          type="number"
                          min={1}
                          step={10}
                          value={editedEnemy.maxHp}
                          onChange={e => updateEnemyField('maxHp', e.target.value)}
                          style={{ ...inputStyle, marginTop: 2 }}
                        />
                      </label>
                      <label style={{ fontSize: 11, color: '#94A3B8' }}>
                        Move Speed
                        <input
                          type="number"
                          min={0}
                          step={0.05}
                          value={editedEnemy.moveSpeed}
                          onChange={e => updateEnemyField('moveSpeed', e.target.value)}
                          style={{ ...inputStyle, marginTop: 2 }}
                        />
                      </label>
                      <label style={{ fontSize: 11, color: '#94A3B8' }}>
                        Damage
                        <input
                          type="number"
                          min={0}
                          step={5}
                          value={editedEnemy.damage}
                          onChange={e => updateEnemyField('damage', e.target.value)}
                          style={{ ...inputStyle, marginTop: 2 }}
                        />
                      </label>
                      <label style={{ fontSize: 11, color: '#94A3B8' }}>
                        Attack Speed
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={editedEnemy.attackSpeed}
                          onChange={e => updateEnemyField('attackSpeed', e.target.value)}
                          style={{ ...inputStyle, marginTop: 2 }}
                        />
                      </label>
                      <label style={{ fontSize: 11, color: '#94A3B8' }}>
                        Attack Range
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={editedEnemy.attackRange}
                          onChange={e => updateEnemyField('attackRange', e.target.value)}
                          style={{ ...inputStyle, marginTop: 2 }}
                        />
                      </label>
                      <label style={{ fontSize: 11, color: '#94A3B8' }}>
                        Armor
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={editedEnemy.armor}
                          onChange={e => updateEnemyField('armor', e.target.value)}
                          style={{ ...inputStyle, marginTop: 2 }}
                        />
                      </label>
                      <label style={{ fontSize: 11, color: '#94A3B8' }}>
                        Fire Resistance (%)
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={5}
                          value={editedEnemy.fireResistancePct}
                          onChange={e => updateEnemyField('fireResistancePct', e.target.value)}
                          style={{ ...inputStyle, marginTop: 2 }}
                        />
                      </label>
                      <label style={{ fontSize: 11, color: '#94A3B8' }}>
                        Freeze Resistance (%)
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={5}
                          value={editedEnemy.freezeResistancePct}
                          onChange={e => updateEnemyField('freezeResistancePct', e.target.value)}
                          style={{ ...inputStyle, marginTop: 2 }}
                        />
                      </label>
                      <label style={{ fontSize: 11, color: '#94A3B8' }}>
                        Energy Reward
                        <input
                          type="number"
                          min={0}
                          step={25}
                          value={editedEnemy.energyReward}
                          onChange={e => updateEnemyField('energyReward', e.target.value)}
                          style={{ ...inputStyle, marginTop: 2 }}
                        />
                      </label>
                      <label style={{ fontSize: 11, color: '#94A3B8' }}>
                        Crystal Reward
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={editedEnemy.crystalReward}
                          onChange={e => updateEnemyField('crystalReward', e.target.value)}
                          style={{ ...inputStyle, marginTop: 2 }}
                        />
                      </label>
                      <label
                        style={{
                          gridColumn: '1 / -1',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 12,
                          color: '#CBD5E1',
                          marginTop: 2,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editedEnemy.freezeImmune}
                          onChange={e => updateEnemyFreezeImmune(e.target.checked)}
                        />
                        Freeze Immune
                      </label>
                    </div>
                  )}
                </>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                <button type="button" onClick={handleApplyAndRestart} style={btnStyle(true, '#4ADE80')}>
                  Apply &amp; Restart Playtest
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <button type="button" onClick={handleResetDefaultPreset} style={btnStyle(false)}>
                    Reset Default Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopyTunedJson()}
                    style={btnStyle(copiedJson, '#38BDF8')}
                  >
                    {copiedJson ? 'Copied!' : 'Copy Tuned JSON'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'log' && (
            <div
              style={{
                maxHeight: 480,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                paddingRight: 2,
              }}
            >
              {snapshot && snapshot.eventLog.length > 0 ? (
                [...snapshot.eventLog].reverse().map(entry => {
                  const statusColor =
                    entry.status === 'applied'
                      ? '#4ADE80'
                      : entry.status === 'rejected'
                        ? '#FB7185'
                        : '#94A3B8';
                  return (
                    <div
                      key={entry.id}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 6,
                        backgroundColor: '#0F172A',
                        borderLeft: `3px solid ${statusColor}`,
                        fontSize: 12,
                        lineHeight: 1.4,
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', color: '#64748B', marginRight: 6 }}>
                        [T{entry.tick}]
                      </span>
                      <span style={{ color: statusColor, fontWeight: 700, marginRight: 6 }}>
                        {entry.category.toUpperCase()}
                      </span>
                      <span style={{ color: '#E2E8F0' }}>{entry.message}</span>
                    </div>
                  );
                })
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>No events recorded yet.</p>
              )}
            </div>
          )}

            {modMeta && (
              <div
                style={{
                  paddingTop: 8,
                  borderTop: '1px solid #334155',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: '#FBBF24' }}>7 FUSION RECIPES:</span>
                {modMeta.fusionMeta.map(recipe => (
                  <span
                    key={recipe.id}
                    style={{
                      fontSize: 11,
                      padding: '2px 7px',
                      borderRadius: 999,
                      backgroundColor: '#0F172A',
                      border: '1px solid #334155',
                      color: '#CBD5E1',
                    }}
                  >
                    {recipe.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

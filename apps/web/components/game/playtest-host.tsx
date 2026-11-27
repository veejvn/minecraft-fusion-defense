'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  PlaytestController,
  PlaytestDefenderConfig,
  PlaytestDefenderMeta,
  PlaytestEnemyConfig,
  PlaytestEnemyMeta,
  PlaytestExternalDragPayload,
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
type ModalKind = 'balance' | 'spawn' | 'log' | null;
type BalanceTab = 'defenders' | 'enemies' | 'waves' | 'json';
type PlacementMode = 'summon' | 'free';

interface LoadedPlaytestModule {
  defenderMeta: readonly PlaytestDefenderMeta[];
  enemyMeta: readonly PlaytestEnemyMeta[];
  fusionMeta: readonly PlaytestFusionRecipeMeta[];
  clonePreset: (preset: PlaytestPresetConfig) => PlaytestPresetConfig;
  createCampaignPreset: () => PlaytestPresetConfig;
}

interface HudDragGesture {
  readonly payload: PlaytestExternalDragPayload;
  readonly spriteUrl: string;
  readonly label: string;
  readonly startX: number;
  readonly startY: number;
  readonly currentX: number;
  readonly currentY: number;
  readonly active: boolean;
  readonly pointerId: number;
}

const MAX_OWNED_WAIT_MS = 6_000;
const DRAG_ACTIVATION_PX = 8;
const SPEED_OPTIONS: readonly PlaytestSpeed[] = [1, 2, 4, 0.5];
const ALL_ENEMY_IDS = ['zombie', 'husk', 'vindicator', 'pillager'] as const;
const PLAYTEST_BALANCE_STORAGE_KEY = 'mfd_playtest_balance_preset_v1';
const IS_DEV_MODE = process.env.NODE_ENV === 'development';

function isValidPlaytestPresetShape(value: unknown): value is PlaytestPresetConfig {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PlaytestPresetConfig>;
  return (
    typeof candidate.seed === 'number' &&
    Array.isArray(candidate.defenders) &&
    candidate.defenders.length > 0 &&
    Array.isArray(candidate.enemies) &&
    candidate.enemies.length > 0 &&
    Array.isArray(candidate.waves) &&
    candidate.waves.length > 0 &&
    Array.isArray(candidate.abilities) &&
    candidate.abilities.length > 0 &&
    Array.isArray(candidate.waveCrystals)
  );
}

function loadSavedPlaytestPreset(fallback: PlaytestPresetConfig): {
  readonly preset: PlaytestPresetConfig;
  readonly hasSaved: boolean;
} {
  if (typeof window === 'undefined') {
    return { preset: fallback, hasSaved: false };
  }
  try {
    const raw = window.localStorage.getItem(PLAYTEST_BALANCE_STORAGE_KEY);
    if (!raw) return { preset: fallback, hasSaved: false };
    const parsed: unknown = JSON.parse(raw);
    if (!isValidPlaytestPresetShape(parsed)) {
      return { preset: fallback, hasSaved: false };
    }
    const savedDefMap = new Map(parsed.defenders.map(d => [d.id, d]));
    const savedEnemyMap = new Map(parsed.enemies.map(e => [e.id, e]));
    const merged: PlaytestPresetConfig = {
      seed: parsed.seed,
      initialEmeralds:
        typeof parsed.initialEmeralds === 'number'
          ? parsed.initialEmeralds
          : fallback.initialEmeralds,
      enablePassiveEnergy:
        typeof parsed.enablePassiveEnergy === 'boolean'
          ? parsed.enablePassiveEnergy
          : fallback.enablePassiveEnergy,
      fusionGloveCooldownSeconds:
        typeof parsed.fusionGloveCooldownSeconds === 'number'
          ? parsed.fusionGloveCooldownSeconds
          : fallback.fusionGloveCooldownSeconds,
      villageChest:
        parsed.villageChest && typeof parsed.villageChest === 'object'
          ? {
              enabled: Boolean(parsed.villageChest.enabled),
              amount:
                typeof parsed.villageChest.amount === 'number'
                  ? parsed.villageChest.amount
                  : (fallback.villageChest?.amount ?? 25),
              intervalSeconds:
                typeof parsed.villageChest.intervalSeconds === 'number'
                  ? parsed.villageChest.intervalSeconds
                  : (fallback.villageChest?.intervalSeconds ?? 10),
            }
          : fallback.villageChest,
      defenders: fallback.defenders.map(def => {
        const saved = savedDefMap.get(def.id);
        return saved
          ? {
              ...def,
              ...saved,
              attackDamageType: def.attackDamageType,
              basicAttackStatus: def.basicAttackStatus,
              economyProduction: saved.economyProduction ?? def.economyProduction,
            }
          : { ...def };
      }),
      enemies: fallback.enemies.map(enemy => {
        const saved = savedEnemyMap.get(enemy.id);
        return saved
          ? {
              ...enemy,
              ...saved,
              crystalDropChance:
                typeof saved.crystalDropChance === 'number'
                  ? saved.crystalDropChance
                  : enemy.crystalDropChance,
            }
          : { ...enemy };
      }),
      // Always sync skill mechanics (counts, scopes, requiresTarget) from code defaults while keeping saved stat tweaks.
      abilities: fallback.abilities,
      waves: parsed.waves.length > 0 ? parsed.waves : fallback.waves,
      waveCrystals: parsed.waveCrystals.length > 0 ? parsed.waveCrystals : fallback.waveCrystals,
    };
    return { preset: merged, hasSaved: true };
  } catch {
    return { preset: fallback, hasSaved: false };
  }
}

function savePlaytestPreset(preset: PlaytestPresetConfig): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(PLAYTEST_BALANCE_STORAGE_KEY, JSON.stringify(preset));
    return true;
  } catch {
    return false;
  }
}

function clearSavedPlaytestPreset(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PLAYTEST_BALANCE_STORAGE_KEY);
  } catch {
    // Ignore storage errors cleanly.
  }
}

function hasSavedPlaytestPresetInStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(PLAYTEST_BALANCE_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

function defenderSpriteUrl(id: string): string {
  return `/assets/sprites/defenders/${id}.png`;
}

function enemySpriteUrl(id: string): string {
  return `/assets/sprites/enemies/${id}.png`;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target.isContentEditable;
}

function cloneNumberInput(rawValue: string, minVal = 0, maxVal?: number): number | null {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return null;
  let next = Math.max(minVal, parsed);
  if (maxVal !== undefined) next = Math.min(maxVal, next);
  return next;
}

export function PlaytestHost() {
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<PlaytestGameHandle | null>(null);
  const controllerRef = useRef<PlaytestController | null>(null);

  const [status, setStatus] = useState<Status>('loading');
  const [modMeta, setModMeta] = useState<LoadedPlaytestModule | null>(null);
  const [snapshot, setSnapshot] = useState<PlaytestHudSnapshot | null>(null);
  const [draftPreset, setDraftPreset] = useState<PlaytestPresetConfig | null>(null);
  const [appliedPresetJson, setAppliedPresetJson] = useState<string>('');
  const [hasSavedPreset, setHasSavedPreset] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const [placementMode, setPlacementMode] = useState<PlacementMode>('summon');
  const [tool, setTool] = useState<PlaytestTool>({ kind: 'select' });
  const toolRef = useRef<PlaytestTool>(tool);
  toolRef.current = tool;

  const [visualStyle, setVisualStyle] = useState<PlaytestVisualStyle>('pixel-art');
  const visualStyleRef = useRef<PlaytestVisualStyle>(visualStyle);
  visualStyleRef.current = visualStyle;

  const [showGridCoords, setShowGridCoords] = useState<boolean>(false);
  const showGridCoordsRef = useRef<boolean>(showGridCoords);
  showGridCoordsRef.current = showGridCoords;

  const [activeModal, setActiveModal] = useState<ModalKind>(null);
  const [balanceTab, setBalanceTab] = useState<BalanceTab>('defenders');

  // Drag-and-drop state from HUD -> Canvas
  const [dragGesture, setDragGesture] = useState<HudDragGesture | null>(null);
  const dragRef = useRef<HudDragGesture | null>(null);
  const suppressNextClickRef = useRef(false);
  dragRef.current = dragGesture;

  // Balance editor selection states
  const [tuneDefenderId, setTuneDefenderId] = useState<string>('iron_golem');
  const [tuneEnemyId, setTuneEnemyId] = useState<string>('zombie');
  const [tuneWaveIdx, setTuneWaveIdx] = useState<number>(0);
  const [jsonInputText, setJsonInputText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [isSyncingGameData, setIsSyncingGameData] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Wave Burst spawner states
  const [burstEnemyId, setBurstEnemyId] = useState<string>('zombie');
  const [burstCount, setBurstCount] = useState<number>(5);
  const [burstInterval, setBurstInterval] = useState<number>(1.5);
  const [spawnLane, setSpawnLane] = useState<number>(0);

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

      const campaignPreset = mod.createCampaignPlaytestPreset();
      const loaded = loadSavedPlaytestPreset(campaignPreset);
      setModMeta({
        defenderMeta: mod.PLAYTEST_DEFENDER_META,
        enemyMeta: mod.PLAYTEST_ENEMY_META,
        fusionMeta: mod.PLAYTEST_FUSION_RECIPES_META,
        clonePreset: mod.clonePlaytestPreset,
        createCampaignPreset: mod.createCampaignPlaytestPreset,
      });

      const create = () => {
        if (cancelled) return;
        try {
          handle = mod.createPlaytestGame(host, {
            preset: loaded.preset,
            mode: 'five-waves',
            showAuxLanes: true,
            allowMultiLaneWaves: true,
            onToolChange: nextTool => {
              if (!cancelled) setTool(nextTool);
            },
          });
          handleRef.current = handle;
          controllerRef.current = handle.controller;
          handle.setTool(toolRef.current);
          handle.setVisualStyle(visualStyleRef.current);
          handle.setShowGridCoords(showGridCoordsRef.current);

          const initialPreset = handle.controller.getPreset();
          setSnapshot(handle.controller.getSnapshot());
          setDraftPreset(initialPreset);
          setHasSavedPreset(loaded.hasSaved);
          const initialJson = JSON.stringify(initialPreset, null, 2);
          setAppliedPresetJson(initialJson);
          setJsonInputText(initialJson);

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
    handleRef.current?.setShowGridCoords(showGridCoords);
  }, [showGridCoords]);

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
        handleRef.current?.setExternalDragAtClientPoint(current.payload, e.clientX, e.clientY);
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
          handleRef.current?.dropExternalDragAtClientPoint(current.payload, e.clientX, e.clientY);
        } else {
          handleRef.current?.setExternalDragAtClientPoint(null, e.clientX, e.clientY);
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
  }, [Boolean(dragGesture)]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Escape') {
        setShowResetConfirm(false);
        setActiveModal(null);
        setTool({ kind: 'select' });
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

  useEffect(() => {
    if (snapshot && !snapshot.showAuxLanes && spawnLane !== 0) {
      setSpawnLane(0);
    }
  }, [snapshot, spawnLane]);

  const startHudDrag = (
    e: React.PointerEvent<HTMLButtonElement>,
    payload: PlaytestExternalDragPayload,
    spriteUrl: string,
    label: string,
  ) => {
    if (e.button !== 0 || snapshot?.terminal !== null) return;
    suppressNextClickRef.current = false;
    const initial: HudDragGesture = {
      payload,
      spriteUrl,
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

  const isPresetDirty = useMemo(() => {
    if (!draftPreset || !appliedPresetJson) return false;
    return JSON.stringify(draftPreset, null, 2) !== appliedPresetJson;
  }, [draftPreset, appliedPresetJson]);

  const editedDefender = useMemo(() => {
    if (!draftPreset) return null;
    return draftPreset.defenders.find(d => d.id === tuneDefenderId) ?? null;
  }, [draftPreset, tuneDefenderId]);

  const editedDefenderMeta = useMemo(() => {
    if (!modMeta) return null;
    return modMeta.defenderMeta.find(d => d.id === tuneDefenderId) ?? null;
  }, [modMeta, tuneDefenderId]);

  const editedEnemy = useMemo(() => {
    if (!draftPreset) return null;
    return draftPreset.enemies.find(e => e.id === tuneEnemyId) ?? null;
  }, [draftPreset, tuneEnemyId]);

  const editedEnemyMeta = useMemo(() => {
    if (!modMeta) return null;
    return modMeta.enemyMeta.find(e => e.id === tuneEnemyId) ?? null;
  }, [modMeta, tuneEnemyId]);

  const editedWave = useMemo(() => {
    if (!draftPreset) return null;
    return draftPreset.waves[tuneWaveIdx] ?? draftPreset.waves[0] ?? null;
  }, [draftPreset, tuneWaveIdx]);

  const controller = controllerRef.current;

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
    if (!controller) return;
    const multiLane = snapshot?.showAuxLanes ?? true;
    controller.reset(draftPreset ?? undefined, mode, multiLane);
    controller.setShowAuxLanes(multiLane);
    setTool({ kind: 'select' });
  };

  const toggleLanes = () => {
    if (!controller || !snapshot) return;
    const nextAux = !snapshot.showAuxLanes;
    if (snapshot.mode === 'five-waves') {
      controller.reset(draftPreset ?? undefined, 'five-waves', nextAux);
    }
    controller.setShowAuxLanes(nextAux);
  };

  const handleReset = () => {
    if (!controller) return;
    const multiLane = snapshot?.showAuxLanes ?? true;
    controller.reset(draftPreset ?? undefined, snapshot?.mode ?? 'five-waves', multiLane);
    controller.setShowAuxLanes(multiLane);
    setTool({ kind: 'select' });
  };

  const cycleSpeed = () => {
    if (!controller || !snapshot) return;
    const idx = SPEED_OPTIONS.indexOf(snapshot.speedMultiplier);
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length] ?? 1;
    controller.setSpeed(next);
  };

  const commitDraftPreset = (nextPreset: PlaytestPresetConfig) => {
    setDraftPreset(nextPreset);
    setJsonInputText(JSON.stringify(nextPreset, null, 2));
    setJsonError(null);
    setSyncFeedback(null);
    if (savePlaytestPreset(nextPreset)) {
      setHasSavedPreset(true);
    }
  };

  const updateDefenderField = (
    field: keyof Pick<
      PlaytestDefenderConfig,
      'maxHp' | 'damage' | 'attackSpeed' | 'attackRange' | 'armor' | 'summonEnergyCost' | 'summonCooldownSeconds'
    >,
    rawValue: string,
  ) => {
    if (!draftPreset || !modMeta) return;
    const value = cloneNumberInput(rawValue, field === 'maxHp' ? 1 : 0);
    if (value === null) return;
    const cloned = modMeta.clonePreset(draftPreset);
    const target = cloned.defenders.find(d => d.id === tuneDefenderId);
    if (!target) return;
    target[field] = value;
    commitDraftPreset(cloned);
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
    const isPct = field === 'fireResistancePct' || field === 'freezeResistancePct';
    const value = cloneNumberInput(rawValue, field === 'maxHp' ? 1 : 0, isPct ? 100 : undefined);
    if (value === null) return;
    const cloned = modMeta.clonePreset(draftPreset);
    const target = cloned.enemies.find(e => e.id === tuneEnemyId);
    if (!target) return;
    target[field] = value;
    commitDraftPreset(cloned);
  };

  const updateEnemyFreezeImmune = (checked: boolean) => {
    if (!draftPreset || !modMeta) return;
    const cloned = modMeta.clonePreset(draftPreset);
    const target = cloned.enemies.find(e => e.id === tuneEnemyId);
    if (!target) return;
    target.freezeImmune = checked;
    commitDraftPreset(cloned);
  };

  const updateEnemyCrystalDropPct = (rawValue: string) => {
    if (!draftPreset || !modMeta) return;
    const pct = cloneNumberInput(rawValue, 0, 100);
    if (pct === null) return;
    const cloned = modMeta.clonePreset(draftPreset);
    const target = cloned.enemies.find(e => e.id === tuneEnemyId);
    if (!target) return;
    target.crystalDropChance = Number((pct / 100).toFixed(4));
    commitDraftPreset(cloned);
  };

  const updateGloveCooldown = (rawValue: string) => {
    if (!draftPreset || !modMeta) return;
    const value = cloneNumberInput(rawValue, 0);
    if (value === null) return;
    const cloned = modMeta.clonePreset(draftPreset);
    cloned.fusionGloveCooldownSeconds = value;
    commitDraftPreset(cloned);
  };

  const updateInitialEmeralds = (rawValue: string) => {
    if (!draftPreset || !modMeta) return;
    const value = cloneNumberInput(rawValue, 0);
    if (value === null) return;
    const cloned = modMeta.clonePreset(draftPreset);
    cloned.initialEmeralds = Math.round(value);
    commitDraftPreset(cloned);
  };

  const updateVillageChestField = (
    field: 'enabled' | 'amount' | 'intervalSeconds',
    rawValue: boolean | string,
  ) => {
    if (!draftPreset || !modMeta) return;
    const cloned = modMeta.clonePreset(draftPreset);
    const current = cloned.villageChest ?? { enabled: true, amount: 25, intervalSeconds: 10 };
    if (field === 'enabled') {
      cloned.villageChest = { ...current, enabled: Boolean(rawValue) };
      commitDraftPreset(cloned);
      return;
    }
    const minVal = field === 'intervalSeconds' ? 0.5 : 1;
    const value = cloneNumberInput(String(rawValue), minVal);
    if (value === null) return;
    cloned.villageChest = {
      ...current,
      [field]: field === 'amount' ? Math.round(value) : value,
    };
    commitDraftPreset(cloned);
  };

  const updateDefenderEconomyField = (
    field: 'amountPerItem' | 'itemCount' | 'initialDelaySeconds' | 'intervalSeconds',
    rawValue: string,
  ) => {
    if (!draftPreset || !modMeta) return;
    const minVal = field === 'initialDelaySeconds' ? 0 : field === 'intervalSeconds' ? 0.5 : 1;
    const value = cloneNumberInput(rawValue, minVal);
    if (value === null) return;
    const cloned = modMeta.clonePreset(draftPreset);
    const target = cloned.defenders.find(d => d.id === tuneDefenderId);
    if (!target || !target.economyProduction) return;
    target.economyProduction = {
      ...target.economyProduction,
      [field]:
        field === 'amountPerItem' || field === 'itemCount'
          ? Math.round(value)
          : value,
    };
    commitDraftPreset(cloned);
  };

  const updateWaveCrystal = (waveIndex: number, rawValue: string) => {
    if (!draftPreset || !modMeta) return;
    const value = cloneNumberInput(rawValue, 0, 5);
    if (value === null) return;
    const cloned = modMeta.clonePreset(draftPreset);
    cloned.waveCrystals[waveIndex] = Math.round(value);
    commitDraftPreset(cloned);
  };

  const updateWaveTiming = (
    waveIndex: number,
    field: 'initialDelaySeconds' | 'delayBeforeNextWaveSeconds',
    rawValue: string,
  ) => {
    if (!draftPreset || !modMeta) return;
    const value = cloneNumberInput(rawValue, 0);
    if (value === null) return;
    const cloned = modMeta.clonePreset(draftPreset);
    const wave = cloned.waves[waveIndex];
    if (!wave) return;
    cloned.waves[waveIndex] = { ...wave, [field]: value };
    commitDraftPreset(cloned);
  };

  type MutableSpawnGroup = {
    -readonly [K in keyof PlaytestPresetConfig['waves'][number]['spawnGroups'][number]]:
      PlaytestPresetConfig['waves'][number]['spawnGroups'][number][K];
  };

  const updateSpawnGroupField = (
    waveIndex: number,
    groupIndex: number,
    updater: (group: MutableSpawnGroup) => MutableSpawnGroup | void,
  ) => {
    if (!draftPreset || !modMeta) return;
    const cloned = modMeta.clonePreset(draftPreset);
    const wave = cloned.waves[waveIndex];
    const group = wave?.spawnGroups[groupIndex];
    if (!wave || !group) return;
    const editable: MutableSpawnGroup = { ...group, allowedLanes: [...group.allowedLanes] };
    const next = updater(editable) ?? editable;
    const nextGroups = wave.spawnGroups.map((g, idx) => (idx === groupIndex ? next : g));
    cloned.waves[waveIndex] = { ...wave, spawnGroups: nextGroups };
    commitDraftPreset(cloned);
  };

  const addSpawnGroup = (waveIndex: number) => {
    if (!draftPreset || !modMeta) return;
    const cloned = modMeta.clonePreset(draftPreset);
    const wave = cloned.waves[waveIndex];
    if (!wave) return;
    cloned.waves[waveIndex] = {
      ...wave,
      spawnGroups: [
        ...wave.spawnGroups,
        {
          enemyId: 'zombie',
          count: 2,
          allowedLanes: [0, 1, 2, 3, 4],
          laneMode: 'sequential',
          startOffsetSeconds: 0,
          intervalSeconds: 2.5,
        },
      ],
    };
    commitDraftPreset(cloned);
  };

  const removeSpawnGroup = (waveIndex: number, groupIndex: number) => {
    if (!draftPreset || !modMeta) return;
    const cloned = modMeta.clonePreset(draftPreset);
    const wave = cloned.waves[waveIndex];
    if (!wave || wave.spawnGroups.length <= 1) return;
    cloned.waves[waveIndex] = {
      ...wave,
      spawnGroups: wave.spawnGroups.filter((_, idx) => idx !== groupIndex),
    };
    commitDraftPreset(cloned);
  };

  const handleApplyAndRestart = () => {
    if (!controller || !draftPreset) return;
    if (savePlaytestPreset(draftPreset)) {
      setHasSavedPreset(true);
    }
    const multiLane = snapshot?.showAuxLanes ?? true;
    controller.reset(draftPreset, snapshot?.mode ?? 'five-waves', multiLane);
    controller.setShowAuxLanes(multiLane);
    const appliedJson = JSON.stringify(draftPreset, null, 2);
    setAppliedPresetJson(appliedJson);
    setJsonInputText(appliedJson);
    setActiveModal(null);
  };

  const executeResetCampaignPreset = () => {
    if (!controller || !modMeta) return;
    clearSavedPlaytestPreset();
    setHasSavedPreset(false);
    setShowResetConfirm(false);
    const fresh = modMeta.createCampaignPreset();
    setDraftPreset(fresh);
    const json = JSON.stringify(fresh, null, 2);
    setAppliedPresetJson(json);
    setJsonInputText(json);
    setJsonError(null);
    const multiLane = snapshot?.showAuxLanes ?? true;
    controller.reset(fresh, snapshot?.mode ?? 'five-waves', multiLane);
    controller.setShowAuxLanes(multiLane);
  };

  const handleResetCampaignPresetClick = () => {
    if (hasSavedPreset || hasSavedPlaytestPresetInStorage()) {
      setShowResetConfirm(true);
      return;
    }
    executeResetCampaignPreset();
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(jsonInputText) as PlaytestPresetConfig;
      if (!isValidPlaytestPresetShape(parsed)) {
        setJsonError('JSON missing required fields: seed, defenders, enemies, waves, abilities, waveCrystals.');
        return;
      }
      commitDraftPreset(parsed);
      if (controller) {
        const multiLane = snapshot?.showAuxLanes ?? true;
        controller.reset(parsed, snapshot?.mode ?? 'five-waves', multiLane);
        controller.setShowAuxLanes(multiLane);
        setAppliedPresetJson(JSON.stringify(parsed, null, 2));
      }
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON syntax');
    }
  };

  const syncPresetToGameJson = async (presetToSync: PlaytestPresetConfig) => {
    if (!IS_DEV_MODE || isSyncingGameData) return;
    setIsSyncingGameData(true);
    setSyncFeedback(null);
    setJsonError(null);
    try {
      const response = await fetch('/api/dev/sync-game-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: presetToSync }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        updatedFiles?: string[];
        error?: string;
      } | null;
      if (!response.ok || !payload?.ok) {
        setSyncFeedback({
          kind: 'error',
          message: payload?.error ?? `Failed to save JSON (${response.status})`,
        });
        return;
      }
      clearSavedPlaytestPreset();
      setHasSavedPreset(false);
      const formatted = JSON.stringify(presetToSync, null, 2);
      setDraftPreset(presetToSync);
      setJsonInputText(formatted);
      setAppliedPresetJson(formatted);
      if (controller) {
        const multiLane = snapshot?.showAuxLanes ?? true;
        controller.reset(presetToSync, snapshot?.mode ?? 'five-waves', multiLane);
        controller.setShowAuxLanes(multiLane);
      }
      const filesLabel = payload.updatedFiles?.map(f => f.split('/').pop()).join(', ') ?? 'packages/game-data/*.json';
      setSyncFeedback({
        kind: 'success',
        message: `Saved directly to ${filesLabel}. Campaign (/) & Playtest defaults updated!`,
      });
    } catch (err) {
      setSyncFeedback({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Network error while saving Game JSON',
      });
    } finally {
      setIsSyncingGameData(false);
    }
  };

  const handleSaveDraftToGameJson = async () => {
    if (balanceTab === 'json') {
      try {
        const parsed = JSON.parse(jsonInputText) as PlaytestPresetConfig;
        if (!isValidPlaytestPresetShape(parsed)) {
          setJsonError('JSON missing required fields: seed, defenders, enemies, waves, abilities, waveCrystals.');
          return;
        }
        await syncPresetToGameJson(parsed);
      } catch (err) {
        setJsonError(err instanceof Error ? err.message : 'Invalid JSON syntax');
      }
      return;
    }
    if (!draftPreset) return;
    await syncPresetToGameJson(draftPreset);
  };

  const handleImportAndSaveToGameJson = async () => {
    try {
      const parsed = JSON.parse(jsonInputText) as PlaytestPresetConfig;
      if (!isValidPlaytestPresetShape(parsed)) {
        setJsonError('JSON missing required fields: seed, defenders, enemies, waves, abilities, waveCrystals.');
        return;
      }
      await syncPresetToGameJson(parsed);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON syntax');
    }
  };

  const handleDownloadJson = () => {
    if (!draftPreset) return;
    const json = JSON.stringify(draftPreset, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mfd-balance-preset.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadJsonFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      setJsonInputText(text);
      setJsonError(null);
      setSyncFeedback(null);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Failed to read JSON file');
    }
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
    if (!controller) return;
    const clampedCount = Math.max(1, Math.min(15, Math.round(burstCount)));
    const clampedInterval = Math.max(0.2, Math.min(3.0, Number(burstInterval.toFixed(2))));
    controller.spawnWaveBurst(burstEnemyId, clampedCount, clampedInterval, spawnLane);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '5px 8px',
    borderRadius: 6,
    border: '1px solid #475569',
    backgroundColor: '#020617',
    color: '#F8FAFC',
    fontSize: 12,
    fontFamily: 'inherit',
  };

  const smallBtnStyle = (active = false, activeColor = '#4ade80'): React.CSSProperties => ({
    padding: '3px 8px',
    fontSize: 11,
    borderRadius: 5,
    border: `1px solid ${active ? activeColor : '#475569'}`,
    background: active ? 'rgba(30, 41, 59, 0.95)' : '#0f172a',
    color: active ? activeColor : '#CBD5E1',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  });

  const baseCards = snapshot?.baseDefenderCards ?? [];
  const gloveCooldown = snapshot?.gloveCooldown ?? {
    totalSeconds: 15,
    remainingSeconds: 0,
    progressPct: 0,
    onCooldown: false,
  };
  const waveNumber =
    snapshot?.currentWaveIndex !== null && snapshot?.currentWaveIndex !== undefined
      ? Math.min(snapshot.totalWaves, snapshot.currentWaveIndex + 1)
      : 1;
  const activeTier2Place =
    tool.kind === 'place' ? fusionDefenders.find(f => f.id === tool.definitionId) ?? null : null;

  return (
    <main className="mfd-shell mfd-shell-battle" style={{ position: 'relative' }}>
      <div className="mfd-container">
        <section className="mfd-battle-section">
          {/* Row 1: Main Campaign-Identical Tactical HUD Bar */}
          <div
            className="mfd-card"
            style={{
              padding: '5px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 6,
              flexWrap: 'wrap',
              flexShrink: 0,
            }}
          >
            {/* Resources: Emeralds & Power Crystal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: '#0f172a',
                  border: '2px solid #10b981',
                  borderRadius: 8,
                  padding: '3px 7px',
                }}
                title="Emeralds used to summon Base Defenders"
              >
                <img src="/assets/sprites/items/emerald.png" alt="Emeralds" width={20} height={20} className="mfd-pixel" />
                <div>
                  <div style={{ fontSize: 9, color: '#6EE7B7', fontWeight: 700, lineHeight: 1.1 }}>EMERALDS</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#A7F3D0', lineHeight: 1.1 }}>
                    {snapshot?.energy ?? 100}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={`mfd-btn ${tool.kind === 'crystal' ? 'mfd-btn-crystal' : ''}`}
                style={{ padding: '3px 7px', touchAction: 'none', userSelect: 'none' }}
                disabled={!snapshot || snapshot.crystals < 1 || snapshot.terminal !== null}
                onPointerDown={e => {
                  if (snapshot && snapshot.crystals >= 1) {
                    startHudDrag(e, { kind: 'crystal' }, '/assets/sprites/items/power_crystal.png', 'Power Crystal');
                  }
                }}
                onClick={() => {
                  if (suppressNextClickRef.current) {
                    suppressNextClickRef.current = false;
                    return;
                  }
                  setTool(tool.kind === 'crystal' ? { kind: 'select' } : { kind: 'crystal' });
                }}
                title="Click or drag onto a Defender to cast its Special Ability (1 Crystal, 0s cooldown)"
              >
                <img src="/assets/sprites/items/power_crystal.png" alt="Crystal" width={20} height={20} className="mfd-pixel" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 9, color: '#BAE6FD', lineHeight: 1.1 }}>CRYSTALS</div>
                  <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.1 }}>
                    {snapshot?.crystals ?? 0} / {snapshot?.maxCrystals ?? 5}
                  </div>
                </div>
              </button>

              {snapshot && snapshot.pendingCrystals > 0 && (
                <button
                  type="button"
                  className="mfd-btn mfd-btn-gold"
                  style={{ padding: '4px 7px', fontSize: 10 }}
                  disabled={snapshot.crystals >= snapshot.maxCrystals || snapshot.terminal !== null}
                  onClick={() => controller?.claimPendingCrystals()}
                  title="Claim pending Power Crystals once storage has room"
                >
                  +{snapshot.pendingCrystals} Crystal
                </button>
              )}
            </div>

            {/* 6 Base Defender Cards + Fusion Glove + Shovel */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              {baseCards.map(card => {
                const selected = tool.kind === 'place' && tool.definitionId === card.id;
                const isFree = placementMode === 'free';
                const blockedByRules = !isFree && (!card.canAfford || card.onCooldown);
                return (
                  <button
                    key={card.id}
                    type="button"
                    className="mfd-btn mfd-defender-card"
                    disabled={(!isFree && card.onCooldown) || snapshot?.terminal !== null}
                    onPointerDown={e => {
                      if (isFree || (card.canAfford && !card.onCooldown)) {
                        startHudDrag(
                          e,
                          { kind: 'place', definitionId: card.id, freeSandbox: isFree },
                          card.spriteUrl,
                          card.name,
                        );
                      }
                    }}
                    onClick={() => {
                      if (suppressNextClickRef.current) {
                        suppressNextClickRef.current = false;
                        return;
                      }
                      if (!isFree && card.onCooldown) return;
                      setTool(
                        selected
                          ? { kind: 'select' }
                          : { kind: 'place', definitionId: card.id, freeSandbox: isFree },
                      );
                    }}
                    style={{
                      padding: '3px 6px',
                      borderColor: selected
                        ? '#facc15'
                        : isFree || (card.canAfford && !card.onCooldown)
                          ? '#4ade80'
                          : '#475569',
                      background: selected ? 'rgba(202, 138, 4, 0.25)' : '#0f172a',
                      opacity: blockedByRules && !selected ? 0.78 : 1,
                    }}
                    title={
                      isFree
                        ? `${card.name} (FREE Sandbox) — ${card.abilityName}`
                        : `${card.name} (${card.cost} EM, ${card.cooldownTotalSeconds}s CD) — ${card.abilityName}. Click or drag onto empty cell or compatible Defender to Fuse.`
                    }
                  >
                    {!isFree && card.onCooldown && (
                      <>
                        <div className="mfd-cd-curtain" style={{ height: `${card.cooldownProgressPct}%` }} />
                        <div className="mfd-cd-badge">{card.cooldownRemainingSeconds.toFixed(1)}s</div>
                      </>
                    )}
                    <img
                      src={card.spriteUrl}
                      alt={card.name}
                      width={22}
                      height={22}
                      draggable={false}
                      className="mfd-pixel"
                    />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#F8FAFC', lineHeight: 1.15 }}>
                        {card.name}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          lineHeight: 1.15,
                          color: isFree
                            ? '#38BDF8'
                            : card.onCooldown
                              ? '#FACC15'
                              : card.canAfford
                                ? '#4ADE80'
                                : '#F87171',
                        }}
                      >
                        {isFree
                          ? 'FREE'
                          : card.onCooldown
                            ? `CD ${card.cooldownRemainingSeconds.toFixed(1)}s`
                            : `${card.cost} EM`}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Fusion Glove */}
              <button
                type="button"
                className="mfd-btn mfd-defender-card"
                disabled={gloveCooldown.onCooldown || snapshot?.terminal !== null}
                onPointerDown={e => {
                  if (!gloveCooldown.onCooldown) {
                    startHudDrag(e, { kind: 'glove' }, '/assets/sprites/items/fusion_glove.png', 'Fusion Glove');
                  }
                }}
                onClick={() => {
                  if (suppressNextClickRef.current) {
                    suppressNextClickRef.current = false;
                    return;
                  }
                  if (gloveCooldown.onCooldown) return;
                  setTool(tool.kind === 'glove' ? { kind: 'select' } : { kind: 'glove' });
                }}
                style={{
                  padding: '3px 6px',
                  borderColor: tool.kind === 'glove' ? '#facc15' : gloveCooldown.onCooldown ? '#475569' : '#38bdf8',
                  background: tool.kind === 'glove' ? 'rgba(202, 138, 4, 0.25)' : '#0f172a',
                  opacity: gloveCooldown.onCooldown && tool.kind !== 'glove' ? 0.78 : 1,
                }}
                title={`Fusion Glove (0 EM, ${gloveCooldown.totalSeconds}s CD): Move a Defender or Fuse two Tier-1 Defenders`}
              >
                {gloveCooldown.onCooldown && (
                  <>
                    <div className="mfd-cd-curtain" style={{ height: `${gloveCooldown.progressPct}%` }} />
                    <div className="mfd-cd-badge">{gloveCooldown.remainingSeconds.toFixed(1)}s</div>
                  </>
                )}
                <img
                  src="/assets/sprites/items/fusion_glove.png"
                  alt="Fusion Glove"
                  width={22}
                  height={22}
                  draggable={false}
                  className="mfd-pixel"
                />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#F8FAFC', lineHeight: 1.15 }}>Glove</div>
                  <div style={{ fontSize: 9, lineHeight: 1.15, color: gloveCooldown.onCooldown ? '#FACC15' : '#38BDF8' }}>
                    {gloveCooldown.onCooldown ? `CD ${gloveCooldown.remainingSeconds.toFixed(1)}s` : 'MOVE/FUSE'}
                  </div>
                </div>
              </button>

              {/* Shovel */}
              <button
                type="button"
                className="mfd-btn mfd-defender-card"
                disabled={snapshot?.terminal !== null}
                onPointerDown={e =>
                  startHudDrag(e, { kind: 'shovel' }, '/assets/sprites/items/shovel.png', 'Shovel')
                }
                onClick={() => {
                  if (suppressNextClickRef.current) {
                    suppressNextClickRef.current = false;
                    return;
                  }
                  setTool(tool.kind === 'shovel' ? { kind: 'select' } : { kind: 'shovel' });
                }}
                style={{
                  padding: '3px 6px',
                  borderColor: tool.kind === 'shovel' ? '#f87171' : '#64748b',
                  background: tool.kind === 'shovel' ? 'rgba(185, 28, 28, 0.35)' : '#0f172a',
                }}
                title="Shovel: Click or drag onto any Defender to remove it (0% refund)"
              >
                <img
                  src="/assets/sprites/items/shovel.png"
                  alt="Shovel"
                  width={22}
                  height={22}
                  draggable={false}
                  className="mfd-pixel"
                />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#F8FAFC', lineHeight: 1.15 }}>Shovel</div>
                  <div style={{ fontSize: 9, lineHeight: 1.15, color: '#FCA5A5' }}>REMOVE</div>
                </div>
              </button>
            </div>

            {/* Wave Status & Playback Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div
                style={{
                  background: '#0f172a',
                  border: '2px solid #334155',
                  borderRadius: 8,
                  padding: '3px 8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 10, color: '#38BDF8', fontWeight: 700, lineHeight: 1.15 }}>
                  {snapshot?.mode === 'sandbox'
                    ? `SANDBOX · ${(snapshot?.elapsedSeconds ?? 0).toFixed(0)}s`
                    : `WAVE ${waveNumber}/${snapshot?.totalWaves ?? 5}`}
                </div>
                <div style={{ fontSize: 10, color: '#CBD5E1', lineHeight: 1.15 }}>
                  E: {snapshot?.enemies.length ?? 0} · K: {snapshot?.enemiesKilled ?? 0}
                </div>
              </div>

              <button
                type="button"
                className="mfd-btn"
                style={{ padding: '6px 9px', fontSize: 12 }}
                onClick={cycleSpeed}
                title="Cycle simulation speed (1x -> 2x -> 4x -> 0.5x)"
              >
                {snapshot?.speedMultiplier ?? 1}x
              </button>

              <button
                type="button"
                className="mfd-btn mfd-btn-gold"
                style={{ padding: '6px 9px', fontSize: 12 }}
                disabled={snapshot?.terminal !== null}
                onClick={() => controller?.setPaused(!(snapshot?.paused ?? false))}
                title="Pause / Resume [P]"
              >
                {snapshot?.paused ? 'Resume' : 'Pause'}
              </button>
            </div>
          </div>

          {/* Row 2: Compact Playtest Lab Strip (keeps canvas >= 600px at 1366x768) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 6,
              flexWrap: 'wrap',
              padding: '4px 8px',
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid #334155',
              borderRadius: 8,
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <Link
                href="/"
                style={{
                  ...smallBtnStyle(false),
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                ← Menu
              </Link>

              <button
                type="button"
                onClick={() => switchGameMode(snapshot?.mode === 'five-waves' ? 'sandbox' : 'five-waves')}
                style={smallBtnStyle(snapshot?.mode === 'five-waves', '#4ade80')}
                title="Switch between 5-Wave Campaign sequence and open Sandbox"
              >
                Mode: {snapshot?.mode === 'five-waves' ? '5-Wave' : 'Sandbox'}
              </button>

              <button
                type="button"
                onClick={toggleLanes}
                style={smallBtnStyle(Boolean(snapshot?.showAuxLanes ?? true), '#38bdf8')}
                title="Toggle full 5x9 battlefield vs 1-Lane test mode"
              >
                {(snapshot?.showAuxLanes ?? true) ? '5 Lanes' : '1 Lane'}
              </button>

              <button
                type="button"
                onClick={() => switchPlacementMode(placementMode === 'summon' ? 'free' : 'summon')}
                style={smallBtnStyle(placementMode === 'free', '#facc15')}
                title="Campaign Rules (Energy + Cooldowns) vs Free T1/T2 Sandbox Placement"
              >
                Rules: {placementMode === 'summon' ? 'Campaign' : 'Free T1/T2'}
              </button>

              <button
                type="button"
                onClick={() => setVisualStyle(prev => (prev === 'pixel-art' ? 'procedural' : 'pixel-art'))}
                style={smallBtnStyle(visualStyle === 'pixel-art', '#a78bfa')}
                title="Toggle Pixel-Art PNG sprites vs Procedural fallback"
              >
                Art: {visualStyle === 'pixel-art' ? 'PNG' : 'Fallback'}
              </button>

              <button
                type="button"
                onClick={() => setShowGridCoords(prev => !prev)}
                style={smallBtnStyle(showGridCoords, '#34d399')}
                title="Toggle cell (row, col) coordinates"
              >
                Coords
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              {selectedDefender && (
                <button
                  type="button"
                  onClick={() => controller?.activateAbility(selectedDefender.id)}
                  style={{ ...smallBtnStyle(true, '#38bdf8'), borderColor: '#38bdf8' }}
                  title={`Cast ${selectedDefender.abilityName} (1 Crystal)`}
                >
                  ⚡ {selectedDefender.name}: {selectedDefender.abilityName} [Space]
                </button>
              )}

              {activeTier2Place && (
                <button
                  type="button"
                  onClick={() => setTool({ kind: 'select' })}
                  style={{ ...smallBtnStyle(true, '#facc15'), borderColor: '#facc15' }}
                  title="Click to cancel Tier-2 placement tool"
                >
                  Placing T2: {activeTier2Place.name} ✕
                </button>
              )}

              <button
                type="button"
                onClick={() => controller?.grantEnergy()}
                style={{ ...smallBtnStyle(false), color: '#6EE7B7', borderColor: '#10b981' }}
              >
                +500 EM
              </button>
              <button
                type="button"
                onClick={() => controller?.grantCrystals()}
                style={{ ...smallBtnStyle(false), color: '#7DD3FC', borderColor: '#0284c7' }}
              >
                +5 CR
              </button>
              <button
                type="button"
                onClick={() => controller?.stepOneTick()}
                style={smallBtnStyle(false)}
                title="Step exactly 1 simulation tick (50ms)"
              >
                +1 Tick
              </button>
              <button
                type="button"
                onClick={handleReset}
                style={{ ...smallBtnStyle(false), color: '#FCA5A5', borderColor: '#dc2626' }}
              >
                Reset
              </button>

              <button
                type="button"
                onClick={() => setActiveModal(prev => (prev === 'spawn' ? null : 'spawn'))}
                style={smallBtnStyle(activeModal === 'spawn', '#38bdf8')}
              >
                👾 Spawn / T2
              </button>

              <button
                type="button"
                onClick={() => setActiveModal(prev => (prev === 'balance' ? null : 'balance'))}
                style={smallBtnStyle(activeModal === 'balance', '#4ade80')}
              >
                ⚖ Balance{isPresetDirty ? ' ●' : ''}
              </button>

              <button
                type="button"
                onClick={() => setActiveModal(prev => (prev === 'log' ? null : 'log'))}
                style={smallBtnStyle(activeModal === 'log', '#facc15')}
              >
                Log ({snapshot?.eventLog.length ?? 0})
              </button>
            </div>
          </div>

          {/* Row 3: Flex-1 5x9 Grassland Phaser Canvas Stage (matches CampaignHost) */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              width: '100%',
              maxWidth: 1280,
              marginInline: 'auto',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              ref={hostRef}
              aria-label="Phaser playtest battlefield"
              style={{
                width: '100%',
                height: '100%',
                minHeight: 0,
                borderRadius: 10,
                overflow: 'hidden',
                border: '2px solid #334155',
                background: '#090f1d',
              }}
            />

            {status === 'loading' && (
              <div
                role="status"
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(9, 15, 29, 0.85)',
                  color: '#CBD5E1',
                  fontSize: 15,
                  borderRadius: 10,
                }}
              >
                Loading Playtest Battlefield...
              </div>
            )}

            {status === 'error' && (
              <div
                role="alert"
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(127, 29, 29, 0.88)',
                  color: '#FECACA',
                  fontSize: 15,
                  borderRadius: 10,
                }}
              >
                Failed to initialize Playtest Phaser canvas.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Floating Cursor Ghost while dragging */}
      {dragGesture?.active && (
        <div
          className="mfd-drag-ghost"
          style={{ left: dragGesture.currentX, top: dragGesture.currentY }}
          aria-hidden="true"
        >
          <img
            src={dragGesture.spriteUrl}
            alt={dragGesture.label}
            width={64}
            height={64}
            className="mfd-pixel"
            style={{ opacity: 0.92 }}
          />
        </div>
      )}

      {/* Floating Feedback Toast */}
      {snapshot?.lastToast && (
        <div
          role="status"
          className="mfd-toast-float"
          style={{
            top: 96,
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

      {/* Terminal Victory / Defeat Overlay */}
      {snapshot?.terminal && activeModal === null && (
        <div className="mfd-modal-backdrop" role="dialog" aria-modal="true" aria-label="Playtest Result">
          <div
            className="mfd-modal"
            style={{
              maxWidth: 480,
              textAlign: 'center',
              borderColor: snapshot.terminal === 'victory' ? '#4ade80' : '#f87171',
            }}
          >
            <h2
              style={{
                margin: '0 0 8px',
                fontSize: 28,
                color: snapshot.terminal === 'victory' ? '#4ADE80' : '#F87171',
              }}
            >
              {snapshot.terminal === 'victory' ? 'VICTORY — Waves Cleared!' : 'DEFEAT — Base Breached!'}
            </h2>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: '#E2E8F0' }}>
              Elapsed: {snapshot.elapsedSeconds.toFixed(1)}s · Wave {waveNumber}/{snapshot.totalWaves} · Kills:{' '}
              {snapshot.enemiesKilled}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="mfd-btn mfd-btn-primary" onClick={handleReset}>
                Restart Playtest
              </button>
              <button type="button" className="mfd-btn mfd-btn-gold" onClick={() => setActiveModal('balance')}>
                Open Balance Editor
              </button>
              <Link href="/" className="mfd-btn">
                Main Menu
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Live Balance Editor (Defenders, Enemies, Waves & Glove, JSON) */}
      {activeModal === 'balance' && (
        <div
          className="mfd-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Playtest Balance Editor"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="mfd-modal"
            style={{ maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 14 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: 20, color: '#4ADE80' }}>⚖ Live Game Balance Editor</h2>
                  {hasSavedPreset && (
                    <span className="mfd-badge mfd-badge-unlocked">Saved locally</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>
                  Auto-saved in browser localStorage across reloads. Edit stats, Waves, Cooldowns &amp; Apply &amp; Restart.
                </div>
              </div>
              <button type="button" className="mfd-btn" style={{ padding: '6px 12px' }} onClick={() => setActiveModal(null)}>
                Close [Esc]
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              <button
                type="button"
                className={`mfd-btn ${balanceTab === 'defenders' ? 'mfd-btn-primary' : ''}`}
                style={{ padding: '7px 10px', fontSize: 12 }}
                onClick={() => setBalanceTab('defenders')}
              >
                Defenders ({draftPreset?.defenders.length ?? 22})
              </button>
              <button
                type="button"
                className={`mfd-btn ${balanceTab === 'enemies' ? 'mfd-btn-danger' : ''}`}
                style={{ padding: '7px 10px', fontSize: 12 }}
                onClick={() => setBalanceTab('enemies')}
              >
                Enemies (4)
              </button>
              <button
                type="button"
                className={`mfd-btn ${balanceTab === 'waves' ? 'mfd-btn-crystal' : ''}`}
                style={{ padding: '7px 10px', fontSize: 12 }}
                onClick={() => setBalanceTab('waves')}
              >
                Waves &amp; Glove
              </button>
              <button
                type="button"
                className={`mfd-btn ${balanceTab === 'json' ? 'mfd-btn-gold' : ''}`}
                style={{ padding: '7px 10px', fontSize: 12 }}
                onClick={() => setBalanceTab('json')}
              >
                JSON Import/Export
              </button>
            </div>

            {balanceTab === 'defenders' && editedDefender && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#1e293b', padding: 10, borderRadius: 8 }}>
                  <img
                    src={defenderSpriteUrl(editedDefender.id)}
                    alt={editedDefenderMeta?.name ?? editedDefender.id}
                    width={48}
                    height={48}
                    className="mfd-pixel"
                  />
                  <div style={{ flex: 1 }}>
                    <select
                      value={tuneDefenderId}
                      onChange={e => setTuneDefenderId(e.target.value)}
                      style={{ ...inputStyle, fontWeight: 700, fontSize: 13 }}
                    >
                      <optgroup label="Base Defenders (Tier-1)">
                        {baseDefenders.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.name} (T1)
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Fusion Defenders (Tier-2)">
                        {fusionDefenders.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.name} (T2)
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                      <strong style={{ color: '#38BDF8' }}>{editedDefenderMeta?.abilityName}:</strong>{' '}
                      {editedDefenderMeta?.abilitySummary} ·{' '}
                      <strong style={{ color: '#FACC15' }}>
                        DPS: {(editedDefender.damage * editedDefender.attackSpeed).toFixed(1)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                    Max HP
                    <input
                      type="number"
                      min={1}
                      step={10}
                      value={editedDefender.maxHp}
                      onChange={e => updateDefenderField('maxHp', e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                    Damage
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={editedDefender.damage}
                      onChange={e => updateDefenderField('damage', e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                    Attack Speed (/s)
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={editedDefender.attackSpeed}
                      onChange={e => updateDefenderField('attackSpeed', e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                    Attack Range (cells)
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={editedDefender.attackRange}
                      onChange={e => updateDefenderField('attackRange', e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                    Armor
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={editedDefender.armor}
                      onChange={e => updateDefenderField('armor', e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: '#6EE7B7' }}>
                    Summon Cost (EM)
                    <input
                      type="number"
                      min={0}
                      step={25}
                      value={editedDefender.summonEnergyCost}
                      onChange={e => updateDefenderField('summonEnergyCost', e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: '#38BDF8' }}>
                    Summon Cooldown (s)
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={editedDefender.summonCooldownSeconds ?? 0}
                      onChange={e => updateDefenderField('summonCooldownSeconds', e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                </div>

                {editedDefender.economyProduction && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: 10,
                      background: '#0f172a',
                      padding: 10,
                      borderRadius: 8,
                      border: '1px solid #10b981',
                    }}
                  >
                    <label style={{ fontSize: 11, color: '#6EE7B7' }}>
                      Emerald / Item
                      <input
                        type="number"
                        min={1}
                        step={5}
                        value={editedDefender.economyProduction.amountPerItem}
                        onChange={e => updateDefenderEconomyField('amountPerItem', e.target.value)}
                        style={{ ...inputStyle, marginTop: 3 }}
                      />
                    </label>
                    <label style={{ fontSize: 11, color: '#6EE7B7' }}>
                      Items / Spawn
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={editedDefender.economyProduction.itemCount}
                        onChange={e => updateDefenderEconomyField('itemCount', e.target.value)}
                        style={{ ...inputStyle, marginTop: 3 }}
                      />
                    </label>
                    <label style={{ fontSize: 11, color: '#6EE7B7' }}>
                      First Spawn Delay (s)
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={editedDefender.economyProduction.initialDelaySeconds}
                        onChange={e => updateDefenderEconomyField('initialDelaySeconds', e.target.value)}
                        style={{ ...inputStyle, marginTop: 3 }}
                      />
                    </label>
                    <label style={{ fontSize: 11, color: '#6EE7B7' }}>
                      Spawn Interval (s)
                      <input
                        type="number"
                        min={0.5}
                        step={0.5}
                        value={editedDefender.economyProduction.intervalSeconds}
                        onChange={e => updateDefenderEconomyField('intervalSeconds', e.target.value)}
                        style={{ ...inputStyle, marginTop: 3 }}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {balanceTab === 'enemies' && editedEnemy && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#1e293b', padding: 10, borderRadius: 8 }}>
                  <img
                    src={enemySpriteUrl(editedEnemy.id)}
                    alt={editedEnemyMeta?.name ?? editedEnemy.id}
                    width={48}
                    height={48}
                    className="mfd-pixel"
                  />
                  <div style={{ flex: 1 }}>
                    <select
                      value={tuneEnemyId}
                      onChange={e => setTuneEnemyId(e.target.value)}
                      style={{ ...inputStyle, fontWeight: 700, fontSize: 13 }}
                    >
                      {(modMeta?.enemyMeta ?? []).map(e => (
                        <option key={e.id} value={e.id}>
                          {e.name} — {e.role}
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                      DPS: {(editedEnemy.damage * editedEnemy.attackSpeed).toFixed(1)} · Speed: {editedEnemy.moveSpeed} cells/s · Reward:{' '}
                      {editedEnemy.energyReward} EN / {editedEnemy.crystalReward} CR (
                      {Math.round((editedEnemy.crystalDropChance ?? 0) * 100)}%)
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                    Max HP
                    <input
                      type="number"
                      min={1}
                      step={10}
                      value={editedEnemy.maxHp}
                      onChange={e => updateEnemyField('maxHp', e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                    Move Speed (cells/s)
                    <input
                      type="number"
                      min={0}
                      step={0.05}
                      value={editedEnemy.moveSpeed}
                      onChange={e => updateEnemyField('moveSpeed', e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                    Damage
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={editedEnemy.damage}
                      onChange={e => updateEnemyField('damage', e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                    Attack Speed (/s)
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={editedEnemy.attackSpeed}
                      onChange={e => updateEnemyField('attackSpeed', e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                    Attack Range (cells)
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={editedEnemy.attackRange}
                      onChange={e => updateEnemyField('attackRange', e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                    Armor
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={editedEnemy.armor}
                      onChange={e => updateEnemyField('armor', e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: '#FB923C' }}>
                    Fire Resist (%)
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      value={editedEnemy.fireResistancePct}
                      onChange={e => updateEnemyField('fireResistancePct', e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: '#7DD3FC' }}>
                    Freeze Resist (%)
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      value={editedEnemy.freezeResistancePct}
                      onChange={e => updateEnemyField('freezeResistancePct', e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: '#6EE7B7' }}>
                    Emerald Drop
                    <input
                      type="number"
                      min={0}
                      step={25}
                      value={editedEnemy.energyReward}
                      onChange={e => updateEnemyField('energyReward', e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: '#38BDF8' }}>
                    Crystal Drop
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={editedEnemy.crystalReward}
                      onChange={e => updateEnemyField('crystalReward', e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: '#38BDF8' }}>
                    Crystal Drop (%)
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      value={Math.round((editedEnemy.crystalDropChance ?? 0) * 100)}
                      onChange={e => updateEnemyCrystalDropPct(e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#E2E8F0', paddingTop: 14 }}>
                    <input
                      type="checkbox"
                      checked={editedEnemy.freezeImmune}
                      onChange={e => updateEnemyFreezeImmune(e.target.checked)}
                    />
                    Freeze Immune
                  </label>
                </div>
              </div>
            )}

            {balanceTab === 'waves' && draftPreset && editedWave && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 10, background: '#1e293b', padding: 10, borderRadius: 8 }}>
                  <label style={{ fontSize: 11, color: '#38BDF8' }}>
                    Fusion Glove Cooldown (s)
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={draftPreset.fusionGloveCooldownSeconds ?? 0}
                      onChange={e => updateGloveCooldown(e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: '#6EE7B7' }}>
                    Initial Emeralds
                    <input
                      type="number"
                      min={0}
                      step={25}
                      value={draftPreset.initialEmeralds ?? 100}
                      onChange={e => updateInitialEmeralds(e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                  <div>
                    <div style={{ fontSize: 11, color: '#BAE6FD', marginBottom: 3 }}>Wave Crystal Rewards (W1 – W5)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                      {draftPreset.waves.map((w, idx) => (
                        <label key={w.id} style={{ fontSize: 10, color: '#94A3B8', textAlign: 'center' }}>
                          W{idx + 1}
                          <input
                            type="number"
                            min={0}
                            max={5}
                            step={1}
                            value={draftPreset.waveCrystals[idx] ?? 1}
                            onChange={e => updateWaveCrystal(idx, e.target.value)}
                            style={{ ...inputStyle, marginTop: 2, textAlign: 'center' }}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Village Supply Chest & Economy Controls */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 10,
                    background: '#1e293b',
                    padding: 10,
                    borderRadius: 8,
                    border: '1px solid #334155',
                    alignItems: 'center',
                  }}
                >
                  <label style={{ fontSize: 11, color: '#6EE7B7', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={draftPreset.villageChest?.enabled ?? true}
                      onChange={e => updateVillageChestField('enabled', e.target.checked)}
                    />
                    Village Supply Chest
                  </label>
                  <label style={{ fontSize: 11, color: '#6EE7B7' }}>
                    Chest Amount (EM)
                    <input
                      type="number"
                      min={1}
                      step={5}
                      value={draftPreset.villageChest?.amount ?? 25}
                      onChange={e => updateVillageChestField('amount', e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: '#6EE7B7' }}>
                    Chest Restock (s)
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={draftPreset.villageChest?.intervalSeconds ?? 10}
                      onChange={e => updateVillageChestField('intervalSeconds', e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                </div>

                {/* Wave selector tabs */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {draftPreset.waves.map((w, idx) => (
                    <button
                      key={w.id}
                      type="button"
                      className={`mfd-btn ${tuneWaveIdx === idx ? 'mfd-btn-crystal' : ''}`}
                      style={{ padding: '5px 10px', fontSize: 12 }}
                      onClick={() => setTuneWaveIdx(idx)}
                    >
                      Wave {idx + 1} ({w.spawnGroups.reduce((acc, g) => acc + g.count, 0)} E)
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                    Initial Delay (s)
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={editedWave.initialDelaySeconds}
                      onChange={e => updateWaveTiming(tuneWaveIdx, 'initialDelaySeconds', e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                    Delay Before Next Wave (s)
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={editedWave.delayBeforeNextWaveSeconds}
                      onChange={e => updateWaveTiming(tuneWaveIdx, 'delayBeforeNextWaveSeconds', e.target.value)}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {editedWave.spawnGroups.map((grp, gIdx) => (
                    <div
                      key={gIdx}
                      style={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: 8,
                        padding: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr 0.8fr 0.8fr auto', gap: 6, alignItems: 'end' }}>
                        <label style={{ fontSize: 10, color: '#94A3B8' }}>
                          Enemy
                          <select
                            value={grp.enemyId}
                            onChange={e => updateSpawnGroupField(tuneWaveIdx, gIdx, g => { g.enemyId = e.target.value; })}
                            style={{ ...inputStyle, marginTop: 2 }}
                          >
                            {ALL_ENEMY_IDS.map(id => (
                              <option key={id} value={id}>
                                {id.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label style={{ fontSize: 10, color: '#94A3B8' }}>
                          Count
                          <input
                            type="number"
                            min={1}
                            max={40}
                            step={1}
                            value={grp.count}
                            onChange={e => {
                              const val = cloneNumberInput(e.target.value, 1, 40);
                              if (val !== null) updateSpawnGroupField(tuneWaveIdx, gIdx, g => { g.count = Math.round(val); });
                            }}
                            style={{ ...inputStyle, marginTop: 2 }}
                          />
                        </label>
                        <label style={{ fontSize: 10, color: '#94A3B8' }}>
                          Start (s)
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={grp.startOffsetSeconds}
                            onChange={e => {
                              const val = cloneNumberInput(e.target.value, 0);
                              if (val !== null) updateSpawnGroupField(tuneWaveIdx, gIdx, g => { g.startOffsetSeconds = val; });
                            }}
                            style={{ ...inputStyle, marginTop: 2 }}
                          />
                        </label>
                        <label style={{ fontSize: 10, color: '#94A3B8' }}>
                          Interval (s)
                          <input
                            type="number"
                            min={0.2}
                            step={0.1}
                            value={grp.intervalSeconds}
                            onChange={e => {
                              const val = cloneNumberInput(e.target.value, 0.2);
                              if (val !== null) updateSpawnGroupField(tuneWaveIdx, gIdx, g => { g.intervalSeconds = val; });
                            }}
                            style={{ ...inputStyle, marginTop: 2 }}
                          />
                        </label>
                        <button
                          type="button"
                          disabled={editedWave.spawnGroups.length <= 1}
                          onClick={() => removeSpawnGroup(tuneWaveIdx, gIdx)}
                          style={{ ...smallBtnStyle(false), color: '#FCA5A5', padding: '5px 8px' }}
                        >
                          ✕
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, color: '#94A3B8' }}>Lanes:</span>
                        {[0, 1, 2, 3, 4].map(lane => {
                          const enabled = grp.allowedLanes.includes(lane);
                          return (
                            <button
                              key={lane}
                              type="button"
                              onClick={() =>
                                updateSpawnGroupField(tuneWaveIdx, gIdx, g => {
                                  if (enabled) {
                                    if (g.allowedLanes.length > 1) {
                                      g.allowedLanes = g.allowedLanes.filter(l => l !== lane);
                                    }
                                  } else {
                                    g.allowedLanes = [...g.allowedLanes, lane].sort((a, b) => a - b);
                                  }
                                })
                              }
                              style={smallBtnStyle(enabled, '#4ade80')}
                            >
                              L{lane + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="mfd-btn"
                    style={{ padding: '6px 10px', fontSize: 12 }}
                    onClick={() => addSpawnGroup(tuneWaveIdx)}
                  >
                    + Add Spawn Group to Wave {tuneWaveIdx + 1}
                  </button>
                </div>
              </div>
            )}

            {balanceTab === 'json' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    void handleLoadJsonFile(file);
                    e.currentTarget.value = '';
                  }}
                />
                <textarea
                  value={jsonInputText}
                  onChange={e => setJsonInputText(e.target.value)}
                  rows={14}
                  style={{
                    ...inputStyle,
                    fontFamily: 'monospace',
                    fontSize: 11,
                    resize: 'vertical',
                  }}
                />
                {jsonError && <div style={{ fontSize: 12, color: '#F87171' }}>{jsonError}</div>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="mfd-btn mfd-btn-crystal"
                    style={{ flex: 1, padding: '7px 12px', fontSize: 12 }}
                    onClick={handleImportJson}
                  >
                    Import JSON &amp; Restart
                  </button>
                  {IS_DEV_MODE && (
                    <button
                      type="button"
                      className="mfd-btn mfd-btn-primary"
                      style={{ flex: 1, padding: '7px 12px', fontSize: 12 }}
                      disabled={isSyncingGameData}
                      onClick={() => void handleImportAndSaveToGameJson()}
                    >
                      {isSyncingGameData ? 'Saving to Game JSON...' : 'Import & Save to Game JSON (Dev)'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="mfd-btn"
                    style={{ padding: '7px 12px', fontSize: 12 }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Load .json File
                  </button>
                  <button
                    type="button"
                    className="mfd-btn"
                    style={{ padding: '7px 12px', fontSize: 12 }}
                    onClick={handleDownloadJson}
                  >
                    Download .json
                  </button>
                  <button
                    type="button"
                    className="mfd-btn"
                    style={{ padding: '7px 12px', fontSize: 12 }}
                    onClick={() => void handleCopyTunedJson()}
                  >
                    {copiedJson ? 'Copied Tuned JSON!' : 'Copy Tuned JSON'}
                  </button>
                </div>
              </div>
            )}

            {syncFeedback && (
              <div
                style={{
                  fontSize: 12,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: `1px solid ${syncFeedback.kind === 'success' ? '#22c55e' : '#ef4444'}`,
                  background: syncFeedback.kind === 'success' ? 'rgba(34, 197, 94, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                  color: syncFeedback.kind === 'success' ? '#86efac' : '#fca5a5',
                }}
              >
                {syncFeedback.message}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid #334155', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="mfd-btn mfd-btn-primary"
                style={{ flex: 1, padding: '8px 14px', fontSize: 13 }}
                onClick={handleApplyAndRestart}
              >
                Apply &amp; Restart Playtest
              </button>
              {IS_DEV_MODE && (
                <button
                  type="button"
                  className="mfd-btn mfd-btn-crystal"
                  style={{ padding: '8px 14px', fontSize: 13 }}
                  disabled={isSyncingGameData}
                  onClick={() => void handleSaveDraftToGameJson()}
                >
                  {isSyncingGameData ? 'Saving to Game JSON...' : 'Save to Game JSON (Dev)'}
                </button>
              )}
              <button
                type="button"
                className="mfd-btn"
                style={{ padding: '8px 14px', fontSize: 13 }}
                onClick={handleResetCampaignPresetClick}
              >
                Reset Campaign Defaults
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Warning Dialog before wiping saved localStorage preset */}
      {showResetConfirm && (
        <div
          className="mfd-modal-backdrop"
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirm Reset Campaign Defaults"
          style={{ zIndex: 80 }}
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="mfd-modal"
            style={{ maxWidth: 460, borderColor: '#facc15', display: 'flex', flexDirection: 'column', gap: 12 }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: 18, color: '#FACC15' }}>
              ⚠ Reset Saved Balance Preset?
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#E2E8F0', lineHeight: 1.5 }}>
              A customized balance preset is currently saved in your browser (<code style={{ color: '#38BDF8' }}>localStorage</code>).
              Resetting to Campaign defaults will permanently delete your saved changes and restart the battlefield.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="mfd-btn"
                style={{ padding: '7px 14px', fontSize: 12 }}
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="mfd-btn mfd-btn-danger"
                style={{ padding: '7px 14px', fontSize: 12 }}
                onClick={executeResetCampaignPreset}
              >
                Delete Saved &amp; Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Spawn Enemies / Place Tier-2 Fusion Defenders / Inspect Selected */}
      {activeModal === 'spawn' && (
        <div
          className="mfd-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Spawn Enemies and Tier-2 Units"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="mfd-modal"
            style={{ maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 14 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 20, color: '#38BDF8' }}>👾 Spawn Enemies, Tier-2 Units &amp; Recipes</h2>
              <button type="button" className="mfd-btn" style={{ padding: '6px 12px' }} onClick={() => setActiveModal(null)}>
                Close [Esc]
              </button>
            </div>

            {/* Selected Defender Inspector */}
            {selectedDefender && (
              <div style={{ background: '#1e293b', border: '1px solid #38bdf8', borderRadius: 8, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img src={defenderSpriteUrl(selectedDefender.definitionId)} alt={selectedDefender.name} width={32} height={32} className="mfd-pixel" />
                    <strong style={{ fontSize: 14 }}>{selectedDefender.name} (T{selectedDefender.tier})</strong>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>
                      R{selectedDefender.row}·C{selectedDefender.column} · HP {Math.ceil(selectedDefender.hp)}/{selectedDefender.maxHp}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="mfd-btn mfd-btn-crystal"
                      style={{ padding: '4px 10px', fontSize: 11 }}
                      onClick={() => controller?.activateAbility(selectedDefender.id)}
                    >
                      Cast {selectedDefender.abilityName}
                    </button>
                    <button
                      type="button"
                      className="mfd-btn mfd-btn-danger"
                      style={{ padding: '4px 10px', fontSize: 11 }}
                      onClick={() => controller?.removeDefender(selectedDefender.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#CBD5E1' }}>{selectedDefender.abilitySummary}</div>
              </div>
            )}

            {/* Quick Place All 16 Tier-2 Fusion Defenders (Free Sandbox) */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#FACC15', marginBottom: 6 }}>
                FREE PLACE {fusionDefenders.length} FUSION DEFENDERS (TIER-2) — Click one to place directly on grid:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
                {fusionDefenders.map(def => (
                  <button
                    key={def.id}
                    type="button"
                    className="mfd-btn"
                    style={{
                      padding: '5px 8px',
                      justifyContent: 'flex-start',
                      fontSize: 11,
                      background: '#0f172a',
                      borderColor: tool.kind === 'place' && tool.definitionId === def.id ? '#facc15' : '#334155',
                    }}
                    title={def.abilitySummary}
                    onClick={() => {
                      setPlacementMode('free');
                      setTool({ kind: 'place', definitionId: def.id, freeSandbox: true });
                      setActiveModal(null);
                    }}
                  >
                    <img src={defenderSpriteUrl(def.id)} alt={def.name} width={26} height={26} className="mfd-pixel" />
                    <span style={{ textAlign: 'left', lineHeight: 1.15 }}>
                      <span style={{ display: 'block', color: '#F8FAFC' }}>{def.name}</span>
                      <span style={{ fontSize: 9, color: '#38BDF8' }}>{def.abilityName}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Enemy Spawner */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: 12, color: '#F87171' }}>ENEMY SPAWNER</strong>
                {snapshot?.showAuxLanes && (
                  <label style={{ fontSize: 11, color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Target Lane:
                    <select
                      value={spawnLane}
                      onChange={e => setSpawnLane(Number(e.target.value))}
                      style={{ ...inputStyle, width: 110 }}
                    >
                      {[0, 1, 2, 3, 4].map(l => (
                        <option key={l} value={l}>
                          Lane {l + 1} (R{l})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
                {(modMeta?.enemyMeta ?? []).map(enemy => (
                  <button
                    key={enemy.id}
                    type="button"
                    className="mfd-btn"
                    style={{ padding: '6px 8px', fontSize: 11, background: '#0f172a' }}
                    onClick={() => controller?.spawnEnemy(enemy.id, spawnLane)}
                  >
                    <img src={enemySpriteUrl(enemy.id)} alt={enemy.name} width={24} height={24} className="mfd-pixel" />
                    <span>+ {enemy.name}</span>
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px auto', gap: 8, alignItems: 'end' }}>
                <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                  Burst Enemy
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
                <button
                  type="button"
                  className="mfd-btn mfd-btn-danger"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={handleSendWaveBurst}
                >
                  Send Burst (L{spawnLane + 1})
                </button>
              </div>
            </div>

            {/* Fusion Recipes Reference */}
            {modMeta && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#FACC15', marginRight: 4 }}>
                  {modMeta.fusionMeta.length} FUSION RECIPES:
                </span>
                {modMeta.fusionMeta.map(r => (
                  <span key={r.id} className="mfd-badge" style={{ fontSize: 10 }}>
                    {r.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 3: Event Log */}
      {activeModal === 'log' && (
        <div
          className="mfd-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Playtest Event Log"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="mfd-modal"
            style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 10 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#FACC15' }}>📜 Event Log ({snapshot?.eventLog.length ?? 0})</h2>
              <button type="button" className="mfd-btn" style={{ padding: '6px 12px' }} onClick={() => setActiveModal(null)}>
                Close [Esc]
              </button>
            </div>
            <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {snapshot && snapshot.eventLog.length > 0 ? (
                [...snapshot.eventLog].reverse().map(entry => {
                  const statusColor =
                    entry.status === 'applied' ? '#4ADE80' : entry.status === 'rejected' ? '#FB7185' : '#94A3B8';
                  return (
                    <div
                      key={entry.id}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 6,
                        backgroundColor: '#1e293b',
                        borderLeft: `3px solid ${statusColor}`,
                        fontSize: 12,
                      }}
                    >
                      <span style={{ color: '#64748B', marginRight: 6 }}>[T{entry.tick}]</span>
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
          </div>
        </div>
      )}
    </main>
  );
}

'use client';

import type { CSSProperties } from 'react';
import type { PlaytestDefenderConfig, PlaytestPresetConfig } from '@mfd/game';

export type AbilityDef = PlaytestPresetConfig['abilities'][number];
export type AbilityEffectDef = AbilityDef['effects'][number];

type AttachedStatusDef = Extract<AbilityEffectDef, { kind: 'status' }>['status'];

interface PlaytestAbilityEditorProps {
  readonly ability: AbilityDef;
  readonly defender: PlaytestDefenderConfig;
  readonly abilityName: string;
  readonly abilitySummary: string;
  readonly inputStyle: CSSProperties;
  readonly onChange: (nextAbility: AbilityDef) => void;
}

function isFinitePositive(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val > 0;
}

function isFiniteNonNegative(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0;
}

function isPositiveSafeInt(val: unknown): val is number {
  return typeof val === 'number' && Number.isSafeInteger(val) && val >= 1;
}

function isNonNegativeSafeInt(val: unknown): val is number {
  return typeof val === 'number' && Number.isSafeInteger(val) && val >= 0;
}

function isUnitInterval(val: unknown, allowZero: boolean): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val <= 1 && (allowZero ? val >= 0 : val > 0);
}

function mergeAttachedStatus(
  base: AttachedStatusDef,
  raw: unknown,
): AttachedStatusDef {
  if (!raw || typeof raw !== 'object') return structuredClone(base);
  const candidate = raw as Record<string, unknown>;
  if (candidate.kind !== base.kind) return structuredClone(base);

  switch (base.kind) {
    case 'slow':
      return {
        kind: 'slow',
        slowPct: isUnitInterval(candidate.slowPct, true) ? candidate.slowPct : base.slowPct,
        durationSeconds: isFinitePositive(candidate.durationSeconds)
          ? candidate.durationSeconds
          : base.durationSeconds,
      };
    case 'stun':
      return {
        kind: 'stun',
        durationSeconds: isFinitePositive(candidate.durationSeconds)
          ? candidate.durationSeconds
          : base.durationSeconds,
      };
    case 'freeze':
      return {
        kind: 'freeze',
        durationSeconds: isFinitePositive(candidate.durationSeconds)
          ? candidate.durationSeconds
          : base.durationSeconds,
      };
    case 'vulnerable':
      return {
        kind: 'vulnerable',
        damageTakenBonusPct: isFiniteNonNegative(candidate.damageTakenBonusPct)
          ? candidate.damageTakenBonusPct
          : base.damageTakenBonusPct,
        durationSeconds: isFinitePositive(candidate.durationSeconds)
          ? candidate.durationSeconds
          : base.durationSeconds,
      };
    case 'burn':
      return {
        kind: 'burn',
        damageMultiplierPerSecond: isFiniteNonNegative(candidate.damageMultiplierPerSecond)
          ? candidate.damageMultiplierPerSecond
          : base.damageMultiplierPerSecond,
        durationSeconds: isFinitePositive(candidate.durationSeconds)
          ? candidate.durationSeconds
          : base.durationSeconds,
        tickIntervalSeconds: isFinitePositive(candidate.tickIntervalSeconds)
          ? candidate.tickIntervalSeconds
          : base.tickIntervalSeconds,
        ...(base.damageType ? { damageType: base.damageType } : {}),
      };
    case 'buff':
      return {
        kind: 'buff',
        attackSpeedBonusPct: isFiniteNonNegative(candidate.attackSpeedBonusPct)
          ? candidate.attackSpeedBonusPct
          : base.attackSpeedBonusPct,
        attackDamageBonusPct: isFiniteNonNegative(candidate.attackDamageBonusPct)
          ? candidate.attackDamageBonusPct
          : base.attackDamageBonusPct,
        durationSeconds: isFinitePositive(candidate.durationSeconds)
          ? candidate.durationSeconds
          : base.durationSeconds,
      };
  }
}

function mergeOptionalStatuses<
  T extends { readonly applyStatus?: AttachedStatusDef; readonly applyStatuses?: readonly AttachedStatusDef[] },
>(base: T, raw: Record<string, unknown>): Pick<T, 'applyStatus' | 'applyStatuses'> {
  const out: { applyStatus?: AttachedStatusDef; applyStatuses?: AttachedStatusDef[] } = {};
  if (base.applyStatus) {
    out.applyStatus = mergeAttachedStatus(base.applyStatus, raw.applyStatus);
  }
  if (base.applyStatuses) {
    const rawList = Array.isArray(raw.applyStatuses) ? raw.applyStatuses : [];
    out.applyStatuses = base.applyStatuses.map((s, i) => mergeAttachedStatus(s, rawList[i]));
  }
  return out;
}

function mergeEffect(base: AbilityEffectDef, raw: unknown): AbilityEffectDef {
  if (!raw || typeof raw !== 'object') return structuredClone(base);
  const candidate = raw as Record<string, unknown>;
  if (candidate.kind !== base.kind) return structuredClone(base);

  switch (base.kind) {
    case 'multihit-projectile':
      return {
        ...structuredClone(base),
        count: isPositiveSafeInt(candidate.count) ? candidate.count : base.count,
        intervalSeconds: isFiniteNonNegative(candidate.intervalSeconds)
          ? candidate.intervalSeconds
          : base.intervalSeconds,
        damageMultiplier: isFinitePositive(candidate.damageMultiplier)
          ? candidate.damageMultiplier
          : base.damageMultiplier,
        ...(base.targetMaxHpBonusPct !== undefined || isFiniteNonNegative(candidate.targetMaxHpBonusPct)
          ? {
              targetMaxHpBonusPct: isFiniteNonNegative(candidate.targetMaxHpBonusPct)
                ? candidate.targetMaxHpBonusPct
                : base.targetMaxHpBonusPct,
            }
          : {}),
        projectileSpeed: isFinitePositive(candidate.projectileSpeed)
          ? candidate.projectileSpeed
          : base.projectileSpeed,
        pierce: typeof candidate.pierce === 'boolean' ? candidate.pierce : base.pierce,
        ...(typeof candidate.armorPiercing === 'boolean'
          ? { armorPiercing: candidate.armorPiercing }
          : base.armorPiercing !== undefined
            ? { armorPiercing: base.armorPiercing }
            : {}),
        ...mergeOptionalStatuses(base, candidate),
      };
    case 'projectile':
      return {
        ...structuredClone(base),
        damageMultiplier: isFinitePositive(candidate.damageMultiplier)
          ? candidate.damageMultiplier
          : base.damageMultiplier,
        ...(base.targetMaxHpBonusPct !== undefined || isFiniteNonNegative(candidate.targetMaxHpBonusPct)
          ? {
              targetMaxHpBonusPct: isFiniteNonNegative(candidate.targetMaxHpBonusPct)
                ? candidate.targetMaxHpBonusPct
                : base.targetMaxHpBonusPct,
            }
          : {}),
        projectileSpeed: isFinitePositive(candidate.projectileSpeed)
          ? candidate.projectileSpeed
          : base.projectileSpeed,
        pierce: typeof candidate.pierce === 'boolean' ? candidate.pierce : base.pierce,
        ...(typeof candidate.armorPiercing === 'boolean'
          ? { armorPiercing: candidate.armorPiercing }
          : base.armorPiercing !== undefined
            ? { armorPiercing: base.armorPiercing }
            : {}),
        ...mergeOptionalStatuses(base, candidate),
      };
    case 'instant-damage':
      return {
        ...structuredClone(base),
        damageMultiplier: isFinitePositive(candidate.damageMultiplier)
          ? candidate.damageMultiplier
          : base.damageMultiplier,
        ...(base.radius !== undefined
          ? { radius: isNonNegativeSafeInt(candidate.radius) ? candidate.radius : base.radius }
          : {}),
        ...(base.frontCells !== undefined
          ? {
              frontCells: isPositiveSafeInt(candidate.frontCells)
                ? candidate.frontCells
                : base.frontCells,
            }
          : {}),
        ...(base.bonusDamageMultiplierIfChilled !== undefined
          ? {
              bonusDamageMultiplierIfChilled: isFiniteNonNegative(candidate.bonusDamageMultiplierIfChilled)
                ? candidate.bonusDamageMultiplierIfChilled
                : base.bonusDamageMultiplierIfChilled,
            }
          : {}),
        ...(base.bonusDamageMultiplierIfBurnOrFreeze !== undefined
          ? {
              bonusDamageMultiplierIfBurnOrFreeze: isFiniteNonNegative(
                candidate.bonusDamageMultiplierIfBurnOrFreeze,
              )
                ? candidate.bonusDamageMultiplierIfBurnOrFreeze
                : base.bonusDamageMultiplierIfBurnOrFreeze,
            }
          : {}),
        ...(typeof candidate.armorPiercing === 'boolean'
          ? { armorPiercing: candidate.armorPiercing }
          : base.armorPiercing !== undefined
            ? { armorPiercing: base.armorPiercing }
            : {}),
        ...mergeOptionalStatuses(base, candidate),
      };
    case 'multihit-falling-area':
      return {
        ...structuredClone(base),
        count: isPositiveSafeInt(candidate.count) ? candidate.count : base.count,
        intervalSeconds: isFiniteNonNegative(candidate.intervalSeconds)
          ? candidate.intervalSeconds
          : base.intervalSeconds,
        travelSeconds: isFinitePositive(candidate.travelSeconds)
          ? candidate.travelSeconds
          : base.travelSeconds,
        radius: isNonNegativeSafeInt(candidate.radius) ? candidate.radius : base.radius,
        damageMultiplier: isFinitePositive(candidate.damageMultiplier)
          ? candidate.damageMultiplier
          : base.damageMultiplier,
        ...(typeof candidate.armorPiercing === 'boolean'
          ? { armorPiercing: candidate.armorPiercing }
          : base.armorPiercing !== undefined
            ? { armorPiercing: base.armorPiercing }
            : {}),
        ...(base.applyStatus
          ? { applyStatus: mergeAttachedStatus(base.applyStatus, candidate.applyStatus) }
          : {}),
      };
    case 'multihit-melee':
      return {
        ...structuredClone(base),
        count: isPositiveSafeInt(candidate.count) ? candidate.count : base.count,
        intervalSeconds: isFiniteNonNegative(candidate.intervalSeconds)
          ? candidate.intervalSeconds
          : base.intervalSeconds,
        damageMultiplier: isFinitePositive(candidate.damageMultiplier)
          ? candidate.damageMultiplier
          : base.damageMultiplier,
        ...(base.range !== undefined
          ? { range: isFinitePositive(candidate.range) ? candidate.range : base.range }
          : {}),
        ...(typeof candidate.armorPiercing === 'boolean'
          ? { armorPiercing: candidate.armorPiercing }
          : base.armorPiercing !== undefined
            ? { armorPiercing: base.armorPiercing }
            : {}),
        ...(base.applyStatus
          ? { applyStatus: mergeAttachedStatus(base.applyStatus, candidate.applyStatus) }
          : {}),
      };
    case 'status':
      return {
        ...structuredClone(base),
        ...(base.radius !== undefined
          ? { radius: isNonNegativeSafeInt(candidate.radius) ? candidate.radius : base.radius }
          : {}),
        status: mergeAttachedStatus(base.status, candidate.status),
      };
    case 'shield': {
      const rawZone =
        candidate.frontSlowZone && typeof candidate.frontSlowZone === 'object'
          ? (candidate.frontSlowZone as Record<string, unknown>)
          : null;
      return {
        kind: 'shield',
        shieldMaxHpPct: isFinitePositive(candidate.shieldMaxHpPct)
          ? candidate.shieldMaxHpPct
          : base.shieldMaxHpPct,
        ...(base.frontSlowZone
          ? {
              frontSlowZone: {
                slowPct:
                  rawZone && isUnitInterval(rawZone.slowPct, true)
                    ? rawZone.slowPct
                    : base.frontSlowZone.slowPct,
                residualDurationSeconds:
                  rawZone && isFinitePositive(rawZone.residualDurationSeconds)
                    ? rawZone.residualDurationSeconds
                    : base.frontSlowZone.residualDurationSeconds,
              },
            }
          : {}),
      };
    }
    case 'redirect':
      return {
        kind: 'redirect',
        radius: isNonNegativeSafeInt(candidate.radius) ? candidate.radius : base.radius,
        redirectSharePct: isUnitInterval(candidate.redirectSharePct, false)
          ? candidate.redirectSharePct
          : base.redirectSharePct,
        durationSeconds: isFinitePositive(candidate.durationSeconds)
          ? candidate.durationSeconds
          : base.durationSeconds,
      };
    case 'resource-burst':
      return {
        kind: 'resource-burst',
        amount: isPositiveSafeInt(candidate.amount) ? candidate.amount : base.amount,
        itemCount: isPositiveSafeInt(candidate.itemCount) ? candidate.itemCount : base.itemCount,
        spawnAsItems:
          typeof candidate.spawnAsItems === 'boolean' ? candidate.spawnAsItems : base.spawnAsItems,
      };
  }
}

/**
 * Safely merge user-saved abilities from localStorage into code-default abilities while
 * preserving structural metadata (`id`, `ownerDefenderId`, `targetScope`, `effect.kind`).
 */
export function mergeSavedAbilities(
  fallbackAbilities: readonly AbilityDef[],
  savedAbilities: unknown,
): AbilityDef[] {
  if (!Array.isArray(savedAbilities)) {
    return structuredClone([...fallbackAbilities]);
  }
  const savedById = new Map<string, Record<string, unknown>>();
  for (const item of savedAbilities) {
    if (item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string') {
      savedById.set((item as { id: string }).id, item as Record<string, unknown>);
    }
  }

  return fallbackAbilities.map(base => {
    const saved = savedById.get(base.id);
    if (
      !saved ||
      saved.ownerDefenderId !== base.ownerDefenderId ||
      !Array.isArray(saved.effects) ||
      saved.effects.length !== base.effects.length
    ) {
      return structuredClone(base);
    }

    const effectsMatchKinds = base.effects.every(
      (baseEff, idx) =>
        saved.effects &&
        Array.isArray(saved.effects) &&
        saved.effects[idx] &&
        typeof saved.effects[idx] === 'object' &&
        (saved.effects[idx] as { kind?: unknown }).kind === baseEff.kind,
    );
    if (!effectsMatchKinds) {
      return structuredClone(base);
    }

    const mergedEffects = base.effects.map((eff, idx) =>
      mergeEffect(eff, (saved.effects as unknown[])[idx]),
    );

    return {
      ...structuredClone(base),
      powerCrystalCost: isNonNegativeSafeInt(saved.powerCrystalCost)
        ? saved.powerCrystalCost
        : base.powerCrystalCost,
      cooldownSeconds: isFiniteNonNegative(saved.cooldownSeconds)
        ? saved.cooldownSeconds
        : base.cooldownSeconds,
      effects: mergedEffects as AbilityDef['effects'],
    };
  });
}

function parseNum(raw: string, min: number, max?: number, isInt = false): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  let clamped = Math.max(min, n);
  if (max !== undefined) clamped = Math.min(max, clamped);
  return isInt ? Math.round(clamped) : Number(clamped.toFixed(4));
}

function parsePct(raw: string, minPct: number, maxPct?: number): number | null {
  const pct = parseNum(raw, minPct, maxPct);
  if (pct === null) return null;
  return Number((pct / 100).toFixed(4));
}

function AttachedStatusFields({
  status,
  defenderDamage,
  inputStyle,
  labelPrefix = '',
  onChange,
}: {
  readonly status: AttachedStatusDef;
  readonly defenderDamage: number;
  readonly inputStyle: CSSProperties;
  readonly labelPrefix?: string;
  readonly onChange: (next: AttachedStatusDef) => void;
}) {
  switch (status.kind) {
    case 'slow':
      return (
        <>
          <label style={{ fontSize: 11, color: '#7DD3FC' }}>
            {labelPrefix}Slow (%)
            <input
              type="number"
              min={0}
              max={100}
              step={5}
              value={Math.round(status.slowPct * 100)}
              onChange={e => {
                const v = parsePct(e.target.value, 0, 100);
                if (v !== null) onChange({ ...status, slowPct: v });
              }}
              style={{ ...inputStyle, marginTop: 3 }}
            />
          </label>
          <label style={{ fontSize: 11, color: '#7DD3FC' }}>
            {labelPrefix}Slow Duration (s)
            <input
              type="number"
              min={0.1}
              step={0.5}
              value={status.durationSeconds}
              onChange={e => {
                const v = parseNum(e.target.value, 0.1);
                if (v !== null) onChange({ ...status, durationSeconds: v });
              }}
              style={{ ...inputStyle, marginTop: 3 }}
            />
          </label>
        </>
      );
    case 'stun':
      return (
        <label style={{ fontSize: 11, color: '#FDE047' }}>
          {labelPrefix}Stun Duration (s)
          <input
            type="number"
            min={0.1}
            step={0.5}
            value={status.durationSeconds}
            onChange={e => {
              const v = parseNum(e.target.value, 0.1);
              if (v !== null) onChange({ ...status, durationSeconds: v });
            }}
            style={{ ...inputStyle, marginTop: 3 }}
          />
        </label>
      );
    case 'freeze':
      return (
        <label style={{ fontSize: 11, color: '#7DD3FC' }}>
          {labelPrefix}Freeze Duration (s)
          <input
            type="number"
            min={0.1}
            step={0.5}
            value={status.durationSeconds}
            onChange={e => {
              const v = parseNum(e.target.value, 0.1);
              if (v !== null) onChange({ ...status, durationSeconds: v });
            }}
            style={{ ...inputStyle, marginTop: 3 }}
          />
        </label>
      );
    case 'vulnerable':
      return (
        <>
          <label style={{ fontSize: 11, color: '#FDBA74' }}>
            {labelPrefix}Extra Damage Taken (%)
            <input
              type="number"
              min={0}
              step={5}
              value={Math.round(status.damageTakenBonusPct * 100)}
              onChange={e => {
                const v = parsePct(e.target.value, 0);
                if (v !== null) onChange({ ...status, damageTakenBonusPct: v });
              }}
              style={{ ...inputStyle, marginTop: 3 }}
            />
          </label>
          <label style={{ fontSize: 11, color: '#FDBA74' }}>
            {labelPrefix}Mark Duration (s)
            <input
              type="number"
              min={0.1}
              step={0.5}
              value={status.durationSeconds}
              onChange={e => {
                const v = parseNum(e.target.value, 0.1);
                if (v !== null) onChange({ ...status, durationSeconds: v });
              }}
              style={{ ...inputStyle, marginTop: 3 }}
            />
          </label>
        </>
      );
    case 'burn':
      return (
        <>
          <label style={{ fontSize: 11, color: '#FB923C' }}>
            {labelPrefix}Burn (% AD/s)
            <input
              type="number"
              min={1}
              step={5}
              value={Math.round(status.damageMultiplierPerSecond * 100)}
              onChange={e => {
                const v = parsePct(e.target.value, 1);
                if (v !== null) onChange({ ...status, damageMultiplierPerSecond: v });
              }}
              style={{ ...inputStyle, marginTop: 3 }}
            />
            <span style={{ fontSize: 10, color: '#94A3B8' }}>
              = {Math.round(defenderDamage * status.damageMultiplierPerSecond)} dmg/s
            </span>
          </label>
          <label style={{ fontSize: 11, color: '#FB923C' }}>
            {labelPrefix}Burn Duration (s)
            <input
              type="number"
              min={0.1}
              step={0.5}
              value={status.durationSeconds}
              onChange={e => {
                const v = parseNum(e.target.value, 0.1);
                if (v !== null) onChange({ ...status, durationSeconds: v });
              }}
              style={{ ...inputStyle, marginTop: 3 }}
            />
          </label>
          <label style={{ fontSize: 11, color: '#FB923C' }}>
            {labelPrefix}Tick Interval (s)
            <input
              type="number"
              min={0.1}
              step={0.25}
              value={status.tickIntervalSeconds}
              onChange={e => {
                const v = parseNum(e.target.value, 0.1);
                if (v !== null) onChange({ ...status, tickIntervalSeconds: v });
              }}
              style={{ ...inputStyle, marginTop: 3 }}
            />
          </label>
        </>
      );
    case 'buff':
      return (
        <>
          <label style={{ fontSize: 11, color: '#4ADE80' }}>
            {labelPrefix}Attack Speed Bonus (%)
            <input
              type="number"
              min={0}
              step={10}
              value={Math.round(status.attackSpeedBonusPct * 100)}
              onChange={e => {
                const v = parsePct(e.target.value, 0);
                if (v !== null) onChange({ ...status, attackSpeedBonusPct: v });
              }}
              style={{ ...inputStyle, marginTop: 3 }}
            />
          </label>
          <label style={{ fontSize: 11, color: '#4ADE80' }}>
            {labelPrefix}Attack Damage Bonus (%)
            <input
              type="number"
              min={0}
              step={10}
              value={Math.round(status.attackDamageBonusPct * 100)}
              onChange={e => {
                const v = parsePct(e.target.value, 0);
                if (v !== null) onChange({ ...status, attackDamageBonusPct: v });
              }}
              style={{ ...inputStyle, marginTop: 3 }}
            />
          </label>
          <label style={{ fontSize: 11, color: '#4ADE80' }}>
            {labelPrefix}Buff Duration (s)
            <input
              type="number"
              min={0.1}
              step={0.5}
              value={status.durationSeconds}
              onChange={e => {
                const v = parseNum(e.target.value, 0.1);
                if (v !== null) onChange({ ...status, durationSeconds: v });
              }}
              style={{ ...inputStyle, marginTop: 3 }}
            />
          </label>
        </>
      );
  }
}

type BasicAttackStatusKind = 'slow' | 'burn' | 'stun' | 'freeze' | 'vulnerable';

const DEFAULT_BASIC_ATTACK_STATUS: Readonly<Record<BasicAttackStatusKind, AttachedStatusDef>> = {
  slow: { kind: 'slow', slowPct: 0.35, durationSeconds: 2.5 },
  burn: { kind: 'burn', damageMultiplierPerSecond: 0.2, durationSeconds: 3, tickIntervalSeconds: 1, damageType: 'fire' },
  stun: { kind: 'stun', durationSeconds: 1 },
  freeze: { kind: 'freeze', durationSeconds: 1.5 },
  vulnerable: { kind: 'vulnerable', damageTakenBonusPct: 0.25, durationSeconds: 3 },
};

/** Validate and sanitize a saved `basicAttackStatus` entry from localStorage. */
export function sanitizeBasicAttackStatus(raw: unknown): AttachedStatusDef | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const candidate = raw as Record<string, unknown>;
  switch (candidate.kind) {
    case 'slow':
      return isUnitInterval(candidate.slowPct, true) && isFinitePositive(candidate.durationSeconds)
        ? { kind: 'slow', slowPct: candidate.slowPct, durationSeconds: candidate.durationSeconds }
        : undefined;
    case 'stun':
      return isFinitePositive(candidate.durationSeconds)
        ? { kind: 'stun', durationSeconds: candidate.durationSeconds }
        : undefined;
    case 'freeze':
      return isFinitePositive(candidate.durationSeconds)
        ? { kind: 'freeze', durationSeconds: candidate.durationSeconds }
        : undefined;
    case 'vulnerable':
      return isFiniteNonNegative(candidate.damageTakenBonusPct) && isFinitePositive(candidate.durationSeconds)
        ? {
            kind: 'vulnerable',
            damageTakenBonusPct: candidate.damageTakenBonusPct,
            durationSeconds: candidate.durationSeconds,
          }
        : undefined;
    case 'burn':
      return isFinitePositive(candidate.damageMultiplierPerSecond) &&
        isFinitePositive(candidate.durationSeconds) &&
        isFinitePositive(candidate.tickIntervalSeconds)
        ? {
            kind: 'burn',
            damageMultiplierPerSecond: candidate.damageMultiplierPerSecond,
            durationSeconds: candidate.durationSeconds,
            tickIntervalSeconds: candidate.tickIntervalSeconds,
            damageType: 'fire',
          }
        : undefined;
    default:
      return undefined;
  }
}

export function PlaytestBasicAttackEditor({
  defender,
  inputStyle,
  onChange,
}: {
  readonly defender: PlaytestDefenderConfig;
  readonly inputStyle: CSSProperties;
  readonly onChange: (patch: {
    attackDamageType?: 'physical' | 'fire' | 'ice';
    basicAttackStatus?: AttachedStatusDef;
  }) => void;
}) {
  const activeDamageType = defender.attackDamageType ?? 'physical';
  const activeStatusKind = defender.basicAttackStatus?.kind ?? 'none';

  return (
    <div
      style={{
        background: '#0f172a',
        border: '1px solid #475569',
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: '#FACC15' }}>
        Basic Attack Effect (Đòn đánh thường)
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <label style={{ fontSize: 11, color: '#CBD5E1' }}>
          Attack Damage Type
          <select
            aria-label="Attack Damage Type"
            value={activeDamageType}
            onChange={e => {
              const val = e.target.value as 'physical' | 'fire' | 'ice';
              onChange({
                attackDamageType: val === 'physical' ? undefined : val,
                basicAttackStatus: defender.basicAttackStatus,
              });
            }}
            style={{ ...inputStyle, marginTop: 3 }}
          >
            <option value="physical">Physical (Vật lý)</option>
            <option value="ice">Ice (Băng)</option>
            <option value="fire">Fire (Lửa)</option>
          </select>
        </label>

        <label style={{ fontSize: 11, color: '#CBD5E1' }}>
          On-Hit Status
          <select
            aria-label="On-Hit Status"
            value={activeStatusKind}
            onChange={e => {
              const kind = e.target.value as 'none' | BasicAttackStatusKind;
              onChange({
                attackDamageType: defender.attackDamageType,
                basicAttackStatus:
                  kind === 'none' ? undefined : structuredClone(DEFAULT_BASIC_ATTACK_STATUS[kind]),
              });
            }}
            style={{ ...inputStyle, marginTop: 3 }}
          >
            <option value="none">None (Không hiệu ứng)</option>
            <option value="slow">Slow (Làm chậm)</option>
            <option value="burn">Burn (Thiêu đốt)</option>
            <option value="stun">Stun (Làm choáng)</option>
            <option value="freeze">Freeze (Đóng băng)</option>
            <option value="vulnerable">Vulnerable (Đánh dấu +Sát thương)</option>
          </select>
        </label>

        {defender.basicAttackStatus && (
          <AttachedStatusFields
            status={defender.basicAttackStatus}
            defenderDamage={defender.damage}
            inputStyle={inputStyle}
            labelPrefix="On-Hit "
            onChange={nextStatus =>
              onChange({
                attackDamageType: defender.attackDamageType,
                basicAttackStatus: nextStatus,
              })
            }
          />
        )}
      </div>
    </div>
  );
}

export function PlaytestAbilityEditor({
  ability,
  defender,
  abilityName,
  abilitySummary,
  inputStyle,
  onChange,
}: PlaytestAbilityEditorProps) {
  const updateEffectAt = (idx: number, nextEffect: AbilityEffectDef) => {
    const nextEffects = ability.effects.map((e, i) => (i === idx ? nextEffect : e));
    onChange({
      ...ability,
      effects: nextEffects as AbilityDef['effects'],
    });
  };

  return (
    <div
      style={{
        background: '#0f172a',
        border: '1px solid #0284c7',
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8' }}>
            Special Ability Tuning: {abilityName} ({ability.id})
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8' }}>{abilitySummary}</div>
        </div>
        <span className="mfd-badge" style={{ fontSize: 10 }}>
          Scope: {ability.targetScope}
        </span>
      </div>

      {/* Ability Cost & Cooldown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(140px, 220px))', gap: 10 }}>
        <label style={{ fontSize: 11, color: '#BAE6FD' }}>
          Crystal Cost
          <input
            type="number"
            min={0}
            max={5}
            step={1}
            value={ability.powerCrystalCost}
            onChange={e => {
              const v = parseNum(e.target.value, 0, 5, true);
              if (v !== null) onChange({ ...ability, powerCrystalCost: v });
            }}
            style={{ ...inputStyle, marginTop: 3 }}
          />
        </label>
        <label style={{ fontSize: 11, color: '#BAE6FD' }}>
          Ability Cooldown (s)
          <input
            type="number"
            min={0}
            step={0.5}
            value={ability.cooldownSeconds}
            onChange={e => {
              const v = parseNum(e.target.value, 0);
              if (v !== null) onChange({ ...ability, cooldownSeconds: v });
            }}
            style={{ ...inputStyle, marginTop: 3 }}
          />
        </label>
      </div>

      {/* Effects List */}
      {ability.effects.map((effect, idx) => (
        <div
          key={`${ability.id}-eff-${idx}`}
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 6,
            padding: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#FACC15' }}>
            Effect #{idx + 1}: {effect.kind}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {effect.kind === 'multihit-projectile' && (
              <>
                <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                  Projectile Count
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={effect.count}
                    onChange={e => {
                      const v = parseNum(e.target.value, 1, 100, true);
                      if (v !== null) updateEffectAt(idx, { ...effect, count: v });
                    }}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                </label>
                <label style={{ fontSize: 11, color: '#FDE047' }}>
                  Damage (% AD)
                  <input
                    type="number"
                    min={1}
                    step={10}
                    value={Math.round(effect.damageMultiplier * 100)}
                    onChange={e => {
                      const v = parsePct(e.target.value, 1);
                      if (v !== null) updateEffectAt(idx, { ...effect, damageMultiplier: v });
                    }}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                  <span style={{ fontSize: 10, color: '#94A3B8' }}>
                    = {Math.round(defender.damage * effect.damageMultiplier)}/hit · Total {Math.round(defender.damage * effect.damageMultiplier * effect.count)}
                  </span>
                </label>
                <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                  Fire Interval (s)
                  <input
                    type="number"
                    min={0}
                    step={0.05}
                    value={effect.intervalSeconds}
                    onChange={e => {
                      const v = parseNum(e.target.value, 0);
                      if (v !== null) updateEffectAt(idx, { ...effect, intervalSeconds: v });
                    }}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                </label>
                <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                  Projectile Speed (cells/s)
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={effect.projectileSpeed}
                    onChange={e => {
                      const v = parseNum(e.target.value, 0.5);
                      if (v !== null) updateEffectAt(idx, { ...effect, projectileSpeed: v });
                    }}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#E2E8F0', paddingTop: 14 }}>
                  <input
                    type="checkbox"
                    checked={effect.pierce}
                    onChange={e => updateEffectAt(idx, { ...effect, pierce: e.target.checked })}
                  />
                  Pierce Enemies
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#E2E8F0', paddingTop: 14 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(effect.armorPiercing)}
                    onChange={e => updateEffectAt(idx, { ...effect, armorPiercing: e.target.checked })}
                  />
                  Armor Piercing
                </label>
              </>
            )}

            {effect.kind === 'projectile' && (
              <>
                <label style={{ fontSize: 11, color: '#FDE047' }}>
                  Damage (% AD)
                  <input
                    type="number"
                    min={1}
                    step={25}
                    value={Math.round(effect.damageMultiplier * 100)}
                    onChange={e => {
                      const v = parsePct(e.target.value, 1);
                      if (v !== null) updateEffectAt(idx, { ...effect, damageMultiplier: v });
                    }}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                  <span style={{ fontSize: 10, color: '#94A3B8' }}>
                    = {Math.round(defender.damage * effect.damageMultiplier)} dmg
                  </span>
                </label>
                <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                  Projectile Speed (cells/s)
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={effect.projectileSpeed}
                    onChange={e => {
                      const v = parseNum(e.target.value, 0.5);
                      if (v !== null) updateEffectAt(idx, { ...effect, projectileSpeed: v });
                    }}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                </label>
                {effect.targetMaxHpBonusPct !== undefined && (
                  <label style={{ fontSize: 11, color: '#FCA5A5' }}>
                    Bonus (% Target HP)
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      value={Math.round(effect.targetMaxHpBonusPct * 100)}
                      onChange={e => {
                        const v = parsePct(e.target.value, 0, 100);
                        if (v !== null) updateEffectAt(idx, { ...effect, targetMaxHpBonusPct: v });
                      }}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#E2E8F0', paddingTop: 14 }}>
                  <input
                    type="checkbox"
                    checked={effect.pierce}
                    onChange={e => updateEffectAt(idx, { ...effect, pierce: e.target.checked })}
                  />
                  Pierce Enemies
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#E2E8F0', paddingTop: 14 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(effect.armorPiercing)}
                    onChange={e => updateEffectAt(idx, { ...effect, armorPiercing: e.target.checked })}
                  />
                  Armor Piercing
                </label>
              </>
            )}

            {effect.kind === 'instant-damage' && (
              <>
                <label style={{ fontSize: 11, color: '#FDE047' }}>
                  Damage (% AD)
                  <input
                    type="number"
                    min={1}
                    step={10}
                    value={Math.round(effect.damageMultiplier * 100)}
                    onChange={e => {
                      const v = parsePct(e.target.value, 1);
                      if (v !== null) updateEffectAt(idx, { ...effect, damageMultiplier: v });
                    }}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                  <span style={{ fontSize: 10, color: '#94A3B8' }}>
                    = {Math.round(defender.damage * effect.damageMultiplier)} dmg
                  </span>
                </label>
                {effect.bonusDamageMultiplierIfChilled !== undefined && (
                  <label style={{ fontSize: 11, color: '#7DD3FC' }}>
                    Bonus vs Chilled (% AD)
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={Math.round(effect.bonusDamageMultiplierIfChilled * 100)}
                      onChange={e => {
                        const v = parsePct(e.target.value, 0);
                        if (v !== null) updateEffectAt(idx, { ...effect, bonusDamageMultiplierIfChilled: v });
                      }}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                )}
                {effect.bonusDamageMultiplierIfBurnOrFreeze !== undefined && (
                  <label style={{ fontSize: 11, color: '#FB923C' }}>
                    Bonus vs Burn/Freeze (% AD)
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={Math.round(effect.bonusDamageMultiplierIfBurnOrFreeze * 100)}
                      onChange={e => {
                        const v = parsePct(e.target.value, 0);
                        if (v !== null) {
                          updateEffectAt(idx, { ...effect, bonusDamageMultiplierIfBurnOrFreeze: v });
                        }
                      }}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                )}
                {effect.frontCells !== undefined && (
                  <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                    Front Cells
                    <input
                      type="number"
                      min={1}
                      max={9}
                      step={1}
                      value={effect.frontCells}
                      onChange={e => {
                        const v = parseNum(e.target.value, 1, 9, true);
                        if (v !== null) updateEffectAt(idx, { ...effect, frontCells: v });
                      }}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                )}
                {effect.radius !== undefined && (
                  <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                    AoE Radius (cells)
                    <input
                      type="number"
                      min={0}
                      max={4}
                      step={1}
                      value={effect.radius}
                      onChange={e => {
                        const v = parseNum(e.target.value, 0, 4, true);
                        if (v !== null) updateEffectAt(idx, { ...effect, radius: v });
                      }}
                      style={{ ...inputStyle, marginTop: 3 }}
                    />
                  </label>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#E2E8F0', paddingTop: 14 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(effect.armorPiercing)}
                    onChange={e => updateEffectAt(idx, { ...effect, armorPiercing: e.target.checked })}
                  />
                  Armor Piercing
                </label>
              </>
            )}

            {effect.kind === 'multihit-falling-area' && (
              <>
                <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                  Drop Count
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={effect.count}
                    onChange={e => {
                      const v = parseNum(e.target.value, 1, 100, true);
                      if (v !== null) updateEffectAt(idx, { ...effect, count: v });
                    }}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                </label>
                <label style={{ fontSize: 11, color: '#FDE047' }}>
                  Damage (% AD)
                  <input
                    type="number"
                    min={1}
                    step={10}
                    value={Math.round(effect.damageMultiplier * 100)}
                    onChange={e => {
                      const v = parsePct(e.target.value, 1);
                      if (v !== null) updateEffectAt(idx, { ...effect, damageMultiplier: v });
                    }}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                  <span style={{ fontSize: 10, color: '#94A3B8' }}>
                    = {Math.round(defender.damage * effect.damageMultiplier)}/hit · Total {Math.round(defender.damage * effect.damageMultiplier * effect.count)}
                  </span>
                </label>
                <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                  Drop Interval (s)
                  <input
                    type="number"
                    min={0}
                    step={0.05}
                    value={effect.intervalSeconds}
                    onChange={e => {
                      const v = parseNum(e.target.value, 0);
                      if (v !== null) updateEffectAt(idx, { ...effect, intervalSeconds: v });
                    }}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                </label>
                <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                  Travel Time (s)
                  <input
                    type="number"
                    min={0.05}
                    step={0.05}
                    value={effect.travelSeconds}
                    onChange={e => {
                      const v = parseNum(e.target.value, 0.05);
                      if (v !== null) updateEffectAt(idx, { ...effect, travelSeconds: v });
                    }}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                </label>
                <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                  AoE Radius (cells)
                  <input
                    type="number"
                    min={0}
                    max={4}
                    step={1}
                    value={effect.radius}
                    onChange={e => {
                      const v = parseNum(e.target.value, 0, 4, true);
                      if (v !== null) updateEffectAt(idx, { ...effect, radius: v });
                    }}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#E2E8F0', paddingTop: 14 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(effect.armorPiercing)}
                    onChange={e => updateEffectAt(idx, { ...effect, armorPiercing: e.target.checked })}
                  />
                  Armor Piercing
                </label>
              </>
            )}

            {effect.kind === 'multihit-melee' && (
              <>
                <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                  Hit Count
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={effect.count}
                    onChange={e => {
                      const v = parseNum(e.target.value, 1, 100, true);
                      if (v !== null) updateEffectAt(idx, { ...effect, count: v });
                    }}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                </label>
                <label style={{ fontSize: 11, color: '#FDE047' }}>
                  Damage (% AD)
                  <input
                    type="number"
                    min={1}
                    step={10}
                    value={Math.round(effect.damageMultiplier * 100)}
                    onChange={e => {
                      const v = parsePct(e.target.value, 1);
                      if (v !== null) updateEffectAt(idx, { ...effect, damageMultiplier: v });
                    }}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                </label>
                <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                  Hit Interval (s)
                  <input
                    type="number"
                    min={0}
                    step={0.05}
                    value={effect.intervalSeconds}
                    onChange={e => {
                      const v = parseNum(e.target.value, 0);
                      if (v !== null) updateEffectAt(idx, { ...effect, intervalSeconds: v });
                    }}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                </label>
              </>
            )}

            {effect.kind === 'status' && effect.radius !== undefined && (
              <label style={{ fontSize: 11, color: '#CBD5E1' }}>
                AoE Radius (cells)
                <input
                  type="number"
                  min={0}
                  max={4}
                  step={1}
                  value={effect.radius}
                  onChange={e => {
                    const v = parseNum(e.target.value, 0, 4, true);
                    if (v !== null) updateEffectAt(idx, { ...effect, radius: v });
                  }}
                  style={{ ...inputStyle, marginTop: 3 }}
                />
              </label>
            )}

            {effect.kind === 'shield' && (
              <>
                <label style={{ fontSize: 11, color: '#38BDF8' }}>
                  Shield (% HP)
                  <input
                    type="number"
                    min={1}
                    step={10}
                    value={Math.round(effect.shieldMaxHpPct * 100)}
                    onChange={e => {
                      const v = parsePct(e.target.value, 1);
                      if (v !== null) updateEffectAt(idx, { ...effect, shieldMaxHpPct: v });
                    }}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                  <span style={{ fontSize: 10, color: '#94A3B8' }}>
                    = {Math.round(defender.maxHp * effect.shieldMaxHpPct)} Shield HP
                  </span>
                </label>
                {effect.frontSlowZone && (
                  <>
                    <label style={{ fontSize: 11, color: '#7DD3FC' }}>
                      Slow Zone (%)
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={5}
                        value={Math.round(effect.frontSlowZone.slowPct * 100)}
                        onChange={e => {
                          const v = parsePct(e.target.value, 0, 100);
                          if (v !== null && effect.frontSlowZone) {
                            updateEffectAt(idx, {
                              ...effect,
                              frontSlowZone: { ...effect.frontSlowZone, slowPct: v },
                            });
                          }
                        }}
                        style={{ ...inputStyle, marginTop: 3 }}
                      />
                    </label>
                    <label style={{ fontSize: 11, color: '#7DD3FC' }}>
                      Slow Lingering (s)
                      <input
                        type="number"
                        min={0.1}
                        step={0.5}
                        value={effect.frontSlowZone.residualDurationSeconds}
                        onChange={e => {
                          const v = parseNum(e.target.value, 0.1);
                          if (v !== null && effect.frontSlowZone) {
                            updateEffectAt(idx, {
                              ...effect,
                              frontSlowZone: { ...effect.frontSlowZone, residualDurationSeconds: v },
                            });
                          }
                        }}
                        style={{ ...inputStyle, marginTop: 3 }}
                      />
                    </label>
                  </>
                )}
              </>
            )}

            {effect.kind === 'redirect' && (
              <>
                <label style={{ fontSize: 11, color: '#93C5FD' }}>
                  Damage Redirect (%)
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step={5}
                    value={Math.round(effect.redirectSharePct * 100)}
                    onChange={e => {
                      const v = parsePct(e.target.value, 1, 100);
                      if (v !== null) updateEffectAt(idx, { ...effect, redirectSharePct: v });
                    }}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                </label>
                <label style={{ fontSize: 11, color: '#93C5FD' }}>
                  Aura Duration (s)
                  <input
                    type="number"
                    min={0.1}
                    step={0.5}
                    value={effect.durationSeconds}
                    onChange={e => {
                      const v = parseNum(e.target.value, 0.1);
                      if (v !== null) updateEffectAt(idx, { ...effect, durationSeconds: v });
                    }}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                </label>
                <label style={{ fontSize: 11, color: '#93C5FD' }}>
                  Aura Radius (cells)
                  <input
                    type="number"
                    min={0}
                    max={4}
                    step={1}
                    value={effect.radius}
                    onChange={e => {
                      const v = parseNum(e.target.value, 0, 4, true);
                      if (v !== null) updateEffectAt(idx, { ...effect, radius: v });
                    }}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                </label>
              </>
            )}

            {effect.kind === 'resource-burst' && (
              <>
                <label style={{ fontSize: 11, color: '#6EE7B7' }}>
                  Total Emeralds
                  <input
                    type="number"
                    min={1}
                    step={25}
                    value={effect.amount}
                    onChange={e => {
                      const v = parseNum(e.target.value, 1, undefined, true);
                      if (v !== null) updateEffectAt(idx, { ...effect, amount: v });
                    }}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                  <span style={{ fontSize: 10, color: '#94A3B8' }}>
                    ≈ {Math.floor(effect.amount / Math.max(1, effect.itemCount))} EM/item
                  </span>
                </label>
                <label style={{ fontSize: 11, color: '#6EE7B7' }}>
                  Item Count
                  <input
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    value={effect.itemCount}
                    onChange={e => {
                      const v = parseNum(e.target.value, 1, 50, true);
                      if (v !== null) updateEffectAt(idx, { ...effect, itemCount: v });
                    }}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#E2E8F0', paddingTop: 14 }}>
                  <input
                    type="checkbox"
                    checked={effect.spawnAsItems}
                    onChange={e => updateEffectAt(idx, { ...effect, spawnAsItems: e.target.checked })}
                  />
                  Spawn Collectible Items
                </label>
              </>
            )}

            {/* Attached status inside `status`, `applyStatus`, or `applyStatuses` */}
            {effect.kind === 'status' && (
              <AttachedStatusFields
                status={effect.status}
                defenderDamage={defender.damage}
                inputStyle={inputStyle}
                onChange={nextStatus => updateEffectAt(idx, { ...effect, status: nextStatus })}
              />
            )}

            {'applyStatus' in effect && effect.applyStatus && (
              <AttachedStatusFields
                status={effect.applyStatus}
                defenderDamage={defender.damage}
                inputStyle={inputStyle}
                onChange={nextStatus =>
                  updateEffectAt(idx, { ...effect, applyStatus: nextStatus } as AbilityEffectDef)
                }
              />
            )}

            {'applyStatuses' in effect &&
              effect.applyStatuses &&
              effect.applyStatuses.map((st, sIdx) => (
                <AttachedStatusFields
                  key={`${ability.id}-eff-${idx}-st-${sIdx}`}
                  status={st}
                  defenderDamage={defender.damage}
                  inputStyle={inputStyle}
                  onChange={nextStatus => {
                    const updated = effect.applyStatuses!.map((entry, j) =>
                      j === sIdx ? nextStatus : entry,
                    );
                    updateEffectAt(idx, { ...effect, applyStatuses: updated } as AbilityEffectDef);
                  }}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

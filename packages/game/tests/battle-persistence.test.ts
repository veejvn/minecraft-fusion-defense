import { afterEach, describe, expect, it } from 'vitest';
import type { AbilityDefinition, AbilitySessionInput } from '../src/abilities/ability-session';
import type { CombatSessionInput } from '../src/combat/combat-session';
import type { ResourceSessionInput } from '../src/core/resource-session';
import { QUEUE_CAPACITY } from '../src/events/event-queue';
import type { FusionSessionInput } from '../src/fusion/fusion-session';
import {
  ACTIVE_BATTLE_STORAGE_KEY,
  CheckpointManager,
  MAX_RAM_CHECKPOINTS,
} from '../src/persistence/checkpoint-manager';
import {
  PROGRESSION_SCHEMA_VERSION,
  PROGRESSION_STORAGE_KEY,
  ProgressionStore,
  ProgressionValidationError,
  STARTER_DEFENDER_IDS,
  STARTER_RECIPE_IDS,
  applyProgressionUnlocks,
  createStarterProgressionProfile,
  getAchievementsView,
  getDefenderCollectionView,
  migrateProgressionEnvelope,
  parseAndValidateProgressionEnvelope,
  serializeProgressionEnvelope,
} from '../src/persistence/progression-store';
import {
  SAVE_SCHEMA_VERSION,
  SnapshotValidationError,
  deserializeBattleCheckpoint,
  serializeBattleCheckpoint,
  type BattleCheckpointEnvelope,
} from '../src/persistence/snapshot-codec';
import {
  BrowserLocalStorageAdapter,
  InMemoryStorageAdapter,
  backupKey,
  type PersistenceStorageAdapter,
} from '../src/persistence/storage-adapter';
import { BattleRuntime } from '../src/systems/battle-runtime';
import type { WaveConfigDefinition, WaveSessionInput } from '../src/waves/wave-session';

// Test-only fixtures. Never treat these values as approved production balance.
function resourceFixture(overrides: Partial<ResourceSessionInput> = {}): ResourceSessionInput {
  return {
    seed: 1,
    defenders: [
      { id: 'iron_golem', classification: 'base', summonEnergyCost: 0, unlocked: true },
      { id: 'skeleton', classification: 'base', summonEnergyCost: 0, unlocked: true },
      { id: 'snow_golem', classification: 'base', summonEnergyCost: 0, unlocked: true },
      { id: 'wolf', classification: 'base', summonEnergyCost: 0, unlocked: true },
      { id: 'blaze', classification: 'base', summonEnergyCost: 0, unlocked: true },
      { id: 'skeleton_sniper', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      { id: 'steel_guardian', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      { id: 'ice_golem', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      { id: 'frost_guardian', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      { id: 'alpha_wolf', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      { id: 'inferno_archer', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
      { id: 'flame_fang', classification: 'fusion', summonEnergyCost: 0, unlocked: true },
    ],
    enemies: [
      { id: 'enemy_grunt', energy: 50, crystals: 1 },
      { id: 'enemy_pass', energy: 50, crystals: 0 },
      { id: 'enemy_weak', energy: 25, crystals: 0 },
    ],
    waves: [
      { id: 'wave_1', crystals: 5 },
      { id: 'wave_2', crystals: 5 },
      { id: 'wave_3', crystals: 5 },
      { id: 'wave_4', crystals: 5 },
      { id: 'wave_5', crystals: 5 },
    ],
    energyItems: {
      amount: 10,
      intervalSeconds: 100,
      region: { min: { x: 0, y: 0 }, max: { x: 1, y: 1 } },
      positions: [{ x: 0.5, y: 0.5 }],
    },
    ...overrides,
  };
}

// Test-only fixtures. Never treat these values as approved production balance.
function combatFixture(overrides: Partial<CombatSessionInput> = {}): CombatSessionInput {
  return {
    spawnX: 9,
    defenders: [
      { id: 'iron_golem', maxHp: 200, damage: 20, attackSpeed: 1, attackRange: 4, targeting: 'CLOSEST_TO_BASE' },
      { id: 'skeleton', maxHp: 100, damage: 15, attackSpeed: 1, attackRange: 5, targeting: 'CLOSEST_TO_BASE' },
      { id: 'snow_golem', maxHp: 100, damage: 0, attackSpeed: 1, attackRange: 4, targeting: 'CLOSEST_TO_BASE' },
      { id: 'wolf', maxHp: 100, damage: 20, attackSpeed: 1, attackRange: 2, targeting: 'CLOSEST_TO_BASE' },
      { id: 'blaze', maxHp: 100, damage: 20, attackSpeed: 1, attackRange: 4, targeting: 'CLOSEST_TO_BASE' },
      { id: 'skeleton_sniper', maxHp: 150, damage: 30, attackSpeed: 1, attackRange: 9, targeting: 'CLOSEST_TO_BASE' },
      { id: 'steel_guardian', maxHp: 300, damage: 0, attackSpeed: 1, attackRange: 2, targeting: 'CLOSEST_TO_BASE', armor: 100 },
      { id: 'ice_golem', maxHp: 180, damage: 0, attackSpeed: 1, attackRange: 5, targeting: 'CLOSEST_TO_BASE' },
      { id: 'frost_guardian', maxHp: 400, damage: 0, attackSpeed: 1, attackRange: 4, targeting: 'CLOSEST_TO_BASE' },
      { id: 'alpha_wolf', maxHp: 200, damage: 40, attackSpeed: 1, attackRange: 2, targeting: 'CLOSEST_TO_BASE' },
      { id: 'inferno_archer', maxHp: 200, damage: 30, attackSpeed: 1, attackRange: 9, targeting: 'CLOSEST_TO_BASE' },
      { id: 'flame_fang', maxHp: 250, damage: 25, attackSpeed: 1, attackRange: 2, targeting: 'CLOSEST_TO_BASE' },
    ],
    enemies: [
      { id: 'enemy_grunt', maxHp: 1000, moveSpeed: 1, behavior: 'STOP_AND_ATTACK', damage: 20, attackSpeed: 1, attackRange: 0 },
      { id: 'enemy_pass', maxHp: 1000, moveSpeed: 1, behavior: 'IGNORE_DEFENDER' },
      { id: 'enemy_weak', maxHp: 10, moveSpeed: 1, behavior: 'IGNORE_DEFENDER' },
    ],
    ...overrides,
  };
}

// Test-only fixtures. Never treat these values as approved production balance.
function fusionFixture(overrides: Partial<FusionSessionInput> = {}): FusionSessionInput {
  return {
    defenders: [
      { id: 'iron_golem', tier: 1 },
      { id: 'skeleton', tier: 1 },
      { id: 'snow_golem', tier: 1 },
      { id: 'wolf', tier: 1 },
      { id: 'blaze', tier: 1 },
      { id: 'skeleton_sniper', tier: 2 },
      { id: 'steel_guardian', tier: 2 },
      { id: 'ice_golem', tier: 2 },
      { id: 'frost_guardian', tier: 2 },
      { id: 'alpha_wolf', tier: 2 },
      { id: 'inferno_archer', tier: 2 },
      { id: 'flame_fang', tier: 2 },
    ],
    recipes: [
      { id: 'fusion_skeleton_sniper', inputDefenderIds: ['skeleton', 'skeleton'], outputDefenderId: 'skeleton_sniper', unlocked: true, enabled: true },
      { id: 'fusion_steel_guardian', inputDefenderIds: ['iron_golem', 'iron_golem'], outputDefenderId: 'steel_guardian', unlocked: true, enabled: true },
      { id: 'fusion_ice_golem', inputDefenderIds: ['snow_golem', 'snow_golem'], outputDefenderId: 'ice_golem', unlocked: true, enabled: true },
      { id: 'fusion_frost_guardian', inputDefenderIds: ['iron_golem', 'snow_golem'], outputDefenderId: 'frost_guardian', unlocked: true, enabled: true },
      { id: 'fusion_alpha_wolf', inputDefenderIds: ['wolf', 'wolf'], outputDefenderId: 'alpha_wolf', unlocked: true, enabled: true },
      { id: 'fusion_inferno_archer', inputDefenderIds: ['blaze', 'skeleton'], outputDefenderId: 'inferno_archer', unlocked: true, enabled: true },
      { id: 'fusion_flame_fang', inputDefenderIds: ['blaze', 'wolf'], outputDefenderId: 'flame_fang', unlocked: true, enabled: true },
    ],
    ...overrides,
  };
}

// Test-only fixtures. Never treat these values as approved production balance.
function abilityFixture(overrides: Partial<AbilitySessionInput> = {}): AbilitySessionInput {
  const abilities: AbilityDefinition[] = [
    {
      id: 'blizzard',
      ownerDefenderId: 'snow_golem',
      powerCrystalCost: 1,
      cooldownSeconds: 0,
      requiresTarget: true,
      targetScope: 'same-lane-enemies',
      effects: [
        { kind: 'status', scope: 'same-lane-enemies', status: { kind: 'slow', slowPct: 0.5, durationSeconds: 5 } },
      ],
    },
    {
      id: 'earthquake',
      ownerDefenderId: 'iron_golem',
      powerCrystalCost: 1,
      cooldownSeconds: 0,
      requiresTarget: true,
      targetScope: 'same-lane-enemies',
      effects: [
        {
          kind: 'instant-damage',
          scope: 'same-lane-enemies',
          damageMultiplier: 3,
          damageType: 'physical',
          applyStatus: { kind: 'stun', durationSeconds: 2 },
        },
      ],
    },
    {
      id: 'arrow_storm',
      ownerDefenderId: 'skeleton',
      powerCrystalCost: 1,
      cooldownSeconds: 0,
      requiresTarget: true,
      targetScope: 'same-lane-enemy-in-range',
      effects: [
        {
          kind: 'multihit-projectile',
          count: 8,
          intervalSeconds: 0.2,
          damageMultiplier: 1,
          damageType: 'physical',
          projectileSpeed: 10,
          pierce: false,
        },
      ],
    },
    {
      id: 'pack_frenzy',
      ownerDefenderId: 'wolf',
      powerCrystalCost: 1,
      cooldownSeconds: 0,
      requiresTarget: false,
      targetScope: 'self',
      effects: [
        {
          kind: 'status',
          scope: 'self',
          status: { kind: 'buff', attackSpeedBonusPct: 0.5, attackDamageBonusPct: 0.5, durationSeconds: 5 },
        },
      ],
    },
    {
      id: 'inferno',
      ownerDefenderId: 'blaze',
      powerCrystalCost: 1,
      cooldownSeconds: 0,
      requiresTarget: true,
      targetScope: 'same-lane-enemies',
      effects: [
        {
          kind: 'instant-damage',
          scope: 'same-lane-enemies',
          damageMultiplier: 3,
          damageType: 'fire',
          armorPiercing: true,
          applyStatus: {
            kind: 'burn',
            damageMultiplierPerSecond: 0.5,
            durationSeconds: 5,
            tickIntervalSeconds: 1,
            damageType: 'fire',
          },
        },
      ],
    },
    {
      id: 'piercing_barrage',
      ownerDefenderId: 'skeleton_sniper',
      powerCrystalCost: 1,
      cooldownSeconds: 0,
      requiresTarget: false,
      targetScope: 'self',
      effects: [
        {
          kind: 'projectile',
          damageMultiplier: 6,
          damageType: 'physical',
          projectileSpeed: 20,
          pierce: true,
        },
      ],
    },
    {
      id: 'glacial_fortress',
      ownerDefenderId: 'frost_guardian',
      powerCrystalCost: 1,
      cooldownSeconds: 0,
      requiresTarget: false,
      targetScope: 'self',
      effects: [
        {
          kind: 'shield',
          shieldMaxHpPct: 0.5,
          frontSlowZone: { slowPct: 0.5, residualDurationSeconds: 5 },
        },
      ],
    },
  ];
  return { abilities, ...overrides };
}

// Test-only fixtures. Never treat these values as approved production balance.
function makeWaveConfig(
  id: string,
  overrides: Partial<WaveConfigDefinition> = {},
): WaveConfigDefinition {
  return {
    id,
    initialDelaySeconds: 0,
    delayBeforeNextWaveSeconds: 0.5,
    spawnGroups: [
      {
        enemyId: 'enemy_weak',
        count: 1,
        allowedLanes: [0],
        laneMode: 'fixed',
        startOffsetSeconds: 0,
        intervalSeconds: 0,
      },
    ],
    ...overrides,
  };
}

// Test-only fixtures. Never treat these values as approved production balance.
function waveFixture(overrides: Partial<WaveSessionInput> = {}): WaveSessionInput {
  return {
    levelId: 'grassland_fixture',
    waveCount: 5,
    waves: [
      makeWaveConfig('wave_1'),
      makeWaveConfig('wave_2'),
      makeWaveConfig('wave_3'),
      makeWaveConfig('wave_4'),
      makeWaveConfig('wave_5'),
    ],
    ...overrides,
  };
}

function step(game: BattleRuntime, ticks = 1, ticksPerSecond = 10): number {
  return game.advance((ticks * 1000) / ticksPerSecond);
}

/** Play a complete 5-wave match to terminal Victory using deterministic test fixtures. */
function playVictoryMatch(options: {
  battleId: string;
  killsPerWave?: number;
  progressionStore?: ProgressionStore;
  storage?: PersistenceStorageAdapter;
}): BattleRuntime {
  const killsPerWave = options.killsPerWave ?? 1;
  const ticksPerSecond = 10;
  const waves = waveFixture({
    waves: Array.from({ length: 5 }, (_, idx) =>
      makeWaveConfig(`wave_${idx + 1}`, {
        initialDelaySeconds: idx === 0 ? 0.2 : 0,
        delayBeforeNextWaveSeconds: 0.2,
        spawnGroups: [
          {
            enemyId: 'enemy_weak',
            count: killsPerWave,
            allowedLanes: [0],
            laneMode: 'fixed',
            startOffsetSeconds: 0,
            intervalSeconds: 0.1,
          },
        ],
      }),
    ),
  });
  const combat = combatFixture({
    defenders: combatFixture().defenders.map(d =>
      d.id === 'skeleton' ? { ...d, damage: 100, attackSpeed: 10, attackRange: 9 } : d,
    ),
  });
  const runtime = new BattleRuntime(
    { ticksPerSecond, maxCatchUpTicks: 250 },
    resourceFixture(),
    combat,
    fusionFixture(),
    waves,
    abilityFixture(),
    {
      battleId: options.battleId,
      storage: options.storage,
      progressionStore: options.progressionStore,
    },
  );

  runtime.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 0 } }, 1);
  for (let i = 0; i < 100; i++) {
    step(runtime, 1, ticksPerSecond);
    if (runtime.snapshot().waves?.terminal === 'victory') {
      break;
    }
  }
  expect(runtime.snapshot().waves?.terminal).toBe('victory');
  return runtime;
}

describe('T-11.6 Battle Persistence & Persistent Progression (AC-01 – AC-18)', () => {
  const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

  afterEach(() => {
    if (originalLocalStorageDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', originalLocalStorageDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

  describe('AC-01 Lossless round-trip of full BattleState', () => {
    it('losslessly encodes and decodes bigint IDs, Map, Set, occupancy, entities, resources, combat, fusion, waves, abilities, EventQueue, rng, tick, paused, battleGeneration, and matchKills', () => {
      const storage = new InMemoryStorageAdapter();
      const baseAbilities = abilityFixture();
      const customAbilities = abilityFixture({
        abilities: [
          ...baseAbilities.abilities.map(a =>
            a.id === 'glacial_fortress' ? { ...a, cooldownSeconds: 5 } : a,
          ),
        ],
      });
      const runtime = new BattleRuntime(
        { ticksPerSecond: 10, maxCatchUpTicks: 250 },
        resourceFixture({
          energyItems: {
            amount: 10,
            intervalSeconds: 0.2,
            region: { min: { x: 0, y: 0 }, max: { x: 1, y: 1 } },
            positions: [{ x: 0.25, y: 0.75 }],
          },
        }),
        combatFixture(),
        fusionFixture(),
        waveFixture({
          waves: [
            makeWaveConfig('wave_1', { initialDelaySeconds: 10 }),
            makeWaveConfig('wave_2', { initialDelaySeconds: 0 }),
            makeWaveConfig('wave_3'),
            makeWaveConfig('wave_4'),
            makeWaveConfig('wave_5'),
          ],
        }),
        customAbilities,
        { battleId: 'battle_ac01', storage },
      );

      // Tick 1: grant crystals, spawn defenders & enemies, apply fusion and abilities.
      runtime.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
      runtime.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 0, column: 0 } }, 1); // 0n
      runtime.enqueue({ type: 'summon', definitionId: 'snow_golem', cell: { row: 0, column: 1 } }, 1); // 1n
      runtime.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 1, column: 0 } }, 1); // 2n
      runtime.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 1, column: 1 } }, 1); // 3n
      runtime.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 1, position: 1.5 } }, 1); // 4n
      runtime.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_weak', lane: 2, position: 3.0 } }, 1); // 5n
      runtime.enqueue({ type: 'summon', definitionId: 'blaze', cell: { row: 2, column: 0 } }, 1); // 6n (kills 5n -> matchKills=1, rewardedEnemies)
      step(runtime, 1);

      // Tick 2: fuse iron_golem+snow_golem -> frost_guardian (7n) and skeleton+skeleton -> skeleton_sniper (8n).
      runtime.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 2);
      runtime.enqueue({ type: 'fuse', sourceId: 2n, targetId: 3n }, 2);
      step(runtime, 1);

      // Tick 3: activate glacial_fortress (shield + cooldown), piercing_barrage (projectile), inferno (burn).
      runtime.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 2, position: 6.0 } }, 3); // 9n
      runtime.enqueue({ type: 'activate-ability', defenderId: 7n }, 3);
      runtime.enqueue({ type: 'activate-ability', defenderId: 8n }, 3);
      runtime.enqueue({ type: 'activate-ability', defenderId: 6n }, 3);
      step(runtime, 2); // Tick 4: projectile hits 4n -> hitEnemyIds has 4n; tick 5: still in flight!

      // Claim pending crystals to populate processedClaims.
      runtime.enqueue({ type: 'claim', requestId: 'claim_ac01' }, 5);
      runtime.enqueue({ type: 'summon', definitionId: 'wolf', cell: { row: 4, column: 4 } }, 7); // future queued event
      step(runtime, 1); // Tick 5
      runtime.advance(35); // Non-zero accumulatorMs
      runtime.setPaused(true);

      const cp = runtime.createCheckpoint('manual');
      const decoded = deserializeBattleCheckpoint(cp.json);

      expect(decoded.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
      expect(decoded.battleId).toBe('battle_ac01');
      expect(decoded.battleGeneration).toBe(1);
      expect(decoded.tick).toBe(5);
      expect(decoded.paused).toBe(true);
      expect(decoded.accumulatorMs).toBe(35);

      // Verify runtime JS types after decoding.
      expect(typeof decoded.state.nextEntityId).toBe('bigint');
      expect(decoded.state.entities instanceof Map).toBe(true);
      expect(decoded.state.resources?.items instanceof Map).toBe(true);
      expect(typeof decoded.state.resources?.nextItemId).toBe('bigint');
      expect(decoded.state.resources?.rewardedEnemies instanceof Set).toBe(true);
      expect(decoded.state.resources?.rewardedWaves instanceof Set).toBe(true);
      expect(decoded.state.resources?.processedClaims instanceof Set).toBe(true);
      expect(decoded.state.combat?.entities instanceof Map).toBe(true);
      expect(decoded.state.waves?.startedWaves instanceof Set).toBe(true);
      expect(decoded.state.waves?.completedWaves instanceof Set).toBe(true);
      expect(decoded.state.waves?.processedSpawns instanceof Set).toBe(true);
      expect(decoded.state.abilities?.cooldowns instanceof Map).toBe(true);
      expect(typeof decoded.state.abilities?.nextEffectId).toBe('bigint');

      const proj = decoded.state.abilities?.projectiles.find(p => p.abilityId === 'piercing_barrage');
      expect(proj?.kind).toBe('lane');
      if (proj?.kind === 'lane') {
        expect(proj.hitEnemyIds instanceof Set).toBe(true);
        expect(proj.hitEnemyIds.size).toBeGreaterThanOrEqual(1);
        for (const id of proj.hitEnemyIds) {
          expect(typeof id).toBe('bigint');
        }
      }

      const snap = runtime.snapshot();
      expect(decoded.state.occupancy).toEqual(snap.occupancy);
      expect(decoded.state.entities).toEqual(snap.entities);
      expect(decoded.state.nextEntityId).toBe(snap.nextEntityId);
      expect(decoded.state.resources).toEqual(snap.resources);
      expect(decoded.state.combat).toEqual(snap.combat);
      expect(decoded.state.fusion).toEqual(snap.fusion);
      expect(decoded.state.waves).toEqual(snap.waves);
      expect(decoded.state.abilities).toEqual(snap.abilities);
      expect(decoded.state.matchKills).toBe(runtime.getPersistenceMeta().matchKills);
      expect(decoded.state.matchKills).toBeGreaterThanOrEqual(1);
      expect(decoded.queue.nextSequence).toBe(snap.queue.nextSequence);
      expect(decoded.queue.nextId).toBe(snap.queue.nextId);
      expect(decoded.queue.events).toEqual(snap.queue.events);
      expect(decoded.rng).toEqual(snap.rng);
    });
  });

  describe('AC-02 Checksum & semantic validation fail-closed (SnapshotValidationError)', () => {
    it('rejects malformed JSON, tampered checksum, future schemaVersion, occupancy mismatch, invalid HP, invalid crystals, and invalid queue order without mutating live BattleRuntime', () => {
      const storage = new InMemoryStorageAdapter();
      const runtime = new BattleRuntime(
        { ticksPerSecond: 10, maxCatchUpTicks: 250 },
        resourceFixture(),
        combatFixture(),
        fusionFixture(),
        waveFixture(),
        abilityFixture(),
        { battleId: 'battle_ac02', storage },
      );
      runtime.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 0 } }, 1);
      step(runtime, 1);

      const validCp = runtime.createCheckpoint('manual');
      const snapBefore = runtime.snapshot();
      const metaBefore = runtime.getPersistenceMeta();

      // 1. Malformed JSON -> INVALID_JSON
      expect(() => deserializeBattleCheckpoint('{invalid-json')).toThrowError(SnapshotValidationError);
      try {
        deserializeBattleCheckpoint('{invalid-json');
      } catch (err) {
        expect((err as SnapshotValidationError).code).toBe('INVALID_JSON');
      }

      // 2. Tampered checksum -> CHECKSUM_MISMATCH
      const parsedEnvelope = JSON.parse(validCp.json) as BattleCheckpointEnvelope;
      const tamperedChecksumJson = JSON.stringify({ ...parsedEnvelope, checksum: 'deadbeef' });
      try {
        runtime.restoreCheckpoint(tamperedChecksumJson);
        expect.unreachable('Expected CHECKSUM_MISMATCH');
      } catch (err) {
        expect(err).toBeInstanceOf(SnapshotValidationError);
        expect((err as SnapshotValidationError).code).toBe('CHECKSUM_MISMATCH');
      }

      // 3. Future schemaVersion: 99 -> UNSUPPORTED_VERSION
      const futureVersionJson = JSON.stringify({ ...parsedEnvelope, schemaVersion: 99 });
      try {
        runtime.restoreCheckpoint(futureVersionJson);
        expect.unreachable('Expected UNSUPPORTED_VERSION');
      } catch (err) {
        expect(err).toBeInstanceOf(SnapshotValidationError);
        expect((err as SnapshotValidationError).code).toBe('UNSUPPORTED_VERSION');
      }

      // Helper to re-sign semantically invalid state with a valid checksum so semantic checks run.
      const resignDecoded = (
        mutate: (decoded: ReturnType<typeof deserializeBattleCheckpoint>) => void,
      ): string => {
        const decoded = deserializeBattleCheckpoint(validCp.json);
        mutate(decoded);
        return serializeBattleCheckpoint({
          checkpointId: decoded.checkpointId,
          battleId: decoded.battleId,
          battleGeneration: decoded.battleGeneration,
          tick: decoded.tick,
          paused: decoded.paused,
          accumulatorMs: decoded.accumulatorMs,
          reason: decoded.reason,
          state: decoded.state,
          queue: decoded.queue,
          rng: decoded.rng,
        }).json;
      };

      // 4. Occupancy / entity mismatch -> SEMANTIC_VIOLATION
      const badOccupancy = resignDecoded(d => {
        d.state.occupancy[0] = null;
      });
      // 5. Invalid HP (hp > maxHp) -> SEMANTIC_VIOLATION
      const badHpOverMax = resignDecoded(d => {
        const combatEntry = d.state.combat!.entities.get(0n)!;
        combatEntry.hp = combatEntry.maxHp + 50;
      });
      // 6. Invalid HP (hp <= 0 when living) -> SEMANTIC_VIOLATION
      const badHpZero = resignDecoded(d => {
        const combatEntry = d.state.combat!.entities.get(0n)!;
        combatEntry.hp = 0;
      });
      // 7. Invalid crystals (> 5) -> SEMANTIC_VIOLATION
      const badCrystals = resignDecoded(d => {
        d.state.resources!.crystals = 6;
      });
      // 8. Invalid queue order -> SEMANTIC_VIOLATION
      const badQueueOrder = resignDecoded(d => {
        d.queue.events = [
          { id: 'event_0', scheduledTick: 10, insertionSequence: 0, causalDepth: 0, payload: { type: 'periodic-energy', period: 1 } },
          { id: 'event_1', scheduledTick: 5, insertionSequence: 1, causalDepth: 0, payload: { type: 'periodic-energy', period: 2 } },
        ];
        d.queue.nextId = 2;
        d.queue.nextSequence = 2;
      });
      // 9. Duplicate queue sequence -> SEMANTIC_VIOLATION
      const badQueueDupSeq = resignDecoded(d => {
        d.queue.events = [
          { id: 'event_0', scheduledTick: 5, insertionSequence: 0, causalDepth: 0, payload: { type: 'periodic-energy', period: 1 } },
          { id: 'event_1', scheduledTick: 5, insertionSequence: 0, causalDepth: 0, payload: { type: 'periodic-energy', period: 2 } },
        ];
        d.queue.nextId = 2;
        d.queue.nextSequence = 2;
      });

      for (const badJson of [
        badOccupancy,
        badHpOverMax,
        badHpZero,
        badCrystals,
        badQueueOrder,
        badQueueDupSeq,
      ]) {
        try {
          runtime.restoreCheckpoint(badJson);
          expect.unreachable('Expected SEMANTIC_VIOLATION');
        } catch (err) {
          expect(err).toBeInstanceOf(SnapshotValidationError);
          expect((err as SnapshotValidationError).code).toBe('SEMANTIC_VIOLATION');
        }
      }

      // Live runtime must remain completely unmutated and not stuck recovering.
      expect(runtime.snapshot()).toEqual(snapBefore);
      expect(runtime.getPersistenceMeta()).toEqual(metaBefore);
      expect(runtime.getPersistenceMeta().recovering).toBe(false);
    });
  });

  describe('AC-03 G02 checkpoint timing & FR10 atomic commit boundaries', () => {
    it('captures at tick 0, every 60 ticks, and after committed summon, fuse, activate-ability, wave-start, wave-reward, and setPaused(true), coalescing duplicates and never capturing on rollback', () => {
      const storage = new InMemoryStorageAdapter();
      // Use maxRamCheckpoints: 20 on CheckpointManager so we can inspect the full reason timeline in AC-03.
      const manager = new CheckpointManager({ storage, maxRamCheckpoints: 20 });
      const runtime = new BattleRuntime(
        { ticksPerSecond: 10, maxCatchUpTicks: 250 },
        resourceFixture(),
        combatFixture({
          defenders: combatFixture().defenders.map(d =>
            d.id === 'snow_golem' ? { ...d, maxHp: 1000 } : d,
          ),
        }),
        fusionFixture(),
        waveFixture({
          waves: [
            makeWaveConfig('wave_1', {
              initialDelaySeconds: 0.2,
              delayBeforeNextWaveSeconds: 0.5,
              spawnGroups: [
                { enemyId: 'enemy_grunt', count: 1, allowedLanes: [0], laneMode: 'fixed', startOffsetSeconds: 0, intervalSeconds: 0 },
              ],
            }), // wave-start @ tick 2
            makeWaveConfig('wave_2', { initialDelaySeconds: 0, delayBeforeNextWaveSeconds: 0.5 }),
            makeWaveConfig('wave_3'),
            makeWaveConfig('wave_4'),
            makeWaveConfig('wave_5'),
          ],
        }),
        abilityFixture(),
        { battleId: 'battle_ac03', checkpointManager: manager },
      );

      // Tick 0 captured automatically on construction.
      expect(runtime.getCheckpoints().map(c => [c.tick, c.reason])).toEqual([[0, 'tick-0']]);

      // Tick 1: summon
      runtime.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 0, column: 0 } }, 1);
      step(runtime, 1);
      expect(runtime.getCheckpoints()[0]).toMatchObject({ tick: 1, reason: 'summon' });

      // Tick 2: wave-start (wave 0 initialDelaySeconds = 0.2 -> tick 2)
      step(runtime, 1);
      expect(runtime.getCheckpoints()[0]).toMatchObject({ tick: 2, reason: 'wave-start' });

      // Tick 3: wave-reward
      runtime.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 3);
      step(runtime, 1);
      expect(runtime.getCheckpoints()[0]).toMatchObject({ tick: 3, reason: 'wave-reward' });

      // Tick 4: second summon for fusion
      runtime.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 0, column: 1 } }, 4);
      step(runtime, 1);
      expect(runtime.getCheckpoints()[0]).toMatchObject({ tick: 4, reason: 'summon' });

      // Tick 5: fuse (iron_golem + iron_golem -> steel_guardian) using actual occupied defender IDs.
      const ironGolemIds = [...runtime.snapshot().entities.values()]
        .filter(e => e.kind === 'defender' && e.definitionId === 'iron_golem')
        .map(e => e.id);
      runtime.enqueue({ type: 'fuse', sourceId: ironGolemIds[0], targetId: ironGolemIds[1] }, 5);
      step(runtime, 1);
      expect(runtime.getCheckpoints()[0]).toMatchObject({ tick: 5, reason: 'fuse' });

      // Tick 6: summon snow_golem; Tick 7: activate blizzard on snow_golem.
      runtime.enqueue({ type: 'summon', definitionId: 'snow_golem', cell: { row: 1, column: 0 } }, 6);
      runtime.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_grunt', lane: 1, position: 7 } }, 6);
      step(runtime, 1); // tick 6 summon
      const snowGolemId = [...runtime.snapshot().entities.values()].find(
        e => e.kind === 'defender' && e.definitionId === 'snow_golem',
      )!.id;
      runtime.enqueue({ type: 'activate-ability', defenderId: snowGolemId }, 7);
      step(runtime, 1); // tick 7 activate-ability
      expect(runtime.getCheckpoints()[0]).toMatchObject({ tick: 7, reason: 'activate-ability' });

      // Advance to tick 60 -> periodic-60
      step(runtime, 53); // 7 + 53 = 60
      expect(runtime.getCheckpoints()[0]).toMatchObject({ tick: 60, reason: 'periodic-60' });

      // Advance to tick 120 -> periodic-60
      step(runtime, 60); // 60 + 60 = 120
      expect(runtime.getCheckpoints()[0]).toMatchObject({ tick: 120, reason: 'periodic-60' });

      // Pause -> captures 'pause'; redundant setPaused(true) coalesces!
      const countBeforePause = runtime.getCheckpoints().length;
      runtime.setPaused(true);
      expect(runtime.getCheckpoints().length).toBe(countBeforePause + 1);
      expect(runtime.getCheckpoints()[0]).toMatchObject({ tick: 120, reason: 'pause', paused: true });

      // Redundant duplicate capture at identical boundary coalesces.
      runtime.setPaused(true);
      manager.acceptCheckpoint({
        checkpointId: 'dup_coalesce',
        battleId: 'battle_ac03',
        battleGeneration: 1,
        tick: 120,
        paused: true,
        accumulatorMs: 0,
        reason: 'periodic-60',
        state: runtime.snapshot() as unknown as Parameters<CheckpointManager['acceptCheckpoint']>[0]['state'],
        queue: runtime.snapshot().queue,
        rng: runtime.snapshot().rng ?? null,
      });
      expect(runtime.getCheckpoints().length).toBe(countBeforePause + 1);

      // Unpause and force a QUEUE_OVERFLOW failure/rollback -> no checkpoint captured for the failed step.
      runtime.setPaused(false);
      const countBeforeOverflow = runtime.getCheckpoints().length;
      const latestBeforeOverflow = runtime.getCheckpoints()[0];
      const currentQueueLen = runtime.snapshot().queue.events.length;
      for (let i = currentQueueLen; i <= QUEUE_CAPACITY; i++) {
        runtime.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 4, column: 8 } }, 200);
      }
      expect(runtime.snapshot().failure?.code).toBe('QUEUE_OVERFLOW');
      expect(runtime.getCheckpoints().length).toBe(countBeforeOverflow);
      expect(runtime.getCheckpoints()[0]).toEqual(latestBeforeOverflow);
    });
  });

  describe('AC-04 G04 RAM ring buffer cap (MAX_RAM_CHECKPOINTS = 3)', () => {
    it('retains at most 3 Accepted Checkpoints in RAM ordered newest-first and evicts the oldest on a 4th checkpoint', () => {
      expect(MAX_RAM_CHECKPOINTS).toBe(3);
      const storage = new InMemoryStorageAdapter();
      const runtime = new BattleRuntime(
        { ticksPerSecond: 10, maxCatchUpTicks: 250 },
        resourceFixture(),
        combatFixture(),
        fusionFixture(),
        undefined,
        abilityFixture(),
        { battleId: 'battle_ac04', storage },
      );

      // 1st checkpoint: tick 0
      expect(runtime.getCheckpoints()).toHaveLength(1);
      const cp0 = runtime.getCheckpoints()[0];
      expect(cp0.tick).toBe(0);

      // 2nd checkpoint: tick 1 summon
      runtime.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 0 } }, 1);
      step(runtime, 1);
      // 3rd checkpoint: tick 2 wave-reward
      runtime.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 2);
      step(runtime, 1);
      expect(runtime.getCheckpoints().map(c => c.tick)).toEqual([2, 1, 0]);

      // 4th checkpoint: tick 3 summon -> evicts tick 0
      runtime.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 0, column: 1 } }, 3);
      step(runtime, 1);

      const buffered = runtime.getCheckpoints();
      expect(buffered).toHaveLength(3);
      expect(buffered.map(c => c.tick)).toEqual([3, 2, 1]);
      expect(buffered.some(c => c.checkpointId === cp0.checkpointId)).toBe(false);
    });
  });

  describe('AC-05 Atomic primary + .bak storage rotation', () => {
    it('rotates previous valid primary into .bak and falls back to .bak on corrupted/truncated primary JSON', () => {
      const storage = new InMemoryStorageAdapter();
      const runtime = new BattleRuntime(
        { ticksPerSecond: 10, maxCatchUpTicks: 250 },
        resourceFixture(),
        combatFixture(),
        undefined,
        undefined,
        undefined,
        { battleId: 'battle_ac05', storage },
      );

      // Tick 0 wrote primary; .bak does not exist yet.
      const primaryAtTick0 = storage.getItem(ACTIVE_BATTLE_STORAGE_KEY);
      expect(primaryAtTick0).not.toBeNull();
      expect(storage.getItem(backupKey(ACTIVE_BATTLE_STORAGE_KEY))).toBeNull();

      // Tick 1 summon rotates tick-0 into .bak and writes tick-1 to primary.
      runtime.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 0 } }, 1);
      step(runtime, 1);
      const primaryAtTick1 = storage.getItem(ACTIVE_BATTLE_STORAGE_KEY);
      const bakAfterTick1 = storage.getItem(backupKey(ACTIVE_BATTLE_STORAGE_KEY));
      expect(primaryAtTick1).not.toBeNull();
      expect(bakAfterTick1).toBe(primaryAtTick0);

      // Corrupt/truncate primary JSON.
      storage.setItem(ACTIVE_BATTLE_STORAGE_KEY, '{"schemaVersion":1,"truncated":');

      const manager = new CheckpointManager({ storage });
      const loaded = manager.loadFromStorage();
      expect(loaded).not.toBeNull();
      expect(loaded!.source).toBe('backup');
      expect(loaded!.decoded.tick).toBe(0);

      // Fresh runtime recovery with empty RAM buffer also falls back to .bak cleanly.
      const coldManager = new CheckpointManager({ storage });
      const coldRuntime = new BattleRuntime(
        { ticksPerSecond: 10, maxCatchUpTicks: 250 },
        resourceFixture(),
        combatFixture(),
        undefined,
        undefined,
        undefined,
        { battleId: 'battle_ac05', checkpointManager: coldManager, autoCheckpoint: false },
      );
      const recovery = coldRuntime.recover();
      expect(recovery).toMatchObject({
        status: 'RECOVERED',
        source: 'storage-backup',
        tick: 0,
        battleGeneration: 2,
      });

      // Writing a new valid checkpoint while primary is corrupted does NOT overwrite valid .bak with corrupted primary.
      runtime.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 0, column: 1 } }, 2);
      step(runtime, 1);
      expect(storage.getItem(backupKey(ACTIVE_BATTLE_STORAGE_KEY))).toBe(primaryAtTick0);
    });
  });

  describe('AC-06 Seamless Resume across reload (BattleRuntime.fromCheckpoint, TC38, TC40, FR11–FR13)', () => {
    it('resumes a rich mid-Wave battle with enemies, items, cooldowns, burn/slow/buff statuses, glacial_fortress shield, PAUSED Stun cadence, and in-flight piercing_barrage projectile producing identical future snapshots', () => {
      // Test-only fixtures. Never treat these values as approved production balance.
      const customResources = resourceFixture({
        defenders: [
          ...resourceFixture().defenders,
          { id: 'stun_totem', classification: 'base', summonEnergyCost: 0, unlocked: true },
        ],
        energyItems: {
          amount: 10,
          intervalSeconds: 0.5, // spawns at tick 5 (10 tps)
          region: { min: { x: 0, y: 0 }, max: { x: 1, y: 1 } },
          positions: [{ x: 0.5, y: 0.5 }],
        },
      });
      // Test-only fixtures. Never treat these values as approved production balance.
      const customCombat = combatFixture({
        defenders: [
          ...combatFixture().defenders,
          { id: 'stun_totem', maxHp: 100, damage: 0, attackSpeed: 1, attackRange: 0, targeting: 'CLOSEST_TO_BASE' },
        ],
      });
      // Test-only fixtures. Never treat these values as approved production balance.
      const customFusion = fusionFixture({
        defenders: [
          ...fusionFixture().defenders,
          { id: 'stun_totem', tier: 1 },
        ],
      });
      // Test-only fixtures. Never treat these values as approved production balance.
      const baseAbilities = abilityFixture();
      const customAbilities: AbilitySessionInput = {
        abilities: [
          ...baseAbilities.abilities.map(a =>
            a.id === 'glacial_fortress' ? { ...a, cooldownSeconds: 5 } : a,
          ),
          {
            id: 'test_ally_stun',
            ownerDefenderId: 'stun_totem',
            powerCrystalCost: 0,
            cooldownSeconds: 0,
            requiresTarget: false,
            targetScope: 'ally-3x3',
            effects: [
              { kind: 'status', scope: 'ally-3x3', radius: 1, status: { kind: 'stun', durationSeconds: 0.5 } },
            ],
          },
        ],
      };
      // Test-only fixtures. Never treat these values as approved production balance.
      const customWaves = waveFixture({
        waves: [
          makeWaveConfig('wave_1', {
            initialDelaySeconds: 0.2,
            delayBeforeNextWaveSeconds: 2,
            spawnGroups: [
              { enemyId: 'enemy_pass', count: 2, allowedLanes: [4], laneMode: 'fixed', startOffsetSeconds: 0, intervalSeconds: 0.4 },
            ],
          }),
          makeWaveConfig('wave_2'),
          makeWaveConfig('wave_3'),
          makeWaveConfig('wave_4'),
          makeWaveConfig('wave_5'),
        ],
      });

      const original = new BattleRuntime(
        { ticksPerSecond: 10, maxCatchUpTicks: 250 },
        customResources,
        customCombat,
        customFusion,
        customWaves,
        customAbilities,
        { battleId: 'battle_ac06', storage: new InMemoryStorageAdapter() },
      );

      // Tick 1: place defenders (fusion units via add, base units via summon) and enemies across lanes.
      original.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
      original.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'frost_guardian', cell: { row: 0, column: 0 } } }, 1); // 0n (shield + cooldown)
      original.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 1 } }, 1); // 1n (arrow_storm)
      original.enqueue({ type: 'summon', definitionId: 'stun_totem', cell: { row: 0, column: 2 } }, 1); // 2n (stuns 1n)
      original.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'skeleton_sniper', cell: { row: 1, column: 0 } } }, 1); // 3n (piercing_barrage)
      original.enqueue({ type: 'summon', definitionId: 'blaze', cell: { row: 2, column: 0 } }, 1); // 4n (burn)
      original.enqueue({ type: 'summon', definitionId: 'snow_golem', cell: { row: 2, column: 1 } }, 1); // 5n (slow)
      original.enqueue({ type: 'summon', definitionId: 'wolf', cell: { row: 3, column: 0 } }, 1); // 6n (buff)
      original.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 6.5 } }, 1); // 7n
      original.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 1, position: 1.5 } }, 1); // 8n (hit by piercing_barrage at tick 6)
      original.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 1, position: 7.5 } }, 1); // 9n (ahead of projectile at tick 6)
      original.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 2, position: 6.5 } }, 1); // 10n (burn + slow)

      // Tick 4: activate arrow_storm on 1n; Tick 5: refill crystals via wave_2, stun 1n via 2n, activate glacial_fortress (0n), piercing_barrage (3n), inferno (4n), blizzard (5n), pack_frenzy (6n).
      original.enqueue({ type: 'activate-ability', defenderId: 1n }, 4);
      original.enqueue({ type: 'wave-reward', sourceId: 'wave_2' }, 5);
      original.enqueue({ type: 'activate-ability', defenderId: 2n }, 5);
      original.enqueue({ type: 'activate-ability', defenderId: 0n }, 5);
      original.enqueue({ type: 'activate-ability', defenderId: 3n }, 5);
      original.enqueue({ type: 'activate-ability', defenderId: 4n }, 5);
      original.enqueue({ type: 'activate-ability', defenderId: 5n }, 5);
      original.enqueue({ type: 'activate-ability', defenderId: 6n }, 5);

      step(original, 6, 10); // Advance to tick 6

      const midSnap = original.snapshot();
      expect(midSnap.tick).toBe(6);
      expect(midSnap.resources?.items.size).toBeGreaterThanOrEqual(1);
      expect(midSnap.abilities?.cooldowns.get(0n)).toBeGreaterThan(0);
      expect(midSnap.abilities?.shields.some(s => s.abilityId === 'glacial_fortress' && s.creationOrder === 0)).toBe(true);
      expect(midSnap.abilities?.statuses.some(s => s.kind === 'burn')).toBe(true);
      expect(midSnap.abilities?.statuses.some(s => s.kind === 'slow')).toBe(true);
      expect(midSnap.abilities?.statuses.some(s => s.kind === 'buff')).toBe(true);
      expect(midSnap.abilities?.cadences.some(c => c.abilityId === 'arrow_storm' && c.status === 'PAUSED')).toBe(true);
      const piercingProj = midSnap.abilities?.projectiles.find(p => p.abilityId === 'piercing_barrage');
      expect(piercingProj?.kind).toBe('lane');
      if (piercingProj?.kind === 'lane') {
        expect(piercingProj.hitEnemyIds.size).toBeGreaterThanOrEqual(1);
      }

      const saved = original.createCheckpoint('manual');
      const resumed = BattleRuntime.fromCheckpoint(
        saved.json,
        { ticksPerSecond: 10, maxCatchUpTicks: 250 },
        customResources,
        customCombat,
        customFusion,
        customWaves,
        customAbilities,
        { storage: new InMemoryStorageAdapter() },
      );

      expect(resumed.snapshot()).toEqual(original.snapshot());

      // Advance both runtimes step-by-step across stun expiration, cadence resume, projectile impacts, burn ticks, cooldown decay, and item spawns.
      for (const deltaTicks of [1, 2, 5, 10, 20]) {
        step(original, deltaTicks, 10);
        step(resumed, deltaTicks, 10);
        expect(resumed.snapshot()).toEqual(original.snapshot());
        expect(resumed.getPersistenceMeta().matchKills).toBe(original.getPersistenceMeta().matchKills);
      }
    });
  });

  describe('AC-07 G05 newest-first recovery & fallback', () => {
    it('skips a corrupted newest RAM checkpoint and restores slot 1 atomically after QUEUE_OVERFLOW', () => {
      const storage = new InMemoryStorageAdapter();
      const checkpointManager = new CheckpointManager({ storage });
      const runtime = new BattleRuntime(
        { ticksPerSecond: 10, maxCatchUpTicks: 250 },
        resourceFixture(),
        combatFixture(),
        undefined,
        undefined,
        undefined,
        { battleId: 'battle_ac07', checkpointManager },
      );

      // Tick 0 checkpoint (slot later becomes slot 1), Tick 1 summon checkpoint (slot 0).
      runtime.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 0 } }, 1);
      step(runtime, 1);

      const slots = runtime.getCheckpoints();
      expect(slots.map(s => s.tick)).toEqual([1, 0]);
      const slot1 = slots[1];

      // Corrupt newest RAM checkpoint (slot 0).
      checkpointManager.tamperRamJson(0, '{"corrupted":true');

      // Fail runtime with QUEUE_OVERFLOW.
      const existing = runtime.snapshot().queue.events.length;
      for (let i = existing; i <= QUEUE_CAPACITY; i++) {
        runtime.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 4, column: 8 } }, 50);
      }
      expect(runtime.snapshot().failure?.code).toBe('QUEUE_OVERFLOW');

      const result = runtime.recover();
      expect(result).toEqual({
        status: 'RECOVERED',
        checkpointId: slot1.checkpointId,
        tick: 0,
        battleGeneration: 2,
        source: 'ram',
      });
      expect(runtime.snapshot().failure).toBeNull();
      expect(runtime.snapshot().tick).toBe(0);

      // Runtime is operational again after recovery.
      runtime.enqueue({ type: 'summon', definitionId: 'iron_golem', cell: { row: 0, column: 0 } }, 1);
      expect(step(runtime, 1)).toBe(1);
      expect(runtime.snapshot().entities.size).toBe(1);
    });
  });

  describe('AC-08 FR4, FR23, FR24 Recovery lifecycle', () => {
    it('increments battleGeneration while leaving status version independent, rejects stale generation, discards uncommitted commands, and rejects inputs while recovering without spending Crystals', () => {
      const baseStorage = new InMemoryStorageAdapter();
      let runtime!: BattleRuntime;
      let enqueueDuringRecoverResult: ReturnType<BattleRuntime['enqueue']> | null = null;
      let crystalsSeenDuringRecover: number | null = null;
      let interceptOnRead = false;

      const interceptingStorage: PersistenceStorageAdapter = {
        getItem(key) {
          if (interceptOnRead && key === ACTIVE_BATTLE_STORAGE_KEY) {
            crystalsSeenDuringRecover = runtime.snapshot().resources?.crystals ?? null;
            enqueueDuringRecoverResult = runtime.enqueue(
              { type: 'activate-ability', defenderId: 0n },
              5,
            );
          }
          return baseStorage.getItem(key);
        },
        setItem(key, value) {
          baseStorage.setItem(key, value);
        },
        removeItem(key) {
          baseStorage.removeItem(key);
        },
      };

      const checkpointManager = new CheckpointManager({ storage: interceptingStorage });
      runtime = new BattleRuntime(
        { ticksPerSecond: 10, maxCatchUpTicks: 250 },
        resourceFixture(),
        combatFixture(),
        undefined,
        undefined,
        abilityFixture(),
        { battleId: 'battle_ac08', checkpointManager },
      );

      // Tick 1: grant crystals, summon blaze & enemy, apply burn status (version = 1).
      runtime.enqueue({ type: 'wave-reward', sourceId: 'wave_1' }, 1);
      runtime.enqueue({ type: 'summon', definitionId: 'blaze', cell: { row: 0, column: 0 } }, 1); // 0n
      runtime.enqueue({ type: 'add', entity: { kind: 'enemy', definitionId: 'enemy_pass', lane: 0, position: 6 } }, 1); // 1n
      runtime.enqueue({ type: 'activate-ability', defenderId: 0n }, 1);
      step(runtime, 1);

      const statusBefore = runtime.snapshot().abilities?.statuses.find(s => s.kind === 'burn');
      expect(statusBefore?.version).toBe(1);
      const crystalsAtCheckpoint = runtime.snapshot().resources!.crystals; // 4
      expect(crystalsAtCheckpoint).toBe(4);

      // Queue uncommitted commands at future tick 10 (after checkpoint) before failing at tick 2.
      runtime.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 4, column: 0 } }, 10);
      const existing = runtime.snapshot().queue.events.length;
      for (let i = existing; i <= QUEUE_CAPACITY; i++) {
        runtime.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 4, column: 8 } }, 50);
      }
      expect(runtime.snapshot().failure?.code).toBe('QUEUE_OVERFLOW');

      // Clear RAM buffer so recover() reads from interceptingStorage.getItem(...) while recovering === true (FR24).
      checkpointManager.clearRamCheckpoints();
      interceptOnRead = true;
      const recovered = runtime.recover();
      interceptOnRead = false;

      expect(recovered.status).toBe('RECOVERED');
      if (recovered.status === 'RECOVERED') {
        expect(recovered.battleGeneration).toBe(2);
      }

      // FR24: enqueue during RECOVERING rejected immediately without spending Crystals.
      expect(enqueueDuringRecoverResult).toEqual({ status: 'REJECTED', reason: 'recovering' });
      expect(crystalsSeenDuringRecover).toBe(crystalsAtCheckpoint);
      expect(runtime.snapshot().resources?.crystals).toBe(crystalsAtCheckpoint);

      // FR4: battleGeneration incremented (1 -> 2) while status.version stays independent (1).
      expect(runtime.getPersistenceMeta().battleGeneration).toBe(2);
      const statusAfter = runtime.snapshot().abilities?.statuses.find(s => s.kind === 'burn');
      expect(statusAfter?.version).toBe(1);

      // Stale generation command is rejected.
      expect(
        runtime.enqueue(
          { type: 'summon', definitionId: 'iron_golem', cell: { row: 1, column: 0 } },
          2,
          { generation: 1 },
        ),
      ).toEqual({ status: 'REJECTED', reason: 'stale-generation' });

      // Current generation command succeeds.
      expect(
        runtime.enqueue(
          { type: 'summon', definitionId: 'iron_golem', cell: { row: 1, column: 0 } },
          2,
          { generation: 2 },
        ).status,
      ).toBe('APPLIED');

      // FR23: uncommitted future summon at (4, 0) for tick 10 was discarded and never auto-replays.
      step(runtime, 15, 10);
      expect(
        [...runtime.snapshot().entities.values()].some(
          e => e.kind === 'defender' && e.cell.row === 4 && e.cell.column === 0,
        ),
      ).toBe(false);
    });
  });

  describe('AC-09 FR17–FR18 Terminal battle closure clears active-battle save', () => {
    it('clears primary and .bak active-battle entries on both victory and defeat', () => {
      // 1. Victory clears both primary and .bak
      const victoryStorage = new InMemoryStorageAdapter();
      const victoryRuntime = playVictoryMatch({
        battleId: 'battle_ac09_victory',
        killsPerWave: 1,
        storage: victoryStorage,
      });
      expect(victoryRuntime.snapshot().waves?.terminal).toBe('victory');
      expect(victoryStorage.getItem(ACTIVE_BATTLE_STORAGE_KEY)).toBeNull();
      expect(victoryStorage.getItem(backupKey(ACTIVE_BATTLE_STORAGE_KEY))).toBeNull();

      // 2. Defeat clears both primary and .bak
      const defeatStorage = new InMemoryStorageAdapter();
      const defeatRuntime = new BattleRuntime(
        { ticksPerSecond: 10, maxCatchUpTicks: 250 },
        resourceFixture(),
        combatFixture(),
        undefined,
        waveFixture({
          waves: [
            makeWaveConfig('wave_1', {
              initialDelaySeconds: 0,
              spawnGroups: [
                { enemyId: 'enemy_pass', count: 1, allowedLanes: [0], laneMode: 'fixed', startOffsetSeconds: 0, intervalSeconds: 0 },
              ],
            }),
            makeWaveConfig('wave_2'),
            makeWaveConfig('wave_3'),
            makeWaveConfig('wave_4'),
            makeWaveConfig('wave_5'),
          ],
        }),
        undefined,
        { battleId: 'battle_ac09_defeat', storage: defeatStorage },
      );

      // Trigger another checkpoint so both primary and .bak exist before defeat.
      defeatRuntime.enqueue({ type: 'summon', definitionId: 'snow_golem', cell: { row: 1, column: 0 } }, 1);
      step(defeatRuntime, 1);
      expect(defeatStorage.getItem(ACTIVE_BATTLE_STORAGE_KEY)).not.toBeNull();
      expect(defeatStorage.getItem(backupKey(ACTIVE_BATTLE_STORAGE_KEY))).not.toBeNull();

      // Advance until enemy_pass breaches x < 0 (spawnX = 9, moveSpeed = 1 -> 0.1/tick -> >90 ticks).
      for (let i = 0; i < 120; i++) {
        step(defeatRuntime, 1, 10);
        if (defeatRuntime.snapshot().combat?.terminal === 'defeat') break;
      }
      expect(defeatRuntime.snapshot().combat?.terminal).toBe('defeat');
      expect(defeatStorage.getItem(ACTIVE_BATTLE_STORAGE_KEY)).toBeNull();
      expect(defeatStorage.getItem(backupKey(ACTIVE_BATTLE_STORAGE_KEY))).toBeNull();
    });
  });

  describe('AC-10 Starter persistent progression profile', () => {
    it('initializes fresh ProgressionStore with 0 victories, 0 victory kills, iron_golem & skeleton, and fusion_skeleton_sniper & fusion_steel_guardian', () => {
      const store = new ProgressionStore({ storage: new InMemoryStorageAdapter() });
      const profile = store.getProfile();

      expect(profile).toEqual({
        totalVictories: 0,
        totalVictoryKills: 0,
        unlockedDefenderIds: [...STARTER_DEFENDER_IDS],
        unlockedRecipeIds: [...STARTER_RECIPE_IDS],
        recordedBattleIds: [],
      });
      expect(profile.unlockedDefenderIds).toEqual(['iron_golem', 'skeleton']);
      expect(profile.unlockedRecipeIds).toEqual(['fusion_skeleton_sniper', 'fusion_steel_guardian']);
    });
  });

  describe('AC-11 First Grassland Victory unlock', () => {
    it('increments totalVictories to 1 and unlocks snow_golem + cascading recipes fusion_ice_golem and fusion_frost_guardian', () => {
      const storage = new InMemoryStorageAdapter();
      const store = new ProgressionStore({ storage });

      playVictoryMatch({ battleId: 'battle_v1', killsPerWave: 1, progressionStore: store, storage });

      const profile = store.getProfile();
      expect(profile.totalVictories).toBe(1);
      expect(profile.totalVictoryKills).toBe(5);
      expect(profile.unlockedDefenderIds).toContain('snow_golem');
      expect(profile.unlockedRecipeIds).toContain('fusion_ice_golem');
      expect(profile.unlockedRecipeIds).toContain('fusion_frost_guardian');
    });
  });

  describe('AC-12 50 Cumulative Victory Kills unlock', () => {
    it('unlocks wolf + cascading recipe fusion_alpha_wolf once cumulative victory kills reach >= 50 across Victory matches', () => {
      const storage = new InMemoryStorageAdapter();
      const store = new ProgressionStore({ storage });

      // Match 1: 5 waves * 5 kills = 25 kills (< 50 -> wolf still locked)
      playVictoryMatch({ battleId: 'kills_v1', killsPerWave: 5, progressionStore: store, storage });
      expect(store.getProfile().totalVictoryKills).toBe(25);
      expect(store.getProfile().unlockedDefenderIds).not.toContain('wolf');
      expect(store.getProfile().unlockedRecipeIds).not.toContain('fusion_alpha_wolf');

      // Match 2: 5 waves * 5 kills = 25 kills (cumulative 50 -> wolf + fusion_alpha_wolf unlocked!)
      playVictoryMatch({ battleId: 'kills_v2', killsPerWave: 5, progressionStore: store, storage });
      expect(store.getProfile().totalVictoryKills).toBe(50);
      expect(store.getProfile().unlockedDefenderIds).toContain('wolf');
      expect(store.getProfile().unlockedRecipeIds).toContain('fusion_alpha_wolf');
    });
  });

  describe('AC-13 5 Grassland Victories unlock', () => {
    it('unlocks blaze + cascading recipes fusion_inferno_archer and fusion_flame_fang (when wolf is unlocked) at 5 victories', () => {
      const storage = new InMemoryStorageAdapter();
      const store = new ProgressionStore({ storage });

      // Case A: Reach 5 victories with fewer than 50 kills -> blaze + fusion_inferno_archer unlock, fusion_flame_fang waits for wolf.
      for (let i = 1; i <= 4; i++) {
        const res = store.recordBattleOutcome({ battleId: `v_${i}`, result: 'victory', enemiesKilled: 5 });
        expect(res.profile.unlockedDefenderIds).not.toContain('blaze');
      }
      const fifth = store.recordBattleOutcome({ battleId: 'v_5', result: 'victory', enemiesKilled: 5 });
      expect(fifth.profile.totalVictories).toBe(5);
      expect(fifth.newlyUnlocked.defenders).toEqual(['blaze']);
      expect(fifth.newlyUnlocked.recipes).toEqual(['fusion_inferno_archer']);
      expect(fifth.profile.unlockedRecipeIds).not.toContain('fusion_flame_fang');

      // Reaching >= 50 cumulative victory kills unlocks wolf + cascading fusion_alpha_wolf + fusion_flame_fang!
      const sixth = store.recordBattleOutcome({ battleId: 'v_6', result: 'victory', enemiesKilled: 25 });
      expect(sixth.newlyUnlocked.defenders).toEqual(['wolf']);
      expect(sixth.newlyUnlocked.recipes).toEqual(['fusion_alpha_wolf', 'fusion_flame_fang']);

      // Case B: If wolf is already unlocked before 5th victory, 5th victory unlocks blaze + both recipes immediately.
      const storeB = new ProgressionStore({ storage: new InMemoryStorageAdapter() });
      storeB.recordBattleOutcome({ battleId: 'b_1', result: 'victory', enemiesKilled: 50 }); // unlocks snow_golem + wolf
      for (let i = 2; i <= 4; i++) {
        storeB.recordBattleOutcome({ battleId: `b_${i}`, result: 'victory', enemiesKilled: 1 });
      }
      const fifthB = storeB.recordBattleOutcome({ battleId: 'b_5', result: 'victory', enemiesKilled: 1 });
      expect(fifthB.newlyUnlocked.defenders).toEqual(['blaze']);
      expect(fifthB.newlyUnlocked.recipes).toEqual(['fusion_inferno_archer', 'fusion_flame_fang']);
    });
  });

  describe('AC-14 Defeat, replay & idempotency rules', () => {
    it('adds 0 victories and 0 kills on defeat even with enemy kills in-match, counts replay victories, and idempotently ignores duplicate battleId commits', () => {
      const storage = new InMemoryStorageAdapter();
      const store = new ProgressionStore({ storage });

      // Run a real BattleRuntime that kills enemies in Wave 1 and then suffers a Defeat breach.
      const defeatRuntime = new BattleRuntime(
        { ticksPerSecond: 10, maxCatchUpTicks: 250 },
        resourceFixture(),
        combatFixture({
          defenders: combatFixture().defenders.map(d =>
            d.id === 'skeleton' ? { ...d, damage: 100, attackSpeed: 10, attackRange: 9 } : d,
          ),
        }),
        undefined,
        waveFixture({
          waves: [
            makeWaveConfig('wave_1', {
              initialDelaySeconds: 0,
              delayBeforeNextWaveSeconds: 0.2,
              spawnGroups: [
                { enemyId: 'enemy_weak', count: 2, allowedLanes: [0], laneMode: 'fixed', startOffsetSeconds: 0, intervalSeconds: 0.1 },
                { enemyId: 'enemy_pass', count: 1, allowedLanes: [4], laneMode: 'fixed', startOffsetSeconds: 0, intervalSeconds: 0 },
              ],
            }),
            makeWaveConfig('wave_2'),
            makeWaveConfig('wave_3'),
            makeWaveConfig('wave_4'),
            makeWaveConfig('wave_5'),
          ],
        }),
        undefined,
        { battleId: 'defeat_with_kills', storage, progressionStore: store },
      );
      defeatRuntime.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 0 } }, 1);
      for (let i = 0; i < 120; i++) {
        step(defeatRuntime, 1, 10);
        if (defeatRuntime.snapshot().combat?.terminal === 'defeat') break;
      }
      expect(defeatRuntime.snapshot().combat?.terminal).toBe('defeat');
      expect(defeatRuntime.getPersistenceMeta().matchKills).toBe(2);
      expect(store.getProfile()).toEqual(createStarterProgressionProfile());

      // Direct defeat outcome with high kills also adds 0.
      const directDefeat = store.recordBattleOutcome({ battleId: 'defeat_direct', result: 'defeat', enemiesKilled: 100 });
      expect(directDefeat.updated).toBe(false);
      expect(directDefeat.duplicate).toBe(false);
      expect(directDefeat.newlyUnlocked).toEqual({ defenders: [], recipes: [] });
      expect(store.getProfile().totalVictories).toBe(0);
      expect(store.getProfile().totalVictoryKills).toBe(0);

      // Replay victories with distinct battleIds both count.
      const v1 = store.recordBattleOutcome({ battleId: 'replay_1', result: 'victory', enemiesKilled: 10 });
      const v2 = store.recordBattleOutcome({ battleId: 'replay_2', result: 'victory', enemiesKilled: 15 });
      expect(v1.updated).toBe(true);
      expect(v2.updated).toBe(true);
      expect(store.getProfile().totalVictories).toBe(2);
      expect(store.getProfile().totalVictoryKills).toBe(25);

      // Duplicate commit of same battleId is idempotently ignored.
      const dup = store.recordBattleOutcome({ battleId: 'replay_2', result: 'victory', enemiesKilled: 15 });
      expect(dup.updated).toBe(false);
      expect(dup.duplicate).toBe(true);
      expect(dup.newlyUnlocked).toEqual({ defenders: [], recipes: [] });
      expect(store.getProfile().totalVictories).toBe(2);
      expect(store.getProfile().totalVictoryKills).toBe(25);
    });
  });

  describe('AC-15 Permanent unlocks & applyProgressionUnlocks() session synchronization', () => {
    it('keeps unlocks monotonic without duplicate rewards and synchronizes BattleRuntime summon/fusion gating via applyProgressionUnlocks()', () => {
      const store = new ProgressionStore({ storage: new InMemoryStorageAdapter() });
      const baseResource = resourceFixture();
      const baseFusion = fusionFixture();

      // 1. Starter profile blocks summoning snow_golem and fusing fusion_ice_golem.
      const starterSynced = applyProgressionUnlocks(store.getProfile(), baseResource, baseFusion);
      // Original inputs are never mutated.
      expect(baseResource.defenders.find(d => d.id === 'snow_golem')?.unlocked).toBe(true);
      expect(starterSynced.resourceInput.defenders.find(d => d.id === 'snow_golem')?.unlocked).toBe(false);
      expect(starterSynced.fusionInput.recipes.find(r => r.id === 'fusion_ice_golem')?.unlocked).toBe(false);

      const lockedRuntime = new BattleRuntime(
        { ticksPerSecond: 10, maxCatchUpTicks: 250 },
        starterSynced.resourceInput,
        combatFixture(),
        starterSynced.fusionInput,
      );
      lockedRuntime.enqueue({ type: 'summon', definitionId: 'snow_golem', cell: { row: 0, column: 0 } }, 1);
      step(lockedRuntime, 1);
      expect(lockedRuntime.snapshot().resources?.outcome).toMatchObject({
        status: 'REJECTED',
        reason: 'defender-unavailable',
      });

      // Place two snow_golems directly via add and attempt locked fusion_ice_golem -> recipe-unavailable.
      lockedRuntime.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'snow_golem', cell: { row: 1, column: 0 } } }, 2);
      lockedRuntime.enqueue({ type: 'add', entity: { kind: 'defender', definitionId: 'snow_golem', cell: { row: 1, column: 1 } } }, 2);
      lockedRuntime.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 2);
      step(lockedRuntime, 1);
      expect(lockedRuntime.snapshot().fusion?.outcome).toMatchObject({
        status: 'REJECTED',
        reason: 'recipe-unavailable',
      });

      // 2. Win battle #1 -> snow_golem & fusion_ice_golem & fusion_frost_guardian unlock permanently.
      const firstWin = store.recordBattleOutcome({ battleId: 'win_1', result: 'victory', enemiesKilled: 5 });
      expect(firstWin.newlyUnlocked).toEqual({
        defenders: ['snow_golem'],
        recipes: ['fusion_ice_golem', 'fusion_frost_guardian'],
      });

      // Second win does not emit duplicate rewards and never re-locks anything.
      const secondWin = store.recordBattleOutcome({ battleId: 'win_2', result: 'victory', enemiesKilled: 5 });
      expect(secondWin.newlyUnlocked).toEqual({ defenders: [], recipes: [] });
      expect(secondWin.profile.unlockedDefenderIds).toContain('snow_golem');

      // 3. Re-syncing BattleRuntime inputs now enables summoning snow_golem and fusing fusion_ice_golem!
      const unlockedSynced = applyProgressionUnlocks(store.getProfile(), baseResource, baseFusion);
      const unlockedRuntime = new BattleRuntime(
        { ticksPerSecond: 10, maxCatchUpTicks: 250 },
        unlockedSynced.resourceInput,
        combatFixture(),
        unlockedSynced.fusionInput,
      );
      unlockedRuntime.enqueue({ type: 'summon', definitionId: 'snow_golem', cell: { row: 0, column: 0 } }, 1);
      unlockedRuntime.enqueue({ type: 'summon', definitionId: 'snow_golem', cell: { row: 0, column: 1 } }, 1);
      unlockedRuntime.enqueue({ type: 'fuse', sourceId: 0n, targetId: 1n }, 1);
      step(unlockedRuntime, 1);
      expect(unlockedRuntime.snapshot().resources?.outcome?.status).toBe('APPLIED');
      expect(unlockedRuntime.snapshot().fusion?.outcome).toMatchObject({
        status: 'APPLIED',
        recipeId: 'fusion_ice_golem',
      });
    });
  });

  describe('AC-16 getAchievementsView() & getDefenderCollectionView()', () => {
    it('tracks victory/kill milestones accurately and exposes locked/unlocked metadata for all 12 Defenders and 7 Recipes', () => {
      const store = new ProgressionStore({ storage: new InMemoryStorageAdapter() });

      // Starter state checks.
      const starterAchievements = getAchievementsView(store.getProfile());
      expect(starterAchievements).toEqual([
        expect.objectContaining({ id: 'first_grassland_victory', current: 0, target: 1, completed: false, rewardDefenderId: 'snow_golem' }),
        expect.objectContaining({ id: 'victory_hunter_50_kills', current: 0, target: 50, completed: false, rewardDefenderId: 'wolf' }),
        expect.objectContaining({ id: 'grassland_veteran_5_victories', current: 0, target: 5, completed: false, rewardDefenderId: 'blaze' }),
      ]);

      const starterCollection = getDefenderCollectionView(store.getProfile());
      expect(starterCollection).toHaveLength(12);
      expect(starterCollection.filter(e => e.classification === 'base')).toHaveLength(5);
      expect(starterCollection.filter(e => e.classification === 'fusion')).toHaveLength(7);
      expect(starterCollection.filter(e => e.unlocked).map(e => e.id).sort()).toEqual([
        'iron_golem',
        'skeleton',
        'skeleton_sniper',
        'steel_guardian',
      ]);

      // After 1 victory with 30 kills.
      store.recordBattleOutcome({ battleId: 'ach_1', result: 'victory', enemiesKilled: 30 });
      const midAchievements = getAchievementsView(store.getProfile());
      expect(midAchievements).toEqual([
        expect.objectContaining({ id: 'first_grassland_victory', current: 1, target: 1, completed: true }),
        expect.objectContaining({ id: 'victory_hunter_50_kills', current: 30, target: 50, completed: false }),
        expect.objectContaining({ id: 'grassland_veteran_5_victories', current: 1, target: 5, completed: false }),
      ]);

      // After 5 total victories and >= 50 kills -> all 12 defenders and 7 recipes unlocked.
      for (let i = 2; i <= 5; i++) {
        store.recordBattleOutcome({ battleId: `ach_${i}`, result: 'victory', enemiesKilled: 10 });
      }
      const finalAchievements = getAchievementsView(store.getProfile());
      expect(finalAchievements.every(a => a.completed)).toBe(true);
      expect(finalAchievements[1].current).toBe(50);
      expect(finalAchievements[2].current).toBe(5);

      const finalCollection = getDefenderCollectionView(store.getProfile());
      expect(finalCollection.every(e => e.unlocked)).toBe(true);
    });
  });

  describe('AC-17 Progression crash-safety & migration', () => {
    it('falls back to .bak when primary progression JSON is corrupted, rejects future schemaVersion fail-closed, and migrates older valid envelopes cleanly', () => {
      const storage = new InMemoryStorageAdapter();
      const store = new ProgressionStore({ storage });

      store.recordBattleOutcome({ battleId: 'prog_1', result: 'victory', enemiesKilled: 12 });
      store.recordBattleOutcome({ battleId: 'prog_2', result: 'victory', enemiesKilled: 8 });

      const primaryBefore = storage.getItem(PROGRESSION_STORAGE_KEY)!;
      const bakBefore = storage.getItem(backupKey(PROGRESSION_STORAGE_KEY))!;
      expect(primaryBefore).not.toBeNull();
      expect(bakBefore).not.toBeNull();

      // Corrupt primary -> loading fresh ProgressionStore falls back to .bak (which has prog_1: 1 victory, 12 kills).
      storage.setItem(PROGRESSION_STORAGE_KEY, '{broken-progression-json');
      const recoveredStore = new ProgressionStore({ storage });
      expect(recoveredStore.getProfile().totalVictories).toBe(1);
      expect(recoveredStore.getProfile().totalVictoryKills).toBe(12);

      // Future schemaVersion > 1 fails closed with ProgressionValidationError('UNSUPPORTED_VERSION').
      const validEnvelope = JSON.parse(bakBefore) as { schemaVersion: number; checksum: string; profile: unknown };
      storage.setItem(
        PROGRESSION_STORAGE_KEY,
        JSON.stringify({ ...validEnvelope, schemaVersion: PROGRESSION_SCHEMA_VERSION + 1 }),
      );
      try {
        new ProgressionStore({ storage });
        expect.unreachable('Expected UNSUPPORTED_VERSION');
      } catch (err) {
        expect(err).toBeInstanceOf(ProgressionValidationError);
        expect((err as ProgressionValidationError).code).toBe('UNSUPPORTED_VERSION');
      }
      try {
        parseAndValidateProgressionEnvelope(
          JSON.stringify({ ...validEnvelope, schemaVersion: 99 }),
        );
        expect.unreachable('Expected UNSUPPORTED_VERSION');
      } catch (err) {
        expect(err).toBeInstanceOf(ProgressionValidationError);
        expect((err as ProgressionValidationError).code).toBe('UNSUPPORTED_VERSION');
      }

      // migrateProgressionEnvelope upgrades older valid envelopes cleanly.
      const serialized = serializeProgressionEnvelope(createStarterProgressionProfile());
      const upgraded = migrateProgressionEnvelope(serialized.envelope as unknown as Record<string, unknown>, {
        targetVersion: 2,
        migrations: {
          1: raw => ({ ...raw, migratedFlag: true }),
        },
      });
      expect(upgraded.schemaVersion).toBe(2);
      expect(upgraded.migratedFlag).toBe(true);
    });
  });

  describe('AC-18 Backward compatibility & BrowserLocalStorageAdapter safety', () => {
    it('omitting persistenceOptions leaves getCheckpoints() empty and preserves exact BattleRuntime.snapshot() keys', () => {
      const legacyRuntime = new BattleRuntime(
        { ticksPerSecond: 10, maxCatchUpTicks: 250 },
        resourceFixture(),
        combatFixture(),
        fusionFixture(),
        waveFixture(),
        abilityFixture(),
      );
      legacyRuntime.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 0 } }, 1);
      step(legacyRuntime, 1);

      expect(legacyRuntime.getCheckpoints()).toEqual([]);
      const snap = legacyRuntime.snapshot();
      expect(Object.keys(snap).sort()).toEqual([
        'abilities',
        'combat',
        'entities',
        'failure',
        'fusion',
        'nextEntityId',
        'occupancy',
        'queue',
        'resources',
        'rng',
        'tick',
        'waves',
      ]);
      expect('matchKills' in snap).toBe(false);
      expect('persistence' in snap).toBe(false);
    });

    it('safely wraps globalThis.localStorage in BrowserLocalStorageAdapter for normal operations and thrown errors', () => {
      const backing = new Map<string, string>();
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        writable: true,
        value: {
          getItem: (k: string) => backing.get(k) ?? null,
          setItem: (k: string, v: string) => {
            backing.set(k, v);
          },
          removeItem: (k: string) => {
            backing.delete(k);
          },
        },
      });

      const adapter = new BrowserLocalStorageAdapter();
      adapter.setItem('mfd.test', 'hello');
      expect(adapter.getItem('mfd.test')).toBe('hello');
      adapter.removeItem('mfd.test');
      expect(adapter.getItem('mfd.test')).toBeNull();

      // When localStorage throws, getItem/removeItem fail safely and setItem throws explicit descriptive Error.
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        writable: true,
        value: {
          getItem: () => {
            throw new Error('SecurityError');
          },
          setItem: () => {
            throw new Error('QuotaExceededError');
          },
          removeItem: () => {
            throw new Error('SecurityError');
          },
        },
      });

      expect(adapter.getItem('mfd.test')).toBeNull();
      expect(() => adapter.removeItem('mfd.test')).not.toThrow();
      expect(() => adapter.setItem('mfd.test', 'x')).toThrow('Failed to write localStorage key "mfd.test": QuotaExceededError');

      // When localStorage is missing entirely.
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        writable: true,
        value: undefined,
      });
      expect(adapter.getItem('mfd.test')).toBeNull();
      expect(() => adapter.removeItem('mfd.test')).not.toThrow();
      expect(() => adapter.setItem('mfd.test', 'x')).toThrow('Browser localStorage is unavailable');
    });
  });
});

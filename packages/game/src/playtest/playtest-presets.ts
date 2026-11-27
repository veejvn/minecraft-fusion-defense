// Test-only playtest presets for Owner balance evaluation backed by @mfd/game-data JSON definitions.

import { MVP_GAME_DATA, parseHexColor } from '@mfd/game-data';
import type {
  AbilityDamageType,
  AbilityDefinition,
  AbilitySessionInput,
  AttachedStatusSpec,
} from '../abilities/ability-session';
import type { CombatSessionInput, EnemyBehavior, TargetingStrategy } from '../combat/combat-session';
import type { ResourceSessionInput } from '../core/resource-session';
import type { FusionSessionInput } from '../fusion/fusion-session';
import type { WaveConfigDefinition, WaveSessionInput } from '../waves/wave-session';

/** Active playtest simulation mode. */
export type PlaytestMode = 'sandbox' | 'five-waves';

/** UI and visual metadata for each MVP Defender in the playtest sandbox. */
export interface PlaytestDefenderMeta {
  readonly id: string;
  readonly name: string;
  readonly shortLabel: string;
  readonly tier: 1 | 2;
  readonly color: number;
  readonly accentColor: number;
  readonly abilityId: string;
  readonly abilityName: string;
  readonly abilitySummary: string;
  readonly requiresTarget: boolean;
}

/** UI and visual metadata for each MVP Enemy in the playtest sandbox. */
export interface PlaytestEnemyMeta {
  readonly id: string;
  readonly name: string;
  readonly shortLabel: string;
  readonly color: number;
  readonly role: string;
}

/** UI metadata for each confirmed MVP Fusion recipe. */
export interface PlaytestFusionRecipeMeta {
  readonly id: string;
  readonly inputs: readonly [string, string];
  readonly output: string;
  readonly label: string;
}

/** Mutable test-only Defender combat and summon configuration for live tuning. */
export interface PlaytestDefenderConfig {
  id: string;
  tier: 1 | 2;
  summonEnergyCost: number;
  summonCooldownSeconds?: number;
  maxHp: number;
  damage: number;
  attackSpeed: number;
  attackRange: number;
  targeting: TargetingStrategy;
  armor: number;
  attackDamageType?: AbilityDamageType;
  basicAttackStatus?: AttachedStatusSpec;
  economyProduction?: {
    itemCount: number;
    amountPerItem: number;
    initialDelaySeconds: number;
    intervalSeconds: number;
  };
}

/** Mutable test-only Enemy combat and reward configuration for live tuning. */
export interface PlaytestEnemyConfig {
  id: string;
  maxHp: number;
  moveSpeed: number;
  behavior: EnemyBehavior;
  damage: number;
  attackSpeed: number;
  attackRange: number;
  armor: number;
  fireResistancePct: number;
  freezeResistancePct: number;
  freezeImmune: boolean;
  energyReward: number;
  crystalReward: number;
  crystalDropChance: number;
}

/** Complete test-only dataset driving a PlaytestController session. */
export interface PlaytestPresetConfig {
  seed: number;
  initialEmeralds?: number;
  enablePassiveEnergy?: boolean;
  fusionGloveCooldownSeconds?: number;
  villageChest?: {
    enabled: boolean;
    amount: number;
    intervalSeconds: number;
  };
  defenders: PlaytestDefenderConfig[];
  enemies: PlaytestEnemyConfig[];
  abilities: AbilityDefinition[];
  waves: WaveConfigDefinition[];
  waveCrystals: number[];
}

/** All 22 MVP Defenders (6 Base + 16 Fusion) loaded from @mfd/game-data JSON definitions. */
export const PLAYTEST_DEFENDER_META: readonly PlaytestDefenderMeta[] = MVP_GAME_DATA.defenders.map(d => ({
  id: d.id,
  name: d.name,
  shortLabel: d.shortLabel,
  tier: d.tier,
  color: parseHexColor(d.color),
  accentColor: parseHexColor(d.accentColor),
  abilityId: d.abilityId,
  abilityName: d.abilityName,
  abilitySummary: d.abilitySummary,
  requiresTarget: d.requiresTarget,
}));

/** All 4 MVP Enemies loaded from @mfd/game-data JSON definitions. */
export const PLAYTEST_ENEMY_META: readonly PlaytestEnemyMeta[] = MVP_GAME_DATA.enemies.map(e => ({
  id: e.id,
  name: e.name,
  shortLabel: e.shortLabel,
  color: parseHexColor(e.color),
  role: e.role,
}));

/** All 16 confirmed MVP Fusion Recipes loaded from @mfd/game-data JSON definitions. */
export const PLAYTEST_FUSION_RECIPES_META: readonly PlaytestFusionRecipeMeta[] =
  MVP_GAME_DATA.fusionRecipes.map(recipe => ({
    id: recipe.id,
    inputs: recipe.inputs,
    output: recipe.output,
    label: recipe.label,
  }));

const SANDBOX_CRYSTAL_GRANT_COUNT = 50;

/** Deep-clone a playtest preset so live UI edits never mutate shared defaults. */
export function clonePlaytestPreset(preset: PlaytestPresetConfig): PlaytestPresetConfig {
  return structuredClone(preset);
}

/** Build the default 1-lane playtest preset from @mfd/game-data JSON definitions. */
export function createDefaultPlaytestPreset(): PlaytestPresetConfig {
  return {
    seed: MVP_GAME_DATA.sandboxLevel.seed,
    initialEmeralds: MVP_GAME_DATA.sandboxLevel.initialEmeralds,
    enablePassiveEnergy: MVP_GAME_DATA.sandboxLevel.enablePassiveEnergy,
    villageChest: structuredClone(MVP_GAME_DATA.sandboxLevel.villageChest),
    defenders: MVP_GAME_DATA.defenders.map(d => ({
      id: d.id,
      tier: d.tier,
      summonEnergyCost: d.summonEnergyCost,
      summonCooldownSeconds: d.summonCooldownSeconds,
      maxHp: d.maxHp,
      damage: d.damage,
      attackSpeed: d.attackSpeed,
      attackRange: d.attackRange,
      targeting: d.targeting,
      armor: d.armor,
      ...(d.attackDamageType ? { attackDamageType: d.attackDamageType } : {}),
      ...(d.basicAttackStatus ? { basicAttackStatus: structuredClone(d.basicAttackStatus) } : {}),
      ...(d.economyProduction ? { economyProduction: structuredClone(d.economyProduction) } : {}),
    })),
    enemies: MVP_GAME_DATA.enemies.map(e => ({
      id: e.id,
      maxHp: e.maxHp,
      moveSpeed: e.moveSpeed,
      behavior: e.behavior,
      damage: e.damage,
      attackSpeed: e.attackSpeed,
      attackRange: e.attackRange,
      armor: e.armor,
      fireResistancePct: e.fireResistancePct,
      freezeResistancePct: e.freezeResistancePct,
      freezeImmune: e.freezeImmune,
      energyReward: e.energyReward,
      crystalReward: e.crystalReward,
      crystalDropChance: e.crystalDropChance,
    })),
    abilities: structuredClone(MVP_GAME_DATA.abilities),
    waves: structuredClone(MVP_GAME_DATA.sandboxLevel.waves),
    waveCrystals: [...MVP_GAME_DATA.sandboxLevel.waveCrystals],
  };
}

/** Validated BattleRuntime constructor inputs derived from a playtest preset and mode. */
export interface PlaytestRuntimeInputs {
  readonly resourceInput: ResourceSessionInput;
  readonly combatInput: CombatSessionInput;
  readonly fusionInput: FusionSessionInput;
  readonly waveInput: WaveSessionInput | undefined;
  readonly abilityInput: AbilitySessionInput;
}

/** Translate a test-only PlaytestPresetConfig into cross-validated BattleRuntime inputs. */
export function buildRuntimeInputsFromPreset(
  preset: PlaytestPresetConfig,
  mode: PlaytestMode,
  allowMultiLaneWaves = false,
): PlaytestRuntimeInputs {
  const crystalGrants = Array.from({ length: SANDBOX_CRYSTAL_GRANT_COUNT }, (_, idx) => ({
    id: `sandbox_crystals_${idx + 1}`,
    crystals: 5,
  }));

  const resourceInput: ResourceSessionInput = {
    seed: preset.seed,
    initialEnergy: preset.initialEmeralds ?? MVP_GAME_DATA.sandboxLevel.initialEmeralds,
    enablePassiveEnergy:
      preset.enablePassiveEnergy ?? MVP_GAME_DATA.sandboxLevel.enablePassiveEnergy,
    villageChest: structuredClone(
      preset.villageChest ?? MVP_GAME_DATA.sandboxLevel.villageChest,
    ),
    defenders: preset.defenders.map(defender => ({
      id: defender.id,
      classification: defender.tier === 1 ? 'base' : 'fusion',
      summonEnergyCost: defender.summonEnergyCost,
      summonCooldownSeconds: defender.summonCooldownSeconds ?? 0,
      unlocked: true,
      ...(defender.economyProduction
        ? { economyProduction: structuredClone(defender.economyProduction) }
        : {}),
    })),
    enemies: [
      ...preset.enemies.map(enemy => ({
        id: enemy.id,
        energy: enemy.energyReward,
        crystals: enemy.crystalReward,
        crystalDropChance: enemy.crystalDropChance,
      })),
      { id: 'sandbox_energy_grant', energy: 500, crystals: 0 },
    ],
    waves: [
      ...preset.waves.map((wave, idx) => ({
        id: wave.id,
        crystals: preset.waveCrystals[idx] ?? 1,
      })),
      ...crystalGrants,
    ],
    energyItems: {
      amount: 25,
      intervalSeconds: 6,
      region: { min: { x: 0.1, y: 0.15 }, max: { x: 0.9, y: 0.85 } },
      positions: [
        { x: 0.25, y: 0.5 },
        { x: 0.5, y: 0.5 },
        { x: 0.75, y: 0.5 },
      ],
    },
    enableRandomEnergyItems: false,
    enableRandomCrystalItems: false,
    fusionGloveCooldownSeconds: preset.fusionGloveCooldownSeconds ?? 0,
  };

  const combatInput: CombatSessionInput = {
    spawnX: 9,
    defenders: preset.defenders.map(defender => ({
      id: defender.id,
      maxHp: defender.maxHp,
      damage: defender.damage,
      attackSpeed: defender.attackSpeed,
      attackRange: defender.attackRange,
      targeting: defender.targeting,
      armor: defender.armor,
      ...(defender.attackDamageType ? { attackDamageType: defender.attackDamageType } : {}),
      ...(defender.basicAttackStatus ? { basicAttackStatus: defender.basicAttackStatus } : {}),
    })),
    enemies: [
      ...preset.enemies.map(enemy => ({
        id: enemy.id,
        maxHp: enemy.maxHp,
        moveSpeed: enemy.moveSpeed,
        behavior: enemy.behavior,
        damage: enemy.damage,
        attackSpeed: enemy.attackSpeed,
        attackRange: enemy.attackRange,
        armor: enemy.armor,
        fireResistancePct: enemy.fireResistancePct,
        freezeResistancePct: enemy.freezeResistancePct,
        freezeImmune: enemy.freezeImmune,
      })),
      {
        id: 'sandbox_energy_grant',
        maxHp: 1,
        moveSpeed: 1,
        behavior: 'IGNORE_DEFENDER',
      },
    ],
  };

  const fusionInput: FusionSessionInput = {
    defenders: preset.defenders.map(defender => ({
      id: defender.id,
      tier: defender.tier,
    })),
    recipes: PLAYTEST_FUSION_RECIPES_META.map(recipe => ({
      id: recipe.id,
      inputDefenderIds: recipe.inputs,
      outputDefenderId: recipe.output,
      unlocked: true,
      enabled: true,
    })),
  };

  const waveInput: WaveSessionInput | undefined =
    mode === 'sandbox'
      ? undefined
      : {
          levelId: 'grassland_playtest',
          waveCount: preset.waves.length,
          seed: preset.seed,
          waves: preset.waves.map(wave => ({
            ...wave,
            spawnGroups: wave.spawnGroups.map(group => {
              if (!allowMultiLaneWaves) {
                return {
                  ...group,
                  allowedLanes: [0],
                  laneMode: 'fixed',
                };
              }
              const hasCustomLanes = group.allowedLanes.length > 1 || group.allowedLanes[0] !== 0;
              return hasCustomLanes
                ? { ...group }
                : {
                    ...group,
                    allowedLanes: [0, 1, 2, 3, 4],
                    laneMode: 'sequential',
                  };
            }),
          })),
        };

  const abilityInput: AbilitySessionInput = {
    abilities: structuredClone(preset.abilities),
  };

  return {
    resourceInput,
    combatInput,
    fusionInput,
    waveInput,
    abilityInput,
  };
}

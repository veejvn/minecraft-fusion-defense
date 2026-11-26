// Test-only playtest presets for Owner balance evaluation. Never treat these values as approved production defaults.

import type { AbilityDefinition, AbilitySessionInput } from '../abilities/ability-session';
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
}

/** Complete test-only dataset driving a PlaytestController session. */
export interface PlaytestPresetConfig {
  seed: number;
  fusionGloveCooldownSeconds?: number;
  defenders: PlaytestDefenderConfig[];
  enemies: PlaytestEnemyConfig[];
  abilities: AbilityDefinition[];
  waves: WaveConfigDefinition[];
  waveCrystals: number[];
}

/** All 20 MVP Defenders (5 Base + 15 Fusion) with Confirmed v2.2 ability summaries. */
export const PLAYTEST_DEFENDER_META: readonly PlaytestDefenderMeta[] = [
  {
    id: 'iron_golem',
    name: 'Iron Golem',
    shortLabel: 'IG',
    tier: 1,
    color: 0x94a3b8,
    accentColor: 0xe2e8f0,
    abilityId: 'earthquake',
    abilityName: 'Earthquake',
    abilitySummary: '3x AD physical + 2s Stun (same lane)',
    requiresTarget: false,
  },
  {
    id: 'snow_golem',
    name: 'Snow Golem',
    shortLabel: 'SG',
    tier: 1,
    color: 0xbae6fd,
    accentColor: 0x38bdf8,
    abilityId: 'blizzard',
    abilityName: 'Blizzard',
    abilitySummary: '1x Ice AD + -50% Slow 5s (same lane)',
    requiresTarget: false,
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    shortLabel: 'SK',
    tier: 1,
    color: 0xe2e8f0,
    accentColor: 0x64748b,
    abilityId: 'arrow_storm',
    abilityName: 'Arrow Storm',
    abilitySummary: '8 arrows @ 0.2s, 100% AD each (same lane)',
    requiresTarget: false,
  },
  {
    id: 'wolf',
    name: 'Wolf',
    shortLabel: 'WF',
    tier: 1,
    color: 0xd6d3d1,
    accentColor: 0xf59e0b,
    abilityId: 'pack_frenzy',
    abilityName: 'Pack Frenzy',
    abilitySummary: 'Self +100% AS / +50% AD for 8s',
    requiresTarget: false,
  },
  {
    id: 'blaze',
    name: 'Blaze',
    shortLabel: 'BZ',
    tier: 1,
    color: 0xf97316,
    accentColor: 0xfef08a,
    abilityId: 'inferno',
    abilityName: 'Inferno',
    abilitySummary: '4 lobbed Fireballs @ 0.25s, 125% Fire AD + Burn 25%/s 5s',
    requiresTarget: false,
  },
  {
    id: 'steel_guardian',
    name: 'Steel Guardian',
    shortLabel: 'STG',
    tier: 2,
    color: 0x475569,
    accentColor: 0xfbbf24,
    abilityId: 'iron_bastion',
    abilityName: 'Iron Bastion',
    abilitySummary: '100% MaxHP Shield + 8s 3x3 50% Redirect',
    requiresTarget: false,
  },
  {
    id: 'frost_guardian',
    name: 'Frost Guardian',
    shortLabel: 'FG',
    tier: 2,
    color: 0x0284c7,
    accentColor: 0x67e8f9,
    abilityId: 'glacial_fortress',
    abilityName: 'Glacial Fortress',
    abilitySummary: '50% MaxHP Shield + front-tile -50% Slow (5s residual)',
    requiresTarget: false,
  },
  {
    id: 'ice_golem',
    name: 'Ice Golem',
    shortLabel: 'ICG',
    tier: 2,
    color: 0x38bdf8,
    accentColor: 0xe0f2fe,
    abilityId: 'absolute_zero',
    abilityName: 'Absolute Zero',
    abilitySummary: 'Freeze all Enemies across 5 lanes for 4s',
    requiresTarget: false,
  },
  {
    id: 'skeleton_sniper',
    name: 'Skeleton Sniper',
    shortLabel: 'SNP',
    tier: 2,
    color: 0xf8fafc,
    accentColor: 0x8b5cf6,
    abilityId: 'piercing_barrage',
    abilityName: 'Piercing Barrage',
    abilitySummary: '1 merged arrow 600% AD, 2x speed, unlimited pierce',
    requiresTarget: false,
  },
  {
    id: 'iron_ranger',
    name: 'Iron Ranger',
    shortLabel: 'IR',
    tier: 2,
    color: 0x94a3b8,
    accentColor: 0xfde047,
    abilityId: 'siege_volley',
    abilityName: 'Siege Volley',
    abilitySummary: '1 heavy bolt: 450% AD + 20% target MaxHP + 1s Stun',
    requiresTarget: false,
  },
  {
    id: 'frostbite_ranger',
    name: 'Frostbite Ranger',
    shortLabel: 'FBR',
    tier: 2,
    color: 0x7dd3fc,
    accentColor: 0xe0f2fe,
    abilityId: 'glacier_barrage',
    abilityName: 'Glacier Barrage',
    abilitySummary: '1 piercing ice arrow across lane: 300% AD + Freeze 2.5s + Slow 5s',
    requiresTarget: false,
  },
  {
    id: 'ironfang_guardian',
    name: 'Ironfang Guardian',
    shortLabel: 'IFG',
    tier: 2,
    color: 0x64748b,
    accentColor: 0x38bdf8,
    abilityId: 'guardian_charge',
    abilityName: 'Guardian Charge',
    abilitySummary: 'Send iron wolf charging full lane: 350% AD + 1.5s Stun pierce',
    requiresTarget: false,
  },
  {
    id: 'magma_colossus',
    name: 'Magma Colossus',
    shortLabel: 'MC',
    tier: 2,
    color: 0xb91c1c,
    accentColor: 0xf97316,
    abilityId: 'eruption',
    abilityName: 'Eruption',
    abilitySummary: '3.5x Fire AD (same lane) + Burn 30%/s 5s + 30% MaxHP Shield',
    requiresTarget: false,
  },
  {
    id: 'steam_warden',
    name: 'Steam Warden',
    shortLabel: 'SW',
    tier: 2,
    color: 0x99f6e4,
    accentColor: 0xfb923c,
    abilityId: 'thermal_collapse',
    abilityName: 'Thermal Collapse',
    abilitySummary: '3x3 around self: 250% Fire AD (400% vs Burn/Freeze) + Slow 5s',
    requiresTarget: false,
  },
  {
    id: 'frostfang',
    name: 'Frostfang',
    shortLabel: 'FRF',
    tier: 2,
    color: 0x38bdf8,
    accentColor: 0xffffff,
    abilityId: 'winter_pounce',
    abilityName: 'Winter Pounce',
    abilitySummary: 'Front 3 cells: 250% Ice AD (400% vs Chill/Freeze) + Slow 4s',
    requiresTarget: false,
  },
  {
    id: 'bonefang_hunter',
    name: 'Bonefang Hunter',
    shortLabel: 'BH',
    tier: 2,
    color: 0xd6d3d1,
    accentColor: 0xef4444,
    abilityId: 'predator_mark',
    abilityName: 'Predator Mark',
    abilitySummary: 'Mark highest-HP lane Enemy (+40% dmg taken 6s) + 250% AD strike',
    requiresTarget: false,
  },
  {
    id: 'infernal_archon',
    name: 'Infernal Archon',
    shortLabel: 'INA',
    tier: 2,
    color: 0xea580c,
    accentColor: 0xfef08a,
    abilityId: 'solar_cataclysm',
    abilityName: 'Solar Cataclysm',
    abilitySummary: 'All 5 lanes: 2.5x Fire AD (armor-piercing) + Burn 30%/s 5s',
    requiresTarget: false,
  },
  {
    id: 'inferno_archer',
    name: 'Inferno Archer',
    shortLabel: 'IA',
    tier: 2,
    color: 0xea580c,
    accentColor: 0xfacc15,
    abilityId: 'meteor_arrow_rain',
    abilityName: 'Meteor Arrow Rain',
    abilitySummary: '8 falling Fire arrows @ 0.2s in 3x3 closest Enemy + Burn',
    requiresTarget: false,
  },
  {
    id: 'flame_fang',
    name: 'Flame Fang',
    shortLabel: 'FF',
    tier: 2,
    color: 0xdc2626,
    accentColor: 0xfb923c,
    abilityId: 'wildfire_rush',
    abilityName: 'Wildfire Rush',
    abilitySummary: 'Summon 5 fire wolves to bite first Enemy per lane: 250% AD + Heavy Burn 6s',
    requiresTarget: false,
  },
  {
    id: 'alpha_wolf',
    name: 'Alpha Wolf',
    shortLabel: 'AW',
    tier: 2,
    color: 0x78716c,
    accentColor: 0xfde047,
    abilityId: 'alpha_howl',
    abilityName: 'Alpha Howl',
    abilitySummary: '3x3 Allies +100% AS / +50% AD for 8s',
    requiresTarget: false,
  },
];

/** All 4 MVP Enemies with display metadata. */
export const PLAYTEST_ENEMY_META: readonly PlaytestEnemyMeta[] = [
  { id: 'zombie', name: 'Zombie', shortLabel: 'ZB', color: 0x65a30d, role: 'Basic Melee' },
  { id: 'husk', name: 'Husk', shortLabel: 'HK', color: 0xca8a04, role: 'Armored Tank' },
  { id: 'vindicator', name: 'Vindicator', shortLabel: 'VN', color: 0x2563eb, role: 'Fast Bruiser' },
  { id: 'pillager', name: 'Pillager', shortLabel: 'PL', color: 0x7c3aed, role: 'Ranged Crossbow' },
];

/** All 15 confirmed MVP Fusion Recipes. */
export const PLAYTEST_FUSION_RECIPES_META: readonly PlaytestFusionRecipeMeta[] = [
  { id: 'fusion_skeleton_sniper', inputs: ['skeleton', 'skeleton'], output: 'skeleton_sniper', label: 'Skeleton + Skeleton -> Skeleton Sniper' },
  { id: 'fusion_steel_guardian', inputs: ['iron_golem', 'iron_golem'], output: 'steel_guardian', label: 'Iron Golem + Iron Golem -> Steel Guardian' },
  { id: 'fusion_iron_ranger', inputs: ['iron_golem', 'skeleton'], output: 'iron_ranger', label: 'Iron Golem + Skeleton -> Iron Ranger' },
  { id: 'fusion_ice_golem', inputs: ['snow_golem', 'snow_golem'], output: 'ice_golem', label: 'Snow Golem + Snow Golem -> Ice Golem' },
  { id: 'fusion_frost_guardian', inputs: ['iron_golem', 'snow_golem'], output: 'frost_guardian', label: 'Iron Golem + Snow Golem -> Frost Guardian' },
  { id: 'fusion_frostbite_ranger', inputs: ['snow_golem', 'skeleton'], output: 'frostbite_ranger', label: 'Snow Golem + Skeleton -> Frostbite Ranger' },
  { id: 'fusion_alpha_wolf', inputs: ['wolf', 'wolf'], output: 'alpha_wolf', label: 'Wolf + Wolf -> Alpha Wolf' },
  { id: 'fusion_ironfang_guardian', inputs: ['iron_golem', 'wolf'], output: 'ironfang_guardian', label: 'Iron Golem + Wolf -> Ironfang Guardian' },
  { id: 'fusion_bonefang_hunter', inputs: ['skeleton', 'wolf'], output: 'bonefang_hunter', label: 'Skeleton + Wolf -> Bonefang Hunter' },
  { id: 'fusion_frostfang', inputs: ['snow_golem', 'wolf'], output: 'frostfang', label: 'Snow Golem + Wolf -> Frostfang' },
  { id: 'fusion_infernal_archon', inputs: ['blaze', 'blaze'], output: 'infernal_archon', label: 'Blaze + Blaze -> Infernal Archon' },
  { id: 'fusion_magma_colossus', inputs: ['iron_golem', 'blaze'], output: 'magma_colossus', label: 'Iron Golem + Blaze -> Magma Colossus' },
  { id: 'fusion_steam_warden', inputs: ['snow_golem', 'blaze'], output: 'steam_warden', label: 'Snow Golem + Blaze -> Steam Warden' },
  { id: 'fusion_inferno_archer', inputs: ['blaze', 'skeleton'], output: 'inferno_archer', label: 'Blaze + Skeleton -> Inferno Archer' },
  { id: 'fusion_flame_fang', inputs: ['blaze', 'wolf'], output: 'flame_fang', label: 'Blaze + Wolf -> Flame Fang' },
];

const SANDBOX_CRYSTAL_GRANT_COUNT = 50;

/** Deep-clone a playtest preset so live UI edits never mutate shared defaults. */
export function clonePlaytestPreset(preset: PlaytestPresetConfig): PlaytestPresetConfig {
  return structuredClone(preset);
}

/** Build the default test-only 1-lane playtest preset with Confirmed v2.0 abilities. */
export function createDefaultPlaytestPreset(): PlaytestPresetConfig {
  return {
    seed: 101,
    defenders: [
      {
        id: 'iron_golem',
        tier: 1,
        summonEnergyCost: 150,
        maxHp: 450,
        damage: 25,
        attackSpeed: 0.7,
        attackRange: 1.1,
        targeting: 'CLOSEST_TO_DEFENDER',
        armor: 4,
      },
      {
        id: 'snow_golem',
        tier: 1,
        summonEnergyCost: 100,
        maxHp: 200,
        damage: 20,
        attackSpeed: 1.0,
        attackRange: 6,
        targeting: 'CLOSEST_TO_DEFENDER',
        armor: 0,
      },
      {
        id: 'skeleton',
        tier: 1,
        summonEnergyCost: 100,
        maxHp: 150,
        damage: 25,
        attackSpeed: 1.2,
        attackRange: 7,
        targeting: 'CLOSEST_TO_DEFENDER',
        armor: 0,
      },
      {
        id: 'wolf',
        tier: 1,
        summonEnergyCost: 125,
        maxHp: 220,
        damage: 35,
        attackSpeed: 1.5,
        attackRange: 1.2,
        targeting: 'CLOSEST_TO_DEFENDER',
        armor: 0,
      },
      {
        id: 'blaze',
        tier: 1,
        summonEnergyCost: 175,
        maxHp: 180,
        damage: 30,
        attackSpeed: 1.0,
        attackRange: 5,
        targeting: 'CLOSEST_TO_DEFENDER',
        armor: 0,
      },
      {
        id: 'steel_guardian',
        tier: 2,
        summonEnergyCost: 0,
        maxHp: 900,
        damage: 45,
        attackSpeed: 0.8,
        attackRange: 1.2,
        targeting: 'CLOSEST_TO_DEFENDER',
        armor: 10,
      },
      {
        id: 'frost_guardian',
        tier: 2,
        summonEnergyCost: 0,
        maxHp: 750,
        damage: 38,
        attackSpeed: 0.75,
        attackRange: 2,
        targeting: 'CLOSEST_TO_DEFENDER',
        armor: 6,
      },
      {
        id: 'ice_golem',
        tier: 2,
        summonEnergyCost: 0,
        maxHp: 420,
        damage: 35,
        attackSpeed: 1.1,
        attackRange: 7,
        targeting: 'CLOSEST_TO_DEFENDER',
        armor: 2,
      },
      {
        id: 'skeleton_sniper',
        tier: 2,
        summonEnergyCost: 0,
        maxHp: 260,
        damage: 65,
        attackSpeed: 0.9,
        attackRange: 9,
        targeting: 'CLOSEST_TO_BASE',
        armor: 0,
      },
      {
        id: 'inferno_archer',
        tier: 2,
        summonEnergyCost: 0,
        maxHp: 300,
        damage: 50,
        attackSpeed: 1.25,
        attackRange: 8,
        targeting: 'CLOSEST_TO_BASE',
        armor: 0,
      },
      {
        id: 'flame_fang',
        tier: 2,
        summonEnergyCost: 0,
        maxHp: 400,
        damage: 45,
        attackSpeed: 1.7,
        attackRange: 1.5,
        targeting: 'CLOSEST_TO_DEFENDER',
        armor: 2,
      },
      {
        id: 'alpha_wolf',
        tier: 2,
        summonEnergyCost: 0,
        maxHp: 450,
        damage: 55,
        attackSpeed: 1.7,
        attackRange: 1.5,
        targeting: 'CLOSEST_TO_DEFENDER',
        armor: 2,
      },
      {
        id: 'iron_ranger',
        tier: 2,
        summonEnergyCost: 0,
        maxHp: 480,
        damage: 95,
        attackSpeed: 0.45,
        attackRange: 8,
        targeting: 'CLOSEST_TO_DEFENDER',
        armor: 12,
      },
      {
        id: 'frostbite_ranger',
        tier: 2,
        summonEnergyCost: 0,
        maxHp: 280,
        damage: 42,
        attackSpeed: 1.0,
        attackRange: 8,
        targeting: 'CLOSEST_TO_DEFENDER',
        armor: 2,
      },
      {
        id: 'ironfang_guardian',
        tier: 2,
        summonEnergyCost: 0,
        maxHp: 720,
        damage: 48,
        attackSpeed: 1.2,
        attackRange: 1.5,
        targeting: 'CLOSEST_TO_DEFENDER',
        armor: 8,
      },
      {
        id: 'magma_colossus',
        tier: 2,
        summonEnergyCost: 0,
        maxHp: 820,
        damage: 58,
        attackSpeed: 0.75,
        attackRange: 1.5,
        targeting: 'CLOSEST_TO_DEFENDER',
        armor: 8,
      },
      {
        id: 'steam_warden',
        tier: 2,
        summonEnergyCost: 0,
        maxHp: 560,
        damage: 40,
        attackSpeed: 0.9,
        attackRange: 3.5,
        targeting: 'CLOSEST_TO_DEFENDER',
        armor: 4,
      },
      {
        id: 'frostfang',
        tier: 2,
        summonEnergyCost: 0,
        maxHp: 380,
        damage: 46,
        attackSpeed: 1.6,
        attackRange: 1.5,
        targeting: 'CLOSEST_TO_DEFENDER',
        armor: 2,
      },
      {
        id: 'bonefang_hunter',
        tier: 2,
        summonEnergyCost: 0,
        maxHp: 340,
        damage: 52,
        attackSpeed: 1.8,
        attackRange: 1.5,
        targeting: 'CLOSEST_TO_DEFENDER',
        armor: 2,
      },
      {
        id: 'infernal_archon',
        tier: 2,
        summonEnergyCost: 0,
        maxHp: 320,
        damage: 62,
        attackSpeed: 0.95,
        attackRange: 7,
        targeting: 'CLOSEST_TO_BASE',
        armor: 0,
      },
    ],
    enemies: [
      {
        id: 'zombie',
        maxHp: 180,
        moveSpeed: 0.35,
        behavior: 'STOP_AND_ATTACK',
        damage: 20,
        attackSpeed: 0.8,
        attackRange: 0,
        armor: 0,
        fireResistancePct: 0,
        freezeResistancePct: 0,
        freezeImmune: false,
        energyReward: 50,
        crystalReward: 0,
      },
      {
        id: 'husk',
        maxHp: 300,
        moveSpeed: 0.25,
        behavior: 'STOP_AND_ATTACK',
        damage: 25,
        attackSpeed: 0.7,
        attackRange: 0,
        armor: 5,
        fireResistancePct: 0,
        freezeResistancePct: 0,
        freezeImmune: false,
        energyReward: 100,
        crystalReward: 0,
      },
      {
        id: 'vindicator',
        maxHp: 220,
        moveSpeed: 0.65,
        behavior: 'STOP_AND_ATTACK',
        damage: 40,
        attackSpeed: 1.2,
        attackRange: 0,
        armor: 0,
        fireResistancePct: 0,
        freezeResistancePct: 0,
        freezeImmune: false,
        energyReward: 150,
        crystalReward: 1,
      },
      {
        id: 'pillager',
        maxHp: 200,
        moveSpeed: 0.35,
        behavior: 'STOP_AND_ATTACK',
        damage: 15,
        attackSpeed: 0.9,
        attackRange: 3,
        armor: 0,
        fireResistancePct: 0,
        freezeResistancePct: 0,
        freezeImmune: false,
        energyReward: 200,
        crystalReward: 1,
      },
    ],
    abilities: [
      {
        id: 'blizzard',
        ownerDefenderId: 'snow_golem',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: false,
        targetScope: 'same-lane-enemies',
        effects: [
          {
            kind: 'instant-damage',
            scope: 'same-lane-enemies',
            damageMultiplier: 1,
            damageType: 'ice',
            applyStatus: { kind: 'slow', slowPct: 0.5, durationSeconds: 5 },
          },
        ],
      },
      {
        id: 'earthquake',
        ownerDefenderId: 'iron_golem',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: false,
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
        requiresTarget: false,
        targetScope: 'same-lane-enemy-in-range',
        effects: [
          {
            kind: 'multihit-projectile',
            count: 8,
            intervalSeconds: 0.2,
            damageMultiplier: 1,
            damageType: 'physical',
            projectileSpeed: 6,
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
            status: {
              kind: 'buff',
              attackSpeedBonusPct: 1,
              attackDamageBonusPct: 0.5,
              durationSeconds: 8,
            },
          },
        ],
      },
      {
        id: 'inferno',
        ownerDefenderId: 'blaze',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: false,
        targetScope: 'same-lane-enemies',
        effects: [
          {
            kind: 'multihit-falling-area',
            count: 4,
            intervalSeconds: 0.25,
            travelSeconds: 0.25,
            radius: 0,
            sameLaneOnly: true,
            damageMultiplier: 1.25,
            damageType: 'fire',
            armorPiercing: true,
            applyStatus: {
              kind: 'burn',
              damageMultiplierPerSecond: 0.25,
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
            projectileSpeed: 12,
            pierce: true,
          },
        ],
      },
      {
        id: 'absolute_zero',
        ownerDefenderId: 'ice_golem',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: false,
        targetScope: 'all-enemies',
        effects: [
          {
            kind: 'status',
            scope: 'all-enemies',
            status: { kind: 'freeze', durationSeconds: 4 },
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
      {
        id: 'wildfire_rush',
        ownerDefenderId: 'flame_fang',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: false,
        targetScope: 'first-enemy-per-lane',
        effects: [
          {
            kind: 'instant-damage',
            scope: 'first-enemy-per-lane',
            damageMultiplier: 2.5,
            damageType: 'fire',
            armorPiercing: true,
            applyStatus: {
              kind: 'burn',
              damageMultiplierPerSecond: 0.5,
              durationSeconds: 6,
              tickIntervalSeconds: 1,
              damageType: 'fire',
            },
          },
        ],
      },
      {
        id: 'meteor_arrow_rain',
        ownerDefenderId: 'inferno_archer',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: false,
        targetScope: 'area-3x3-closest-enemy',
        effects: [
          {
            kind: 'multihit-falling-area',
            count: 8,
            intervalSeconds: 0.2,
            travelSeconds: 0.4,
            radius: 1,
            damageMultiplier: 1,
            damageType: 'fire',
            applyStatus: {
              kind: 'burn',
              damageMultiplierPerSecond: 0.25,
              durationSeconds: 5,
              tickIntervalSeconds: 1,
              damageType: 'fire',
            },
          },
        ],
      },
      {
        id: 'alpha_howl',
        ownerDefenderId: 'alpha_wolf',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: false,
        targetScope: 'ally-3x3',
        allowWhileDisabled: true,
        effects: [
          {
            kind: 'status',
            scope: 'ally-3x3',
            radius: 1,
            status: {
              kind: 'buff',
              attackSpeedBonusPct: 1,
              attackDamageBonusPct: 0.5,
              durationSeconds: 8,
            },
          },
        ],
      },
      {
        id: 'iron_bastion',
        ownerDefenderId: 'steel_guardian',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: false,
        targetScope: 'ally-3x3',
        effects: [
          { kind: 'shield', shieldMaxHpPct: 1 },
          { kind: 'redirect', radius: 1, redirectSharePct: 0.5, durationSeconds: 8 },
        ],
      },
      {
        id: 'siege_volley',
        ownerDefenderId: 'iron_ranger',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: false,
        targetScope: 'same-lane-enemy-in-range',
        effects: [
          {
            kind: 'projectile',
            damageMultiplier: 4.5,
            targetMaxHpBonusPct: 0.2,
            damageType: 'physical',
            projectileSpeed: 8.5,
            pierce: false,
            armorPiercing: true,
            applyStatus: { kind: 'stun', durationSeconds: 1 },
          },
        ],
      },
      {
        id: 'guardian_charge',
        ownerDefenderId: 'ironfang_guardian',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: false,
        targetScope: 'self',
        effects: [
          {
            kind: 'projectile',
            damageMultiplier: 3.5,
            damageType: 'physical',
            projectileSpeed: 9.5,
            pierce: true,
            applyStatus: { kind: 'stun', durationSeconds: 1.5 },
          },
        ],
      },
      {
        id: 'eruption',
        ownerDefenderId: 'magma_colossus',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: false,
        targetScope: 'same-lane-enemies',
        effects: [
          {
            kind: 'instant-damage',
            scope: 'same-lane-enemies',
            damageMultiplier: 3.5,
            damageType: 'fire',
            armorPiercing: true,
            applyStatus: {
              kind: 'burn',
              damageMultiplierPerSecond: 0.3,
              durationSeconds: 5,
              tickIntervalSeconds: 1,
              damageType: 'fire',
            },
          },
          { kind: 'shield', shieldMaxHpPct: 0.3 },
        ],
      },
      {
        id: 'glacier_barrage',
        ownerDefenderId: 'frostbite_ranger',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: false,
        targetScope: 'self',
        effects: [
          {
            kind: 'projectile',
            damageMultiplier: 3,
            damageType: 'ice',
            projectileSpeed: 11,
            pierce: true,
            applyStatuses: [
              { kind: 'freeze', durationSeconds: 2.5 },
              { kind: 'slow', slowPct: 0.5, durationSeconds: 5 },
            ],
          },
        ],
      },
      {
        id: 'winter_pounce',
        ownerDefenderId: 'frostfang',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: false,
        targetScope: 'front-3-cells',
        effects: [
          {
            kind: 'instant-damage',
            scope: 'front-3-cells',
            frontCells: 3,
            damageMultiplier: 2.5,
            bonusDamageMultiplierIfChilled: 1.5,
            damageType: 'ice',
            applyStatus: { kind: 'slow', slowPct: 0.5, durationSeconds: 4 },
          },
        ],
      },
      {
        id: 'thermal_collapse',
        ownerDefenderId: 'steam_warden',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: false,
        targetScope: 'area-3x3-self',
        effects: [
          {
            kind: 'instant-damage',
            scope: 'area-3x3-self',
            radius: 1,
            damageMultiplier: 2.5,
            bonusDamageMultiplierIfBurnOrFreeze: 1.5,
            damageType: 'fire',
            armorPiercing: true,
            applyStatus: { kind: 'slow', slowPct: 0.5, durationSeconds: 5 },
          },
        ],
      },
      {
        id: 'predator_mark',
        ownerDefenderId: 'bonefang_hunter',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: false,
        targetScope: 'highest-hp-same-lane',
        effects: [
          {
            kind: 'status',
            scope: 'self',
            status: { kind: 'buff', attackSpeedBonusPct: 0.5, attackDamageBonusPct: 0, durationSeconds: 6 },
          },
          {
            kind: 'status',
            scope: 'highest-hp-same-lane',
            status: { kind: 'vulnerable', damageTakenBonusPct: 0.4, durationSeconds: 6 },
          },
          {
            kind: 'instant-damage',
            scope: 'highest-hp-same-lane',
            damageMultiplier: 2.5,
            damageType: 'physical',
            armorPiercing: true,
          },
        ],
      },
      {
        id: 'solar_cataclysm',
        ownerDefenderId: 'infernal_archon',
        powerCrystalCost: 1,
        cooldownSeconds: 0,
        requiresTarget: false,
        targetScope: 'all-enemies',
        effects: [
          {
            kind: 'instant-damage',
            scope: 'all-enemies',
            damageMultiplier: 2.5,
            damageType: 'fire',
            armorPiercing: true,
            applyStatus: {
              kind: 'burn',
              damageMultiplierPerSecond: 0.3,
              durationSeconds: 5,
              tickIntervalSeconds: 1,
              damageType: 'fire',
            },
          },
        ],
      },
    ],
    waves: [
      {
        id: 'wave_1',
        initialDelaySeconds: 2,
        delayBeforeNextWaveSeconds: 3,
        spawnGroups: [
          {
            enemyId: 'zombie',
            count: 3,
            allowedLanes: [0],
            laneMode: 'fixed',
            startOffsetSeconds: 0,
            intervalSeconds: 3,
          },
        ],
      },
      {
        id: 'wave_2',
        initialDelaySeconds: 0,
        delayBeforeNextWaveSeconds: 3,
        spawnGroups: [
          {
            enemyId: 'zombie',
            count: 3,
            allowedLanes: [0],
            laneMode: 'fixed',
            startOffsetSeconds: 0,
            intervalSeconds: 2.5,
          },
          {
            enemyId: 'husk',
            count: 2,
            allowedLanes: [0],
            laneMode: 'fixed',
            startOffsetSeconds: 2,
            intervalSeconds: 3,
          },
        ],
      },
      {
        id: 'wave_3',
        initialDelaySeconds: 0,
        delayBeforeNextWaveSeconds: 3,
        spawnGroups: [
          {
            enemyId: 'husk',
            count: 2,
            allowedLanes: [0],
            laneMode: 'fixed',
            startOffsetSeconds: 0,
            intervalSeconds: 2.5,
          },
          {
            enemyId: 'vindicator',
            count: 2,
            allowedLanes: [0],
            laneMode: 'fixed',
            startOffsetSeconds: 2,
            intervalSeconds: 3,
          },
        ],
      },
      {
        id: 'wave_4',
        initialDelaySeconds: 0,
        delayBeforeNextWaveSeconds: 3,
        spawnGroups: [
          {
            enemyId: 'zombie',
            count: 3,
            allowedLanes: [0],
            laneMode: 'fixed',
            startOffsetSeconds: 0,
            intervalSeconds: 2,
          },
          {
            enemyId: 'pillager',
            count: 2,
            allowedLanes: [0],
            laneMode: 'fixed',
            startOffsetSeconds: 1.5,
            intervalSeconds: 3,
          },
        ],
      },
      {
        id: 'wave_5',
        initialDelaySeconds: 0,
        delayBeforeNextWaveSeconds: 3,
        spawnGroups: [
          {
            enemyId: 'husk',
            count: 2,
            allowedLanes: [0],
            laneMode: 'fixed',
            startOffsetSeconds: 0,
            intervalSeconds: 2.5,
          },
          {
            enemyId: 'vindicator',
            count: 2,
            allowedLanes: [0],
            laneMode: 'fixed',
            startOffsetSeconds: 1.5,
            intervalSeconds: 2.5,
          },
          {
            enemyId: 'pillager',
            count: 2,
            allowedLanes: [0],
            laneMode: 'fixed',
            startOffsetSeconds: 3,
            intervalSeconds: 2.5,
          },
        ],
      },
    ],
    waveCrystals: [1, 1, 1, 2, 2],
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
    defenders: preset.defenders.map(defender => ({
      id: defender.id,
      classification: defender.tier === 1 ? 'base' : 'fusion',
      summonEnergyCost: defender.summonEnergyCost,
      summonCooldownSeconds: defender.summonCooldownSeconds ?? 0,
      unlocked: true,
    })),
    enemies: [
      ...preset.enemies.map(enemy => ({
        id: enemy.id,
        energy: enemy.energyReward,
        crystals: enemy.crystalReward,
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

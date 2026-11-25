import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ALL_GAME_ASSETS,
  DEFENDER_SPRITE_ASSETS,
  EFFECT_SPRITE_ASSETS,
  ENEMY_SPRITE_ASSETS,
  ITEM_SPRITE_ASSETS,
  MAP_TILE_ASSETS,
  getDefenderAsset,
  getEffectAsset,
  getEnemyAsset,
} from '../src/assets/asset-manifest';
import {
  BASIC_ATTACK_VFX_BY_DEFENDER,
  BasicAttackVisualTracker,
} from '../src/assets/basic-attack-vfx';
import type { PlaytestDefenderView, PlaytestEnemyView } from '../src/playtest/playtest-controller';

const REPO_PUBLIC_DIR = resolve(__dirname, '../../../apps/web/public');

describe('T-12.1 Asset Manifest Coverage (49 Pixel-Art PNGs)', () => {
  it('registers all 20 Defenders, 4 Enemies, 4 Items/Tools, 4 Map Tiles, and 17 Effects with unique keys and URLs', () => {
    expect(Object.keys(DEFENDER_SPRITE_ASSETS)).toHaveLength(20);
    expect(Object.keys(ENEMY_SPRITE_ASSETS)).toHaveLength(4);
    expect(Object.keys(ITEM_SPRITE_ASSETS)).toHaveLength(4);
    expect(Object.keys(MAP_TILE_ASSETS)).toHaveLength(4);
    expect(Object.keys(EFFECT_SPRITE_ASSETS)).toHaveLength(17);
    expect(ALL_GAME_ASSETS).toHaveLength(49);

    const keys = new Set(ALL_GAME_ASSETS.map(entry => entry.key));
    const urls = new Set(ALL_GAME_ASSETS.map(entry => entry.url));
    expect(keys.size).toBe(49);
    expect(urls.size).toBe(49);

    expect(getDefenderAsset('iron_ranger')?.url).toBe('/assets/sprites/defenders/iron_ranger.png');
    expect(getEnemyAsset('vindicator')?.url).toBe('/assets/sprites/enemies/vindicator.png');
    expect(getEffectAsset('proj_iron_wolf')?.url).toBe('/assets/effects/proj_iron_wolf.png');
    expect(getEffectAsset('proj_frost_pierce_arrow')?.url).toBe('/assets/effects/proj_frost_pierce_arrow.png');
  });

  it('verifies every manifest asset PNG actually exists under apps/web/public', () => {
    for (const entry of ALL_GAME_ASSETS) {
      const diskPath = resolve(REPO_PUBLIC_DIR, entry.url.replace(/^\//, ''));
      expect(existsSync(diskPath), `Missing PNG file: ${entry.url}`).toBe(true);
    }
  });

  it('registers basic attack VFX specs for all 20 Defenders', () => {
    const defenderIds = Object.keys(DEFENDER_SPRITE_ASSETS);
    expect(Object.keys(BASIC_ATTACK_VFX_BY_DEFENDER)).toHaveLength(20);
    for (const id of defenderIds) {
      expect(BASIC_ATTACK_VFX_BY_DEFENDER[id], `Missing basic attack VFX spec for ${id}`).toBeDefined();
    }
  });

  it('tracks multi-target attackCount resets, spawn-tick shots, killing blows, and match resets in BasicAttackVisualTracker', () => {
    const tracker = new BasicAttackVisualTracker();
    const geom = { originX: 136, originY: 22, cellW: 112, cellH: 132 };

    const makeDef = (
      attackCount: number,
      attackAnchorTick: number | null,
      targetId: string | null,
    ): PlaytestDefenderView => ({
      id: '1',
      definitionId: 'skeleton',
      name: 'Skeleton',
      shortLabel: 'SK',
      tier: 1,
      color: 0xe2e8f0,
      accentColor: 0x64748b,
      row: 2,
      column: 1,
      hp: 150,
      maxHp: 150,
      shieldAmount: 0,
      shieldMaxAmount: 0,
      abilityId: 'arrow_storm',
      abilityName: 'Arrow Storm',
      abilitySummary: '',
      requiresTarget: true,
      cooldownTicks: 0,
      isStunned: false,
      isFrozen: false,
      buffDamagePct: 0,
      buffAttackSpeedPct: 0,
      hasRedirectAura: false,
      targetId,
      attackCount,
      attackAnchorTick,
      badges: [],
    });

    const makeEnemy = (id: string, x: number): PlaytestEnemyView => ({
      id,
      definitionId: 'zombie',
      name: 'Zombie',
      shortLabel: 'ZB',
      color: 0x65a30d,
      lane: 2,
      x,
      hp: 100,
      maxHp: 100,
      slowPct: 0,
      isStunned: false,
      isFrozen: false,
      isVulnerable: false,
      burnCount: 0,
      targetId: null,
      attackCount: 0,
      attackAnchorTick: null,
      badges: [],
    });

    // 1. Spawn-tick immediate attack (`attackAnchorTick === currentTick`, `attackCount === 1`)
    tracker.syncFromSnapshot([makeDef(1, 10, '100')], [makeEnemy('100', 5.5)], geom, 10);
    expect(tracker.getActiveAttacks()).toHaveLength(1);
    expect(tracker.getActiveAttacks()[0].endX).toBeCloseTo(136 + 5.5 * 112);

    // 2. Killing blow on same anchor where enemy '100' disappears from living enemies list
    for (let i = 0; i < 6; i++) tracker.advance(50, false); // > 220ms skeleton duration
    tracker.syncFromSnapshot([makeDef(2, 10, '100')], [], geom, 27);
    expect(tracker.getActiveAttacks()).toHaveLength(1);
    expect(tracker.getActiveAttacks()[0].endX).toBeCloseTo(136 + 5.5 * 112);

    // 3. New enemy arrives later -> engine resets attackCount = 1 with a new attackAnchorTick = 90
    for (let i = 0; i < 6; i++) tracker.advance(50, false);
    tracker.syncFromSnapshot([makeDef(1, 90, '101')], [makeEnemy('101', 6.2)], geom, 90);
    expect(tracker.getActiveAttacks()).toHaveLength(1);
    expect(tracker.getActiveAttacks()[0].endX).toBeCloseTo(136 + 6.2 * 112);

    // 4. Match reset (tick drops back to 0) resets tracker cleanly without ghost shots from old anchor
    tracker.syncFromSnapshot([makeDef(0, null, null)], [], geom, 0);
    expect(tracker.getActiveAttacks()).toHaveLength(0);
  });
});

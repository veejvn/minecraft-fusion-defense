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
import { BASIC_ATTACK_VFX_BY_DEFENDER } from '../src/assets/basic-attack-vfx';

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
});

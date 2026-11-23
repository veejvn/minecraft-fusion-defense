import type * as Phaser from 'phaser';
import { registerPlaytestPixelTextures } from '../playtest/procedural-pixel-art';

export interface SpriteAssetEntry {
  readonly id: string;
  readonly key: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly category: 'defender' | 'enemy' | 'item' | 'map' | 'effect';
}

export const DEFENDER_SPRITE_ASSETS: Readonly<Record<string, SpriteAssetEntry>> = {
  iron_golem: { id: 'iron_golem', key: 'mfd-def-iron_golem', url: '/assets/sprites/defenders/iron_golem.png', width: 64, height: 64, category: 'defender' },
  snow_golem: { id: 'snow_golem', key: 'mfd-def-snow_golem', url: '/assets/sprites/defenders/snow_golem.png', width: 64, height: 64, category: 'defender' },
  skeleton: { id: 'skeleton', key: 'mfd-def-skeleton', url: '/assets/sprites/defenders/skeleton.png', width: 64, height: 64, category: 'defender' },
  wolf: { id: 'wolf', key: 'mfd-def-wolf', url: '/assets/sprites/defenders/wolf.png', width: 64, height: 64, category: 'defender' },
  blaze: { id: 'blaze', key: 'mfd-def-blaze', url: '/assets/sprites/defenders/blaze.png', width: 64, height: 64, category: 'defender' },
  skeleton_sniper: { id: 'skeleton_sniper', key: 'mfd-def-skeleton_sniper', url: '/assets/sprites/defenders/skeleton_sniper.png', width: 64, height: 64, category: 'defender' },
  steel_guardian: { id: 'steel_guardian', key: 'mfd-def-steel_guardian', url: '/assets/sprites/defenders/steel_guardian.png', width: 64, height: 64, category: 'defender' },
  iron_ranger: { id: 'iron_ranger', key: 'mfd-def-iron_ranger', url: '/assets/sprites/defenders/iron_ranger.png', width: 64, height: 64, category: 'defender' },
  ice_golem: { id: 'ice_golem', key: 'mfd-def-ice_golem', url: '/assets/sprites/defenders/ice_golem.png', width: 64, height: 64, category: 'defender' },
  frost_guardian: { id: 'frost_guardian', key: 'mfd-def-frost_guardian', url: '/assets/sprites/defenders/frost_guardian.png', width: 64, height: 64, category: 'defender' },
  frostbite_ranger: { id: 'frostbite_ranger', key: 'mfd-def-frostbite_ranger', url: '/assets/sprites/defenders/frostbite_ranger.png', width: 64, height: 64, category: 'defender' },
  alpha_wolf: { id: 'alpha_wolf', key: 'mfd-def-alpha_wolf', url: '/assets/sprites/defenders/alpha_wolf.png', width: 64, height: 64, category: 'defender' },
  ironfang_guardian: { id: 'ironfang_guardian', key: 'mfd-def-ironfang_guardian', url: '/assets/sprites/defenders/ironfang_guardian.png', width: 64, height: 64, category: 'defender' },
  bonefang_hunter: { id: 'bonefang_hunter', key: 'mfd-def-bonefang_hunter', url: '/assets/sprites/defenders/bonefang_hunter.png', width: 64, height: 64, category: 'defender' },
  frostfang: { id: 'frostfang', key: 'mfd-def-frostfang', url: '/assets/sprites/defenders/frostfang.png', width: 64, height: 64, category: 'defender' },
  infernal_archon: { id: 'infernal_archon', key: 'mfd-def-infernal_archon', url: '/assets/sprites/defenders/infernal_archon.png', width: 64, height: 64, category: 'defender' },
  magma_colossus: { id: 'magma_colossus', key: 'mfd-def-magma_colossus', url: '/assets/sprites/defenders/magma_colossus.png', width: 64, height: 64, category: 'defender' },
  steam_warden: { id: 'steam_warden', key: 'mfd-def-steam_warden', url: '/assets/sprites/defenders/steam_warden.png', width: 64, height: 64, category: 'defender' },
  inferno_archer: { id: 'inferno_archer', key: 'mfd-def-inferno_archer', url: '/assets/sprites/defenders/inferno_archer.png', width: 64, height: 64, category: 'defender' },
  flame_fang: { id: 'flame_fang', key: 'mfd-def-flame_fang', url: '/assets/sprites/defenders/flame_fang.png', width: 64, height: 64, category: 'defender' },
};

export const ENEMY_SPRITE_ASSETS: Readonly<Record<string, SpriteAssetEntry>> = {
  zombie: { id: 'zombie', key: 'mfd-enemy-zombie', url: '/assets/sprites/enemies/zombie.png', width: 64, height: 64, category: 'enemy' },
  husk: { id: 'husk', key: 'mfd-enemy-husk', url: '/assets/sprites/enemies/husk.png', width: 64, height: 64, category: 'enemy' },
  vindicator: { id: 'vindicator', key: 'mfd-enemy-vindicator', url: '/assets/sprites/enemies/vindicator.png', width: 64, height: 64, category: 'enemy' },
  pillager: { id: 'pillager', key: 'mfd-enemy-pillager', url: '/assets/sprites/enemies/pillager.png', width: 64, height: 64, category: 'enemy' },
};

export const ITEM_SPRITE_ASSETS: Readonly<
  Record<'energy_orb' | 'power_crystal' | 'fusion_glove' | 'shovel', SpriteAssetEntry>
> = {
  energy_orb: { id: 'energy_orb', key: 'mfd-item-energy_orb', url: '/assets/sprites/items/energy_orb.png', width: 64, height: 64, category: 'item' },
  power_crystal: { id: 'power_crystal', key: 'mfd-item-power_crystal', url: '/assets/sprites/items/power_crystal.png', width: 64, height: 64, category: 'item' },
  fusion_glove: { id: 'fusion_glove', key: 'mfd-item-fusion_glove', url: '/assets/sprites/items/fusion_glove.png', width: 64, height: 64, category: 'item' },
  shovel: { id: 'shovel', key: 'mfd-item-shovel', url: '/assets/sprites/items/shovel.png', width: 64, height: 64, category: 'item' },
};

export const MAP_TILE_ASSETS: Readonly<Record<'grassland_tile_light' | 'grassland_tile_dark' | 'base_gate_tile' | 'spawn_portal_tile', SpriteAssetEntry>> = {
  grassland_tile_light: { id: 'grassland_tile_light', key: 'mfd-map-grass_light', url: '/assets/maps/grassland_tile_light.png', width: 64, height: 64, category: 'map' },
  grassland_tile_dark: { id: 'grassland_tile_dark', key: 'mfd-map-grass_dark', url: '/assets/maps/grassland_tile_dark.png', width: 64, height: 64, category: 'map' },
  base_gate_tile: { id: 'base_gate_tile', key: 'mfd-map-base_gate', url: '/assets/maps/base_gate_tile.png', width: 64, height: 64, category: 'map' },
  spawn_portal_tile: { id: 'spawn_portal_tile', key: 'mfd-map-spawn_portal', url: '/assets/maps/spawn_portal_tile.png', width: 64, height: 64, category: 'map' },
};

export const EFFECT_SPRITE_ASSETS: Readonly<Record<string, SpriteAssetEntry>> = {
  proj_arrow: { id: 'proj_arrow', key: 'mfd-fx-proj_arrow', url: '/assets/effects/proj_arrow.png', width: 32, height: 32, category: 'effect' },
  proj_piercing_arrow: { id: 'proj_piercing_arrow', key: 'mfd-fx-proj_piercing_arrow', url: '/assets/effects/proj_piercing_arrow.png', width: 32, height: 32, category: 'effect' },
  proj_frost_pierce_arrow: { id: 'proj_frost_pierce_arrow', key: 'mfd-fx-proj_frost_pierce_arrow', url: '/assets/effects/proj_frost_pierce_arrow.png', width: 32, height: 32, category: 'effect' },
  proj_steel_bolt: { id: 'proj_steel_bolt', key: 'mfd-fx-proj_steel_bolt', url: '/assets/effects/proj_steel_bolt.png', width: 32, height: 32, category: 'effect' },
  proj_fireball: { id: 'proj_fireball', key: 'mfd-fx-proj_fireball', url: '/assets/effects/proj_fireball.png', width: 32, height: 32, category: 'effect' },
  proj_snowball: { id: 'proj_snowball', key: 'mfd-fx-proj_snowball', url: '/assets/effects/proj_snowball.png', width: 32, height: 32, category: 'effect' },
  proj_meteor_arrow: { id: 'proj_meteor_arrow', key: 'mfd-fx-proj_meteor_arrow', url: '/assets/effects/proj_meteor_arrow.png', width: 32, height: 32, category: 'effect' },
  proj_iron_wolf: { id: 'proj_iron_wolf', key: 'mfd-fx-proj_iron_wolf', url: '/assets/effects/proj_iron_wolf.png', width: 64, height: 64, category: 'effect' },
  proj_fire_wolf: { id: 'proj_fire_wolf', key: 'mfd-fx-proj_fire_wolf', url: '/assets/effects/proj_fire_wolf.png', width: 64, height: 64, category: 'effect' },
  vfx_frost_shield: { id: 'vfx_frost_shield', key: 'mfd-fx-vfx_frost_shield', url: '/assets/effects/vfx_frost_shield.png', width: 64, height: 64, category: 'effect' },
  vfx_iron_bastion: { id: 'vfx_iron_bastion', key: 'mfd-fx-vfx_iron_bastion', url: '/assets/effects/vfx_iron_bastion.png', width: 64, height: 64, category: 'effect' },
  vfx_predator_mark: { id: 'vfx_predator_mark', key: 'mfd-fx-vfx_predator_mark', url: '/assets/effects/vfx_predator_mark.png', width: 32, height: 32, category: 'effect' },
  vfx_frost_claw: { id: 'vfx_frost_claw', key: 'mfd-fx-vfx_frost_claw', url: '/assets/effects/vfx_frost_claw.png', width: 64, height: 64, category: 'effect' },
  vfx_steam_burst: { id: 'vfx_steam_burst', key: 'mfd-fx-vfx_steam_burst', url: '/assets/effects/vfx_steam_burst.png', width: 64, height: 64, category: 'effect' },
  vfx_ice_block: { id: 'vfx_ice_block', key: 'mfd-fx-vfx_ice_block', url: '/assets/effects/vfx_ice_block.png', width: 64, height: 64, category: 'effect' },
  vfx_earth_crack: { id: 'vfx_earth_crack', key: 'mfd-fx-vfx_earth_crack', url: '/assets/effects/vfx_earth_crack.png', width: 64, height: 64, category: 'effect' },
  vfx_howl_ring: { id: 'vfx_howl_ring', key: 'mfd-fx-vfx_howl_ring', url: '/assets/effects/vfx_howl_ring.png', width: 64, height: 64, category: 'effect' },
};

export const ALL_GAME_ASSETS: readonly SpriteAssetEntry[] = [
  ...Object.values(DEFENDER_SPRITE_ASSETS),
  ...Object.values(ENEMY_SPRITE_ASSETS),
  ...Object.values(ITEM_SPRITE_ASSETS),
  ...Object.values(MAP_TILE_ASSETS),
  ...Object.values(EFFECT_SPRITE_ASSETS),
];

/** Back-compat alias for the HUD tool sprites now included in `ITEM_SPRITE_ASSETS`. */
export const OPTIONAL_TOOL_SPRITE_ASSETS: Readonly<Record<'fusion_glove' | 'shovel', SpriteAssetEntry>> = {
  fusion_glove: ITEM_SPRITE_ASSETS.fusion_glove,
  shovel: ITEM_SPRITE_ASSETS.shovel,
};

export function getDefenderAsset(definitionId: string): SpriteAssetEntry | undefined {
  return DEFENDER_SPRITE_ASSETS[definitionId];
}

export function getEnemyAsset(definitionId: string): SpriteAssetEntry | undefined {
  return ENEMY_SPRITE_ASSETS[definitionId];
}

export function getEffectAsset(effectId: string): SpriteAssetEntry | undefined {
  return EFFECT_SPRITE_ASSETS[effectId];
}

/**
 * Queue all 47 pixel-art PNG assets for a Phaser Scene and register procedural
 * CanvasTexture fallbacks in parallel so rendering never fails cleanly offline/in tests.
 */
export function preloadGameAssets(
  scene: Phaser.Scene,
  nearestFilter: Phaser.Textures.FilterMode,
): void {
  registerPlaytestPixelTextures(scene, nearestFilter);
  for (const asset of ALL_GAME_ASSETS) {
    if (!scene.textures.exists(asset.key)) {
      scene.load.image(asset.key, asset.url);
    }
  }
}

/** Apply NEAREST filtering to every loaded manifest texture in the Scene cache. */
export function applyNearestFilterToManifestTextures(
  scene: Phaser.Scene,
  nearestFilter: Phaser.Textures.FilterMode,
): void {
  for (const asset of ALL_GAME_ASSETS) {
    if (scene.textures.exists(asset.key)) {
      scene.textures.get(asset.key).setFilter(nearestFilter);
    }
  }
}

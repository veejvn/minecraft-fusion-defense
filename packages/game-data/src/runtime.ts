import { z } from 'zod';
import { gameDataBundleSchema, type GameDataBundle } from './bundle';

const runtimeBundleSchema = gameDataBundleSchema.superRefine((bundle, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
  if (bundle.contentStatus !== 'approved') issue(['contentStatus'], 'Runtime data requires approved content; incomplete definitions cannot run');
  const base = bundle.defenders.filter(item => item.classification === 'base');
  const fusion = bundle.defenders.filter(item => item.classification === 'fusion');
  if (base.length !== 5) issue(['defenders'], `MVP requires 5 Base Defenders; found ${base.length}`);
  if (fusion.length !== 7) issue(['defenders'], `MVP requires 7 Fusion Defenders; found ${fusion.length}`);
  if (bundle.enemies.length !== 4) issue(['enemies'], `MVP requires 4 Enemy types; found ${bundle.enemies.length}`);
  if (bundle.fusionRecipes.length !== 7) issue(['fusionRecipes'], `MVP requires 7 Fusion Recipes; found ${bundle.fusionRecipes.length}`);
  if (bundle.abilities.length !== 12) issue(['abilities'], `MVP requires 12 Abilities; found ${bundle.abilities.length}`);
  if (bundle.levels.length !== 1) issue(['levels'], `MVP requires 1 Grassland Level; found ${bundle.levels.length}`);
  if (bundle.waves.length !== 5) issue(['waves'], `MVP requires 5 Waves; found ${bundle.waves.length}`);
  bundle.defenders.forEach((item, index) => {
    if (!item.stats) issue(['defenders', index, 'stats'], 'Runtime Defender stats are missing');
    if (!item.abilityId) issue(['defenders', index, 'abilityId'], 'Runtime Defender Ability reference is missing');
    if (item.classification === 'base' && item.summonEnergyCost === undefined) issue(['defenders', index, 'summonEnergyCost'], 'Runtime Base Defender summon cost is missing');
  });
  bundle.enemies.forEach((item, index) => {
    if (!item.stats) issue(['enemies', index, 'stats'], 'Runtime Enemy stats are missing');
    if (!item.rewards) issue(['enemies', index, 'rewards'], 'Runtime Enemy rewards are missing');
  });
  bundle.abilities.forEach((item, index) => {
    if (item.powerCrystalCost === undefined) issue(['abilities', index, 'powerCrystalCost'], 'Runtime Ability cost is missing');
    // No executable Ability effect contract has been approved. Keep runtime data
    // closed until that contract can validate the actual effect configuration.
    issue(['abilities', index, 'effects'], `Executable Ability effect contract is not approved for ${item.id}`);
  });
  bundle.levels.forEach((item, index) => {
    if (item.rows !== 5 || item.columns !== 9) issue(['levels', index], 'Grassland battlefield must be 5 rows × 9 columns');
    if (item.waveIds.length !== 5) issue(['levels', index, 'waveIds'], 'Grassland must reference 5 Waves');
  });
  bundle.waves.forEach((item, index) => {
    if (!item.spawns?.length) issue(['waves', index, 'spawns'], 'Runtime Wave spawn composition/timing is missing');
  });
  const requiredResources = ['initialEnergy', 'passiveEnergyAmount', 'passiveEnergyIntervalSeconds', 'maxEnergy', 'initialPowerCrystals', 'maxPowerCrystals', 'energyItemLifetimeSeconds', 'powerCrystalItemLifetimeSeconds'] as const;
  requiredResources.forEach(key => {
    if (bundle.resources[key] === undefined) issue(['resources', key], `Runtime resource configuration is missing: ${key}`);
  });
});

/** The isolated boundary later gameplay code must call before consuming definitions. */
export function loadRuntimeData(candidate: unknown): GameDataBundle {
  return runtimeBundleSchema.parse(candidate);
}

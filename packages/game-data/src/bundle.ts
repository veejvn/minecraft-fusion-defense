import { z } from 'zod';
import { abilityDefinitionSchema } from './schemas/ability';
import { defenderDefinitionSchema } from './schemas/defender';
import { enemyDefinitionSchema } from './schemas/enemy';
import { fusionRecipeSchema } from './schemas/fusion-recipe';
import { levelDefinitionSchema } from './schemas/level';
import { resourceConfigurationSchema } from './schemas/resources';
import { waveDefinitionSchema } from './schemas/wave';

export const SUPPORTED_SCHEMA_VERSION = 1;

const bundleShape = z.strictObject({
  schemaVersion: z.number().int().refine(value => value === SUPPORTED_SCHEMA_VERSION, {
    message: `Unsupported Game Data schema version; expected ${SUPPORTED_SCHEMA_VERSION}`,
  }),
  contentStatus: z.enum(['incomplete', 'approved']),
  defenders: z.array(defenderDefinitionSchema),
  enemies: z.array(enemyDefinitionSchema),
  fusionRecipes: z.array(fusionRecipeSchema),
  abilities: z.array(abilityDefinitionSchema),
  levels: z.array(levelDefinitionSchema),
  waves: z.array(waveDefinitionSchema),
  resources: resourceConfigurationSchema,
});

function duplicateIds(items: readonly { id: string }[], path: string, ctx: z.RefinementCtx): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.id)) ctx.addIssue({ code: 'custom', path: [path, index, 'id'], message: `Duplicate ${path} ID: ${item.id}` });
    seen.add(item.id);
  });
}

export const gameDataBundleSchema = bundleShape.superRefine((bundle, ctx) => {
  duplicateIds(bundle.defenders, 'defenders', ctx);
  duplicateIds(bundle.enemies, 'enemies', ctx);
  duplicateIds(bundle.fusionRecipes, 'fusionRecipes', ctx);
  duplicateIds(bundle.abilities, 'abilities', ctx);
  duplicateIds(bundle.levels, 'levels', ctx);
  duplicateIds(bundle.waves, 'waves', ctx);

  const defenders = new Map(bundle.defenders.map(item => [item.id, item]));
  const enemies = new Set(bundle.enemies.map(item => item.id));
  const abilities = new Map(bundle.abilities.map(item => [item.id, item]));
  const waves = new Set(bundle.waves.map(item => item.id));
  const pairs = new Set<string>();
  const wrongCategory = (id: string) => enemies.has(id) ? ` (found an Enemy with that ID)` : '';

  if (bundle.resources.initialPowerCrystals !== undefined
    && bundle.resources.maxPowerCrystals !== undefined
    && bundle.resources.initialPowerCrystals > bundle.resources.maxPowerCrystals) {
    ctx.addIssue({ code: 'custom', path: ['resources', 'initialPowerCrystals'], message: 'Initial Power Crystals exceed the storage cap' });
  }

  bundle.defenders.forEach((defender, index) => {
    if (!defender.abilityId) return;
    const ability = abilities.get(defender.abilityId);
    if (!ability) ctx.addIssue({ code: 'custom', path: ['defenders', index, 'abilityId'], message: `Unknown Ability ID: ${defender.abilityId}` });
    else if (ability.ownerDefenderId !== defender.id) ctx.addIssue({ code: 'custom', path: ['defenders', index, 'abilityId'], message: `Ability ${ability.id} belongs to ${ability.ownerDefenderId}` });
  });
  bundle.abilities.forEach((ability, index) => {
    if (!defenders.has(ability.ownerDefenderId)) ctx.addIssue({ code: 'custom', path: ['abilities', index, 'ownerDefenderId'], message: `Unknown Defender owner: ${ability.ownerDefenderId}${wrongCategory(ability.ownerDefenderId)}` });
  });
  bundle.fusionRecipes.forEach((recipe, index) => {
    recipe.inputDefenderIds.forEach((id, inputIndex) => {
      if (!defenders.has(id)) ctx.addIssue({ code: 'custom', path: ['fusionRecipes', index, 'inputDefenderIds', inputIndex], message: `Unknown Defender input: ${id}${wrongCategory(id)}` });
    });
    if (!defenders.has(recipe.outputDefenderId)) ctx.addIssue({ code: 'custom', path: ['fusionRecipes', index, 'outputDefenderId'], message: `Unknown Defender output: ${recipe.outputDefenderId}${wrongCategory(recipe.outputDefenderId)}` });
    const pair = [...recipe.inputDefenderIds].sort().join('|');
    if (pairs.has(pair)) ctx.addIssue({ code: 'custom', path: ['fusionRecipes', index, 'inputDefenderIds'], message: `Duplicate unordered Fusion input pair: ${pair}` });
    pairs.add(pair);
  });
  bundle.levels.forEach((level, index) => {
    const seen = new Set<string>();
    level.waveIds.forEach((id, waveIndex) => {
      if (!waves.has(id)) ctx.addIssue({ code: 'custom', path: ['levels', index, 'waveIds', waveIndex], message: `Unknown Wave ID: ${id}` });
      if (seen.has(id)) ctx.addIssue({ code: 'custom', path: ['levels', index, 'waveIds', waveIndex], message: `Duplicate Wave reference: ${id}` });
      seen.add(id);
    });
  });
  bundle.waves.forEach((wave, index) => wave.spawns?.forEach((spawn, spawnIndex) => {
    if (!enemies.has(spawn.enemyId)) ctx.addIssue({ code: 'custom', path: ['waves', index, 'spawns', spawnIndex, 'enemyId'], message: `Unknown Enemy ID: ${spawn.enemyId}${defenders.has(spawn.enemyId) ? ' (found a Defender with that ID)' : ''}` });
  }));
});

export type GameDataBundle = z.infer<typeof gameDataBundleSchema>;

/** Use in build/test checks for candidate TypeScript definition modules. */
export function validateGameData(candidate: unknown): GameDataBundle {
  return gameDataBundleSchema.parse(candidate);
}

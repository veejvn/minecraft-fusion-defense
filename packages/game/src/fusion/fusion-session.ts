import type { CombatSession } from '../combat/combat-session';
import type { ResourceSession } from '../core/resource-session';

const STABLE_ID_PATTERN = /^[a-z][a-z0-9_]*$/;

export interface FusionDefenderDefinition {
  readonly id: string;
  readonly tier: number;
}

export interface FusionRecipeDefinition {
  readonly id: string;
  readonly inputDefenderIds: readonly [string, string];
  readonly outputDefenderId: string;
  readonly unlocked: boolean;
  readonly enabled: boolean;
}

export interface FusionSessionInput {
  readonly defenders: readonly FusionDefenderDefinition[];
  readonly recipes: readonly FusionRecipeDefinition[];
}

/** Produce a canonical order-independent lookup key for two defender definition IDs. */
export function normalizeFusionPair(inputA: string, inputB: string): string {
  return inputA <= inputB ? `${inputA}|${inputB}` : `${inputB}|${inputA}`;
}

function assertStableId(id: unknown, label: string, existing: Record<string, unknown>): asserts id is string {
  if (typeof id !== 'string' || !STABLE_ID_PATTERN.test(id) || id in existing) {
    throw new TypeError(`Invalid or duplicate ${label} ID`);
  }
}

function freezeData<T extends object>(value: T): T {
  for (const field of Object.values(value)) {
    if (field && typeof field === 'object') freezeData(field);
  }
  return Object.freeze(value);
}

/** Validate and freeze fusion defender and recipe definitions before battle start. */
export function validateFusionSession(
  input: FusionSessionInput,
  resourceSession?: ResourceSession,
  combatSession?: CombatSession,
) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Missing fusion session input');
  }
  const config = structuredClone(input);
  if (!Array.isArray(config.defenders)) throw new TypeError('Expected defender array');
  if (!Array.isArray(config.recipes)) throw new TypeError('Expected recipe array');

  const defendersById: Record<string, FusionDefenderDefinition> = Object.create(null);
  for (const defender of config.defenders) {
    if (!defender || typeof defender !== 'object') {
      throw new TypeError('Invalid fusion defender definition');
    }
    assertStableId(defender.id, 'fusion defender definition', defendersById);
    if (typeof defender.tier !== 'number' || !Number.isSafeInteger(defender.tier) || defender.tier < 1) {
      throw new RangeError('Expected positive safe integer defender tier');
    }
    defendersById[defender.id] = defender;
  }

  const recipesById: Record<string, FusionRecipeDefinition> = Object.create(null);
  const recipesByPair: Record<string, FusionRecipeDefinition> = Object.create(null);
  for (const recipe of config.recipes) {
    if (!recipe || typeof recipe !== 'object') {
      throw new TypeError('Invalid fusion recipe definition');
    }
    assertStableId(recipe.id, 'fusion recipe', recipesById);
    if (!Array.isArray(recipe.inputDefenderIds) || recipe.inputDefenderIds.length !== 2) {
      throw new TypeError(`Invalid fusion recipe inputs: ${recipe.id}`);
    }
    const [inputA, inputB] = recipe.inputDefenderIds;
    if (typeof inputA !== 'string' || typeof inputB !== 'string' ||
      !(inputA in defendersById) || !(inputB in defendersById)) {
      throw new TypeError(`Unknown fusion recipe input defender: ${recipe.id}`);
    }
    if (typeof recipe.outputDefenderId !== 'string' || !(recipe.outputDefenderId in defendersById)) {
      throw new TypeError(`Unknown fusion recipe output defender: ${recipe.id}`);
    }
    if (typeof recipe.unlocked !== 'boolean' || typeof recipe.enabled !== 'boolean') {
      throw new TypeError(`Invalid fusion recipe availability flags: ${recipe.id}`);
    }
    const pairKey = normalizeFusionPair(inputA, inputB);
    if (pairKey in recipesByPair) {
      throw new TypeError(`Duplicate fusion input pair: ${pairKey}`);
    }
    recipesById[recipe.id] = recipe;
    recipesByPair[pairKey] = recipe;
  }

  if (resourceSession) {
    for (const defender of resourceSession.defenders) {
      if (!(defender.id in defendersById)) {
        throw new TypeError(`Missing fusion definition for defender: ${defender.id}`);
      }
    }
  }

  if (combatSession) {
    for (const defender of config.defenders) {
      if (!(defender.id in combatSession.defendersById)) {
        throw new TypeError(`Missing combat definition for fusion defender: ${defender.id}`);
      }
    }
  }

  return freezeData({
    defenders: config.defenders,
    recipes: config.recipes,
    defendersById,
    recipesById,
    recipesByPair,
  });
}

export type FusionSession = ReturnType<typeof validateFusionSession>;

import { BATTLEFIELD_COLUMNS, BATTLEFIELD_ROWS } from '../battlefield/grid';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface EconomyProductionConfig {
  readonly itemCount: number;
  readonly amountPerItem: number;
  readonly initialDelaySeconds: number;
  readonly intervalSeconds: number;
}

export interface VillageChestConfig {
  readonly enabled: boolean;
  readonly amount: number;
  readonly intervalSeconds: number;
}

export interface StartingDefenderPlacement {
  readonly definitionId: string;
  readonly row: number;
  readonly column: number;
}

export interface ResourceSessionInput {
  readonly seed: number;
  readonly defenders: readonly {
    readonly id: string;
    readonly classification: 'base' | 'fusion';
    readonly summonEnergyCost: number;
    readonly unlocked: boolean;
    readonly summonCooldownSeconds?: number;
    readonly economyProduction?: EconomyProductionConfig;
  }[];
  readonly enemies: readonly {
    readonly id: string;
    readonly energy: number;
    readonly crystals: number;
    readonly crystalDropChance?: number;
  }[];
  readonly waves: readonly { readonly id: string; readonly crystals: number }[];
  readonly energyItems: {
    readonly amount: number;
    readonly intervalSeconds: number;
    readonly region: { readonly min: Point; readonly max: Point };
    // The supplied list defines the distribution. Repeated positions have greater weight.
    readonly positions: readonly Point[];
  };
  readonly initialEnergy?: number;
  readonly enablePassiveEnergy?: boolean;
  readonly villageChest?: VillageChestConfig;
  readonly enableRandomEnergyItems?: boolean;
  readonly enableRandomCrystalItems?: boolean;
  readonly fusionGloveCooldownSeconds?: number;
  readonly startingDefenders?: readonly StartingDefenderPlacement[];
}

export function count(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Expected a nonnegative safe integer');
  return value;
}

export function deadline(seconds: number, rate: number, origin = 0): number {
  const offset = Math.ceil(seconds * rate);
  if (offset <= 0) throw new RangeError('Timer must advance');
  return count(origin + count(offset));
}

function validateIds(entries: readonly { id: string }[]): void {
  const ids = new Set<string>();
  for (const { id } of entries) {
    if (typeof id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(id) || ids.has(id)) {
      throw new TypeError('Invalid or duplicate definition ID');
    }
    ids.add(id);
  }
}

function normalized(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y) &&
    point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
}

function freezeData<T extends object>(value: T): T {
  for (const field of Object.values(value)) if (field && typeof field === 'object') freezeData(field);
  return Object.freeze(value);
}

export function validateResourceSession(input: ResourceSessionInput, rate: number) {
  const config = structuredClone(input);
  if (count(config.seed) > 0xffffffff) throw new RangeError('Seed must be uint32');
  validateIds(config.defenders);
  validateIds(config.enemies);
  validateIds(config.waves);
  for (const defender of config.defenders) {
    if ((defender.classification !== 'base' && defender.classification !== 'fusion') ||
      typeof defender.unlocked !== 'boolean') throw new TypeError('Invalid Defender availability');
    count(defender.summonEnergyCost);
    if (defender.summonCooldownSeconds !== undefined) {
      if (typeof defender.summonCooldownSeconds !== 'number' ||
        !Number.isFinite(defender.summonCooldownSeconds) ||
        defender.summonCooldownSeconds < 0) {
        throw new RangeError('Invalid Defender summon cooldown');
      }
      if (defender.summonCooldownSeconds > 0) deadline(defender.summonCooldownSeconds, rate);
    }
    if (defender.economyProduction !== undefined) {
      const prod = defender.economyProduction;
      if (!prod || typeof prod !== 'object') throw new TypeError('Invalid economyProduction');
      if (count(prod.itemCount) === 0 || count(prod.amountPerItem) === 0) {
        throw new RangeError('Economy production itemCount and amountPerItem must be positive integers');
      }
      if (
        typeof prod.initialDelaySeconds !== 'number' ||
        !Number.isFinite(prod.initialDelaySeconds) ||
        prod.initialDelaySeconds <= 0 ||
        typeof prod.intervalSeconds !== 'number' ||
        !Number.isFinite(prod.intervalSeconds) ||
        prod.intervalSeconds <= 0
      ) {
        throw new RangeError('Invalid economyProduction timing seconds');
      }
      deadline(prod.initialDelaySeconds, rate);
      deadline(prod.intervalSeconds, rate);
    }
  }
  for (const enemy of config.enemies) {
    count(enemy.energy);
    count(enemy.crystals);
    if (enemy.crystalDropChance !== undefined) {
      if (
        typeof enemy.crystalDropChance !== 'number' ||
        !Number.isFinite(enemy.crystalDropChance) ||
        enemy.crystalDropChance < 0 ||
        enemy.crystalDropChance > 1
      ) {
        throw new RangeError('Invalid Enemy crystal drop chance');
      }
    }
  }
  for (const wave of config.waves) count(wave.crystals);
  const energy = config.energyItems;
  if (!energy || count(energy.amount) === 0 || !Number.isFinite(energy.intervalSeconds) || energy.intervalSeconds <= 0 ||
    !Array.isArray(energy.positions) || energy.positions.length === 0) throw new TypeError('Missing or invalid Energy Item configuration');
  const { min, max } = energy.region;
  if (!normalized(min) || !normalized(max) || min.x > max.x || min.y > max.y ||
    energy.positions.some(p => !normalized(p) || p.x < min.x || p.x > max.x || p.y < min.y || p.y > max.y)) {
    throw new RangeError('Invalid Energy Item interactive region or positions');
  }
  deadline(energy.intervalSeconds, rate);
  deadline(3, rate);
  deadline(10, rate);
  if (
    (config.enableRandomEnergyItems !== undefined && typeof config.enableRandomEnergyItems !== 'boolean') ||
    (config.enableRandomCrystalItems !== undefined && typeof config.enableRandomCrystalItems !== 'boolean')
  ) {
    throw new TypeError('Invalid random resource spawn flag');
  }
  if (config.fusionGloveCooldownSeconds !== undefined) {
    if (
      typeof config.fusionGloveCooldownSeconds !== 'number' ||
      !Number.isFinite(config.fusionGloveCooldownSeconds) ||
      config.fusionGloveCooldownSeconds < 0
    ) {
      throw new RangeError('Invalid Fusion Glove cooldown');
    }
    if (config.fusionGloveCooldownSeconds > 0) deadline(config.fusionGloveCooldownSeconds, rate);
  }
  if (config.initialEnergy !== undefined) {
    count(config.initialEnergy);
  }
  if (config.enablePassiveEnergy !== undefined && typeof config.enablePassiveEnergy !== 'boolean') {
    throw new TypeError('Invalid enablePassiveEnergy flag');
  }
  if (config.villageChest !== undefined) {
    const chest = config.villageChest;
    if (!chest || typeof chest !== 'object' || typeof chest.enabled !== 'boolean') {
      throw new TypeError('Invalid villageChest configuration');
    }
    if (
      count(chest.amount) === 0 ||
      typeof chest.intervalSeconds !== 'number' ||
      !Number.isFinite(chest.intervalSeconds) ||
      chest.intervalSeconds <= 0
    ) {
      throw new RangeError('Invalid villageChest amount or intervalSeconds');
    }
    deadline(chest.intervalSeconds, rate);
  }
  const defenderIds = new Set(config.defenders.map(d => d.id));
  const startingCells = new Set<string>();
  const startingDefenders: StartingDefenderPlacement[] = [];
  if (config.startingDefenders !== undefined) {
    if (!Array.isArray(config.startingDefenders)) {
      throw new TypeError('startingDefenders must be an array');
    }
    for (const starter of config.startingDefenders) {
      if (!starter || typeof starter !== 'object' || !defenderIds.has(starter.definitionId)) {
        throw new TypeError(`Invalid startingDefender definitionId: ${String(starter?.definitionId)}`);
      }
      if (
        !Number.isSafeInteger(starter.row) || starter.row < 0 || starter.row >= BATTLEFIELD_ROWS ||
        !Number.isSafeInteger(starter.column) || starter.column < 0 || starter.column >= BATTLEFIELD_COLUMNS
      ) {
        throw new RangeError('startingDefender cell out of bounds (5x10)');
      }
      const key = `${starter.row},${starter.column}`;
      if (startingCells.has(key)) {
        throw new RangeError(`Duplicate startingDefender cell (${starter.row}, ${starter.column})`);
      }
      startingCells.add(key);
      startingDefenders.push({
        definitionId: starter.definitionId,
        row: starter.row,
        column: starter.column,
      });
    }
  }

  const minInterval = count(Math.ceil(30 * rate));
  const maxInterval = count(Math.floor(60 * rate));
  if (minInterval < 1 || minInterval > maxInterval) throw new RangeError('No eligible Crystal interval');
  return freezeData({
    ...config,
    startingDefenders,
    enemies: config.enemies.map(enemy => ({
      ...enemy,
      crystalDropChance: enemy.crystalDropChance ?? 1,
    })),
    initialEnergy: config.initialEnergy ?? 50,
    enablePassiveEnergy: config.enablePassiveEnergy ?? true,
    enableRandomEnergyItems: config.enableRandomEnergyItems ?? true,
    enableRandomCrystalItems: config.enableRandomCrystalItems ?? true,
    fusionGloveCooldownSeconds: config.fusionGloveCooldownSeconds ?? 0,
    rate,
    minInterval,
    maxInterval,
  });
}

export type ResourceSession = ReturnType<typeof validateResourceSession>;

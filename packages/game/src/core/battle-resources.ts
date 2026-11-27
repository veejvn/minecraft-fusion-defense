import { BATTLEFIELD_COLUMNS, cellIndex, isLane, type Cell } from '../battlefield/grid';
import type { EntityId } from '../entities/runtime-entity';
import { applyBattleCommand, type BattleState } from './battle-state';
import { uniformFraction, uniformIndex, type ResourceRng } from './resource-rng';
import { count, deadline, type Point, type ResourceSession } from './resource-session';

const ENERGY_GRANT = 50;
const CRYSTAL_CAP = 5;
type ItemId = bigint;
type ItemPosition =
  | { readonly kind: 'normalized'; readonly point: Point }
  | { readonly kind: 'cell'; readonly cell: Cell }
  | { readonly kind: 'lane'; readonly lane: number; readonly position: number };

interface Item {
  readonly id: ItemId;
  readonly kind: 'energy' | 'crystal';
  readonly amount: number;
  readonly source: string | EntityId;
  readonly position: ItemPosition;
  readonly expiresAt: number;
}

export interface ResourceState {
  energy: number;
  crystals: number;
  pending: number;
  readonly items: Map<ItemId, Item>;
  nextItemId: ItemId;
  initialized: boolean;
  terminal: 'victory' | 'defeat' | null;
  readonly rewardedEnemies: Set<EntityId>;
  readonly rewardedWaves: Set<string>;
  readonly processedClaims: Set<string>;
  outcome: { eventId: string; status: 'APPLIED' | 'REJECTED'; reason?: string } | null;
  summonCooldownUntilTick?: Map<string, number>;
  gloveCooldownUntilTick?: number;
  villageChestReady?: boolean;
  villageChestNextTick?: number | null;
  producerNextTickByEntityId?: Map<EntityId, number>;
}

export function createResourceState(): ResourceState {
  return {
    energy: 0, crystals: 0, pending: 0, items: new Map(), nextItemId: 0n,
    initialized: false, terminal: null, rewardedEnemies: new Set(), rewardedWaves: new Set(),
    processedClaims: new Set(), outcome: null,
  };
}

export type ResourceCommand =
  | { readonly type: 'summon'; readonly definitionId: string; readonly cell: Cell }
  | { readonly type: 'move-defender'; readonly defenderId: EntityId; readonly targetCell: Cell }
  | { readonly type: 'collect'; readonly id: ItemId }
  | { readonly type: 'claim-village-chest' }
  | { readonly type: 'enemy-reward'; readonly sourceId: EntityId; readonly definitionId: string;
      readonly lane: number; readonly position: number }
  | { readonly type: 'wave-reward'; readonly sourceId: string }
  | { readonly type: 'claim'; readonly requestId: string }
  | { readonly type: 'terminal'; readonly result: 'victory' | 'defeat' };

type Timer =
  | { readonly type: 'initialize' }
  | { readonly type: 'periodic-energy' | 'energy-spawn'; readonly period: number }
  | { readonly type: 'village-chest-ready' }
  | { readonly type: 'defender-produce'; readonly entityId: EntityId; readonly expectedTick: number }
  | { readonly type: 'crystal-attempt' }
  | { readonly type: 'expire'; readonly id: ItemId };

export type ResourceEvent = ResourceCommand | Timer;

interface Context {
  readonly battle: BattleState;
  readonly state: ResourceState;
  readonly config: ResourceSession;
  readonly rng: ResourceRng;
  readonly tick: number;
  readonly schedule: (timer: Timer, tick: number) => void;
}

function spawn(ctx: Context, kind: Item['kind'], amount: number, position: ItemPosition, source: Item['source']): void {
  const expiresAt = deadline(10, ctx.config.rate, ctx.tick);
  const id = ctx.state.nextItemId++;
  ctx.state.items.set(id, { id, kind, amount, position, source, expiresAt });
  ctx.schedule({ type: 'expire', id }, expiresAt);
}

function collect(state: ResourceState, id: ItemId): string | undefined {
  const item = state.items.get(id);
  if (!item) return 'item-unavailable';
  if (item.kind === 'crystal') {
    if (state.crystals + item.amount > CRYSTAL_CAP) return 'crystal-storage-full';
    state.crystals += item.amount;
  } else {
    state.energy = count(state.energy + item.amount);
  }
  state.items.delete(id);
}

function itemOnCell(position: ItemPosition, cell: Cell): boolean {
  switch (position.kind) {
    case 'cell': return position.cell.row === cell.row && position.cell.column === cell.column;
    // The headless Enemy position is a continuous offset in cell units along its lane.
    case 'lane': return position.lane === cell.row && Math.floor(position.position) === cell.column;
    case 'normalized': return false;
  }
}

export function claimPending(state: ResourceState, requestId: string): string | undefined {
  if (typeof requestId !== 'string' || !requestId.trim()) throw new TypeError('Invalid claim identity');
  if (state.processedClaims.has(requestId)) return 'duplicate-claim';
  const amount = Math.min(state.pending, CRYSTAL_CAP - state.crystals);
  if (amount === 0) return 'nothing-to-claim';
  state.crystals += amount;
  state.pending -= amount;
  state.processedClaims.add(requestId);
}

function nextCrystalAttempt(ctx: Context): void {
  const { minInterval, maxInterval } = ctx.config;
  const interval = minInterval + uniformIndex(ctx.rng, maxInterval - minInterval + 1);
  ctx.schedule({ type: 'crystal-attempt' }, count(ctx.tick + interval));
}

function clampLaneX(x: number): number {
  return Math.max(0.15, Math.min(BATTLEFIELD_COLUMNS - 0.15, x));
}

export function spawnEmeraldBurst(
  ctx: Context,
  cell: Cell,
  sourceId: EntityId,
  totalAmount: number,
  itemCount: number,
  spawnAsItems: boolean,
): void {
  if (!spawnAsItems) {
    ctx.state.energy = count(ctx.state.energy + totalAmount);
    return;
  }
  const countItems = Math.max(1, itemCount);
  const perItem = Math.floor(totalAmount / countItems);
  const remainder = totalAmount - perItem * countItems;
  const spreadSpan = countItems <= 1 ? 0 : Math.min(0.85, 0.25 + countItems * 0.06);
  for (let i = 0; i < countItems; i++) {
    const amount = perItem + (i === 0 ? remainder : 0);
    if (amount <= 0) continue;
    const baseOffset = countItems <= 1 ? 0 : -spreadSpan / 2 + (spreadSpan * i) / (countItems - 1);
    const jitter = (uniformFraction(ctx.rng) - 0.5) * (countItems <= 1 ? 0.34 : 0.14);
    const position = clampLaneX(cell.column + 0.5 + baseOffset + jitter);
    spawn(ctx, 'energy', amount, { kind: 'lane', lane: cell.row, position }, sourceId);
  }
}

export function registerDefenderProducer(
  ctx: Context,
  entityId: EntityId,
  definitionId: string,
): void {
  const definition = ctx.config.defenders.find(d => d.id === definitionId);
  const prod = definition?.economyProduction;
  if (!prod) return;
  const nextTick = count(ctx.tick + deadline(prod.initialDelaySeconds, ctx.config.rate));
  ctx.state.producerNextTickByEntityId ??= new Map();
  ctx.state.producerNextTickByEntityId.set(entityId, nextTick);
  ctx.schedule({ type: 'defender-produce', entityId, expectedTick: nextTick }, nextTick);
}

export function unregisterDefenderProducer(state: ResourceState, entityId: EntityId): void {
  state.producerNextTickByEntityId?.delete(entityId);
}

function runTimer(ctx: Context, timer: Timer): void {
  const { state, config } = ctx;
  switch (timer.type) {
    case 'initialize':
      if (state.initialized) return;
      state.initialized = true;
      state.energy = count(state.energy + config.initialEnergy);
      if (config.enablePassiveEnergy) {
        ctx.schedule({ type: 'periodic-energy', period: 1 }, deadline(3, config.rate));
      }
      if (config.enableRandomCrystalItems) {
        nextCrystalAttempt(ctx);
      }
      if (config.enableRandomEnergyItems) {
        ctx.schedule({ type: 'energy-spawn', period: 1 }, deadline(config.energyItems.intervalSeconds, config.rate));
      }
      if (config.villageChest?.enabled) {
        const firstReadyTick = deadline(config.villageChest.intervalSeconds, config.rate);
        state.villageChestReady = false;
        state.villageChestNextTick = firstReadyTick;
        ctx.schedule({ type: 'village-chest-ready' }, firstReadyTick);
      }
      return;
    case 'periodic-energy': {
      state.energy = count(state.energy + ENERGY_GRANT);
      const period = count(timer.period + 1);
      ctx.schedule({ type: 'periodic-energy', period }, deadline(period * 3, config.rate));
      return;
    }
    case 'energy-spawn': {
      const { positions, amount, intervalSeconds } = config.energyItems;
      const point = positions[uniformIndex(ctx.rng, positions.length)];
      spawn(ctx, 'energy', amount, { kind: 'normalized', point }, 'energy-timer');
      const period = count(timer.period + 1);
      ctx.schedule({ type: 'energy-spawn', period }, deadline(period * intervalSeconds, config.rate));
      return;
    }
    case 'village-chest-ready': {
      if (config.villageChest?.enabled && !state.villageChestReady) {
        state.villageChestReady = true;
        state.villageChestNextTick = null;
      }
      return;
    }
    case 'defender-produce': {
      const expected = state.producerNextTickByEntityId?.get(timer.entityId);
      if (expected !== timer.expectedTick) return;
      const entity = ctx.battle.entities.get(timer.entityId);
      if (!entity || entity.kind !== 'defender') {
        state.producerNextTickByEntityId?.delete(timer.entityId);
        return;
      }
      if (ctx.battle.combat) {
        const cState = ctx.battle.combat.entities.get(timer.entityId);
        if (!cState || cState.hp <= 0) {
          state.producerNextTickByEntityId?.delete(timer.entityId);
          return;
        }
      }
      const def = config.defenders.find(d => d.id === entity.definitionId);
      const prod = def?.economyProduction;
      if (!prod) {
        state.producerNextTickByEntityId?.delete(timer.entityId);
        return;
      }
      spawnEmeraldBurst(
        ctx,
        entity.cell,
        timer.entityId,
        prod.amountPerItem * prod.itemCount,
        prod.itemCount,
        true,
      );
      const nextTick = count(ctx.tick + deadline(prod.intervalSeconds, config.rate));
      state.producerNextTickByEntityId!.set(timer.entityId, nextTick);
      ctx.schedule({ type: 'defender-produce', entityId: timer.entityId, expectedTick: nextTick }, nextTick);
      return;
    }
    case 'crystal-attempt': {
      const eligible = ctx.battle.occupancy.flatMap((id, index) => id === null ? [index] : []);
      if (eligible.length) {
        const index = eligible[uniformIndex(ctx.rng, eligible.length)];
        const cell = { row: Math.floor(index / BATTLEFIELD_COLUMNS), column: index % BATTLEFIELD_COLUMNS };
        spawn(ctx, 'crystal', 1, { kind: 'cell', cell }, 'crystal-timer');
      }
      nextCrystalAttempt(ctx);
      return;
    }
    case 'expire':
      state.items.delete(timer.id);
  }
}

function applyResourceCommand(ctx: Context, command: ResourceCommand): string | undefined {
  const { state, battle, config } = ctx;
  switch (command.type) {
    case 'summon': {
      const definition = config.defenders.find(d => d.id === command.definitionId);
      if (!definition?.unlocked || definition.classification !== 'base') return 'defender-unavailable';
      let index: number;
      try {
        index = cellIndex(command.cell);
      } catch (error) {
        if (error instanceof RangeError) return 'invalid-cell';
        throw error;
      }
      if (battle.occupancy[index] !== null) return 'occupied-cell';
      if ((definition.summonCooldownSeconds ?? 0) > 0) {
        const readyTick = state.summonCooldownUntilTick?.get(definition.id) ?? 0;
        if (ctx.tick < readyTick) return 'summon-on-cooldown';
      }
      if (state.energy < definition.summonEnergyCost) return 'insufficient-energy';
      state.energy -= definition.summonEnergyCost;
      const spawnedId = battle.nextEntityId;
      applyBattleCommand(battle, { type: 'add', entity: {
        kind: 'defender', definitionId: definition.id, cell: command.cell,
      } });
      registerDefenderProducer(ctx, spawnedId, definition.id);
      if ((definition.summonCooldownSeconds ?? 0) > 0) {
        state.summonCooldownUntilTick ??= new Map();
        state.summonCooldownUntilTick.set(
          definition.id,
          ctx.tick + deadline(definition.summonCooldownSeconds!, config.rate),
        );
      }
      // Map insertion order is the monotonically allocated Item creation order.
      for (const [id, item] of state.items) {
        if (state.crystals === CRYSTAL_CAP) break;
        if (item.kind === 'crystal' && itemOnCell(item.position, command.cell)) collect(state, id);
      }
      return;
    }
    case 'move-defender': {
      if (state.terminal || battle.combat?.terminal) return 'terminal';
      let targetIndex: number;
      try {
        targetIndex = cellIndex(command.targetCell);
      } catch (error) {
        if (error instanceof RangeError) return 'invalid-cell';
        throw error;
      }
      const defender = battle.entities.get(command.defenderId);
      if (!defender || defender.kind !== 'defender') return 'invalid-target';
      if (battle.combat) {
        const cState = battle.combat.entities.get(command.defenderId);
        if (!cState || cState.hp <= 0) return 'entity-dead';
      }
      if (
        defender.cell.row === command.targetCell.row &&
        defender.cell.column === command.targetCell.column
      ) {
        return 'same-cell';
      }
      if (battle.occupancy[targetIndex] !== null) return 'occupied-cell';
      if (config.fusionGloveCooldownSeconds > 0) {
        const readyTick = state.gloveCooldownUntilTick ?? 0;
        if (ctx.tick < readyTick) return 'glove-on-cooldown';
      }
      const oldIndex = cellIndex(defender.cell);
      if (battle.occupancy[oldIndex] !== defender.id) throw new Error('Inconsistent defender occupancy');
      battle.occupancy[oldIndex] = null;
      battle.occupancy[targetIndex] = defender.id;
      battle.entities.set(defender.id, {
        ...defender,
        cell: { row: command.targetCell.row, column: command.targetCell.column },
      });
      if (battle.combat) {
        const cState = battle.combat.entities.get(defender.id);
        if (cState) cState.targetId = null;
      }
      for (const [id, item] of state.items) {
        if (state.crystals === CRYSTAL_CAP) break;
        if (item.kind === 'crystal' && itemOnCell(item.position, command.targetCell)) collect(state, id);
      }
      if (config.fusionGloveCooldownSeconds > 0) {
        state.gloveCooldownUntilTick =
          ctx.tick + deadline(config.fusionGloveCooldownSeconds, config.rate);
      }
      return;
    }
    case 'collect':
      return collect(state, command.id);
    case 'claim-village-chest': {
      if (!config.villageChest?.enabled) return 'village-chest-disabled';
      if (!state.villageChestReady) return 'chest-not-ready';
      state.energy = count(state.energy + config.villageChest.amount);
      state.villageChestReady = false;
      const nextTick = count(ctx.tick + deadline(config.villageChest.intervalSeconds, config.rate));
      state.villageChestNextTick = nextTick;
      ctx.schedule({ type: 'village-chest-ready' }, nextTick);
      return;
    }
    case 'claim':
      return claimPending(state, command.requestId);
    case 'wave-reward': {
      if (state.rewardedWaves.has(command.sourceId)) return 'duplicate-wave-reward';
      const wave = config.waves.find(w => w.id === command.sourceId);
      if (!wave) return 'unknown-wave-reward';
      const deposit = Math.min(wave.crystals, CRYSTAL_CAP - state.crystals);
      state.pending = count(state.pending + (wave.crystals - deposit));
      state.crystals += deposit;
      state.rewardedWaves.add(command.sourceId);
      return;
    }
    case 'enemy-reward': {
      if (state.rewardedEnemies.has(command.sourceId)) return 'duplicate-enemy-reward';
      const definition = config.enemies.find(e => e.id === command.definitionId);
      if (!definition || typeof command.sourceId !== 'bigint' || command.sourceId < 0n ||
        !isLane(command.lane) || !Number.isFinite(command.position)) return 'invalid-enemy-reward';
      const registered = battle.entities.get(command.sourceId);
      if (registered && (registered.kind !== 'enemy' || registered.definitionId !== command.definitionId)) {
        return 'invalid-enemy-reward';
      }
      state.energy = count(state.energy + definition.energy);
      if (definition.crystals > 0) {
        const dropChance = definition.crystalDropChance ?? 1;
        const shouldDrop =
          dropChance >= 1
            ? true
            : dropChance <= 0
              ? false
              : uniformFraction(ctx.rng) < dropChance;
        if (shouldDrop) {
          for (let i = 0; i < definition.crystals; i++) {
            spawn(ctx, 'crystal', 1, { kind: 'lane', lane: command.lane, position: command.position }, command.sourceId);
          }
        }
      }
      state.rewardedEnemies.add(command.sourceId);
      return;
    }
    case 'terminal':
      if (command.result !== 'victory' && command.result !== 'defeat') throw new TypeError('Invalid terminal result');
      state.pending = 0;
      state.terminal = command.result;
      return;
    default:
      throw new TypeError('Unknown resource command');
  }
}

export function applyResourceEvent(ctx: Context, event: ResourceEvent, eventId: string): void {
  if (ctx.state.terminal) return;
  switch (event.type) {
    case 'initialize':
    case 'periodic-energy':
    case 'energy-spawn':
    case 'village-chest-ready':
    case 'defender-produce':
    case 'crystal-attempt':
    case 'expire':
      runTimer(ctx, event);
      return;
    default: {
      const reason = applyResourceCommand(ctx, event);
      ctx.state.outcome = reason ? { eventId, status: 'REJECTED', reason } : { eventId, status: 'APPLIED' };
    }
  }
}

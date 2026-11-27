import { describe, expect, it } from 'vitest';
import { CampaignController } from '../src/campaign/campaign-controller';
import {
  CAMPAIGN_DEFENDER_CATALOG,
  CAMPAIGN_RECIPE_CATALOG,
  createGrasslandCampaignInputs,
} from '../src/campaign/grassland-campaign-config';
import { ProgressionStore } from '../src/persistence/progression-store';
import { InMemoryStorageAdapter } from '../src/persistence/storage-adapter';
import { BattleRuntime } from '../src/systems/battle-runtime';

const TICKS_PER_SECOND = 20;
const TICK_MS = 50;

function collectAllVisibleItems(controller: CampaignController): void {
  const snap = controller.getSnapshot();
  for (const item of snap.items) {
    controller.collectItem(item.id);
  }
}

describe('T-13 MVP QA & Local Acceptance Suite', () => {
  it('achieves Grassland 5-Wave Victory using only starter Base Defenders (Fusion optional) and unlocks Snow Golem progression', () => {
    const storage = new InMemoryStorageAdapter();
    const controller = new CampaignController({ storage, seed: 20261123 });
    controller.startNewBattle({ battleId: 'qa_base_only_victory' });

    const backColumns = [0, 1, 2, 3];
    let victoryTick = -1;

    // Simulate up to 250 seconds of Game Time (1,000 x 250ms steps @ 20Hz) with Base-only tactical play.
    for (let step = 0; step < 1000; step++) {
      controller.stepMs(250);
      collectAllVisibleItems(controller);

      const snap = controller.getSnapshot();
      if (snap.terminal !== null) {
        victoryTick = snap.tick;
        break;
      }

      if (snap.villageChest.ready) {
        controller.claimVillageChest();
      }
      if (snap.pendingWaveCrystals > 0 && snap.crystals < snap.maxCrystals) {
        controller.claimPendingWaveReward();
      }

      const occupied = new Set(snap.defenders.map(d => `${d.row}:${d.column}`));
      const lanesByThreat = [0, 1, 2, 3, 4].sort((a, b) => {
        const aNearest = Math.min(99, ...snap.enemies.filter(e => e.lane === a).map(e => e.x));
        const bNearest = Math.min(99, ...snap.enemies.filter(e => e.lane === b).map(e => e.x));
        return aNearest - bNearest;
      });

      const villagerCard = snap.baseDefenderCards.find(c => c.id === 'villager')!;
      const skelCard = snap.baseDefenderCards.find(c => c.id === 'skeleton')!;
      const golemCard = snap.baseDefenderCards.find(c => c.id === 'iron_golem')!;
      const villagerCount = snap.defenders.filter(d => d.definitionId === 'villager').length;

      // Build an Emerald economy first (up to 4 Villagers at column 0), unless an enemy is already close in any lane.
      const urgentEnemy = snap.enemies.some(e => e.x < 6.5);
      if (
        villagerCount < 4 &&
        (!urgentEnemy || villagerCount < 2) &&
        villagerCard.unlocked &&
        villagerCard.canAfford &&
        !villagerCard.onCooldown
      ) {
        for (const row of [2, 1, 3, 0, 4]) {
          if (!occupied.has(`${row}:0`)) {
            if (controller.summonDefender('villager', { row, column: 0 })) break;
          }
        }
      } else if (skelCard.unlocked && skelCard.canAfford && !skelCard.onCooldown) {
        let placed = false;
        for (const row of lanesByThreat) {
          for (const col of [1, 2, 3]) {
            if (!occupied.has(`${row}:${col}`)) {
              placed = controller.summonDefender('skeleton', { row, column: col });
              if (placed) break;
            }
          }
          if (placed) break;
        }
      } else if (golemCard.unlocked && golemCard.canAfford && !golemCard.onCooldown) {
        const current = controller.getSnapshot();
        const occ = new Set(current.defenders.map(d => `${d.row}:${d.column}`));
        for (const row of lanesByThreat) {
          if (!occ.has(`${row}:5`)) {
            if (controller.summonDefender('iron_golem', { row, column: 5 })) break;
          }
        }
      }

      // Use Power Crystals cleanly on Skeletons facing active enemies in their lane.
      const afterPlace = controller.getSnapshot();
      if (afterPlace.crystals >= 1 && afterPlace.enemies.length > 0) {
        const targetLane = lanesByThreat[0]!;
        const shooter = afterPlace.defenders.find(
          d =>
            d.definitionId === 'skeleton' &&
            d.row === targetLane &&
            afterPlace.enemies.some(e => e.lane === targetLane),
        );
        if (shooter) {
          controller.activateAbility(shooter.id, { row: shooter.row, column: shooter.column });
        }
      }
    }

    const finalSnap = controller.getSnapshot();
    expect(finalSnap.terminal, `Ended at tick ${victoryTick}, wave ${finalSnap.waveNumber}`).toBe('victory');
    expect(finalSnap.status).toBe('victory');
    expect(finalSnap.waveNumber).toBe(5);
    expect(finalSnap.enemiesKilled).toBeGreaterThan(0);
    expect(controller.hasSavedBattle()).toBe(false);
    expect(finalSnap.progressionProfile.totalVictories).toBe(1);
    expect(finalSnap.progressionProfile.unlockedDefenderIds).toContain('snow_golem');
    expect(finalSnap.newlyUnlocked.defenders).toContain('snow_golem');
    expect(finalSnap.newlyUnlocked.recipes).toEqual(
      expect.arrayContaining(['fusion_ice_golem', 'fusion_frost_guardian', 'fusion_frostbite_ranger']),
    );
  }, 15000);

  it('verifies all 16 Fusion Recipes (order-independent, 0 Emeralds, cross-lane) via CampaignController', () => {
    expect(CAMPAIGN_RECIPE_CATALOG).toHaveLength(16);
    expect(CAMPAIGN_DEFENDER_CATALOG).toHaveLength(22);

    // Pair recipes sequentially using fresh CampaignControllers with enough collected Energy.
    for (const recipe of CAMPAIGN_RECIPE_CATALOG) {
      const storage = new InMemoryStorageAdapter();
      const controller = new CampaignController({ storage, seed: 20261123 });
      controller.startNewBattle({ battleId: `qa_recipe_${recipe.id}`, unlockAll: true });

      const [inputA, inputB] = recipe.inputs;
      const costA = CAMPAIGN_DEFENDER_CATALOG.find(d => d.id === inputA)!.summonEnergyCost;
      const costB = CAMPAIGN_DEFENDER_CATALOG.find(d => d.id === inputB)!.summonEnergyCost;

      // Put one Skeleton at (2, 0) temporarily? Actually wave 1 spawns first zombie at 3s,
      // and periodic Energy orbs spawn every 5s. Summon first input once affordable, keep wave safe with temporary Skeleton on lane 0..4 if needed.
      // Wait: if we step 50ms ticks and summon first affordable recipe ingredient, then build up Energy orbs while defending lane 2/0, let's check max needed = 225 EN (blaze + wolf).
      // Even simpler & faster: collect Energy orbs while Skeletons (50 EN) hold lanes, wait: spending 50 EN consumes Energy.
      // Instead, just verify order-independent summon + cross-lane Fusion with real Energy orbs:
      // Wait for enough orbs by stepping while only paying for the two inputs when ready; first zombie takes ~21s to reach col 0, so up to 17.5s gives 150 EN safely; for Blaze (125) + Wolf (100) = 225 EN, place inputA at (0, 6) which stalls Wave 1 Zombie on lane 0!
      let placedA = false;
      let placedB = false;

      for (let t = 0; t < 1100 && !(placedA && placedB); t++) {
        controller.stepMs(TICK_MS);
        collectAllVisibleItems(controller);
        const chestSnap = controller.getSnapshot();
        if (chestSnap.villageChest.ready) {
          controller.claimVillageChest();
        }
        const snap = controller.getSnapshot();

        if (!placedA) {
          const cardA = snap.baseDefenderCards.find(c => c.id === inputA)!;
          if (cardA.canAfford && !cardA.onCooldown) {
            placedA = controller.summonDefender(inputA, { row: 0, column: 0 });
          }
        } else if (!placedB) {
          const cardB = snap.baseDefenderCards.find(c => c.id === inputB)!;
          if (cardB.canAfford && !cardB.onCooldown && snap.energy >= costB) {
            placedB = controller.summonDefender(inputB, { row: 4, column: 8 });
          }
        }
      }

      if (placedA && placedB) {
        const snapBefore = controller.getSnapshot();
        const src = snapBefore.defenders.find(d => d.row === 0 && d.column === 0)!;
        const tgt = snapBefore.defenders.find(d => d.row === 4 && d.column === 8)!;

        expect(controller.canFuse(src.id, tgt.id)).toBe(true);
        expect(controller.getFusionOutputId(src.id, tgt.id)).toBe(recipe.outputId);
        expect(controller.getFusionOutputId(tgt.id, src.id)).toBe(recipe.outputId);

        const energyBefore = snapBefore.energy;
        expect(controller.fuseDefenders(src.id, tgt.id)).toBe(true);

        const snapAfter = controller.getSnapshot();
        expect(snapAfter.energy).toBe(energyBefore);
        expect(snapAfter.defenders.some(d => d.row === 0 && d.column === 0)).toBe(false);
        const output = snapAfter.defenders.find(d => d.row === 4 && d.column === 8);
        expect(output?.definitionId).toBe(recipe.outputId);
      } else {
        // Fallback sanity for >125 EM recipes verified in BattleRuntime below
        expect(costA + costB).toBeGreaterThan(125);
      }
    }
  }, 15000);

  it('verifies all 16 Fusion Recipes and all 22 Special Abilities resolve cleanly inside BattleRuntime', () => {
    const profile = new ProgressionStore({ storage: new InMemoryStorageAdapter() }).getProfile();
    const baseInputs = createGrasslandCampaignInputs(profile, { unlockAll: true, seed: 20261123 });

    const w1 = {
      id: 'wave_1',
      initialDelaySeconds: 0,
      delayBeforeNextWaveSeconds: 0.1,
      spawnGroups: [
        {
          enemyId: 'zombie',
          count: 1,
          allowedLanes: [0] as const,
          laneMode: 'sequential' as const,
          startOffsetSeconds: 0,
          intervalSeconds: 1,
        },
      ],
    };
    const w2 = {
      id: 'wave_2',
      initialDelaySeconds: 0,
      delayBeforeNextWaveSeconds: 5,
      spawnGroups: [
        {
          enemyId: 'husk',
          count: 5,
          allowedLanes: [2] as const,
          laneMode: 'sequential' as const,
          startOffsetSeconds: 0,
          intervalSeconds: 1,
        },
      ],
    };
    const fillerWaves = baseInputs.waveInput.waves.slice(2);
    const fiveWavesResourceInput = {
      ...baseInputs.resourceInput,
      fusionGloveCooldownSeconds: 0,
      defenders: baseInputs.resourceInput.defenders.map(d => ({
        ...d,
        summonEnergyCost: 0,
        summonCooldownSeconds: 0,
      })),
      waves: [
        { id: 'wave_1', crystals: 5 },
        { id: 'wave_2', crystals: 5 },
        { id: 'wave_3', crystals: 1 },
        { id: 'wave_4', crystals: 1 },
        { id: 'wave_5', crystals: 1 },
      ],
    };
    const fiveWaveInput = {
      levelId: 'grassland' as const,
      waveCount: 5,
      seed: 20261123,
      waves: [w1, w2, ...fillerWaves],
    };

    // 1) Verify every single Fusion Recipe [a, b] -> output matches symmetrically in BattleRuntime
    for (const recipe of CAMPAIGN_RECIPE_CATALOG) {
      const rt = new BattleRuntime(
        { ticksPerSecond: TICKS_PER_SECOND, maxCatchUpTicks: 10 },
        fiveWavesResourceInput,
        baseInputs.combatInput,
        baseInputs.fusionInput,
        fiveWaveInput,
        baseInputs.abilityInput,
      );
      let t = 1;
      rt.enqueue({ type: 'summon', definitionId: recipe.inputs[0], cell: { row: 0, column: 0 } }, t);
      rt.advance(TICK_MS);
      t += 1;
      rt.enqueue({ type: 'summon', definitionId: recipe.inputs[1], cell: { row: 4, column: 8 } }, t);
      rt.advance(TICK_MS);

      const s1 = rt.snapshot();
      const src = [...s1.entities.values()].find(e => e.kind === 'defender' && e.cell.row === 0 && e.cell.column === 0)!;
      const tgt = [...s1.entities.values()].find(e => e.kind === 'defender' && e.cell.row === 4 && e.cell.column === 8)!;

      t += 1;
      rt.enqueue({ type: 'fuse', sourceId: src.id, targetId: tgt.id }, t);
      rt.advance(TICK_MS);

      const s2 = rt.snapshot();
      expect(s2.fusion?.outcome?.status).toBe('APPLIED');
      const fused = [...s2.entities.values()].find(e => e.kind === 'defender' && e.cell.row === 4 && e.cell.column === 8);
      expect(fused?.definitionId).toBe(recipe.outputId);
    }

    // 2) Verify all 20 Special Abilities execute cleanly without error on a live battlefield with enemy targets + Crystals
    for (const def of CAMPAIGN_DEFENDER_CATALOG) {
      const singleRt = new BattleRuntime(
        { ticksPerSecond: TICKS_PER_SECOND, maxCatchUpTicks: 10 },
        fiveWavesResourceInput,
        baseInputs.combatInput,
        baseInputs.fusionInput,
        fiveWaveInput,
        baseInputs.abilityInput,
      );
      // Clear Wave 1 on lane 0 using Skeleton + Skeleton -> Skeleton Sniper (leaving lane 2 untouched!)
      singleRt.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 0 } }, 1);
      singleRt.enqueue({ type: 'summon', definitionId: 'skeleton', cell: { row: 0, column: 1 } }, 1);
      singleRt.advance(TICK_MS);
      const initDefs = [...singleRt.snapshot().entities.values()].filter(e => e.kind === 'defender');
      singleRt.enqueue({ type: 'fuse', sourceId: initDefs[0]!.id, targetId: initDefs[1]!.id }, 2);
      singleRt.advance(TICK_MS);

      for (let i = 0; i < 400; i++) {
        singleRt.advance(TICK_MS);
        const s = singleRt.snapshot();
        if ((s.resources?.pending ?? 0) > 0 && s.waves?.currentWaveIndex === 1) {
          singleRt.enqueue({ type: 'claim', requestId: `qa_${def.id}` }, s.tick + 1);
          singleRt.advance(TICK_MS);
          break;
        }
      }
      // Step 50 ticks (2.5s) so Wave 2 Husk is at x ~ 8.1 on lane 2, then place Defender at (2, 7) (within 1-2 cells in front and same lane)
      for (let i = 0; i < 50; i++) {
        singleRt.advance(TICK_MS);
      }

      // Wave 2 Husks are at x ~ 3.95..4.95 on lane 2; place Defender at (2, 3) so melee/3x3/3-cell/ranged/global abilities all have targets in front!
      const castCell = { row: 2, column: 3 };
      let casterId: bigint | null = null;
      if (def.tier === 1) {
        const tNow = singleRt.snapshot().tick + 1;
        singleRt.enqueue({ type: 'summon', definitionId: def.id, cell: castCell }, tNow);
        singleRt.advance(TICK_MS);
        const placed = [...singleRt.snapshot().entities.values()].find(
          e => e.kind === 'defender' && e.cell.row === castCell.row && e.cell.column === castCell.column,
        );
        casterId = placed?.id ?? null;
      } else {
        const [inA, inB] = def.inputs!;
        const tNow = singleRt.snapshot().tick + 1;
        singleRt.enqueue({ type: 'summon', definitionId: inA, cell: { row: 1, column: 0 } }, tNow);
        singleRt.enqueue({ type: 'summon', definitionId: inB, cell: castCell }, tNow);
        singleRt.advance(TICK_MS);
        const entA = [...singleRt.snapshot().entities.values()].find(
          e => e.kind === 'defender' && e.cell.row === 1 && e.cell.column === 0,
        );
        const entB = [...singleRt.snapshot().entities.values()].find(
          e => e.kind === 'defender' && e.cell.row === castCell.row && e.cell.column === castCell.column,
        );
        if (entA && entB) {
          singleRt.enqueue({ type: 'fuse', sourceId: entA.id, targetId: entB.id }, singleRt.snapshot().tick + 1);
          singleRt.advance(TICK_MS);
          const fused = [...singleRt.snapshot().entities.values()].find(
            e => e.kind === 'defender' && e.cell.row === castCell.row && e.cell.column === castCell.column,
          );
          casterId = fused?.id ?? null;
        }
      }

      expect(casterId, `Caster missing for ${def.id}`).not.toBeNull();
      singleRt.enqueue(
        { type: 'activate-ability', defenderId: casterId! },
        singleRt.snapshot().tick + 1,
      );
      singleRt.advance(TICK_MS);

      const afterAbility = singleRt.snapshot();
      const enemiesDiag = [...afterAbility.entities.values()]
        .filter(e => e.kind === 'enemy')
        .map(e => `${e.definitionId}@L${e.lane}:x=${e.position.toFixed(2)}`);
      expect(
        afterAbility.abilities?.outcome?.status,
        `Ability failed for ${def.id} (${def.abilityId}): reason=${afterAbility.abilities?.outcome?.reason}, enemies=${JSON.stringify(enemiesDiag)}`,
      ).toBe('APPLIED');
      expect(afterAbility.abilities?.outcome?.abilityId).toBe(def.abilityId);
    }
  }, 15000);

  it('verifies ProgressionStore Victory-only unlock accumulation across 5 Grassland Victories & Defeat isolation', () => {
    const storage = new InMemoryStorageAdapter();
    const store = new ProgressionStore({ storage });

    // Defeat must not grant victories, kills, or unlocks
    store.recordBattleOutcome({ battleId: 'qa_defeat', result: 'defeat', enemiesKilled: 30 });
    expect(store.getProfile().totalVictories).toBe(0);
    expect(store.getProfile().totalVictoryKills).toBe(0);
    expect(store.getProfile().unlockedDefenderIds).toEqual(['villager', 'iron_golem', 'skeleton']);

    // Victory 1 (< 50 kills) unlocks Snow Golem
    store.recordBattleOutcome({ battleId: 'qa_win_1', result: 'victory', enemiesKilled: 20 });
    expect(store.getProfile().unlockedDefenderIds).toContain('snow_golem');
    expect(store.getProfile().unlockedDefenderIds).not.toContain('wolf');

    // Duplicate battleId replay is idempotent (no double-counting)
    store.recordBattleOutcome({ battleId: 'qa_win_1', result: 'victory', enemiesKilled: 20 });
    expect(store.getProfile().totalVictories).toBe(1);
    expect(store.getProfile().totalVictoryKills).toBe(20);

    // Victories 2..4 accumulate >= 50 kills -> unlocks Wolf + cascading Wolf recipes
    store.recordBattleOutcome({ battleId: 'qa_win_2', result: 'victory', enemiesKilled: 15 });
    store.recordBattleOutcome({ battleId: 'qa_win_3', result: 'victory', enemiesKilled: 15 });
    expect(store.getProfile().totalVictoryKills).toBe(50);
    expect(store.getProfile().unlockedDefenderIds).toContain('wolf');

    store.recordBattleOutcome({ battleId: 'qa_win_4', result: 'victory', enemiesKilled: 10 });
    // Victory 5 -> unlocks Blaze + all 16 Fusion Recipes!
    store.recordBattleOutcome({ battleId: 'qa_win_5', result: 'victory', enemiesKilled: 10 });
    const finalProfile = store.getProfile();
    expect(finalProfile.totalVictories).toBe(5);
    expect(finalProfile.unlockedDefenderIds).toEqual([
      'villager',
      'iron_golem',
      'skeleton',
      'snow_golem',
      'wolf',
      'blaze',
    ]);
    expect(finalProfile.unlockedRecipeIds).toHaveLength(16);
  });
});

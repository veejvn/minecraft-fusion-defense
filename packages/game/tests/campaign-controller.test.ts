import { describe, expect, it } from 'vitest';
import { CampaignController } from '../src/campaign/campaign-controller';
import {
  CAMPAIGN_DEFENDER_CATALOG,
  CAMPAIGN_ENEMY_CATALOG,
  CAMPAIGN_GLOVE_COOLDOWN_SECONDS,
  CAMPAIGN_RECIPE_CATALOG,
} from '../src/campaign/grassland-campaign-config';
import { ProgressionStore } from '../src/persistence/progression-store';
import { InMemoryStorageAdapter } from '../src/persistence/storage-adapter';

describe('T-14 CampaignController & Grassland Campaign Integration', () => {
  it('exposes complete 22-Defender, 16-Recipe, 4-Enemy catalogs and enforces starter unlocks on new battle', () => {
    expect(CAMPAIGN_DEFENDER_CATALOG).toHaveLength(22);
    expect(CAMPAIGN_RECIPE_CATALOG).toHaveLength(16);
    expect(CAMPAIGN_ENEMY_CATALOG).toHaveLength(4);

    const storage = new InMemoryStorageAdapter();
    const controller = new CampaignController({ storage });
    expect(controller.hasSavedBattle()).toBe(false);

    controller.startNewBattle();
    const snap = controller.getSnapshot();
    expect(snap.status).toBe('playing');
    expect(snap.energy).toBe(100);
    expect(snap.totalWaves).toBe(5);
    expect(snap.waveNumber).toBe(1);

    const unlockedCards = snap.baseDefenderCards.filter(c => c.unlocked).map(c => c.id);
    expect(unlockedCards).toEqual(['villager', 'iron_golem', 'skeleton']);

    // Summoning a locked Defender (snow_golem) is rejected with English message.
    expect(controller.summonDefender('snow_golem', { row: 0, column: 0 })).toBe(false);
    expect(controller.getSnapshot().lastToast?.message).toBe('Defender is still locked');

    // Summoning Villager costs 50 EM and succeeds, leaving 50 EM -> Iron Golem (50 EM) succeeds -> 0 EM left for Skeleton.
    expect(controller.summonDefender('villager', { row: 1, column: 0 })).toBe(true);
    expect(controller.getSnapshot().energy).toBe(50);
    expect(controller.summonDefender('skeleton', { row: 2, column: 0 })).toBe(false);
    expect(controller.summonDefender('iron_golem', { row: 2, column: 0 })).toBe(true);
    expect(controller.getSnapshot().defenders).toHaveLength(2);
    expect(controller.getSnapshot().energy).toBe(0);
    expect(controller.hasSavedBattle()).toBe(true);
  });

  it('supports Villager Emerald production, free unlimited-distance Fusion, Pause guard, and Save & Resume across controller instances', () => {
    const storage = new InMemoryStorageAdapter();
    const controllerA = new CampaignController({ storage });
    controllerA.startNewBattle({ battleId: 'camp_resume_1' });

    // Start at 100 EM -> summon Villager at (1, 0) (50 EM left), then collect Villager drops + chest to fund 2 Skeletons.
    expect(controllerA.summonDefender('villager', { row: 1, column: 0 })).toBe(true);
    expect(controllerA.summonDefender('skeleton', { row: 0, column: 0 })).toBe(false);

    for (let i = 0; i < 560; i++) {
      controllerA.stepMs(50);
      for (const item of controllerA.getSnapshot().items) {
        if (item.kind === 'energy') controllerA.collectItem(item.id);
      }
      if (controllerA.getSnapshot().villageChest.ready) {
        controllerA.claimVillageChest();
      }
    }
    expect(controllerA.getSnapshot().energy).toBeGreaterThanOrEqual(200);
    expect(controllerA.summonDefender('skeleton', { row: 0, column: 0 })).toBe(true);

    // Wait 5.5s for Skeleton summon cooldown, then place 2nd Skeleton at opposite corner (4, 8).
    for (let i = 0; i < 110; i++) {
      controllerA.stepMs(50);
    }
    expect(controllerA.summonDefender('skeleton', { row: 4, column: 8 })).toBe(true);

    const src = controllerA.getSnapshot().defenders.find(d => d.row === 0 && d.column === 0)!;
    const tgt = controllerA.getSnapshot().defenders.find(d => d.row === 4 && d.column === 8)!;
    expect(controllerA.canFuse(src.id, tgt.id)).toBe(true);
    expect(controllerA.getFusionOutputId(src.id, tgt.id)).toBe('skeleton_sniper');

    // Free cross-lane maximum-corner Fusion at 0 Emeralds!
    const energyBeforeFuse = controllerA.getSnapshot().energy;
    expect(controllerA.fuseDefenders(src.id, tgt.id)).toBe(true);
    const afterFuse = controllerA.getSnapshot();
    expect(afterFuse.energy).toBe(energyBeforeFuse);
    expect(afterFuse.defenders).toHaveLength(2);
    expect(afterFuse.defenders.find(d => d.row === 4 && d.column === 8)).toMatchObject({
      definitionId: 'skeleton_sniper',
      row: 4,
      column: 8,
    });

    // Pause blocks summon/fuse/ability.
    controllerA.setPaused(true);
    expect(controllerA.getSnapshot().status).toBe('paused');
    expect(controllerA.summonDefender('skeleton', { row: 1, column: 1 })).toBe(false);
    expect(controllerA.getSnapshot().lastToast?.message).toBe('Game is Paused');

    // Simulate browser reload with a brand-new CampaignController reading the same storage.
    const controllerB = new CampaignController({ storage });
    const summary = controllerB.getSavedBattleSummary();
    expect(summary).not.toBeNull();
    expect(summary?.battleId).toBe('camp_resume_1');

    expect(controllerB.resumeSavedBattle()).toBe(true);
    const resumed = controllerB.getSnapshot();
    expect(resumed.status).toBe('playing');
    expect(resumed.defenders.find(d => d.row === 4 && d.column === 8)).toMatchObject({
      definitionId: 'skeleton_sniper',
      row: 4,
      column: 8,
    });
  });

  it('tracks Victory unlocks and clears active checkpoint on Defeat', () => {
    const storage = new InMemoryStorageAdapter();
    const controller = new CampaignController({ storage });
    controller.startNewBattle({ battleId: 'camp_defeat_1' });
    expect(controller.hasSavedBattle()).toBe(true);

    // Step with zero Defenders until Wave 1 Zombie reaches the base -> Defeat!
    for (let i = 0; i < 800; i++) {
      controller.stepMs(50);
      if (controller.getSnapshot().terminal !== null) break;
    }

    const defeatSnap = controller.getSnapshot();
    expect(defeatSnap.status).toBe('defeat');
    expect(defeatSnap.terminal).toBe('defeat');
    expect(defeatSnap.progressionProfile.totalVictories).toBe(0);
    expect(controller.hasSavedBattle()).toBe(false);

    // Verify unlock progression reflection when ProgressionStore records Victory.
    const store = new ProgressionStore({ storage });
    store.recordBattleOutcome({ battleId: 'camp_win_1', result: 'victory', enemiesKilled: 10 });
    const controllerAfterWin = new CampaignController({ storage });
    controllerAfterWin.startNewBattle();
    const afterWinSnap = controllerAfterWin.getSnapshot();
    expect(afterWinSnap.baseDefenderCards.find(c => c.id === 'snow_golem')?.unlocked).toBe(true);
    expect(afterWinSnap.unlockedRecipeIds).toContain('fusion_ice_golem');
    expect(afterWinSnap.unlockedRecipeIds).toContain('fusion_frost_guardian');
    expect(afterWinSnap.unlockedRecipeIds).toContain('fusion_frostbite_ranger');
  });

  it('enforces base defender summon cooldowns, freezes cooldown on pause, and persists across resume', () => {
    const storage = new InMemoryStorageAdapter();
    const controller = new CampaignController({ storage });
    controller.startNewBattle({ battleId: 'camp_cooldown_1', unlockAll: true });

    // Advance 25s with two Villagers & Village Supply Chest to ensure >= 250 EM before testing cooldowns.
    expect(controller.summonDefender('villager', { row: 4, column: 0 })).toBe(true);
    for (let i = 0; i < 105; i++) controller.stepMs(50);
    expect(controller.summonDefender('villager', { row: 3, column: 0 })).toBe(true);
    for (let i = 0; i < 600; i++) {
      controller.stepMs(50);
      for (const item of controller.getSnapshot().items) {
        if (item.kind === 'energy') {
          controller.collectItem(item.id);
        }
      }
      if (controller.getSnapshot().villageChest.ready) {
        controller.claimVillageChest();
      }
      if (controller.getSnapshot().energy >= 250) break;
    }
    expect(controller.getSnapshot().energy).toBeGreaterThanOrEqual(250);

    expect(controller.summonDefender('skeleton', { row: 0, column: 0 })).toBe(true);
    const afterFirst = controller.getSnapshot();
    const skeletonCard = afterFirst.baseDefenderCards.find(c => c.id === 'skeleton')!;
    expect(skeletonCard.cooldownTotalSeconds).toBe(5);
    expect(skeletonCard.onCooldown).toBe(true);
    expect(skeletonCard.cooldownRemainingSeconds).toBeCloseTo(5, 1);
    expect(afterFirst.flashes.some(f => f.kind === 'summon' && f.cell?.row === 0 && f.cell?.column === 0)).toBe(true);

    // Second immediate Skeleton summon is rejected by cooldown even though Energy >= 100.
    expect(controller.getSnapshot().energy).toBeGreaterThanOrEqual(100);
    expect(controller.summonDefender('skeleton', { row: 1, column: 0 })).toBe(false);
    expect(controller.getSnapshot().lastToast?.message).toBe('Defender is recharging (on cooldown)');

    // Cooldown is per-Defender type, so Iron Golem (50 EN) can still be placed immediately.
    expect(controller.summonDefender('iron_golem', { row: 2, column: 0 })).toBe(true);

    // Pausing freezes cooldown countdown.
    const remBeforePause = controller.getSnapshot().baseDefenderCards.find(c => c.id === 'skeleton')!
      .cooldownRemainingSeconds;
    controller.setPaused(true);
    controller.stepMs(3000);
    const remAfterPause = controller.getSnapshot().baseDefenderCards.find(c => c.id === 'skeleton')!
      .cooldownRemainingSeconds;
    expect(remAfterPause).toBe(remBeforePause);

    // Save/Resume preserves cooldown, then advancing >= 5s clears it and allows re-summon.
    const reloaded = new CampaignController({ storage });
    expect(reloaded.resumeSavedBattle()).toBe(true);
    const reloadedCard = reloaded.getSnapshot().baseDefenderCards.find(c => c.id === 'skeleton')!;
    expect(reloadedCard.onCooldown).toBe(true);

    for (let i = 0; i < 105; i++) {
      reloaded.stepMs(50);
    }
    const readyCard = reloaded.getSnapshot().baseDefenderCards.find(c => c.id === 'skeleton')!;
    expect(readyCard.onCooldown).toBe(false);
    expect(readyCard.cooldownRemainingSeconds).toBe(0);
    expect(reloaded.summonDefender('skeleton', { row: 1, column: 0 })).toBe(true);
  });

  it('disables passive +50/3s and random items while powering Villager Emerald drops and 10s Village Supply Chest', () => {
    const storage = new InMemoryStorageAdapter();
    const controller = new CampaignController({ storage });
    controller.startNewBattle({ battleId: 'camp_no_passive_economy', unlockAll: true });

    // Start at 100 EM; after 9.5s with NO Villagers and NO chest claim, still 100 EM and 0 items!
    expect(controller.getSnapshot().energy).toBe(100);
    for (let i = 0; i < 190; i++) {
      controller.stepMs(50);
      expect(controller.getSnapshot().items).toHaveLength(0);
    }
    expect(controller.getSnapshot().energy).toBe(100);
    expect(controller.claimVillageChest()).toBe(false);

    // At 10s (10 more ticks), Village Supply Chest becomes ready and grants its configured EM on click!
    const chestAmount = controller.getSnapshot().villageChest.amount;
    for (let i = 0; i < 10; i++) controller.stepMs(50);
    expect(controller.getSnapshot().villageChest.ready).toBe(true);
    expect(controller.claimVillageChest()).toBe(true);
    expect(controller.getSnapshot().energy).toBe(100 + chestAmount);
    expect(controller.getSnapshot().villageChest.ready).toBe(false);

    // Summon Villager, verify 1st collectible Emerald spawns at +4s and adds its configured EM when collected.
    const villagerCost = controller.getSnapshot().baseDefenderCards.find(c => c.id === 'villager')!.cost;
    expect(controller.summonDefender('villager', { row: 0, column: 0 })).toBe(true);
    expect(controller.getSnapshot().energy).toBe(100 + chestAmount - villagerCost);
    for (let i = 0; i < 82; i++) controller.stepMs(50);
    const villagerDrops = controller.getSnapshot().items.filter(item => item.kind === 'energy');
    expect(villagerDrops).toHaveLength(1);
    const dropAmount = villagerDrops[0]!.amount;
    expect(dropAmount).toBeGreaterThan(0);
    expect(controller.collectItem(villagerDrops[0]!.id)).toBe(true);
    expect(controller.getSnapshot().energy).toBe(100 + chestAmount - villagerCost + dropAmount);
  });

  it('supports direct shop-card fusion (summon-fuse), Fusion Glove 10s cooldown (Move/Fuse) with Pause/Save persistence, and instant 0%-refund Shovel removal', () => {
    const storage = new InMemoryStorageAdapter();
    const controller = new CampaignController({ storage });
    controller.startNewBattle({ battleId: 'camp_glove_shovel_1' });

    // Start at 100 EM -> summon Iron Golem (50 EM, 10s CD) at (0, 0), leaving 50 EM immediately.
    expect(controller.summonDefender('iron_golem', { row: 0, column: 0 })).toBe(true);
    const golem = controller.getSnapshot().defenders.find(d => d.row === 0 && d.column === 0)!;
    expect(controller.getCardFusionOutputId('iron_golem', golem.id)).toBe('steel_guardian');

    // Attempt immediate direct shop-card fusion while Iron Golem card is still on 10s cooldown -> rejected!
    expect(controller.getSnapshot().energy).toBe(50);
    expect(controller.summonAndFuseDefender('iron_golem', golem.id)).toBe(false);
    expect(controller.getSnapshot().lastToast?.message).toBe('Defender is recharging (on cooldown)');
    expect(controller.getSnapshot().energy).toBe(50);

    // Advance 10.5s so Iron Golem cooldown clears (still 50 EM available), then direct shop-card fuse onto placed Iron Golem!
    for (let i = 0; i < 210; i++) controller.stepMs(50);
    expect(controller.summonAndFuseDefender('iron_golem', golem.id)).toBe(true);
    const afterShopFuse = controller.getSnapshot();
    expect(afterShopFuse.energy).toBe(0);
    expect(afterShopFuse.defenders).toHaveLength(1);
    expect(afterShopFuse.defenders[0]).toMatchObject({
      definitionId: 'steel_guardian',
      row: 0,
      column: 0,
    });
    expect(afterShopFuse.baseDefenderCards.find(c => c.id === 'iron_golem')?.onCooldown).toBe(true);

    // Move fused Steel Guardian from (0, 0) to empty cell (2, 1) using Fusion Glove (0 EM, triggers 10s cooldown).
    const guardian = afterShopFuse.defenders[0]!;
    expect(controller.moveDefender(guardian.id, { row: 2, column: 1 })).toBe(true);
    const afterMove = controller.getSnapshot();
    expect(afterMove.energy).toBe(0);
    expect(afterMove.defenders[0]).toMatchObject({
      id: guardian.id,
      definitionId: 'steel_guardian',
      row: 2,
      column: 1,
    });
    expect(afterMove.gloveCooldown.onCooldown).toBe(true);
    expect(afterMove.gloveCooldown.totalSeconds).toBe(CAMPAIGN_GLOVE_COOLDOWN_SECONDS);
    expect(afterMove.gloveCooldown.remainingSeconds).toBeCloseTo(CAMPAIGN_GLOVE_COOLDOWN_SECONDS, 1);

    // Pause freezes Fusion Glove cooldown.
    controller.setPaused(true);
    controller.stepMs(4000);
    expect(controller.getSnapshot().gloveCooldown.remainingSeconds).toBeCloseTo(CAMPAIGN_GLOVE_COOLDOWN_SECONDS, 1);
    controller.setPaused(false);

    // Attempting another move while Glove is on cooldown is rejected.
    expect(controller.moveDefender(guardian.id, { row: 2, column: 2 })).toBe(false);
    expect(controller.getSnapshot().lastToast?.message).toBe('Fusion Glove is recharging (on cooldown)');

    // Save & Resume preserves Glove cooldown; after configured cooldown clears and Move succeeds again.
    const reloaded = new CampaignController({ storage });
    expect(reloaded.resumeSavedBattle()).toBe(true);
    expect(reloaded.getSnapshot().gloveCooldown.onCooldown).toBe(true);
    const ticksToClear = Math.ceil(CAMPAIGN_GLOVE_COOLDOWN_SECONDS * 20) + 10;
    for (let i = 0; i < ticksToClear; i++) reloaded.stepMs(50);
    expect(reloaded.getSnapshot().gloveCooldown.onCooldown).toBe(false);
    expect(reloaded.moveDefender(guardian.id, { row: 2, column: 2 })).toBe(true);

    // Shovel removes Defender immediately with 0 EN cost, 0% refund, and 0s cooldown.
    const energyBeforeShovel = reloaded.getSnapshot().energy;
    expect(reloaded.removeDefender(guardian.id)).toBe(true);
    const afterShovel = reloaded.getSnapshot();
    expect(afterShovel.defenders).toHaveLength(0);
    expect(afterShovel.energy).toBe(energyBeforeShovel);
    expect(afterShovel.lastToast?.message).toBe('Removed Steel Guardian with Shovel');
  });
});

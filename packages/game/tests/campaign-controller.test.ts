import { describe, expect, it } from 'vitest';
import { CampaignController } from '../src/campaign/campaign-controller';
import {
  CAMPAIGN_DEFENDER_CATALOG,
  CAMPAIGN_ENEMY_CATALOG,
  CAMPAIGN_RECIPE_CATALOG,
} from '../src/campaign/grassland-campaign-config';
import { ProgressionStore } from '../src/persistence/progression-store';
import { InMemoryStorageAdapter } from '../src/persistence/storage-adapter';

describe('T-12.2 CampaignController & Grassland Campaign Integration', () => {
  it('exposes complete 20-Defender, 15-Recipe, 4-Enemy catalogs and enforces starter unlocks on new battle', () => {
    expect(CAMPAIGN_DEFENDER_CATALOG).toHaveLength(20);
    expect(CAMPAIGN_RECIPE_CATALOG).toHaveLength(15);
    expect(CAMPAIGN_ENEMY_CATALOG).toHaveLength(4);

    const storage = new InMemoryStorageAdapter();
    const controller = new CampaignController({ storage });
    expect(controller.hasSavedBattle()).toBe(false);

    controller.startNewBattle();
    const snap = controller.getSnapshot();
    expect(snap.status).toBe('playing');
    expect(snap.energy).toBe(50);
    expect(snap.totalWaves).toBe(5);
    expect(snap.waveNumber).toBe(1);

    const unlockedCards = snap.baseDefenderCards.filter(c => c.unlocked).map(c => c.id);
    expect(unlockedCards).toEqual(['iron_golem', 'skeleton']);

    // Summoning a locked Defender (snow_golem) is rejected with English message.
    expect(controller.summonDefender('snow_golem', { row: 0, column: 0 })).toBe(false);
    expect(controller.getSnapshot().lastToast?.message).toBe('Defender is still locked');

    // Summoning Skeleton costs 50 Energy and succeeds.
    expect(controller.summonDefender('skeleton', { row: 2, column: 0 })).toBe(true);
    expect(controller.getSnapshot().defenders).toHaveLength(1);
    expect(controller.getSnapshot().energy).toBe(0);
    expect(controller.hasSavedBattle()).toBe(true);
  });

  it('supports Energy item collection, free unlimited-distance Fusion, Pause guard, and Save & Resume across controller instances', () => {
    const storage = new InMemoryStorageAdapter();
    const controllerA = new CampaignController({ storage });
    controllerA.startNewBattle({ battleId: 'camp_resume_1' });

    // Place Skeleton at (0, 0) using initial 50 Energy.
    expect(controllerA.summonDefender('skeleton', { row: 0, column: 0 })).toBe(true);

    // Advance 5.5s so periodic Energy Orb (25 Energy) spawns, collect twice after 10.5s -> 50 Energy -> place 2nd Skeleton at opposite corner (4, 8)!
    for (let i = 0; i < 110; i++) {
      controllerA.stepMs(50);
      for (const item of controllerA.getSnapshot().items) {
        if (item.kind === 'energy') {
          controllerA.collectItem(item.id);
        }
      }
    }
    expect(controllerA.getSnapshot().energy).toBeGreaterThanOrEqual(50);
    expect(controllerA.summonDefender('skeleton', { row: 4, column: 8 })).toBe(true);

    const src = controllerA.getSnapshot().defenders.find(d => d.row === 0 && d.column === 0)!;
    const tgt = controllerA.getSnapshot().defenders.find(d => d.row === 4 && d.column === 8)!;
    expect(controllerA.canFuse(src.id, tgt.id)).toBe(true);
    expect(controllerA.getFusionOutputId(src.id, tgt.id)).toBe('skeleton_sniper');

    // Free cross-lane maximum-corner Fusion at 0 Energy!
    const energyBeforeFuse = controllerA.getSnapshot().energy;
    expect(controllerA.fuseDefenders(src.id, tgt.id)).toBe(true);
    const afterFuse = controllerA.getSnapshot();
    expect(afterFuse.energy).toBe(energyBeforeFuse);
    expect(afterFuse.defenders).toHaveLength(1);
    expect(afterFuse.defenders[0]).toMatchObject({
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
    expect(resumed.defenders).toHaveLength(1);
    expect(resumed.defenders[0]).toMatchObject({
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

    // Advance 20.5s and collect periodic Energy orbs to ensure >= 150 Energy before testing cooldowns.
    for (let i = 0; i < 410; i++) {
      controller.stepMs(50);
      for (const item of controller.getSnapshot().items) {
        if (item.kind === 'energy') {
          controller.collectItem(item.id);
        }
      }
    }
    expect(controller.getSnapshot().energy).toBeGreaterThanOrEqual(150);

    expect(controller.summonDefender('skeleton', { row: 0, column: 0 })).toBe(true);
    const afterFirst = controller.getSnapshot();
    const skeletonCard = afterFirst.baseDefenderCards.find(c => c.id === 'skeleton')!;
    expect(skeletonCard.cooldownTotalSeconds).toBe(4);
    expect(skeletonCard.onCooldown).toBe(true);
    expect(skeletonCard.cooldownRemainingSeconds).toBeCloseTo(4, 1);
    expect(afterFirst.flashes.some(f => f.kind === 'summon' && f.cell?.row === 0 && f.cell?.column === 0)).toBe(true);

    // Second immediate Skeleton summon is rejected by cooldown even though Energy >= 50.
    expect(controller.getSnapshot().energy).toBeGreaterThanOrEqual(100);
    expect(controller.summonDefender('skeleton', { row: 1, column: 0 })).toBe(false);
    expect(controller.getSnapshot().lastToast?.message).toBe('Defender is recharging (on cooldown)');

    // Cooldown is per-Defender type, so Iron Golem (100 EN) can still be placed immediately.
    expect(controller.summonDefender('iron_golem', { row: 2, column: 0 })).toBe(true);

    // Pausing freezes cooldown countdown.
    const remBeforePause = controller.getSnapshot().baseDefenderCards.find(c => c.id === 'skeleton')!
      .cooldownRemainingSeconds;
    controller.setPaused(true);
    controller.stepMs(3000);
    const remAfterPause = controller.getSnapshot().baseDefenderCards.find(c => c.id === 'skeleton')!
      .cooldownRemainingSeconds;
    expect(remAfterPause).toBe(remBeforePause);

    // Save/Resume preserves cooldown, then advancing >= 4s clears it and allows re-summon.
    const reloaded = new CampaignController({ storage });
    expect(reloaded.resumeSavedBattle()).toBe(true);
    const reloadedCard = reloaded.getSnapshot().baseDefenderCards.find(c => c.id === 'skeleton')!;
    expect(reloadedCard.onCooldown).toBe(true);

    for (let i = 0; i < 85; i++) {
      reloaded.stepMs(50);
    }
    const readyCard = reloaded.getSnapshot().baseDefenderCards.find(c => c.id === 'skeleton')!;
    expect(readyCard.onCooldown).toBe(false);
    expect(readyCard.cooldownRemainingSeconds).toBe(0);
    expect(reloaded.summonDefender('skeleton', { row: 1, column: 0 })).toBe(true);
  });

  it('disables random Energy and Crystal item spawns while keeping +50 EN / 3s periodic Energy active', () => {
    const storage = new InMemoryStorageAdapter();
    const controller = new CampaignController({ storage });
    controller.startNewBattle({ battleId: 'camp_no_random_spawns', unlockAll: true });

    // Place a Skeleton Sniper on lane 0 and step 70s in intervals while avoiding defeat?
    // Actually verify over 18s (360 ticks @ 50ms) before any Wave 1 Zombie reaches col 0 or dies:
    // +50 EN initial + 6 periodic ticks (3,6,9,12,15,18s) = 350 EN, and 0 random orbs or crystal spawns!
    expect(controller.getSnapshot().energy).toBe(50);
    for (let i = 0; i < 360; i++) {
      controller.stepMs(50);
      expect(controller.getSnapshot().items).toHaveLength(0);
    }
    expect(controller.getSnapshot().energy).toBe(350);

    // Also verify longer 70s horizon using a runtime check via no enemies / 0 kills:
    // Wave 1 spawns at 3s and Zombies walk in 18s, so summon Skeleton Sniper at (0,0),(0,1),(1,0),(1,1)...
    // wait: killing enemies grants Energy directly, and Wave 1 Zombies drop 0 Crystals.
    // Even across 70s, no 'energy' orb item should EVER spawn!
    for (let lane = 0; lane < 5; lane++) {
      controller.summonDefender('skeleton', { row: lane, column: 0 });
    }
    for (let i = 0; i < 1040; i++) {
      controller.stepMs(50);
      const energyItems = controller.getSnapshot().items.filter(item => item.kind === 'energy');
      expect(energyItems).toHaveLength(0);
    }
  });

  it('supports direct shop-card fusion (summon-fuse), Fusion Glove 15s cooldown (Move/Fuse) with Pause/Save persistence, and instant 0%-refund Shovel removal', () => {
    const storage = new InMemoryStorageAdapter();
    const controller = new CampaignController({ storage });
    controller.startNewBattle({ battleId: 'camp_glove_shovel_1' });

    // Place Iron Golem? Start at 50 EN -> summon Skeleton at (0, 0).
    expect(controller.summonDefender('skeleton', { row: 0, column: 0 })).toBe(true);
    const skel = controller.getSnapshot().defenders.find(d => d.row === 0 && d.column === 0)!;
    expect(controller.getCardFusionOutputId('skeleton', skel.id)).toBe('skeleton_sniper');

    // Attempt immediate direct shop-card fusion while Skeleton card is still on 4s cooldown -> rejected!
    // Advance 3s so +50 EN passive triggers (Energy = 50), while Skeleton 4s cooldown still has 1s left.
    for (let i = 0; i < 60; i++) controller.stepMs(50);
    expect(controller.getSnapshot().energy).toBe(50);
    expect(controller.summonAndFuseDefender('skeleton', skel.id)).toBe(false);
    expect(controller.getSnapshot().lastToast?.message).toBe('Defender is recharging (on cooldown)');
    expect(controller.getSnapshot().energy).toBe(50);

    // Advance 1.5s more (total 4.5s > 4s cooldown), then direct shop-card fuse Skeleton onto placed Skeleton!
    for (let i = 0; i < 30; i++) controller.stepMs(50);
    expect(controller.summonAndFuseDefender('skeleton', skel.id)).toBe(true);
    const afterShopFuse = controller.getSnapshot();
    expect(afterShopFuse.energy).toBe(0);
    expect(afterShopFuse.defenders).toHaveLength(1);
    expect(afterShopFuse.defenders[0]).toMatchObject({
      definitionId: 'skeleton_sniper',
      row: 0,
      column: 0,
    });
    expect(afterShopFuse.baseDefenderCards.find(c => c.id === 'skeleton')?.onCooldown).toBe(true);

    // Move fused Skeleton Sniper from (0, 0) to empty cell (2, 1) using Fusion Glove (0 EN, triggers 15s cooldown).
    const sniper = afterShopFuse.defenders[0]!;
    expect(controller.moveDefender(sniper.id, { row: 2, column: 1 })).toBe(true);
    const afterMove = controller.getSnapshot();
    expect(afterMove.energy).toBe(0);
    expect(afterMove.defenders[0]).toMatchObject({
      id: sniper.id,
      definitionId: 'skeleton_sniper',
      row: 2,
      column: 1,
    });
    expect(afterMove.gloveCooldown.onCooldown).toBe(true);
    expect(afterMove.gloveCooldown.totalSeconds).toBe(15);
    expect(afterMove.gloveCooldown.remainingSeconds).toBeCloseTo(15, 1);

    // Pause freezes Fusion Glove cooldown.
    controller.setPaused(true);
    controller.stepMs(4000);
    expect(controller.getSnapshot().gloveCooldown.remainingSeconds).toBeCloseTo(15, 1);
    controller.setPaused(false);

    // Attempting another move while Glove is on cooldown is rejected.
    expect(controller.moveDefender(sniper.id, { row: 2, column: 2 })).toBe(false);
    expect(controller.getSnapshot().lastToast?.message).toBe('Fusion Glove is recharging (on cooldown)');

    // Save & Resume preserves Glove cooldown; after 15.5s it clears and Move succeeds again.
    const reloaded = new CampaignController({ storage });
    expect(reloaded.resumeSavedBattle()).toBe(true);
    expect(reloaded.getSnapshot().gloveCooldown.onCooldown).toBe(true);
    for (let i = 0; i < 310; i++) reloaded.stepMs(50);
    expect(reloaded.getSnapshot().gloveCooldown.onCooldown).toBe(false);
    expect(reloaded.moveDefender(sniper.id, { row: 2, column: 2 })).toBe(true);

    // Shovel removes Defender immediately with 0 EN cost, 0% refund, and 0s cooldown.
    const energyBeforeShovel = reloaded.getSnapshot().energy;
    expect(reloaded.removeDefender(sniper.id)).toBe(true);
    const afterShovel = reloaded.getSnapshot();
    expect(afterShovel.defenders).toHaveLength(0);
    expect(afterShovel.energy).toBe(energyBeforeShovel);
    expect(afterShovel.lastToast?.message).toBe('Removed Skeleton Sniper with Shovel');
  });
});

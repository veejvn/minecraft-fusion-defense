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
});

import { describe, expect, it } from 'vitest';
import { MVP_GAME_DATA } from '@mfd/game-data';
import {
  CAMPAIGN_BASE_COSTS,
  CAMPAIGN_BASE_COOLDOWNS,
  CAMPAIGN_GLOVE_COOLDOWN_SECONDS,
  createCampaignPlaytestPreset,
} from '../src/campaign/grassland-campaign-config';
import { PlaytestController } from '../src/playtest/playtest-controller';
import {
  PLAYTEST_DEFENDER_META,
  PLAYTEST_ENEMY_META,
  PLAYTEST_FUSION_RECIPES_META,
  createDefaultPlaytestPreset,
  createPlaytestPresetFromLevel,
} from '../src/playtest/playtest-presets';

describe('PlaytestController (T-10B.1 / T-10B.2 / T-10B.5 / T-14)', () => {
  it('initializes with 22 Defenders, 4 Enemies, 16 Recipes, and 22 Abilities in both modes', () => {
    const preset = createDefaultPlaytestPreset();
    expect(PLAYTEST_DEFENDER_META).toHaveLength(22);
    expect(PLAYTEST_ENEMY_META).toHaveLength(4);
    expect(PLAYTEST_FUSION_RECIPES_META).toHaveLength(16);
    expect(preset.defenders).toHaveLength(22);
    expect(preset.enemies).toHaveLength(4);
    expect(preset.abilities).toHaveLength(22);
    expect(preset.waves).toHaveLength(5);

    const sandbox = new PlaytestController({ mode: 'sandbox' });
    const sandboxSnap = sandbox.getSnapshot();
    expect(sandboxSnap.mode).toBe('sandbox');
    expect(sandboxSnap.waveStatus).toBe('sandbox');
    expect(sandboxSnap.energy).toBe(100);
    expect(sandboxSnap.crystals).toBe(0);
    expect(sandboxSnap.villageChest.enabled).toBe(true);
    expect(sandboxSnap.terminal).toBeNull();

    const fiveWaves = new PlaytestController({ mode: 'five-waves' });
    expect(fiveWaves.getSnapshot().mode).toBe('five-waves');
    expect(fiveWaves.getSnapshot().waveStatus).toBe('pending');

    // Wave 1 starts after initialDelaySeconds = 2s (40 ticks = 40 frames @ 50ms) on Lane 0.
    for (let i = 0; i < 40; i++) {
      fiveWaves.stepMs(50);
    }
    const waveSnap = fiveWaves.getSnapshot();
    expect(waveSnap.currentWaveIndex).toBe(0);
    expect(waveSnap.enemies.length).toBeGreaterThanOrEqual(1);
    expect(waveSnap.enemies.every(enemy => enemy.lane === 0)).toBe(true);
  });

  it('supports free sandbox placement (Tier 1 & Tier 2), Energy summon, drag-fusion, and removal', () => {
    const controller = new PlaytestController({ mode: 'sandbox' });

    // Free sandbox placement works for both Tier 1 and Tier 2 at 0 Energy.
    expect(controller.placeDefender('steel_guardian', { row: 0, column: 2 }, true)).toBe(true);
    // Duplicate same-tick free placement on the same cell is safely rejected before execution.
    expect(controller.placeDefender('iron_golem', { row: 0, column: 2 }, true)).toBe(false);
    controller.stepMs(50);
    expect(controller.getSnapshot().defenders).toHaveLength(1);
    expect(controller.getSnapshot().defenders[0].definitionId).toBe('steel_guardian');
    expect(controller.getSnapshot().energy).toBe(100);

    // Grant +500 Emeralds so we can summon two Tier-1 Skeletons and fuse into Skeleton Sniper.
    expect(controller.grantEnergy()).toBe(true);
    controller.stepMs(50);
    expect(controller.getSnapshot().energy).toBe(600);

    // Tier-2 direct standard summon is rejected.
    expect(controller.placeDefender('skeleton_sniper', { row: 0, column: 0 }, false)).toBe(false);

    expect(controller.placeDefender('skeleton', { row: 0, column: 0 }, false)).toBe(true);
    controller.stepMs(50);
    // Wait 5s for Skeleton summon cooldown to clear before summoning second Skeleton.
    for (let i = 0; i < 100; i++) controller.stepMs(50);
    expect(controller.placeDefender('skeleton', { row: 0, column: 1 }, false)).toBe(true);
    controller.stepMs(50);

    const afterSummons = controller.getSnapshot();
    expect(afterSummons.energy).toBe(400);
    const skelA = afterSummons.defenders.find(d => d.column === 0)!;
    const skelB = afterSummons.defenders.find(d => d.column === 1)!;
    expect(controller.canFuse(skelA.id, skelB.id)).toBe(true);
    expect(controller.canFuse(skelA.id, skelA.id)).toBe(false);

    expect(controller.fuseDefenders(skelA.id, skelB.id)).toBe(true);
    controller.stepMs(50);

    const afterFusion = controller.getSnapshot();
    const sniper = afterFusion.defenders.find(d => d.column === 1);
    expect(sniper?.definitionId).toBe('skeleton_sniper');
    expect(afterFusion.defenders.some(d => d.column === 0)).toBe(false);
    expect(afterFusion.flashes.some(f => f.kind === 'fusion')).toBe(true);

    // Remove the fused Skeleton Sniper.
    expect(controller.removeDefender(sniper!.id)).toBe(true);
    // Duplicate same-tick remove is ignored safely.
    expect(controller.removeDefender(sniper!.id)).toBe(false);
    controller.stepMs(50);
    expect(controller.getSnapshot().defenders.some(d => d.id === sniper!.id)).toBe(false);
  });

  it('spawns individual enemies and custom wave bursts on Lane 0', () => {
    const controller = new PlaytestController({ mode: 'sandbox' });
    expect(controller.spawnEnemy('husk', 0)).toBe(true);
    controller.stepMs(50);
    expect(controller.getSnapshot().enemies).toHaveLength(1);
    expect(controller.getSnapshot().enemies[0].definitionId).toBe('husk');
    expect(controller.getSnapshot().enemies[0].lane).toBe(0);

    expect(controller.spawnWaveBurst('zombie', 3, 0.5, 0)).toBe(true);
    for (let i = 0; i < 25; i++) {
      controller.stepMs(50);
    }
    expect(controller.getSnapshot().enemies).toHaveLength(4);
  });

  it('activates Confirmed v2.0 abilities, exposes views/flashes, and logs structured rejections', () => {
    const controller = new PlaytestController({ mode: 'sandbox' });

    // Place Snow Golem, Iron Golem, Skeleton, Blaze, Skeleton Sniper, Frost Guardian, Steel Guardian, Alpha Wolf, Inferno Archer.
    controller.placeDefender('snow_golem', { row: 0, column: 0 }, true);
    controller.placeDefender('iron_golem', { row: 0, column: 1 }, true);
    controller.placeDefender('blaze', { row: 0, column: 2 }, true);
    controller.placeDefender('skeleton', { row: 0, column: 3 }, true);
    controller.placeDefender('skeleton_sniper', { row: 1, column: 0 }, true);
    controller.placeDefender('frost_guardian', { row: 1, column: 1 }, true);
    controller.placeDefender('steel_guardian', { row: 1, column: 2 }, true);
    controller.placeDefender('alpha_wolf', { row: 2, column: 1 }, true);
    controller.placeDefender('inferno_archer', { row: 2, column: 0 }, true);
    controller.stepMs(50);

    const defs = controller.getSnapshot().defenders;
    const byId = (defId: string) => defs.find(d => d.definitionId === defId)!;

    // 1. Insufficient crystals rejection.
    expect(controller.activateAbility(byId('skeleton_sniper').id)).toBe(true);
    controller.stepMs(50);
    expect(
      controller.getSnapshot().eventLog.some(entry => entry.message.includes('insufficient-crystals')),
    ).toBe(true);

    // Grant 5 Crystals.
    expect(controller.grantCrystals()).toBe(true);
    controller.stepMs(50);
    expect(controller.getSnapshot().crystals).toBe(5);

    // 2. Targetless activation works for all Defenders (e.g. Blizzard & Skeleton Arrow Storm) even when no Enemies exist.
    expect(controller.activateAbility(byId('snow_golem').id)).toBe(true);
    controller.stepMs(50);
    expect(controller.getSnapshot().crystals).toBe(4);
    expect(controller.activateAbility(byId('skeleton').id)).toBe(true);
    controller.stepMs(50);
    expect(controller.getSnapshot().crystals).toBe(3);
    expect(
      controller
        .getSnapshot()
        .projectiles.some(p => p.kind === 'lane' && p.abilityId === 'arrow_storm' && !p.pierce),
    ).toBe(true);

    // Refill Crystals before testing Tier-2 proactive/defensive abilities.
    expect(controller.grantCrystals()).toBe(true);
    controller.stepMs(50);
    expect(controller.getSnapshot().crystals).toBe(5);

    // 3. Proactive / Defensive abilities without enemies:
    // Piercing Barrage -> lane projectile view.
    expect(controller.activateAbility(byId('skeleton_sniper').id)).toBe(true);
    controller.stepMs(50);
    expect(controller.getSnapshot().projectiles.some(p => p.kind === 'lane' && p.pierce)).toBe(true);

    // Glacial Fortress -> shield + front slow zone view at (1, 2).
    expect(controller.activateAbility(byId('frost_guardian').id)).toBe(true);
    controller.stepMs(50);
    const afterGlacial = controller.getSnapshot();
    expect(afterGlacial.defenders.find(d => d.definitionId === 'frost_guardian')?.shieldAmount).toBeGreaterThan(0);
    expect(afterGlacial.slowZones).toHaveLength(1);
    expect(afterGlacial.slowZones[0]).toMatchObject({ row: 1, column: 2, slowPct: 0.5 });

    // Iron Bastion -> 100% MaxHP shield + 3x3 redirect aura protecting neighbors (including Frost Guardian & Alpha Wolf).
    expect(controller.activateAbility(byId('steel_guardian').id)).toBe(true);
    controller.stepMs(50);
    const afterBastion = controller.getSnapshot();
    expect(afterBastion.redirectAuras).toHaveLength(1);
    expect(afterBastion.redirectAuras[0].protectedAllyIds).toContain(byId('frost_guardian').id);
    expect(afterBastion.redirectAuras[0].protectedAllyIds).toContain(byId('alpha_wolf').id);

    // Alpha Howl -> +100% AS / +50% AD buff across 3x3 allies.
    expect(controller.activateAbility(byId('alpha_wolf').id)).toBe(true);
    controller.stepMs(50);
    const buffedGuardian = controller
      .getSnapshot()
      .defenders.find(d => d.definitionId === 'steel_guardian')!;
    expect(buffedGuardian.buffDamagePct).toBeCloseTo(0.5);
    expect(buffedGuardian.buffAttackSpeedPct).toBeCloseTo(1);

    // Refill crystals before offensive abilities.
    expect(controller.grantCrystals()).toBe(true);
    controller.stepMs(50);
    expect(controller.getSnapshot().crystals).toBe(5);

    // Spawn enemy on Lane 0 and test Blizzard, Earthquake, Inferno, and Meteor Arrow Rain.
    controller.spawnEnemy('husk', 0);
    controller.stepMs(50);

    controller.activateAbility(byId('snow_golem').id);
    controller.stepMs(50);
    expect(controller.getSnapshot().enemies[0].slowPct).toBeCloseTo(0.5);

    controller.activateAbility(byId('iron_golem').id);
    controller.stepMs(50);
    expect(controller.getSnapshot().enemies[0].isStunned).toBe(true);

    controller.activateAbility(byId('blaze').id);
    controller.stepMs(500); // wait 10 ticks so lobbed fireball (travelSeconds = 0.45s = 9 ticks) lands & applies Burn
    expect(controller.getSnapshot().enemies[0].burnCount).toBeGreaterThanOrEqual(1);

    controller.activateAbility(byId('inferno_archer').id, { row: 0, column: 8 });
    controller.stepMs(50);
    expect(controller.getSnapshot().projectiles.some(p => p.kind === 'falling')).toBe(true);

    // Verify 16-arrow Arrow Storm and 8-fireball Inferno configuration
    const preset = controller.getPreset();
    const arrowStorm = preset.abilities.find(a => a.id === 'arrow_storm');
    const inferno = preset.abilities.find(a => a.id === 'inferno');
    expect(arrowStorm?.effects[0]).toMatchObject({ kind: 'multihit-projectile', count: 16 });
    expect(inferno?.effects[0]).toMatchObject({ kind: 'multihit-falling-area', count: 8 });

    // Paused rejection log check.
    controller.setPaused(true);
    expect(controller.activateAbility(byId('alpha_wolf').id)).toBe(false);
    expect(
      controller.getSnapshot().eventLog.some(entry => entry.message.includes('Paused')),
    ).toBe(true);
  });

  it('supports pause, stepOneTick, speed multiplier, subscriptions, and live preset reset', () => {
    const controller = new PlaytestController({ mode: 'sandbox' });
    const snapshots: number[] = [];
    const unsubscribe = controller.subscribe(snap => snapshots.push(snap.tick));

    controller.setPaused(true);
    expect(controller.stepMs(500)).toBe(0);
    expect(controller.getSnapshot().tick).toBe(0);

    // stepOneTick advances exactly 1 tick (50ms) even while paused, keeping paused = true.
    expect(controller.stepOneTick()).toBe(1);
    expect(controller.getSnapshot().tick).toBe(1);
    expect(controller.getSnapshot().paused).toBe(true);

    // Speed 2x doubles tick progression on stepMs.
    controller.setPaused(false);
    controller.setSpeed(2);
    expect(controller.stepMs(100)).toBe(4);
    expect(controller.getSnapshot().tick).toBe(5);

    // Live preset tuning + reset applies new Defender Max HP immediately.
    controller.setSpeed(1);
    const tuned = controller.getPreset();
    const ig = tuned.defenders.find(d => d.id === 'iron_golem')!;
    ig.maxHp = 999;
    controller.reset(tuned, 'sandbox');
    controller.placeDefender('iron_golem', { row: 0, column: 0 }, true);
    controller.stepMs(50);

    const snap = controller.getSnapshot();
    expect(snap.tick).toBe(1);
    expect(snap.defenders[0].maxHp).toBe(999);
    expect(snap.defenders[0].hp).toBe(999);

    unsubscribe();
    const countBefore = snapshots.length;
    controller.stepMs(50);
    expect(snapshots.length).toBe(countBefore);
  });

  it('supports Campaign parity preset: summon cooldowns, Direct Shop-Card Fusion, Fusion Glove move/cooldown, and multi-lane waves', () => {
    const campaignPreset = createCampaignPlaytestPreset();
    expect(campaignPreset.fusionGloveCooldownSeconds).toBe(CAMPAIGN_GLOVE_COOLDOWN_SECONDS);
    for (const [id, cost] of Object.entries(CAMPAIGN_BASE_COSTS)) {
      expect(campaignPreset.defenders.find(d => d.id === id)?.summonEnergyCost).toBe(cost);
    }
    for (const [id, cd] of Object.entries(CAMPAIGN_BASE_COOLDOWNS)) {
      expect(campaignPreset.defenders.find(d => d.id === id)?.summonCooldownSeconds).toBe(cd);
    }

    const controller = new PlaytestController({
      preset: campaignPreset,
      mode: 'five-waves',
      showAuxLanes: true,
      allowMultiLaneWaves: true,
    });
    expect(controller.grantEnergy()).toBe(true);
    controller.stepMs(50);

    // Summon Skeleton (100 EN, 5s CD)
    expect(controller.placeDefender('skeleton', { row: 2, column: 1 }, false)).toBe(true);
    controller.stepMs(50);
    const afterSummon = controller.getSnapshot();
    const skeletonCard = afterSummon.baseDefenderCards.find(c => c.id === 'skeleton')!;
    expect(skeletonCard.cost).toBe(100);
    expect(skeletonCard.cooldownTotalSeconds).toBe(5);
    expect(skeletonCard.onCooldown).toBe(true);
    expect(afterSummon.defenders).toHaveLength(1);

    // Advance 5s (100 ticks) so Skeleton summon cooldown expires, then Direct Shop-Card Fusion
    for (let i = 0; i < 100; i++) {
      controller.stepMs(50);
    }
    const targetId = controller.getSnapshot().defenders[0].id;
    expect(controller.getCardFusionOutputId('iron_golem', targetId)).toBe('iron_ranger');
    expect(controller.summonAndFuseDefender('iron_golem', targetId)).toBe(true);
    controller.stepMs(50);

    const afterShopFuse = controller.getSnapshot();
    const ironRanger = afterShopFuse.defenders.find(d => d.column === 1 && d.row === 2);
    expect(ironRanger?.definitionId).toBe('iron_ranger');
    expect(afterShopFuse.lastToast?.message).toContain('Iron Ranger');

    // Move Iron Ranger with Fusion Glove -> moves to (1, 3) and triggers 15s Glove cooldown
    expect(controller.moveDefender(ironRanger!.id, { row: 1, column: 3 })).toBe(true);
    controller.stepMs(50);
    const afterMove = controller.getSnapshot();
    expect(afterMove.defenders[0].row).toBe(1);
    expect(afterMove.defenders[0].column).toBe(3);
    expect(afterMove.gloveCooldown.totalSeconds).toBe(CAMPAIGN_GLOVE_COOLDOWN_SECONDS);
    expect(afterMove.gloveCooldown.onCooldown).toBe(true);
  });

  it('supports Villager -> Master Trader fusion and interactive Village Supply Chest in PlaytestController', () => {
    const controller = new PlaytestController({ mode: 'sandbox' });
    expect(controller.claimVillageChest()).toBe(false);
    expect(controller.getSnapshot().lastToast?.message).toBe('Village Supply Chest is still restocking');

    // Step 10s so Village Supply Chest restocks (+25 EM), then claim it cleanly.
    for (let i = 0; i < 200; i++) controller.stepMs(50);
    expect(controller.getSnapshot().villageChest.ready).toBe(true);
    expect(controller.claimVillageChest()).toBe(true);
    controller.stepMs(50);
    expect(controller.getSnapshot().energy).toBe(125);
    expect(controller.getSnapshot().villageChest.ready).toBe(false);

    // Summon two Villagers (50 EM each, 5s CD) and fuse into Master Trader (0 EM)
    expect(controller.placeDefender('villager', { row: 0, column: 0 }, false)).toBe(true);
    controller.stepMs(50);
    for (let i = 0; i < 100; i++) controller.stepMs(50);
    expect(controller.placeDefender('villager', { row: 0, column: 1 }, false)).toBe(true);
    controller.stepMs(50);

    const defs = controller.getSnapshot().defenders;
    expect(controller.getFusionOutputId(defs[0]!.id, defs[1]!.id)).toBe('master_trader');
    expect(controller.fuseDefenders(defs[0]!.id, defs[1]!.id)).toBe(true);
    controller.stepMs(50);
    expect(controller.getSnapshot().defenders[0]?.definitionId).toBe('master_trader');
  });

  it('deduplicates same-tick collectItem calls (hover-collect) without item-unavailable errors', () => {
    const controller = new PlaytestController({ mode: 'sandbox' });
    expect(controller.placeDefender('villager', { row: 0, column: 0 }, false)).toBe(true);
    controller.stepMs(50);
    expect(controller.getSnapshot().energy).toBe(50);

    // Wait 4s (80 ticks) until Villager spawns its collectible Emerald item.
    for (let i = 0; i < 82; i++) controller.stepMs(50);
    const beforeCollect = controller.getSnapshot().energy;
    const items = controller.getSnapshot().items.filter(i => i.kind === 'energy');
    expect(items).toHaveLength(1);
    const itemId = items[0]!.id;
    const itemAmount = items[0]!.amount;
    expect(itemAmount).toBeGreaterThan(0);

    // Simulate multiple hover pointermove events hitting the same Emerald before the next tick runs.
    expect(controller.collectItem(itemId)).toBe(true);
    expect(controller.collectItem(itemId)).toBe(false);
    expect(controller.collectItem(itemId)).toBe(false);

    controller.stepMs(50);
    const snap = controller.getSnapshot();
    expect(snap.energy).toBe(beforeCollect + itemAmount);
    expect(snap.items.some(i => i.id === itemId)).toBe(false);
    expect(snap.eventLog.some(e => e.message.includes('item-unavailable'))).toBe(false);
    expect(snap.lastToast?.kind === 'error').toBe(false);
  });

  it('builds editor Test Play presets with Jump-to-Wave, startingDefenders, and allowedBaseDefenderIds enforcement (T-15)', () => {
    const baseLevel = structuredClone(MVP_GAME_DATA.campaignLevels[0]!);
    baseLevel.startingDefenders = [
      { definitionId: 'villager', row: 1, column: 0 },
      { definitionId: 'steel_guardian', row: 2, column: 4 },
    ];
    baseLevel.allowedBaseDefenderIds = ['villager', 'iron_golem'];

    const preset = createPlaytestPresetFromLevel(baseLevel, {
      startWaveIndex: 2,
      overrideInitialEmeralds: 500,
    });
    expect(preset.waves).toHaveLength(3);
    expect(preset.waveCrystals).toHaveLength(3);
    expect(preset.initialEmeralds).toBe(500);

    const controller = new PlaytestController({
      preset,
      mode: 'five-waves',
      showAuxLanes: true,
      allowMultiLaneWaves: true,
    });
    const snap = controller.getSnapshot();
    expect(snap.energy).toBe(500);
    expect(snap.totalWaves).toBe(3);
    expect(snap.defenders).toHaveLength(2);
    expect(snap.baseDefenderCards.find(c => c.id === 'iron_golem')?.unlocked).toBe(true);
    expect(snap.baseDefenderCards.find(c => c.id === 'skeleton')?.unlocked).toBe(false);

    // Allowed card summons cleanly; banned base defender is rejected
    expect(controller.placeDefender('skeleton', { row: 0, column: 0 }, false)).toBe(false);
    expect(controller.getSnapshot().lastToast?.message).toContain('restricted in this stage');
    expect(controller.placeDefender('iron_golem', { row: 0, column: 0 }, false)).toBe(true);
  });

  it('applies tuned ability parameters (e.g. Skeleton arrow_storm count and % AD) on live reset', () => {
    const controller = new PlaytestController({ mode: 'sandbox' });
    const tuned = controller.getPreset();
    const arrowStorm = tuned.abilities.find(a => a.id === 'arrow_storm')!;
    const eff = arrowStorm.effects[0];
    if (eff.kind !== 'multihit-projectile') throw new Error('Expected multihit-projectile');
    tuned.abilities = tuned.abilities.map(a =>
      a.id === 'arrow_storm'
        ? { ...a, effects: [{ ...eff, count: 20, damageMultiplier: 1.5 }] }
        : a,
    );

    controller.reset(tuned, 'sandbox');
    expect(controller.getPreset().abilities.find(a => a.id === 'arrow_storm')?.effects[0]).toMatchObject({
      kind: 'multihit-projectile',
      count: 20,
      damageMultiplier: 1.5,
    });

    // Place Skeleton (25 AD) + tanky Husk on Lane 0, grant Crystals, and activate arrow_storm
    expect(controller.placeDefender('skeleton', { row: 0, column: 0 }, true)).toBe(true);
    expect(controller.spawnEnemy('husk', 0)).toBe(true);
    expect(controller.grantCrystals()).toBe(true);
    controller.stepMs(50);

    const skeleton = controller.getSnapshot().defenders[0]!;
    const enemyBefore = controller.getSnapshot().enemies[0]!.hp;
    expect(controller.activateAbility(skeleton.id)).toBe(true);
    controller.stepMs(50);
    expect(controller.getSnapshot().projectiles.some(p => p.abilityId === 'arrow_storm')).toBe(true);

    // Let arrows fly and verify Husk takes boosted damage (each arrow deals 1.5 * 25 = 37.5 > baseline 25)
    for (let i = 0; i < 65; i++) {
      controller.stepMs(50);
    }
    const enemyAfter = controller.getSnapshot().enemies[0];
    expect(!enemyAfter || enemyAfter.hp < enemyBefore - 300).toBe(true);
  });

  it('applies tuned basicAttackStatus (e.g. Snow Golem on-hit slowPct and duration) on live reset', () => {
    const controller = new PlaytestController({ mode: 'sandbox' });
    const tuned = controller.getPreset();
    const snowGolem = tuned.defenders.find(d => d.id === 'snow_golem')!;
    snowGolem.basicAttackStatus = { kind: 'slow', slowPct: 0.6, durationSeconds: 4 };
    controller.reset(tuned, 'sandbox');

    expect(controller.placeDefender('snow_golem', { row: 0, column: 6 }, true)).toBe(true);
    expect(controller.spawnEnemy('zombie', 0)).toBe(true);
    controller.stepMs(100);

    const enemy = controller.getSnapshot().enemies[0];
    expect(enemy?.slowPct).toBeCloseTo(0.6);
  });
});

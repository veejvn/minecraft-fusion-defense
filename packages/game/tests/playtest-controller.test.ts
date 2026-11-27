import { describe, expect, it } from 'vitest';
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
} from '../src/playtest/playtest-presets';

describe('PlaytestController (T-10B.1 / T-10B.2 / T-10B.5)', () => {
  it('initializes with 20 Defenders, 4 Enemies, 15 Recipes, and 20 Confirmed v2.2 Abilities in both modes', () => {
    const preset = createDefaultPlaytestPreset();
    expect(PLAYTEST_DEFENDER_META).toHaveLength(20);
    expect(PLAYTEST_ENEMY_META).toHaveLength(4);
    expect(PLAYTEST_FUSION_RECIPES_META).toHaveLength(15);
    expect(preset.defenders).toHaveLength(20);
    expect(preset.enemies).toHaveLength(4);
    expect(preset.abilities).toHaveLength(20);
    expect(preset.waves).toHaveLength(5);

    const sandbox = new PlaytestController({ mode: 'sandbox' });
    const sandboxSnap = sandbox.getSnapshot();
    expect(sandboxSnap.mode).toBe('sandbox');
    expect(sandboxSnap.waveStatus).toBe('sandbox');
    expect(sandboxSnap.energy).toBe(50);
    expect(sandboxSnap.crystals).toBe(0);
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
    expect(controller.getSnapshot().energy).toBe(50);

    // Grant +500 Energy so we can summon two Tier-1 Skeletons and fuse into Skeleton Sniper.
    expect(controller.grantEnergy()).toBe(true);
    controller.stepMs(50);
    expect(controller.getSnapshot().energy).toBe(550);

    // Tier-2 direct standard summon is rejected.
    expect(controller.placeDefender('skeleton_sniper', { row: 0, column: 0 }, false)).toBe(false);

    expect(controller.placeDefender('skeleton', { row: 0, column: 0 }, false)).toBe(true);
    controller.stepMs(50);
    expect(controller.placeDefender('skeleton', { row: 0, column: 1 }, false)).toBe(true);
    controller.stepMs(50);

    const afterSummons = controller.getSnapshot();
    expect(afterSummons.energy).toBe(350);
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
    expect(afterMove.gloveCooldown.totalSeconds).toBe(15);
    expect(afterMove.gloveCooldown.onCooldown).toBe(true);
  });
});

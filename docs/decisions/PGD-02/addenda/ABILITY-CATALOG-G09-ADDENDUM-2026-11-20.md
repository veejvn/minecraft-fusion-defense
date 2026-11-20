# Ability Catalog — PGD-02 G09 Addendum

**Authorization:** PGD-02.DOC-11 A (2026-11-20): create an additive Ability Catalog addendum, without overwriting existing documents.  
**Status:** DOCUMENTATION ADDENDUM — G09 conversation-derived rules, **Confirmed — Source Pending Verification** for individual original approvals. **Not** independently Source Verified, not Implementation Verified, not a new Owner gameplay decision.  
**Baseline preserved:** [Ability Catalog Draft v1.0](../../../game-design/ABILITY_CATALOG.md).  
**Preparation:** [DOC-10 Sync Proposal](../proposals/DOCSYNC-ABILITY-STEEL-GUARDIAN-PROPOSAL-2026-11-20.md).

## Reading and authority

This document records the **later G09 transcription** alongside the earlier Draft/TBD Ability Catalog. It does not retroactively change the status labels in that catalog. Original IDs/Owner messages for the reported 216 ability-specific decisions are not recovered. For detailed edge cases, the [G09 Ability Register](../registers/G09-ABILITY-REGISTER.md) and [G09 Technical Contract](../contracts/G09-TECHNICAL-CONTRACT.md) remain the complete available transcriptions; the summaries here do not supersede them.

## Shared activation — G09 transcription

- Drag one Power Crystal onto an eligible Defender in PLAYING; one Crystal per valid activation, immediate, **no cooldown**.
- Invalid drop, invalid owner, missing eligible target for target-dependent abilities, or failed activation: reject without Crystal spend.
- Self-buffs/self-Shields can activate without Enemy when permitted by the ability.
- Crystal consumption and Activation creation are **atomic**. Multiple same-tick requests resolve sequentially.
- Recovery rejects gameplay input and cancels uncommitted commands; Pause freezes Game Time. Follow G09 state/event contracts.

**Catalog synchronization implication:** Earlier `powerCrystalCost` and `cooldownMs` TBD, generic select-target UX, draft validation code names, and draft cooldown events should be explicitly reconciled in any later authorized in-place update. No schema/API identifier is approved by this addendum.

## All 12 MVP Special Abilities — later G09 transcription

### 1. Snow Golem — Blizzard (`blizzard`)
All Enemies present in same Lane at activation receive -50% movement Slow for 5s. Same-source refresh, strongest overlapping Slow wins. Applied Slow persists after target changes Lane.

### 2. Iron Golem — Earthquake (`earthquake`)
All Enemies present in same Lane take immediate 3× Attack Damage and 2s Stun, preventing movement, attacks and skills. Same-source Stun refreshes; different sources remain independent. **No Knockback inferred**.

### 3. Skeleton — Arrow Storm (`arrow_storm`)
Eight arrows fired 0.2s apart, each 100% Attack Damage, normal speed, no piercing. Retarget at each firing; snapshot Damage at firing. Already-fired arrows persist after owner death/Fusion and may hit another eligible Enemy if original target dies. Unfired shots cancel on death/Fusion/no target; Stun pauses remaining cadence; separate activations independent.

### 4. Wolf — Pack Frenzy (`pack_frenzy`)
Self +100% Attack Speed and +50% Attack Damage for 8s, no Enemy required. Same-source recast refreshes without stacking; other-source Buffs add against base values. Death/Fusion removes self-buff; Stun blocks normal attacks, not Buff timer.

### 5. Blaze — Inferno (`inferno`)
Immediate 3× Attack Damage as Fire Damage to all Enemies currently in same Lane. Burn 25% Attack Damage/s for 5s, one tick/s. Snapshot Burn base at apply/refresh; Fire Resistance affects both. Same-source Burn refreshes duration/ticks; different sources independent. Burn persists after Blaze death/Fusion or target lane change.

### 6. Skeleton Sniper — Piercing Barrage (`piercing_barrage`)
One merged arrow (three component arrows), 600% Attack Damage per Enemy, 2× speed, unlimited same-Lane pierce, each Enemy hit at most once, no falloff. Can fire without Enemy; snapshot Damage at firing. Fired projectile persists after death/Fusion; immune Enemy still counts as hit and arrow continues; despawns at field edge.

### 7. Ice Golem — Absolute Zero (`absolute_zero`)
Freeze all Enemies currently present across all five Lanes for 4s; prevents movement, attacks and skills. Immunity respected; Resistance proportionally reduces duration at apply/refresh. Same-source refresh, different-source independence; coexists with Slow/Stun; persists after source death/Fusion or target lane change.

### 8. Frost Guardian — Glacial Fortress (`glacial_fortress`)
Self Shield = 50% Max HP until broken; recast resets Shield/area without stacking. While Shield exists, one-tile-directly-in-front area applies -50% movement Slow for 5s to eligible Enemies entering/present. Leaving active area ends area-derived Slow immediately; after Shield breaks, residual applied Slow lasts its remaining duration. Shield absorbs before HP, including Armor-piercing Damage. Death/Fusion removes Shield/area, not residual target Slow.

### 9. Flame Fang — Wildfire Rush (`wildfire_rush`)
Five **stationary** normal-range melee hits 0.2s apart; retarget each hit. Each deals 100% current Attack Damage snapshotted at hit. A landed hit applies Burn = 25% Attack Damage/s for 5s (1 tick/s), snapshotted on apply/refresh. Direct Damage physical; Fire Resistance affects Burn. Pending hits cancel on death/Fusion/no target; Stun pauses cadence; activations independent. **No dash inferred.**

### 10. Inferno Archer — Meteor Arrow Rain (`meteor_arrow_rain`)
Eight falling flaming arrows 0.2s apart into fixed 3×3 area centered on nearest Enemy to defense line at activation. Each arrow retargets at start, locks impact tile, may miss; impact hits all eligible Enemies in tile once. Each hit 100% Attack Damage snapshotted at arrow start and applies Burn 25% Attack Damage/s for 5s. Fire Resistance affects direct/Burn. Falling arrows persist after owner death/Fusion; pending shots cancel on death/Fusion/no Enemy; Stun pauses pending shots; Burn persists after source death/Fusion/target lane change.

### 11. Alpha Wolf — Alpha Howl (`alpha_howl`)
Snapshot all Defenders in 3×3 including self at activation; +100% Attack Speed/+50% Attack Damage for 8s. Recipients retain Buff on leaving area and after source death/Fusion, except source's own Buff ends on its death/Fusion. Recipient death/Fusion removes Buff without inheritance. Same-source refresh; different Alpha Wolf and Pack Frenzy Buffs add against base. Stun does not prevent activation/application or stop timer; non-attacking recipients do not gain an attack.

### 12. Steel Guardian — Iron Bastion (`iron_bastion`)
Self Shield 100% current Max HP snapshotted at activation, persists until broken. Dynamic 3×3 ally protection for 8s redirects 50% of post-Armor/Resistance ally Damage to Guardian; no second Guardian Armor/Resistance. Guardian Shield then HP absorbs redirected share; ally Shield processes remaining share. Recast resets Shield/protection without stacking. Nearest Guardian by Manhattan distance, tie stable Entity ID; Shield piercing retained on both portions. Guardian death/Fusion ends protection; redirect can kill Guardian, with no overflow back. See [Steel Guardian addendum](STEEL-GUARDIAN-IRON-BASTION-G09-ADDENDUM-2026-11-20.md).

## Cross-system implementation references (source-pending)

- Typed Damage processing: Armor/Resistance → Redirect → Shield → HP; explicit piercing; confirmed hit distinct from positive Damage.
- Status identity, source key, refresh/version, independent sources and periodic tick scheduling.
- Oldest-first Shield absorption; same-source Shield reset preserves instance ID/creation order.
- Projectile hit registry, target retargeting, fired/unfired lifecycle and deterministic collision ordering.
- Stun pauses unfired multihit cadence while existing projectiles/statuses retain their own lifecycles.
- Atomic State + Event Queue commit; deterministic checkpoint/restore of RNG, IDs, queue, statuses, projectiles and Activation state.
- Terminal Priority: **new Owner decision B — first valid resolved terminal event wins**, separately documented in [G07 Owner Decision](../owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md).

## What remains open

- **Original G09 evidence:** individual 216 ability-specific Decision IDs, option letters and Owner messages not recovered.
- **Implementation:** no tests or benchmark run; no PASS asserted.
- **Catalog Draft placeholders:** illustrative `glacial_fortress` JSON numbers, proposed validation codes/primitives, schema names, VFX and UI details are not approved runtime values.
- **DOCSYNC-01:** addendum now exists; **in-place Catalog synchronization remains OPEN**, pending separate authorization and evidence policy.
- This addendum does not change PGD-01's historical TBD status; see separate Steel Guardian addendum.

**Preservation:** no original document edited, overwritten or deleted.

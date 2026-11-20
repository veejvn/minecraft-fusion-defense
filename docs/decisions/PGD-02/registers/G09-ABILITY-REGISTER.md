# G09 — MVP Special Ability Decision Register

**Status:** Conversation-derived specification transcription; **Confirmed — Source Pending Verification** for individual original decision approvals. **Not** Implementation Verified or Design Complete.

This file documents the 12 ability designs in a consistent readable structure. The source summary reports **216 Confirmed ability-specific decisions**, but **does not expose their original 216 Decision IDs or complete one-to-one mapping**. Therefore the headings below are **ability names, not newly invented decision IDs**, and the bullets are **reported rules, not claims of 216 individually verified decisions**.

## Common activation contract

- One Power Crystal per valid activation; immediate, no cooldown.
- Invalid drop or failed target-dependent validation rejects without spending Crystal.
- Self-buffs and self-Shields may activate without Enemy; targeting and eligibility rechecked per ability.
- Multiple activations in one Game Tick resolve sequentially; Crystal consumption and activation creation are atomic.
- Damage/Status/Shield/Projectile lifecycle and scheduled actions use the G09 Technical Contract; no runtime PASS asserted.

## Snow Golem — Blizzard

**Original per-ability Decision IDs:** Not recovered. **Evidence:** Source Pending Verification.

- Target: all Enemies present in the same Lane at activation.
- Slow: movement speed -50% for 5 seconds.
- Same-source refresh; strongest Slow wins when multiple Slows overlap.
- Applied Slow persists after target changes Lane.

## Iron Golem — Earthquake

**Original per-ability Decision IDs:** Not recovered. **Evidence:** Source Pending Verification.

- Target: all Enemies present in the same Lane.
- Immediate damage: 3× Attack Damage per target.
- Stun: 2 seconds; prevents movement, attacks and skills.
- Different-source Stuns independent; same-source Stun refreshes.

## Skeleton — Arrow Storm

**Original per-ability Decision IDs:** Not recovered. **Evidence:** Source Pending Verification.

- 8 sequential arrows, 0.2 seconds between firing actions; each deals 100% Attack Damage.
- Normal projectile speed, no piercing; target is selected again at each firing.
- Attack Damage snapshot at firing; fired arrows persist after death/Fusion and may hit another eligible Enemy if original target dies.
- Unfired actions cancel on death/Fusion or no eligible target; Stun pauses remaining cadence; separate Crystal activations independent.

## Wolf — Pack Frenzy

**Original per-ability Decision IDs:** Not recovered. **Evidence:** Source Pending Verification.

- Self-buff: +100% Attack Speed and +50% Attack Damage for 8 seconds.
- No Enemy required to activate; same-source refresh, no stacking.
- Death/Fusion ends self-buff; other-source Buffs add independently to base values.
- Stun prevents normal attacks but buff duration continues.

## Blaze — Inferno

**Original per-ability Decision IDs:** Not recovered. **Evidence:** Source Pending Verification.

- Immediate 3× Attack Damage as Fire Damage to all Enemies present in same Lane.
- Burn: 25% Attack Damage per second for 5 seconds, tick every second.
- Burn base damage snapshot at application/refresh; Fire Resistance affects direct Fire Damage and Burn.
- Same-source Burn refresh resets duration/ticks; different-source Burns independent; persists after Blaze death/Fusion or Enemy lane change.

## Skeleton Sniper — Piercing Barrage

**Original per-ability Decision IDs:** Not recovered. **Evidence:** Source Pending Verification.

- One merged arrow from three component arrows; 600% Attack Damage per Enemy.
- 2× projectile speed, unlimited pierce in same Lane, once per Enemy per projectile, no falloff.
- Can fire without Enemy; Attack Damage snapshot at firing.
- Fired projectile persists after shooter death/Fusion; immune Enemy counts as hit and projectile continues; despawns at field edge.

## Ice Golem — Absolute Zero

**Original per-ability Decision IDs:** Not recovered. **Evidence:** Source Pending Verification.

- Freeze all Enemies currently present across five Lanes for 4 seconds.
- Freeze blocks movement, attacks and skills.
- Immunity respected; Resistance reduces duration proportionally at application/refresh.
- Same-source refresh, different-source Freeze independent; coexists with Slow and Stun; persists after source death/Fusion or Enemy lane change.

## Frost Guardian — Glacial Fortress

**Original per-ability Decision IDs:** Not recovered. **Evidence:** Source Pending Verification.

- Self Shield equals 50% Max HP until broken; repeat activation resets same Shield/area without stacking.
- While Shield exists, one-tile-directly-in-front area applies -50% movement Slow for 5 seconds to eligible Enemies entering/present.
- Leaving active area ends area-derived Slow immediately; after Shield breaks, already-applied residual Slow persists remaining duration.
- Shield absorbs before HP including armor-piercing Damage; death/Fusion removes Shield and area but residual Slow persists.

## Flame Fang — Wildfire Rush

**Original per-ability Decision IDs:** Not recovered. **Evidence:** Source Pending Verification.

- Five stationary melee hits 0.2 seconds apart, normal melee range, retarget each hit.
- Each hit uses 100% current Attack Damage snapshotted at that hit.
- Landed hit applies Burn 25% Attack Damage/s for 5 seconds, one tick per second, snapshot on apply/refresh.
- Direct Damage physical; Fire Resistance affects Burn; unfired actions cancel on death/Fusion/no target; Stun pauses; Crystal sequences independent.

## Inferno Archer — Meteor Arrow Rain

**Original per-ability Decision IDs:** Not recovered. **Evidence:** Source Pending Verification.

- Eight falling flaming arrows 0.2 seconds apart into fixed 3×3 area centered on nearest Enemy to defense line at activation.
- Each arrow retargets at start, locks impact tile and can miss; each impact hits all eligible Enemies in tile once.
- Each hit deals 100% Attack Damage snapshotted at arrow start and applies Burn 25% Attack Damage/s for 5 seconds.
- Fire Resistance reduces direct/Burn; Burn persists after source death/Fusion/lane change; falling arrows persist; pending shots cancel on death/Fusion/no Enemy; Stun pauses unfired.

## Alpha Wolf — Alpha Howl

**Original per-ability Decision IDs:** Not recovered. **Evidence:** Source Pending Verification.

- At activation snapshot all Defenders in 3×3 including self; give +100% Attack Speed/+50% Attack Damage for 8 seconds.
- Recipients retain Buff after leaving area and Alpha Wolf death/Fusion; Alpha Wolf's own Buff ends on its death/Fusion.
- Recipient death/Fusion removes its Buff with no inheritance; same-source refresh, different-source Alpha Howls additive base, also additive with Pack Frenzy.
- Stun does not prevent activation/application or freeze Buff timer; non-attacking Defender receives Buff without gaining an attack.

## Steel Guardian — Iron Bastion

**Original per-ability Decision IDs:** Not recovered. **Evidence:** Source Pending Verification.

- Self Shield equals 100% current Max HP snapshotted at activation; Shield persists until broken.
- Dynamic 3×3 protection lasts 8 seconds, redirecting 50% of ally post-Armor/Resistance Damage to Guardian.
- Guardian's redirected share goes to its Shield then HP, with no second Armor/Resistance; ally Shield processes remaining share after redirect.
- Repeat Crystal resets Shield/protection without stacking; nearest Guardian by Manhattan distance, tie Entity ID; Shield-piercing retains piercing on both shares; Guardian death/Fusion ends protection; redirect may kill Guardian without overflow back.

## Cross-system interactions and evidence gaps

- Damage order and piercing: Armor/Resistance → Redirect → Shield → HP, with explicit bypass flags. Zero post-defense Damage can still be a confirmed hit and apply Burn.
- Same-source status and Buff refresh preserves instance identity and increments version; distinct sources/abilities aggregate according to their specific rules.
- Stun pauses unfinished multihit cadence with remaining delay; fired projectiles and existing statuses retain their own lifecycles. Battle Pause freezes Game Time.
- Shield recast preserves Shield Instance ID and original Creation Order; oldest Shield absorbs first unless bypassed.
- Recovery preserves committed queue, RNG, IDs, statuses, Shields, projectiles, Activation progress and remaining delay; uncommitted commands do not replay; inputs during RECOVERING rejected.
- **G07.GAP-01** Terminal Priority remains PENDING EVIDENCE; no choice is made here.
- Existing [Ability Catalog](../../../game-design/ABILITY_CATALOG.md) remains a DOCUMENTATION SYNC issue; do not silently overwrite it.
- **Still required:** original 216 decision IDs, option letters, message-level Owner confirmations, and reconciliation of any conflicting primary sources.

See [G09 system summary](../systems/G09.md), [Technical Contract](../contracts/G09-TECHNICAL-CONTRACT.md), [Decision Index](../DECISION_INDEX.md), [Source Register](../SOURCE_REGISTER.md), and [GAP Register](../audits/GAP_REGISTER.md).

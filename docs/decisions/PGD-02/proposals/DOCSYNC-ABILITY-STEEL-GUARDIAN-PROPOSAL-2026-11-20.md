# PGD-02 — Documentation Sync Proposal: Ability Catalog & Steel Guardian

**Proposal ID:** PGD-02.DOC-10 A  
**Date:** 2026-11-20  
**Status:** PROPOSAL ONLY — NOT APPLIED / NOT NEW GAMEPLAY APPROVAL  
**Scope:** DOCSYNC-01 and DOCSYNC-02.  
**Preservation:** This is a new document. Do **not** edit `docs/game-design/ABILITY_CATALOG.md`, `docs/decisions/PGD-01-STEEL-GUARDIAN.md`, or any other existing file without a later explicit Owner instruction.

## Evidence and decision labels

- **[R — Repository Confirmed]:** directly inspected repository text explicitly confirms identity, existing systems, or policy. A Draft/TBD statement is **not** approval.
- **[G — G09 Conversation-Derived, Source Pending Verification]:** transcribed from PGD-02 G09 summaries; the 216 original ability-specific IDs and individual Owner messages are not recovered. These are **proposed synchronization content**, not independently source-verified approvals.
- **[T — TBD / Not Established]:** leave unresolved. No inferred mechanics.
- **[O — New Owner Confirmed]:** the 2026-11-20 terminal decision B; independent of ability approvals.

Direct sources: [Documentation Policy](../../../DOCUMENTATION_POLICY.md), [Ability Catalog](../../../game-design/ABILITY_CATALOG.md), [PGD-01 Steel Guardian](../../PGD-01-STEEL-GUARDIAN.md), [G09 Ability Register](../registers/G09-ABILITY-REGISTER.md), [G09 system summary](../systems/G09.md), [G09 Technical Contract](../contracts/G09-TECHNICAL-CONTRACT.md), [DOC-09 Audit](../audits/DOCSYNC-ABILITY-STEEL-GUARDIAN-AUDIT-2026-11-20.md).

## Part I — Proposed synchronization of Ability Catalog

### 1. Keep existing confirmed baseline [R]

- MVP requires exactly 12 Special Ability definitions for 5 Base and 7 Fusion Defenders.
- Power Crystal is independent of Energy and does not pay for normal Fusion.
- Existing Power Crystal sources and collection rules remain governed by Gameplay Mechanics.
- Abilities have per-ability Targeting/Lane Scope, rather than automatic cross-Lane targeting.
- Pause freezes gameplay time; Fusion does not automatically activate a Special Ability.
- Existing API validation code names and JSON samples are **Draft examples**, not implementation contracts.

### 2. Candidate replacement for shared activation rules [G]

**Proposed text (not applied):**

> In PLAYING, the player drags one Power Crystal onto a valid Defender to request its Special Ability. A valid activation consumes exactly one Power Crystal, starts immediately, and has no cooldown. Target-dependent abilities require an eligible Enemy at commit; otherwise the activation is rejected without consuming the Crystal. Self-buff and self-Shield abilities may activate without an Enemy. Activation creation and Crystal consumption are atomic; same-tick requests resolve sequentially. Targeting, eligibility, Stable Entity ID ties, effect lifecycle, Stun behavior and event ordering follow each ability's typed contract.

**Sync targets:** Catalog §§2, 6, 9–11 and acceptance criteria in §12.  
**Not yet approved for direct replacement:** existing `powerCrystalCost` TBD and configurable `cooldownMs` fields, UI selection UX, `ABILITY_ON_COOLDOWN` validation code and proposed cooldown events. An authorized sync should mark these as historical/proposed where superseded; do not silently delete evidence.

**Still TBD [T]:** animation/UI feedback details not explicitly specified in G09, exact serialization schema and API code names.

### 3. Candidate per-ability content for Catalog §§4–5 [G]

All entries below are **conversation-derived G09 design transcriptions**. They are not 12 new Owner approvals, nor proof of all 216 original decisions.

| Ability ID | Defender | Proposed effect specification |
|---|---|---|
| `blizzard` | Snow Golem | Same-Lane Slow -50% movement, 5s; same-source refresh, strongest Slow applies; persists after lane change |
| `earthquake` | Iron Golem | All present same-Lane Enemies take 3× Attack Damage and 2s Stun |
| `arrow_storm` | Skeleton | Eight arrows 0.2s apart, 100% Attack Damage each, normal speed, no pierce; retarget at firing |
| `pack_frenzy` | Wolf | Self +100% Attack Speed/+50% Attack Damage for 8s; same-source refresh, no stacking |
| `inferno` | Blaze | Same-Lane 3× Fire Damage and Burn 25% Attack Damage/s for 5s (1 tick/s); snapshot Burn base on application/refresh |
| `piercing_barrage` | Skeleton Sniper | One merged arrow, 600% Attack Damage per Enemy, 2× speed, unlimited same-Lane pierce, once per Enemy |
| `absolute_zero` | Ice Golem | Freeze all present Enemies across five Lanes for 4s; immunity and resistance apply |
| `glacial_fortress` | Frost Guardian | Shield 50% Max HP until broken; while active, one-tile-front Slow area -50% movement for 5s |
| `wildfire_rush` | Flame Fang | Five **stationary** melee hits 0.2s apart, 100% current Attack Damage per hit; Burn on landed hit |
| `meteor_arrow_rain` | Inferno Archer | Eight falling arrows 0.2s apart into fixed 3×3 area; impact tile locked per arrow; hit applies Burn |
| `alpha_howl` | Alpha Wolf | 3×3 Defender recipients including self snapshot at activation; +100% Attack Speed/+50% Attack Damage for 8s |
| `iron_bastion` | Steel Guardian | Shield 100% current Max HP until broken; dynamic 3×3 ally protection for 8s, redirects 50% post-defense Damage |

**Preserve detailed semantics by linking rather than shortening the executable specification:** [G09 Ability Register](../registers/G09-ABILITY-REGISTER.md) defines same-source refresh, independent sources, Burn snapshots, Fire Resistance, Projectile persistence, Stun-paused multihit cadence, Fusion/death cancellation, tile impact, Shield behavior, and Buff inheritance. The table is a **catalog summary**, not a substitute for those constraints.

### 4. Candidate cross-cutting contract references [G]

For Catalog §§8–12, propose references to [G09 Technical Contract](../contracts/G09-TECHNICAL-CONTRACT.md) and [G09 Decision Register](../registers/G09-DECISION-REGISTER.md), explicitly labeling evidence level. Summarize:

- Damage order: Armor/Resistance → Redirect → Shield → HP, with piercing exceptions; `hitConfirmed` distinct from `damageApplied`.
- Status/Shield/Projectile/Activation instances carry stable identities and lifecycle policies.
- Same-source refresh increments version and invalidates stale scheduled events; separate sources aggregate by effect policy.
- Atomic Crystal spend + Activation creation, Hit Claim + Damage, and Gameplay State + Event Queue commits.
- Checkpoints retain RNG, IDs, versions, queue insertion sequence, pending activations, projectile cursor and hit registry.
- No test is marked PASS without actual verification.

**Do not** copy Catalog's `glacial_fortress` JSON placeholders (`amount:100`, `durationMs:3000`, `slowPercent:30`, `durationMs:2000`) into approved balance data. Do not equate the candidate primitive list with implementation-approved interfaces.

### 5. Proposed acceptance criteria changes [G; verification pending]

Candidate tests to be written (not executed): one Crystal spent exactly once per valid activation; zero cooldown; invalid targeting refunds; per-ability targeting/stacking; fired-vs-unfired projectile lifecycle; Stun-paused cadence; Shield redirect/piercing; same-tick deterministic ordering; exact checkpoint/recovery replay. Preserve all original acceptance criteria and mark superseded ones explicitly **only in a later authorized synchronization**.

## Part II — Proposed PGD-01 Steel Guardian addendum (separate file in a future authorized step)

### 1. Preserve PGD-01 identity [R]

| Field | PGD-01 confirmed value |
|---|---|
| Defender | Steel Guardian (`steel_guardian`) |
| Tier | 2 Fusion Defender |
| Inputs | `iron_golem + iron_golem` |
| Recipe ID | `fusion_steel_guardian` |
| Unlock | At start |
| Gameplay identity | Crowd Control Guardian |
| Normal attack | Crushing Strike |
| Special Ability | Iron Bastion (`iron_bastion`) |

### 2. Candidate addendum text for Iron Bastion [G]

> Iron Bastion grants Steel Guardian a self-Shield equal to **100% of its current Max HP**, snapshotted on activation. The Shield remains until broken. For **8 seconds**, Steel Guardian protects allied Defenders dynamically within a **3×3 area** by redirecting **50%** of each eligible ally's post-Armor/Resistance Damage to itself. Redirected Damage does not pass through Guardian Armor/Resistance again; Shield/HP and piercing semantics follow the G09 Damage contract. Ally Shield processes its remaining Damage share after redirect. Repeated Crystal activation resets the same-source Shield and protection duration without stacking. If multiple Guardians qualify, use nearest Manhattan distance and stable Entity ID tie-break. Death/Fusion ends the Guardian's Shield and protection; no redirected overflow returns to the ally.

**Supporting lifecycle [G]:** recast Shield retains original Shield Instance ID and Creation Order; redirected Shield-piercing Damage remains piercing on both portions; Guardian may die from redirected Damage. Refer to G09 Technical Contract and GR/FR decisions for exact event semantics.

### 3. Fields explicitly **not** filled [T]

- Crushing Strike's actual Stun/Knockback/Slow mechanic, targeting, duration, Damage and cooldown.
- Steel Guardian's Max HP, Attack Damage, Attack Speed, Attack Range, precise normal-attack targeting.
- Visual/VFX design and API/schema field names not expressly confirmed by the inspected sources.

**Do not treat Iron Bastion details as approvals for Crushing Strike.** Keep the existing PGD-01 unchanged; an addendum, if authorized, should link back to it and distinguish historical TBD from later source-pending G09 rules.

## Part III — Proposed execution plan (requires separate Owner choice)

1. **Evidence check:** attempt to recover original G09 approvals for Crystal activation and 12 abilities; retain `Source Pending Verification` where unavailable.
2. **Owner scope approval:** decide whether to publish a non-destructive **Ability Catalog addendum**, a **PGD-01 Steel Guardian addendum**, both, or defer pending evidence. Do not auto-approve any new gameplay parameter.
3. **Draft addenda:** create new Markdown files with explicit provenance and source links; preserve old Catalog and PGD-01 as historical records.
4. **Optional future in-place sync:** only after separate explicit Owner authorization; make changes traceable, preserving older decisions and avoiding silent promotion of Draft/TBD.
5. **Verification:** write tests separately; implementation remains `NOT VERIFIED`.

## Known independent status

- [G07 Owner Terminal Decision](../owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md) [O] establishes First Resolved Terminal Event Wins. Historical original G07 provenance remains pending; this proposal does not reopen or alter that decision.
- DOCSYNC-01 / DOCSYNC-02: **OPEN — proposal prepared, not applied**.
- EVIDENCE-01/02: **PENDING**.
- VERIFY-01: **NOT VERIFIED**.
- PGD-02 global **Design Complete: NOT CLAIMED**.

## Owner approval required

**This proposal alone authorizes no synchronization.** Before any addendum or catalog edit, obtain the Owner's explicit choice of scope and evidence policy. No existing document is modified by this proposal.

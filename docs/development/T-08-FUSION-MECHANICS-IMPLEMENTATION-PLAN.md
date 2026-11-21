# T-08 — Fusion Mechanics: Implementation Plan v1.0

**Project:** Minecraft Fusion Defense  
**Status:** **IMPLEMENTED LOCALLY — 19/20 GATES LOCAL PASS, AC-20 REMOTE CI PENDING COMMIT & PUSH (D-39–D-48 = A; Fusion Defender Combat Stats Remain TBD)**  
**Scope:** Headless `packages/game` data-driven Fusion session validation, order-independent recipe lookup, unlock/enabled validation, atomic Source + Target Defender replacement at Target cell, zero resource cost, and integration with T-05 Grid/Entity Registry, T-06 Resources and T-07 Combat State; see [T-08 Final Acceptance Report](../reports/T-08-FINAL-ACCEPTANCE.md).  
**Dependency:** [T-05 acceptance](../reports/T-05-FINAL-ACCEPTANCE.md), [T-06 acceptance](../reports/T-06-FINAL-ACCEPTANCE.md), [T-07 acceptance](../reports/T-07-FINAL-ACCEPTANCE.md), T-04 simulation contracts.  
**Authority:** [Documentation Policy](../DOCUMENTATION_POLICY.md); [Fusion Recipes](../game-design/FUSION_RECIPES.md); [Entity Catalog](../game-design/ENTITY_CATALOG.md) §2–§3; [Gameplay Mechanics](../product/GAMEPLAY_MECHANICS.md) §8, §14.3, §15; [Game Balancing](../game-design/GAME_BALANCING.md) §5; [PGD-01 Steel Guardian](../decisions/PGD-01-STEEL-GUARDIAN.md); PGD-02 G06/G07.

## 1. Objective and scope

Extend the accepted T-05/T-06/T-07 headless runtime with deterministic, data-driven **Defender Fusion**:
- Validate an immutable Fusion recipe catalog (including recipe unlock/enabled availability and cross-validation against Defender definitions).
- Execute internal `fuse` commands atomically inside the existing T-04 `TransactionEngine` and `EventQueue`.
- Match unordered input Defender definition pairs (`A + B === B + A`) without any hardcoded Tier ceiling.
- Enforce **0 Energy and 0 Power Crystal cost**, **no lane or distance restriction**, **Source cell release**, and **Output placement at the Target Defender's original cell**.
- Initialize the resulting Fusion Defender in T-07 `CombatState` (when combat is active) at **100% of its own `maxHp`**, with **no inherited status effects or cooldowns**, **attack-ready immediately**.

**Out of scope:** Phaser drag-and-drop pointer handling, target highlight UI, preview tooltips, fusion animations/particles/SFX (T-12), persistent unlock tracking across battles (T-11), Special Ability activation (T-10), Wave orchestration (T-09), production balance numbers for Fusion Defenders, new dependencies, and public host APIs.

## 2. Confirmed gameplay invariants (must be preserved)

- **7 approved MVP recipes (4 same-type, 3 cross-type):**
  - `fusion_skeleton_sniper`: `skeleton` + `skeleton` → `skeleton_sniper`
  - `fusion_steel_guardian`: `iron_golem` + `iron_golem` → `steel_guardian` ([PGD-01](../decisions/PGD-01-STEEL-GUARDIAN.md))
  - `fusion_ice_golem`: `snow_golem` + `snow_golem` → `ice_golem`
  - `fusion_frost_guardian`: `iron_golem` + `snow_golem` → `frost_guardian`
  - `fusion_flame_fang`: `blaze` + `wolf` → `flame_fang`
  - `fusion_inferno_archer`: `blaze` + `skeleton` → `inferno_archer`
  - `fusion_alpha_wolf`: `wolf` + `wolf` → `alpha_wolf`
- **No hardcoded Tier ceiling:** Engine matches by approved recipe data across any Tier; current MVP approves only the seven Tier-1 + Tier-1 → Tier-2 recipes above. Higher-tier inputs without an approved recipe fail with `no-recipe`, not a hardcoded Tier check (GM §8.9, Fusion Recipes §1–§2).
- **Free Fusion:** Costs **0 Energy and 0 Power Crystal**. Must succeed even when `energy === 0` and `crystals === 0`, and must never deduct or refund either resource (Fusion Recipes §2, §6).
- **No spatial restriction:** Source and Target may be in any two distinct valid cells of the 5 × 9 battlefield, across any lanes or opposite corners (GM §8.1).
- **Placement rule:** Output always spawns at the **Target Defender's original cell**; the **Source Defender's original cell becomes empty** (GM §8.3).
- **Output state (Confirmed 03/11/2026):** Starts at **100% of its own Max HP**, inherits **no positive or negative status effects**, does **not** sum input stats, and is **attack-ready immediately** when a valid target exists (Entity Catalog §3, Fusion Recipes §2).
- **Pause & Terminal:** Fusion is rejected while Paused or after Victory/Defeat (Fusion Recipes §9–§10).
- **Atomicity:** Invalid Fusion attempts must never consume, damage, move, or unlock/lock either input Defender, allocate a committed `EntityId`, or mutate grid occupancy or resources.

## 3. Owner-approved technical decisions (2026-11-21)

All **10 decisions D-39 through D-48** are approved as **Option A**:

| ID | Topic | Approved choice |
| --- | --- | --- |
| **D-39** | Fusion command identity | **A:** `{ readonly type: 'fuse'; readonly sourceId: EntityId; readonly targetId: EntityId }` (identify Source and Target by runtime `EntityId` and verify live grid occupancy). |
| **D-40** | Recipe lookup & pair normalization | **A:** Normalize input pair as `[inputA, inputB].sort().join('|')`; reject duplicate unordered pairs across recipes at session validation time; order-independent matching while Target determines output cell. |
| **D-41** | Tier handling in engine | **A:** Validate positive integer `tier` on Defender definitions and recipe input/output definitions; match strictly by validated recipe definitions without hardcoding `tier === 1` in the engine. |
| **D-42** | Recipe availability snapshot | **A:** Inject immutable per-battle recipe `unlocked` and `enabled` flags in `FusionSessionInput` (D-06/D-24 pattern); locked or disabled recipe rejects with `'recipe-unavailable'`. |
| **D-43** | Pause & Terminal guards | **A:** `BattleRuntime.enqueue` rejects `'fuse'` immediately with `{ status: 'REJECTED', reason: 'paused' \| 'terminal' }` when Paused or Terminal (matching T-06 `'collect'` / `'claim'`); handler also no-ops after terminal. |
| **D-44** | Combat state integration | **A:** When `CombatState` is active, verify both Source and Target have `hp > 0`, unregister both input combat states, and register the new Fusion Defender with `hp = maxHp = outputDef.maxHp` and `nextAttackTick = null` (attack-ready on the next combat phase). |
| **D-45** | Collectibles on Source & Target cells | **A:** Fusion leaves any Energy/Crystal Items on both Source and Target cells untouched (no deletion, no deadline reset, no Summon auto-collect). |
| **D-46** | Competing same-tick Fusion commands | **A:** Resolve in T-04 `EventQueue` `scheduledTick + insertionSequence` order; the first valid `fuse` consumes both inputs, and any later `fuse` referencing either consumed `EntityId` rejects deterministically with `'source-not-found'` or `'target-not-found'`. |
| **D-47** | Gameplay rejection vs contract error | **A:** Expected invalid attempts (`same-instance`, `source-not-found`, `target-not-found`, `invalid-source`, `invalid-target`, `entity-dead`, `no-recipe`, `recipe-unavailable`) record `fusion.outcome = { eventId, status: 'REJECTED', reason }` without mutating state or triggering T-04 fail-stop; true occupancy/registry corruption triggers fail-stop rollback. |
| **D-48** | Session wiring on `BattleRuntime` | **A:** Optional 4th constructor parameter `fusionInput?: FusionSessionInput` on `BattleRuntime` (cross-validated against `resourceInput` and `combatInput` when present; omitted `fusionInput` leaves `snapshot()` unchanged for T-05/T-06/T-07 tests). |

## 4. Implementation slices (approved scope; coding awaits separate authorization)

| Slice | Work | Exit evidence |
| --- | --- | --- |
| **T-08.1 — Fusion session & recipe registry** | `FusionSessionInput`, fail-closed recipe/tier/duplicate-pair/cross-session validation, immutable freeze | Validation & fail-closed unit tests |
| **T-08.2 — Pure Fusion validator & state** | `FusionState`, `FusionCommand`, instance/occupancy/liveness/recipe/unlock validation | Rejection reason tests with zero state/ID mutation |
| **T-08.3 — Atomic Grid & Entity replacement** | Remove Source & Target, free Source cell, place new Fusion Defender at Target cell with deterministic `EntityId` | Same-type, cross-type, swapped direction, cross-lane, opposite-corner tests |
| **T-08.4 — Resource & Combat integration** | Zero Energy/Crystal check/deduction, 100% own Max HP, attack-ready cooldown reset, Enemy blocker/target interaction, Item preservation | Combat + resource integration tests |
| **T-08.5 — Pause, Terminal, Concurrency & Rollback** | Pause/terminal rejection, competing same-tick `fuse` commands, transaction rollback, deterministic replay | Same-tick competition, rollback, replay, T-04/T-05/T-06/T-07 regression tests |

## 5. Acceptance gates — 20 gates (19/20 local PASS, AC-20 remote CI pending commit & push — see [Acceptance Report](../reports/T-08-FINAL-ACCEPTANCE.md))

| Gate | Requirement |
| --- | --- |
| **AC-01** | Fusion session validates recipe IDs, input/output Defender IDs, Tiers, unlock/enabled flags and rejects duplicate unordered input pairs or cross-session mismatches fail-closed |
| **AC-02** | All 7 approved MVP recipe pairs (4 same-type, 3 cross-type) resolve to their exact confirmed Tier-2 output Defender IDs |
| **AC-03** | Recipe matching is order-independent (`A + B` and `B + A` resolve to the same output definition) |
| **AC-04** | Output Defender always occupies the **Target** Defender's original cell, and the **Source** Defender's original cell becomes empty (`null`) |
| **AC-05** | Swapping Source and Target produces the same output Defender type at the new Target's cell |
| **AC-06** | Cross-lane and maximum-distance Fusion (e.g. `(0, 0)` to `(4, 8)`) succeed without distance or adjacency checks |
| **AC-07** | Fusion succeeds when `energy === 0` and `crystals === 0` and deducts **0 Energy and 0 Power Crystal** |
| **AC-08** | Same-instance (`sourceId === targetId`) is rejected with `'same-instance'` without mutating state |
| **AC-09** | Missing, already-removed, dead (`hp <= 0`), or Enemy `EntityId` inputs are rejected safely without mutating the surviving Defender or occupancy |
| **AC-10** | Unmatched pairs (including Tier-2 inputs with no approved recipe) reject with `'no-recipe'` without a hardcoded Tier-1 engine ceiling |
| **AC-11** | Locked or disabled recipes reject with `'recipe-unavailable'` without mutating state |
| **AC-12** | Rejected Fusion attempts allocate no committed `EntityId`, consume no inputs, and do not trigger T-04 fail-stop |
| **AC-13** | Two competing same-tick Fusion attempts sharing an input Defender allow the first in `insertionSequence` to succeed and reject the second cleanly |
| **AC-14** | When Combat is active, the Fusion Defender starts at **100% of its own `maxHp`** (even if inputs were damaged) and is **attack-ready immediately** (`nextAttackTick === null`) |
| **AC-15** | Removing inputs and placing the Fusion Defender preserves any Energy/Crystal Items on both Source and Target cells untouched |
| **AC-16** | `STOP_AND_ATTACK` Enemies blocked at the vacated Source cell resume moving, while Enemies at the Target cell interact with the new Fusion Defender |
| **AC-17** | Paused and Terminal states reject Fusion commands without mutating state |
| **AC-18** | Failed transactions roll back entities, occupancy, combat state, ID counters, and staged events atomically |
| **AC-19** | Identical config, seed and inputs replay identically; snapshot mutations are isolated; all T-04/T-05/T-06/T-07 regressions pass |
| **AC-20** | `@mfd/game` tests, `@mfd/game-data` tests, workspace `typecheck` and `build` pass; remote CI PASS only after a real workflow run |

## 6. Production-data blockers (not permission to invent values)

- Combat stats (HP, Damage, Attack Speed, Attack Range, Targeting Strategy, Attack Rules) for the 7 Tier-2 Fusion Defenders remain **TBD** (Balancing §5.2; Frost Guardian and Flame Fang numbers in Entity Catalog §3 are explicitly prototype-only proposals, not approved balance).
- Fusion interaction cooldown (if any), animation duration, and discovery UI remain **TBD** (Fusion Recipes §11).

Headless engine implementation and tests will use explicitly labeled test-only fixtures once coding is separately authorized.

## 7. Stop conditions

Stop and ask the Owner before: adding any Energy or Power Crystal cost to Fusion; adding lane/distance/adjacency limits; inventing Tier-3 recipes or production Fusion Defender stats; changing Target-cell placement semantics; modifying `@mfd/game-data` public schemas without approval; or touching `apps/web` / Phaser scenes.

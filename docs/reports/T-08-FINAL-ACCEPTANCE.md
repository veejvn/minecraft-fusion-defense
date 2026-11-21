# T-08 — Final Technical Acceptance Report

**Project:** Minecraft Fusion Defense  
**Date:** 2026-11-21  
**Review status:** **19/20 GATES LOCAL PASS; AC-20 LOCAL PASS / REMOTE CI PENDING COMMIT & PUSH (Headless Scope; Fusion Defender Production Stats Remain TBD)**  
**Scope:** Headless `packages/game` data-driven Fusion session validation, order-independent recipe lookup (`A + B === B + A`), recipe unlock/enabled guards, tier-agnostic matching (no hardcoded Tier ceiling), zero resource cost, cross-lane/maximum-distance execution, Target-cell placement with Source-cell release, 100% own `maxHp` & attack-ready Combat initialization, collectible preservation, Pause/Terminal guards, and atomic T-04 rollback.  
**Implementation location:** Local working tree on `main` (parent commit `9751435`, uncommitted — pending commit & push).  
**CI evidence:** Local `pnpm --filter @mfd/game test` (110/110), `pnpm --filter @mfd/game-data test` (25/25), `pnpm typecheck` (3/3), and `pnpm build` (`@mfd/web`, uncached) all **PASS**; remote GitHub Actions CI run is **PENDING** commit and push (`gh run list` latest run `44877738893` is for T-07 commit `6b0ee0b`).

## 1. Executive summary

Technical implementation and independent read-only audit against [T-08 Plan v1.0](../development/T-08-FUSION-MECHANICS-IMPLEMENTATION-PLAN.md) confirm that the T-08 changes implement all **10 Owner-approved technical decisions (`D-39`–`D-48 = A`)** and pass **AC-01–AC-19** plus the local checks of **AC-20** within the headless test-fixture boundary.

Because production combat values for the 7 Tier-2 Fusion Defenders (HP, Damage, Attack Speed, Attack Range, Targeting Strategy, Attack Rules) and UI/animation/cooldown details remain **TBD**, runtime validation fails closed on missing or mismatched session inputs and tests use explicitly labeled test-only fixtures in `battle-fusion.test.ts`. No production balance defaults were invented.

## 2. Implementation scope and contract compliance

T-08 adds/modifies six files exclusively inside `packages/game`:

| File | Responsibility |
| --- | --- |
| `packages/game/src/fusion/fusion-session.ts` | Fail-closed `validateFusionSession()`, `normalizeFusionPair()`, unique recipe/pair checks (`D-40`), positive safe-integer `tier` without a Tier-1 ceiling (`D-41`), cross-session validation against `ResourceSession` & `CombatSession` (`D-48`), deep freeze |
| `packages/game/src/fusion/fusion-state.ts` | `FusionFailureReason`, `FusionOutcome`, `FusionState`, `FusionCommand` (`{ type: 'fuse', sourceId, targetId }` per `D-39`), `createFusionState()` |
| `packages/game/src/fusion/fusion-engine.ts` | `validateFusionAttempt()` and `applyFusionCommand()`: live occupancy check, combat liveness check (`D-44`), recipe/unlock lookup (`D-42`), non-mutating `REJECTED` outcome (`D-47`), atomic removal of Source + Target, Target-cell output placement, 100% own `maxHp` & attack-ready combat registration (`D-44`), zero resource/item touch (`D-45`), fail-closed `battle.combat && !combatSession` guard |
| `packages/game/src/core/battle-state.ts` | Optional `readonly fusion?: FusionState` field on `BattleState` |
| `packages/game/src/systems/battle-runtime.ts` | Optional 4th constructor parameter `fusionInput?: FusionSessionInput` (`D-48`), Pause/Terminal rejection for `'fuse'` in `enqueue()` (`D-43`), `TransactionEngine` handler wiring, detached `snapshot()` preserving prior shape when omitted |
| `packages/game/tests/battle-fusion.test.ts` | 25 focused unit/integration tests (test-only fixtures) covering `AC-01`–`AC-20` |

No changes were made to `apps/web`, `packages/game-data`, `packages/game/src/index.ts`, `packages/game/src/scenes/hello-scene.ts`, `packages/game/src/core/battle-resources.ts`, `package.json`, or `pnpm-lock.yaml`.

## 3. Acceptance matrix — 20 gates

| Gate | Verdict | Evidence |
| --- | --- | --- |
| **AC-01** — Session validation, duplicate unordered pair & cross-session fail-closed | **PASS** | `validateFusionSession()` in `fusion-session.ts` validates IDs, tiers, booleans, duplicate `normalizeFusionPair()` keys, and `resourceSession`/`combatSession` cross-links. Tested in `battle-fusion.test.ts` (L116–234). |
| **AC-02** — All 7 approved MVP recipes resolve to exact Tier-2 outputs | **PASS** | Data-driven `recipesByPair` lookup tested across all 7 MVP recipes (`skeleton_sniper`, `steel_guardian`, `ice_golem`, `frost_guardian`, `flame_fang`, `inferno_archer`, `alpha_wolf`) in `battle-fusion.test.ts` (L237–279). |
| **AC-03** — Order-independent matching (`A + B` and `B + A`) | **PASS** | `normalizeFusionPair()` normalizes pair order; tested via unit test (L146–150) and reversed cross-type inputs (L281–324). |
| **AC-04** — Output occupies Target's original cell; Source cell becomes empty (`null`) | **PASS** | `applyFusionCommand()` captures `targetCell`, removes both inputs, adds output at `targetCell`. Verified `occupancy[source] === null` and subsequent `summon` on vacated Source cell in `battle-fusion.test.ts` (L262–278). |
| **AC-05** — Swapping Source and Target produces same output type at new Target's cell | **PASS** | Verified by swapped cross-type Fusion cases in `battle-fusion.test.ts` (L281–324). |
| **AC-06** — Cross-lane and maximum-distance `(0, 0)` → `(4, 8)` Fusion succeed | **PASS** | No lane/distance/adjacency restriction in `validateFusionAttempt()`. Tested in `battle-fusion.test.ts` (L326–342). |
| **AC-07** — Succeeds with `energy === 0` and `crystals === 0`; deducts 0 resources | **PASS** | `fusion-engine.ts` never checks or mutates `energy` or `crystals`. Tested at `0/0` in `battle-fusion.test.ts` (L536–549). |
| **AC-08** — Same-instance (`sourceId === targetId`) rejected with `'same-instance'` | **PASS** | `validateFusionAttempt()` checks `sourceId === targetId` first. Tested in `battle-fusion.test.ts` (L384). |
| **AC-09** — Missing, removed, dead (`hp <= 0`), or Enemy IDs rejected safely | **PASS** | Checks existence, `kind === 'defender'`, and `hp > 0` (`'entity-dead'`). Tested via `validateFusionAttempt()` and combat-killed inputs in `BattleRuntime` (`battle-fusion.test.ts` L386–404, L436–481). |
| **AC-10** — Unmatched pairs (including Tier-2 + Tier-2) reject `'no-recipe'`; no Tier-1 ceiling | **PASS** | Verified `'no-recipe'` on unmatched Tier-1/Tier-2 pairs and synthetic Tier-2 + Tier-2 → Tier-3 success in `battle-fusion.test.ts` (L405–412, L483–532). |
| **AC-11** — Locked or disabled recipes reject with `'recipe-unavailable'` | **PASS** | `validateFusionAttempt()` checks `recipe.enabled && recipe.unlocked`. Tested in `battle-fusion.test.ts` (L414–434). |
| **AC-12** — Rejected attempts allocate no committed `EntityId`, consume no inputs, no fail-stop | **PASS** | Verified `failure === null`, unchanged `entities`, `occupancy`, and `nextEntityId` across rejections (`battle-fusion.test.ts` L344–434). |
| **AC-13** — Competing same-tick `fuse` commands resolve by `insertionSequence` | **PASS** | First `fuse` in `EventQueue` succeeds; subsequent `fuse` sharing an input rejects cleanly (`battle-fusion.test.ts` L648–673). |
| **AC-14** — Output starts at 100% own `maxHp` and attack-ready immediately (`nextAttackTick === null`) | **PASS** | `unregisterCombatEntity` removes inputs and `registerCombatEntity` initializes output fresh (`hp = maxHp`, `nextAttackTick = null`). Verified with damaged, on-cooldown inputs attacking on next phase (`battle-fusion.test.ts` L551–585). |
| **AC-15** — Collectibles on Source and Target cells preserved untouched | **PASS** | `battle.resources.items` untouched. Tested with Energy + Crystal Items on both Source and Target cells (`battle-fusion.test.ts` L587–621). |
| **AC-16** — Enemy at vacated Source cell resumes moving; Enemy at Target cell interacts with output | **PASS** | Verified `STOP_AND_ATTACK` Enemy advancing at vacated Source lane and attacking new `steel_guardian` at Target lane (`battle-fusion.test.ts` L623–644). |
| **AC-17** — Paused and Terminal states reject `'fuse'` without mutating state | **PASS** | `BattleRuntime.enqueue()` rejects `'fuse'` when `paused` or `terminal`; handler no-ops after terminal (`battle-fusion.test.ts` L675–720). |
| **AC-18** — Failed transactions roll back entities, occupancy, combat, counters and staged events | **PASS** | Verified `CONTRACT_ERROR` rollback via malformed `fuse` IDs and mid-transaction occupancy corruption (`battle-fusion.test.ts` L722–767). |
| **AC-19** — Deterministic replay, snapshot isolation & T-04/T-05/T-06/T-07 regressions | **PASS** | Verified replay equality, `snapshot().fusion` detachment, and all 85 prior tests passing (`battle-fusion.test.ts` L769–800). |
| **AC-20** — Workspace tests, typecheck, build and real remote CI pass | **LOCAL PASS / REMOTE CI PENDING** | Local `@mfd/game` (110/110), `@mfd/game-data` (25/25), `pnpm typecheck` (3/3), and `pnpm build` PASS after final edit; remote CI pending commit & push. |

## 4. Verification commands and evidence

Local checks executed after the final code edit on the current working tree:

- `pnpm --filter @mfd/game test` → **PASS** (`7` test files, `110/110` tests: `lifecycle-adapter.test.ts` 7, `create-game.test.ts` 4, `battle-fusion.test.ts` 25, `battle-combat.test.ts` 12, `battle-runtime.test.ts` 12, `battle-resources.test.ts` 21, `simulation-foundation.test.ts` 29)
- `pnpm --filter @mfd/game-data test` → **PASS** (`1` test file, `25/25` tests: `validation.test.ts`)
- `pnpm typecheck` → **PASS** (`3/3` packages: `@mfd/game-data`, `@mfd/game`, `@mfd/web`)
- `pnpm build` → **PASS** (`@mfd/web` Next.js production build, uncached)
- Independent audit (`research` subagent `T-08 Gate Auditor`) confirmed all `D-39`–`D-48` contracts, `AC-01`–`AC-19` coverage, and strict scope isolation.
- Remote CI: **PENDING** (changes are uncommitted on local `main`; latest remote CI run `44877738893` passed for T-07 `6b0ee0b`).

## 5. Non-blocking observations and remaining boundaries

1. **Remote CI gate (`AC-20`):** Commit and push the T-08 implementation and documentation to GitHub `main`, then verify the resulting workflow run succeeds to close `AC-20` as remote-CI verified.
2. **Production data still TBD:** Combat stats/targeting/attack rules for the 7 Tier-2 Fusion Defenders, plus Fusion interaction cooldown (if any), animation duration, and discovery UI remain unapproved.
3. **Downstream boundary:** T-09 (Grassland 5 Waves & Victory/Defeat) and T-10 (Special Abilities) remain pending separate Owner plans and coding authorizations.

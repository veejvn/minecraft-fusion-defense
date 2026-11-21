# T-07 — Final Technical Acceptance Report

**Project:** Minecraft Fusion Defense  
**Date:** 2026-11-21  
**Review status:** **OWNER-ACCEPTED TECHNICALLY — 20/20 GATES PASS (Headless Scope; Production Combat Data Remains TBD)**  
**Scope:** Headless `packages/game` Enemy spawn hook (`spawn-enemy`), lane movement, `STOP_AND_ATTACK` / `IGNORE_DEFENDER` interaction, 6 Defender targeting strategies, drift-free attack cooldowns, HP/damage/death, Enemy-death reward hook, Defender cell release preserving Items, Base breach → Defeat notification, and additive `TransactionEngine.executePhase()`.  
**Implementation commit:** [`7b7c37d7bab41c33e1c4eb4936d89abf4dc263f2`](https://github.com/veejvn/minecraft-fusion-defense/commit/7b7c37d7bab41c33e1c4eb4936d89abf4dc263f2) (pushed to `main` via [`6b0ee0b1fd420947e5d0f2c7eafcb9293abc5b24`](https://github.com/veejvn/minecraft-fusion-defense/commit/6b0ee0b1fd420947e5d0f2c7eafcb9293abc5b24)).  
**CI evidence:** [GitHub Actions run 44877738893](https://github.com/veejvn/minecraft-fusion-defense/actions/runs/44877738893) — completed **success** on commit `6b0ee0b` (Install dependencies, Game Unit Tests, Game Data Unit Tests, Workspace TypeScript Checks, Workspace Production Build all **success**).

## 1. Executive summary

Technical review against [T-07 Plan v1.0](../development/T-07-ENEMY-MOVEMENT-COMBAT-TARGETING-IMPLEMENTATION-PLAN.md), local checks, and remote GitHub Actions CI run `44877738893` confirm that commit `7b7c37d` implements all **14 Owner-approved decisions (D-25–D-38 = A)** and passes all **20 acceptance gates (AC-01–AC-20)** within the headless test-fixture boundary.

Because production combat values (HP, Damage, Attack Speed, Attack Range, Move Speed, per-Enemy interaction behavior, per-Defender targeting strategy, `spawnOffsetX`, status-effect stacking, and `SPECIAL` / `HIGHEST_THREAT` semantics) remain **TBD**, runtime validation fails closed on missing or unsupported fields and tests use explicit test-only fixtures in `battle-combat.test.ts`. No production balance defaults were invented.

## 2. Implementation scope and contract compliance

Commit `7b7c37d` modifies/adds eight files exclusively inside `packages/game`:

| File | Responsibility |
| --- | --- |
| `packages/game/src/core/transaction.ts` | Additive `PhaseContext`, `PhaseHandler`, `TransactionEngine.executePhase()` (`D-25 A`) sharing `runStaged()` atomic commit/rollback without consuming the 250-events/tick scheduler budget |
| `packages/game/src/combat/combat-session.ts` | Fail-closed `validateCombatSession()` for `spawnX`, Defender/Enemy stats, 6 supported `TargetingStrategy` values (rejecting `HIGHEST_THREAT`), `STOP_AND_ATTACK` / `IGNORE_DEFENDER` (rejecting `SPECIAL`), cross-session validation against `ResourceSession`, and deep freeze |
| `packages/game/src/combat/combat-state.ts` | `CombatState`, `CombatEntityState`, `CombatCommand` (`spawn-enemy`), `registerCombatEntity()`, `unregisterCombatEntity()`, `applyCombatCommand()`, and D-34 modifier hooks (`computeDamage`, `computeMoveSpeed`) |
| `packages/game/src/combat/combat-engine.ts` | `nextAttackDeadline()` (anchor-based cooldowns), `findBlockingDefender()`, `selectDefenderTarget()` (6 strategies + lower-`EntityId` tie-break), and `runCombatPhase()` (start-of-tick simultaneous intent computation → atomic apply → ascending-ID death/reward & breach resolution) |
| `packages/game/src/core/battle-state.ts` | Optional `readonly combat?: CombatState` field on `BattleState` |
| `packages/game/src/systems/battle-runtime.ts` | Optional `combatInput` session wiring, per-tick `executePhase` before `EventScheduler.runTick(tick)`, `spawn-enemy` / `add` / `summon` / `remove` / `terminal` integration, and detached `snapshot()` |
| `packages/game/tests/simulation-foundation.test.ts` | 2 new `executePhase` tests (budget-free atomic commit; error/`QUEUE_OVERFLOW`/nested/invalid-tick rollback) |
| `packages/game/tests/battle-combat.test.ts` | 12 focused tests (test-only fixtures) covering `AC-01`–`AC-20` |

No changes were made to `apps/web`, `packages/game/src/index.ts`, `packages/game/src/scenes/hello-scene.ts`, `packages/game/src/core/battle-resources.ts`, `packages/game-data`, `package.json`, or `pnpm-lock.yaml`.

## 3. Acceptance matrix — 20 gates

| Gate | Verdict | Evidence |
| --- | --- | --- |
| **AC-01** — Combat definitions validated; missing stats/behavior/targeting fail closed | **PASS** | `validateCombatSession()` in `combat-session.ts` validates finite bounds, rejects `HIGHEST_THREAT`, `SPECIAL`, missing `STOP_AND_ATTACK` attack stats, and cross-session mismatches. Tested in `battle-combat.test.ts` (L55–107). |
| **AC-02** — `spawn-enemy` spawns in valid lane at `spawnX`; invalid lane/definition rejected without mutation | **PASS** | `applyCombatCommand()` checks `definitionId` and `isLane()`, recording `REJECTED` outcome without allocating `nextEntityId` or failing stop. Tested in `battle-combat.test.ts` (L110–121). |
| **AC-03** — Enemy moves right → left at `moveSpeed` cells/s, frame-split independent, no lane change | **PASS** | Anchored movement `anchor - (movedTicks * speed) / rate` in `combat-engine.ts`. Tested at `rate = 2.5` across `400ms+1200ms` vs `16×100ms` in `battle-combat.test.ts` (L123–135). |
| **AC-04** — Pause freezes movement, attacks and cooldowns | **PASS** | `SimulationClock.advance()` skips `executePhase` and `runTick` while paused; `movedTicks` and `nextAttackTick` remain frozen. Tested in `battle-combat.test.ts` (L181–201). |
| **AC-05** — Start-of-tick simultaneous computation; queue resolves by insertion sequence | **PASS** | `runCombatPhase()` computes all `damageIntents` / `movementIntents` before applying (`D-26`); `executePhase()` runs before `EventScheduler.runTick(tick)`. Verified by mutual-kill and entering-range-waits-a-tick tests (`battle-combat.test.ts` L137–179). |
| **AC-06** — `STOP_AND_ATTACK` stops at same-lane Defender, attacks per cooldown, resumes after Defender dies | **PASS** | `findBlockingDefender()` + anti-tunneling `stopX` clamp + attack cooldown; resumes on next tick once Defender is removed. Tested in `battle-combat.test.ts` (L247–276). |
| **AC-07** — `IGNORE_DEFENDER` passes Defenders without stopping or attacking | **PASS** | `IGNORE_DEFENDER` bypasses `findBlockingDefender()` and moves unimpeded. Tested in `battle-combat.test.ts` (L261–271). |
| **AC-08** — Enemies never attack Defenders in other lanes | **PASS** | `findBlockingDefender()` queries `cellIndex({ row: lane, column })` strictly within Enemy's `lane`. Tested in `battle-combat.test.ts` (L256–271). |
| **AC-09** — Defender attacks only valid, living, in-range, same-lane Enemies | **PASS** | `selectDefenderTarget()` enforces `entity.lane === defenderCell.row`, `position >= column`, `|position - (column + 0.5)| <= attackRange`, `hp > 0`. Tested in `battle-combat.test.ts` (L278–313). |
| **AC-10** — All 6 Targeting Strategies select accurately with lower-`EntityId` tie-break | **PASS** | `isBetterTarget()` implements `CLOSEST_TO_BASE`, `CLOSEST_TO_DEFENDER`, `HIGHEST_HP`, `LOWEST_HP`, `FASTEST`, `FIRST_VALID` with `a.id < b.id` tie-break. Tested in `battle-combat.test.ts` (L278–326). |
| **AC-11** — Target re-evaluation on target death, out-of-range or priority change | **PASS** | `selectDefenderTarget()` re-evaluates each tick and updates `targetId` (e.g., when an `IGNORE_DEFENDER` Enemy moves behind `column`). Tested in `battle-combat.test.ts` (L315–326). |
| **AC-12** — Drift-free cooldown (`attacks/second`) and attack-ready on first valid target | **PASS** | `nextAttackDeadline()` uses `attackAnchorTick + Math.ceil((attackCount * rate) / attackSpeed)` and fires immediately on `nextAttackTick === null || tick >= nextAttackTick`. Tested at `attackSpeed = 3, rate = 10` (`[2, 6, 9, 12, 16]`) in `battle-combat.test.ts` (L328–355). |
| **AC-13** — Exact HP updates; simultaneous hits kill once; no damage from dead entities | **PASS** | `damageIntents` accumulate start-of-tick hits; deaths resolve in Phase C and dead entities are excluded from subsequent ticks. Tested in `battle-combat.test.ts` (L137–162, L357–373). |
| **AC-14** — Enemy death removes entity and grants T-06 reward once at death position | **PASS** | Phase C removes Enemy, unregisters combat state, and calls `enqueueReward` once with `{ lane, position }`. Verified for multi-Defender overkill in `battle-combat.test.ts` (L357–373). |
| **AC-15** — Defender death frees cell and leaves Items intact | **PASS** | Phase C invokes `applyBattleCommand(battle, { type: 'remove', id })` without touching `battle.resources.items`. Tested in `battle-combat.test.ts` (L253–271). |
| **AC-16** — Breach (`x < 0`) enqueues Defeat; first valid terminal wins; no simulation after terminal | **PASS** | Phase C enqueues `{ type: 'terminal', result: 'defeat' }` for surviving Enemies with `position < 0`; G07 pre-queued Victory wins; killed-on-same-tick Enemy does not breach. Tested in `battle-combat.test.ts` (L203–233). |
| **AC-17** — Failed transaction rolls back positions, HP, cooldowns, entities, counters and staged events | **PASS** | `TransactionEngine.executePhase()` clones `state`, `queue`, and `rng` into staging. Tested for `QUEUE_OVERFLOW` rollback in `battle-combat.test.ts` (L235–245) and `simulation-foundation.test.ts` (L285–309). |
| **AC-18** — Identical config, seed and inputs replay identically | **PASS** | Deterministic phase + queue ordering + snapshot detachment. Tested in `battle-combat.test.ts` (L55–71, L375–390). |
| **AC-19** — T-04/T-05/T-06 regressions and queue/budget limits preserved | **PASS** | `executePhase()` returns `executed: 0` without consuming the 250-events/tick budget; all existing T-04 (29/29), T-05 (12/12), and T-06 (21/21) tests pass. |
| **AC-20** — Game/Game Data tests, typecheck, build and real remote CI pass | **PASS** | Local checks on `7b7c37d` and remote GitHub Actions CI run `44877738893` on `6b0ee0b` both pass across all workspace steps. |

## 4. Verification commands and evidence

Local checks executed on `7b7c37d` and remote CI on `6b0ee0b`:

- `pnpm --filter @mfd/game test` → **PASS** (`6` test files, `85/85` tests: `lifecycle-adapter.test.ts` 7, `create-game.test.ts` 4, `battle-combat.test.ts` 12, `battle-runtime.test.ts` 12, `battle-resources.test.ts` 21, `simulation-foundation.test.ts` 29)
- `pnpm --filter @mfd/game-data test` → **PASS** (`1` test file, `25/25` tests: `validation.test.ts`)
- `pnpm typecheck` → **PASS** (`3/3` packages: `@mfd/game-data`, `@mfd/game`, `@mfd/web`)
- `pnpm build` → **PASS** (`@mfd/web` Next.js production build, uncached)
- Remote CI: [GitHub Actions run 44877738893](https://github.com/veejvn/minecraft-fusion-defense/actions/runs/44877738893) on `6b0ee0b` (`Workspace Checks` job `136766065972`) completed **success** (Game Unit Tests, Game Data Unit Tests, Workspace TypeScript Checks, Workspace Production Build).

## 5. Non-blocking observations and remaining boundaries

1. **Final status:** **T-07 OWNER-ACCEPTED (TECHNICAL)**, **20/20 acceptance gates PASS**, remote CI **SUCCESS** (`44877738893`).
2. **Production data still TBD:** Exact stats/targeting for 5 Base + 7 Fusion Defenders, stats/behaviors for Zombie/Husk/Vindicator/Pillager, `spawnOffsetX`, status-effect stacking, and `SPECIAL` / `HIGHEST_THREAT` definitions remain unapproved.
3. **Downstream boundary:** T-08 (Fusion) and T-09 (5 Waves & Victory) remain pending separate Owner plans and coding authorizations.

# T-06 — Final Technical Acceptance Review

**Project:** Minecraft Fusion Defense  
**Date:** 2026-11-21  
**Review status:** **OWNER-ACCEPTED TECHNICALLY — 26/26 GATES PASS (Headless Scope; Production Data Remains TBD)**  
**Scope:** Headless `packages/game` Summon, Placement, Energy/Power Crystal resources, passive Energy, collectible lifecycle, deterministic random Crystal spawn, config-driven Energy Item spawn, Enemy/Wave reward hooks, Pending Wave Rewards and Pause/terminal resource guards.  
**Implementation commit:** [`147e8bde209bf1f99e2ba341732c874a05913d65`](https://github.com/veejvn/minecraft-fusion-defense/commit/147e8bde209bf1f99e2ba341732c874a05913d65) (plus Owner-requested regression tests in `packages/game/tests/battle-resources.test.ts`).  
**CI evidence:** GitHub Actions run `44850790552` — completed **success** for commit `147e8bd` (subsequent docs-only push `68d5142` also completed **success** at run `44872044295`; the newly added test supplement in `battle-resources.test.ts` is verified locally and will run in CI when pushed).

## 1. Executive summary

The Owner accepted T-06 technically across all **26 acceptance gates (AC-01–AC-26)** on 2026-11-21 after source review against [T-06 Plan v1.0 & Readiness Review v1.1](../development/T-06-SUMMON-PLACEMENT-RESOURCES-IMPLEMENTATION-PLAN.md), local execution of all unit tests / typecheck / production build, and remote CI verification of `147e8bd`. The implementation satisfies all **21 Owner-approved technical decisions (D-04–D-24)** within the approved test-fixture boundary.

Because production game values (Base Defender summon costs/cooldowns, Energy Item spawn rate/amount/distribution, Wave 1–5 Crystal rewards) remain **TBD**, runtime validation fails closed on missing inputs and uses explicit test-only fixtures in `battle-resources.test.ts`. No production defaults were invented.

## 2. Implementation scope and contract compliance

Commit `147e8bd` modifies only six files inside `packages/game`:

| File | Responsibility |
| --- | --- |
| `packages/game/src/core/battle-resources.ts` | `ResourceState`, Summon/Collect/Claim/EnemyReward/WaveReward/Terminal commands, passive Energy, Energy/Crystal spawn & expiration timers, Crystal-only oldest-first auto-collect |
| `packages/game/src/core/resource-session.ts` | Fail-closed immutable (`Object.freeze` + `structuredClone`) session input validation, safe integer `count()`, `deadline()` tick conversion, normalized position/region validation, Crystal interval bounds |
| `packages/game/src/core/resource-rng.ts` | Transactional Mulberry32 PRNG and bias-free rejection-sampled `uniformIndex()` |
| `packages/game/src/core/battle-state.ts` | Optional `resources?: ResourceState` field on `BattleState` |
| `packages/game/src/systems/battle-runtime.ts` | Integration of `TransactionEngine` (with staged `ResourceRng`), tick-0 `initialize`, Pause guard for `collect`/`claim`, terminal guard, detached snapshots |
| `packages/game/tests/battle-resources.test.ts` | 21 focused unit tests covering T-06.1 through T-06.5 using explicit test-only fixtures (20 in `147e8bd` + 1 runtime claim test & dual-terminal assertion added during acceptance) |

No changes were made to `apps/web`, `packages/game/src/index.ts`, `packages/game/src/scenes/hello-scene.ts`, `packages/game-data`, `package.json`, lockfile, or T-04 core engine files (`simulation-clock.ts`, `transaction.ts`, `event-queue.ts`, `event-scheduler.ts`).

### Technical decisions D-04–D-24 spot check
- **D-04 / D-08 (Tick time & deadlines):** `deadline(seconds, rate, origin)` computes `origin + Math.ceil(seconds * rate)`; periodic Energy (`period * 3`) and Energy Item spawn (`period * intervalSeconds`) calculate from `origin = 0` to prevent cumulative rounding drift.
- **D-05 / D-20 / D-22 (Single queue & expiration):** All commands and timers share one T-04 `EventQueue` ordered by `scheduledTick` then `insertionSequence`. Items persist until their `expire` event executes (including when deferred by the 250-events/tick budget).
- **D-07 / D-15–D-19 / D-21 (Seeded Mulberry32 PRNG):** `uint32` seed (0 allowed) stored in `TransactionEngine` `rng`, cloned/committed/rolled back atomically. Crystal interval uniformly sampled in `[ceil(30*r), floor(60*r)]` via rejection sampling; cell RNG drawn only when `eligible.length > 0`.
- **D-09 / D-11–D-14 / D-23–D-24:** Summon auto-collects Crystal items only (oldest-first); Energy items use validated normalized coordinates; normal gameplay rejections record `state.resources.outcome` (`REJECTED`) without mutating gameplay resources/entities/IDs/RNG or triggering T-04 fail-stop; malformed inputs and safe-integer overflows trigger fail-stop rollback.

## 3. Acceptance matrix — 26 gates

| Gate | Verdict | Evidence |
| --- | --- | --- |
| **AC-01** — Energy starts 0, +50 once at t=0 | **PASS** | `createResourceState()` initializes `energy: 0`; constructor runs `initialize` once at tick 0 (`if (state.initialized) return;`). Tested in `battle-resources.test.ts` (L37–48). |
| **AC-02** — Crystal cap 5; Energy uncapped | **PASS** | `CRYSTAL_CAP = 5`, `crystals: 0`; Energy uses safe-integer `count()` with no gameplay cap. Tested in `battle-resources.test.ts` (L40, L171–189, L283–290). |
| **AC-03** — Validated available Base Defender summon cost; fail closed | **PASS** | `validateResourceSession()` requires valid Base/Fusion classification, `unlocked`, and non-negative safe integer `summonEnergyCost`; missing cost throws. Tested in `battle-resources.test.ts` (L54, L63–94). |
| **AC-04** — Reject invalid/non-integer/out-of-range/occupied cells | **PASS** | `cellIndex()` catches `RangeError` → `'invalid-cell'`; occupied cell returns `'occupied-cell'`. Tested in `battle-resources.test.ts` (L69–71, L84–93). |
| **AC-05** — Insufficient Energy rejects without mutation/ID consumption | **PASS** | Guard runs before Energy subtraction and `applyBattleCommand`; `entities.size`, `nextEntityId`, and `occupancy` remain unchanged. Tested in `battle-resources.test.ts` (L73–83). |
| **AC-06** — Successful Summon atomically spends Energy, creates Defender, updates occupancy | **PASS** | Executed within `TransactionEngine` staged handler (`state.energy -= cost` + `applyBattleCommand`). Tested in `battle-resources.test.ts` (L45–47, L73–83). |
| **AC-07** — +50 passive Energy every 3s Game Time; no FPS dependence/drift | **PASS** | `deadline(period * 3, config.rate)` from `origin = 0`. Tested at fractional rate `2.5` across split frames (`2800ms+400ms+2800ms` vs `60×100ms`) in `battle-resources.test.ts` (L98–109). |
| **AC-08** — Pause freezes timers and forbids collect/claim; Resume preserves lifetime | **PASS** | `SimulationClock.setPaused`, `BattleRuntime.enqueue` rejects `collect`/`claim` with `'paused'`; `expiresAt` preserved across pause. Tested in `battle-resources.test.ts` (L111–123). |
| **AC-09** — Unique Item IDs, valid positions, 10s Game Time lifetime | **PASS** | Monotonic `nextItemId: bigint`, `deadline(10, rate, ctx.tick)`, validated normalized Energy positions/region, grid cells, and enemy lane positions. Tested in `battle-resources.test.ts` (L57, L145–147, L229–231, L248–250). |
| **AC-10** — Valid collection credits once and removes Item; duplicates rejected | **PASS** | `collect()` deletes Item from `state.items` after crediting; second click returns `'item-unavailable'`. Tested in `battle-resources.test.ts` (L127–138). |
| **AC-11** — Same-tick Collect/Expire obey `scheduledTick + insertionSequence` | **PASS** | Single `EventQueue` ordering, including 250-event-budget deferral across ticks. Tested in `battle-resources.test.ts` (L140–169). |
| **AC-12** — Full Crystal storage prevents collection without deleting Item/resetting deadline | **PASS** | `if (state.crystals + item.amount > CRYSTAL_CAP) return 'crystal-storage-full'` leaves Item and `expiresAt` intact. Tested in `battle-resources.test.ts` (L251–254). |
| **AC-13** — Summon auto-collects Crystal only, oldest-first to cap; never Energy | **PASS** | Iterates `state.items` in insertion order (`bigint` ID order), filters `item.kind === 'crystal' && itemOnCell(...)`, stops at cap `5`. Tested in `battle-resources.test.ts` (L171–189). |
| **AC-14** — Uncollected Items keep deadlines; Defender removal preserves Items | **PASS** | Uncollected Crystal `6n` retains `expiresAt`; `remove` command leaves Item untouched. Tested in `battle-resources.test.ts` (L181–189). |
| **AC-15** — Independent 30–60s random Crystal intervals | **PASS** | `nextCrystalAttempt()` invoked at `initialize` and after every `crystal-attempt`. Tested in `battle-resources.test.ts` (L213–233). |
| **AC-16** — Successful random Crystal attempt spawns 1-Crystal Item in eligible cell | **PASS** | Filters `occupancy` for `null` cells and spawns `amount: 1` Crystal at `{ kind: 'cell', cell }`. Tested in `battle-resources.test.ts` (L213–233, `full: false`). |
| **AC-17** — No eligible cell safely skips spawn without invalid/off-grid Item | **PASS** | Skips cell RNG draw and Item creation when `eligible.length === 0`, still schedules next interval. Tested in `battle-resources.test.ts` (L213–233, `full: true`). |
| **AC-18** — No Item count cap; multiple Items may share a cell | **PASS** | No size limit on `state.items`; `crystal-attempt` ignores existing Items on cell and `enemy-reward` spawns multiple Items at identical position. Tested in `battle-resources.test.ts` (L176, L246–250). |
| **AC-19** — Enemy-death hook grants direct Energy + per-Crystal Items once per source | **PASS** | `enemy-reward` deduplicates via `rewardedEnemies`, credits direct Energy, spawns `definition.crystals` 1-Crystal Items at `{ lane, position }`. Tested in `battle-resources.test.ts` (L240–250). |
| **AC-20** — Wave Reward grants once per source, fills storage up to 5, overflow to Pending | **PASS** | `wave-reward` deduplicates via `rewardedWaves`, caps storage deposit at `5 - crystals`, adds overflow to uncapped `pending`. Tested in `battle-resources.test.ts` (L237–245). |
| **AC-21** — Manual claim transfers only available capacity; no double-claim or claim while Paused | **PASS** | `claimPending()` claims `min(pending, 5 - crystals)` and tracks `processedClaims`; `BattleRuntime.enqueue` blocks `claim` while paused and rejects empty claims without burning `requestId`. Tested in `battle-resources.test.ts` (L117, L252–255, L264–283). |
| **AC-22** — Valid terminal clears Pending and stops resource generation without resolving priority | **PASS** | `terminal` sets `state.pending = 0` and `state.terminal`, stopping timers/commands via `if (state.resources?.terminal) return;`; competing second `terminal` is ignored (first valid wins). Tested in `battle-resources.test.ts` (L193–205, L256–261). |
| **AC-23** — Failed transaction rolls back RNG, counters, resources, Items/Entities and staged events | **PASS** | `TransactionEngine` clones `state`, `queue`, and `rng` into staging. Tested for `QUEUE_OVERFLOW` and `CONTRACT_ERROR` (safe-integer overflow) in `battle-resources.test.ts` (L275–290). |
| **AC-24** — Identical config, seed, inputs and event order replay identically | **PASS** | Deterministic Mulberry32 + tick-based `EventQueue`. Tested in `battle-resources.test.ts` (L292–310). |
| **AC-25** — Snapshot isolation and T-04/T-05 regressions | **PASS** | `structuredClone` snapshots verified by mutation test (`battle-resources.test.ts` L299–307); `simulation-foundation.test.ts` (27/27) and `battle-runtime.test.ts` (12/12) pass. |
| **AC-26** — Workspace tests, typecheck, build and real remote CI pass | **PASS** | Local checks and GitHub Actions CI run `44850790552` on `147e8bd` both pass. |

## 4. Verification commands and CI evidence

Local checks executed on 2026-11-21 after adding the acceptance regression tests:

- `pnpm --filter @mfd/game test` → **PASS** (`5` test files, `71/71` tests: `lifecycle-adapter.test.ts` 7, `create-game.test.ts` 4, `battle-runtime.test.ts` 12, `battle-resources.test.ts` 21, `simulation-foundation.test.ts` 27)
- `pnpm --filter @mfd/game-data test` → **PASS** (`1` test file, `25/25` tests: `validation.test.ts`)
- `pnpm typecheck` → **PASS** (`3/3` packages: `@mfd/game-data`, `@mfd/game`, `@mfd/web`)
- `pnpm build` → **PASS** (`@mfd/web` Next.js production build, uncached)
- Remote CI: `gh run list` confirms workflow `CI` run `44850790552` (`feat: implement resource management system with state and commands`, `147e8bd`) completed **success**.

## 5. Non-blocking observations and remaining TBD boundaries

1. **Test-fixture boundary for partial `claim`:** Because T-06 does not yet include an Ability Crystal-spending command, `BattleRuntime` cannot reach `crystals < 5 && pending > 0` without a Crystal consumer; partial claim transfer (`crystals: 3, pending: 7` → `5/5`) is therefore tested directly on `claimPending(state, ...)` (`battle-resources.test.ts` L273–283), while `BattleRuntime.enqueue({ type: 'claim', ... })` is tested for paused, full-storage, and empty-pending paths.
2. **Production data still TBD (as planned):** Base Defender summon costs/cooldowns (cooldown field is not yet part of `defenderDefinitionSchema` or `ResourceSessionInput`), Energy Item spawn rate/amount/interactive region/position distribution, and Wave 1–5 Crystal reward amounts remain unapproved and require Owner sign-off before production gameplay data assembly.
3. **Final status:** **T-06 OWNER-ACCEPTED (TECHNICAL)**, **26/26 acceptance gates PASS**, [ROADMAP.md](../product/ROADMAP.md) and [T-06 Plan](../development/T-06-SUMMON-PLACEMENT-RESOURCES-IMPLEMENTATION-PLAN.md) updated accordingly. Downstream T-07–T-13 coding still requires separate Owner scope approval.

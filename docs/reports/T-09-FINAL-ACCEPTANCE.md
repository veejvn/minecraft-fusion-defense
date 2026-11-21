# T-09 — Final Technical Acceptance Report

**Project:** Minecraft Fusion Defense  
**Date:** 2026-11-21  
**Review status:** **19/20 GATES LOCAL PASS; AC-20 LOCAL PASS / REMOTE CI PENDING COMMIT & PUSH (Headless Scope; Wave 1–5 Production Data Remains TBD)**  
**Scope:** Headless `packages/game` 5-Wave Grassland session validation (`waveCount === waves.length === 5`), anchor-based Spawn Group scheduling (`wave-start`, `wave-spawn`), `fixed` / `sequential` / seeded-Mulberry32 `random` lane selection, Wave completion guards (`allSpawned && livingEnemies === 0`), idempotent T-06 `wave-reward` triggering, inter-wave transitions, Wave 5 Victory detection, G07 simultaneous Victory/Defeat arbitration, and Pause/Terminal Wave timer guards.  
**Implementation location:** Local working tree on `main` (parent commit `e276e21`, uncommitted — pending commit & push).  
**CI evidence:** Local `pnpm --filter @mfd/game test` (126/126), `pnpm --filter @mfd/game-data test` (25/25), `pnpm typecheck` (3/3), and `pnpm build` (`@mfd/web`, uncached) all **PASS**; remote GitHub Actions CI run is **PENDING** commit and push (`gh run list` latest run `44877738893` is for T-07 commit `6b0ee0b`).

## 1. Executive summary

Technical implementation and independent read-only audit against [T-09 Plan v1.0](../development/T-09-GRASSLAND-WAVES-VICTORY-DEFEAT-IMPLEMENTATION-PLAN.md) confirm that the T-09 changes implement all **10 Owner-approved technical decisions (`D-49`–`D-58 = A`)** and pass **AC-01–AC-19** plus the local checks of **AC-20** within the headless test-fixture boundary.

Because production Wave 1–5 Enemy compositions, counts, allowed rows, delays/intervals, Wave Power Crystal reward amounts, and Entity combat stats remain **TBD**, runtime validation fails closed on `null`/missing/mismatched session inputs and tests use explicitly labeled test-only fixtures in `battle-waves.test.ts`. No production balance or Wave defaults were invented.

## 2. Implementation scope and contract compliance

T-09 adds/modifies six files exclusively inside `packages/game`:

| File | Responsibility |
| --- | --- |
| `packages/game/src/waves/wave-session.ts` | `REQUIRED_GRASSLAND_WAVE_COUNT = 5`, `waveDeadline()`, fail-closed `validateWaveSession()` (`D-49`, `D-50`, `D-51`, `D-57`), cross-validation with `CombatSession` and `ResourceSession`, deep freeze |
| `packages/game/src/waves/wave-state.ts` | `WavePhaseStatus`, `WaveState`, `WaveEvent` (`wave-start`, `wave-spawn`), `createWaveState()` |
| `packages/game/src/waves/wave-engine.ts` | `isBattleTerminal()`, `countLivingEnemies()`, `checkWaveCompletion()` (`D-53`, `D-54`), `applyWaveEvent()` (`D-51`, `D-52`) with active-wave guard (`event.waveIndex === currentWaveIndex`) |
| `packages/game/src/core/battle-state.ts` | Optional `readonly waves?: WaveState` field on `BattleState` |
| `packages/game/src/systems/battle-runtime.ts` | Optional 5th constructor parameter `waveInput?: WaveSessionInput` (`D-58`), tick-0 Wave 1 scheduling before single `runTick(0)`, `checkWaveCompletion()` after `runCombatPhase()` and `remove`, synchronized `markTerminal` (`D-55`, `D-56`), detached `snapshot()` preserving prior shape when omitted |
| `packages/game/tests/battle-waves.test.ts` | 16 focused unit/integration tests (test-only fixtures) covering `AC-01`–`AC-20` |

No changes were made to `apps/web`, `packages/game-data`, `packages/game/src/index.ts`, `packages/game/src/scenes/hello-scene.ts`, `packages/game/src/core/battle-resources.ts`, `package.json`, or `pnpm-lock.yaml`.

## 3. Acceptance matrix — 20 gates

| Gate | Verdict | Evidence |
| --- | --- | --- |
| **AC-01** — 5-Wave session validation & cross-session fail-closed | **PASS** | `validateWaveSession()` enforces `waveCount === waves.length === 5`, unique stable IDs, non-empty `spawnGroups`, positive integer `count`, nonnegative delays/intervals, unique `allowedLanes` `0..4`, `laneMode`, seed rules, and `CombatSession`/`ResourceSession` cross-links. Tested in `battle-waves.test.ts` (L154–413). |
| **AC-02** — Wave 1 schedules at `t = 0` and spawns after `initialDelaySeconds + startOffsetSeconds` | **PASS** | `BattleRuntime` schedules `wave-start` at `waveDeadline(initialDelaySeconds, rate, 0)`. Tested with `initialDelaySeconds: 2, startOffsetSeconds: 3` and `0 + 0` immediate launch in `battle-waves.test.ts` (L416–483). |
| **AC-03** — Drift-free Spawn Group intervals at fractional tick rates & `intervalSeconds: 0` burst | **PASS** | `waveDeadline(startOffsetSeconds + spawnIndex * intervalSeconds, rate, tick)` anchors from `wave-start` tick. Tested at `2.5 Hz` across split frames (`[1, 2, 3, 5]`) and burst `intervalSeconds: 0` in `battle-waves.test.ts` (L485–566). |
| **AC-04** — Each Enemy spawns once at `combatSession.spawnX` with full `maxHp` | **PASS** | `applyWaveEvent()` spawns at `spawnX`, registers `CombatEntityState`, and deduplicates via `startedWaves` & `processedSpawns`. Tested in `battle-waves.test.ts` (L568–640). |
| **AC-05** — Deterministic `'fixed'`, `'sequential'`, and Mulberry32 `'random'` lane selection | **PASS** | `resolveSpawnLane()` tested across `'fixed'`, `'sequential'`, and `'random'` (both with `resourceInput` and standalone `waveInput.seed`) against `uniformIndex` in `battle-waves.test.ts` (L642–725). |
| **AC-06** — Killing active Enemies before Spawn Groups finish does not complete Wave early | **PASS** | `checkWaveCompletion()` requires `spawnedInCurrentWave >= plannedInCurrentWave`. Tested in `battle-waves.test.ts` (L728–780). |
| **AC-07** — Finishing spawns with living Enemies does not complete Wave or grant reward early | **PASS** | `checkWaveCompletion()` requires `countLivingEnemies(battle) === 0`. Tested in `battle-waves.test.ts` (L782–839). |
| **AC-08** — Final Enemy death completes Wave `w`, grants `wave-reward` once, transitions after delay | **PASS** | `checkWaveCompletion()` marks `completedWaves.add(w)`, enqueues `wave-reward`, and schedules `w + 1` via `waveDeadline(delayBeforeNextWaveSeconds, rate, tick)`. Tested in `battle-waves.test.ts` (L841–921). |
| **AC-09** — Wave Reward fills storage to cap 5, overflows to Pending, deduplicates by `wave.id` | **PASS** | Verified cap-5 storage fill, Pending overflow (`3 -> 5+2 -> 5+8`), and `duplicate-wave-reward` rejection in `battle-waves.test.ts` (L841–921). |
| **AC-10** — Wave 5 completion enqueues `{ type: 'terminal', result: 'victory' }` and resolves Victory | **PASS** | `checkWaveCompletion()` on `w === 4` sets `status = 'completed'` and calls `enqueueVictory(tick)`. Tested in full 5-Wave playthroughs (`battle-waves.test.ts` L924–1057). |
| **AC-11** — Enemy breach (`x < 0`) during any Wave resolves Defeat immediately | **PASS** | Breach in Wave 2 triggers `terminal: defeat` (`battle-waves.test.ts` L1059–1112). |
| **AC-12** — Simultaneous Victory and Defeat resolve strictly by G07 `scheduledTick + insertionSequence` | **PASS** | Tested both directions (`defeat` before phase `victory` -> `defeat`; `victory` before phase breach `defeat` -> `victory`) and post-terminal immutability (`battle-waves.test.ts` L1114–1185). |
| **AC-13** — Terminal clears `Pending Wave Reward` and cancels remaining spawns, transitions, and rewards | **PASS** | `markTerminal()` + `isBattleTerminal()` verified clearing `pending` and halting Wave 2–5 spawns (`battle-waves.test.ts` L1059–1112). |
| **AC-14** — Pause freezes initial delays, Spawn Group intervals, and inter-wave transitions; Resume continues cleanly | **PASS** | Tested Pause/Resume across `initialDelaySeconds`, `intervalSeconds`, and `delayBeforeNextWaveSeconds` with zero duplicates or skips (`battle-waves.test.ts` L1188–1281). |
| **AC-15** — Base & Fusion Defenders engage Wave Enemies and trigger T-06 Enemy/Wave rewards | **PASS** | Verified Enemy-death rewards and Wave rewards across all 5 Waves (`battle-waves.test.ts` L924–1057). |
| **AC-16** — Fusion optional for Grassland Victory | **PASS** | Verified full 5-Wave Victory using Base Defenders only (`fusion === undefined`) and with T-08 `frost_guardian` (`battle-waves.test.ts` L924–1057). |
| **AC-17** — Failed transactions roll back Wave state, entities, RNG, resources, and staged events atomically | **PASS** | Tested `QUEUE_OVERFLOW` during both `wave-start` scheduling and `checkWaveCompletion` (`battle-waves.test.ts` L1283–1327). |
| **AC-18** — Identical 5-Wave battles replay identically and isolate `snapshot().waves` mutations | **PASS** | Tested deterministic 5-Wave replay (`random` + `sequential` + Base + Fusion) and detached `snapshot().waves` Set/field isolation (`battle-waves.test.ts` L1329–1384). |
| **AC-19** — Omitting `waveInput` keeps `snapshot()` unchanged; T-04–T-08 regressions pass | **PASS** | Verified `snapshot().waves === undefined` when omitted (`battle-waves.test.ts` L154–210) and all 110 prior tests passing. |
| **AC-20** — Workspace tests, typecheck, build and real remote CI pass | **LOCAL PASS / REMOTE CI PENDING** | Local `@mfd/game` (126/126), `@mfd/game-data` (25/25), `pnpm typecheck` (3/3), and `pnpm build` PASS after final edit; remote CI pending commit & push. |

## 4. Verification commands and evidence

Local checks executed after the final code edit on the current working tree:

- `pnpm --filter @mfd/game test` → **PASS** (`8` test files, `126/126` tests: `lifecycle-adapter.test.ts` 7, `create-game.test.ts` 4, `battle-runtime.test.ts` 12, `battle-resources.test.ts` 21, `battle-combat.test.ts` 12, `battle-fusion.test.ts` 25, `battle-waves.test.ts` 16, `simulation-foundation.test.ts` 29)
- `pnpm --filter @mfd/game-data test` → **PASS** (`1` test file, `25/25` tests: `validation.test.ts`)
- `pnpm typecheck` → **PASS** (`3/3` packages: `@mfd/game-data`, `@mfd/game`, `@mfd/web`)
- `pnpm build` → **PASS** (`@mfd/web` Next.js production build, `0 cached`)
- Independent audit (`research` subagent `T-09 Gate Auditor`) confirmed `D-49`–`D-58`, `AC-01`–`AC-19` coverage, and strict scope isolation (non-blocking suggestions applied and re-verified).
- Remote CI: **PENDING** (changes are uncommitted on local `main`; latest remote CI run `44877738893` passed for T-07 `6b0ee0b`).

## 5. Non-blocking observations and remaining boundaries

1. **Remote CI gate (`AC-20`):** Commit and push both T-08 (`061d2ee`, if not yet pushed) and T-09 implementation + acceptance documentation to GitHub `main`, then verify the resulting workflow run succeeds to close `AC-20` as remote-CI verified.
2. **Production data still TBD:** Wave 1–5 Enemy compositions, counts, allowed rows, delays/intervals, Wave Crystal reward amounts, and Entity combat stats/behaviors remain unapproved.
3. **Downstream boundary:** T-10 (Special Abilities), T-11 (Save & Resume / persistent progression), T-12 (UI, assets & playable integration), and T-13 (MVP QA) remain pending separate Owner plans and authorizations.

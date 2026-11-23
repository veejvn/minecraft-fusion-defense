# T-11 — Final Technical Acceptance Report

**Project:** Minecraft Fusion Defense  
**Date:** 2026-11-23  
**Review status:** **19/20 GATES LOCAL PASS; AC-20 LOCAL PASS / REMOTE CI PENDING PUSH (Headless Persistence, Checkpoint/Recovery & Progression Scope)**  
**Scope:** Headless `packages/game` **Save & Resume, Checkpoint/Recovery (`G02–G05`), and Persistent Progression System** covering canonical lossless JSON codec (`bigint`, `Map`, `Set`) + deterministic 32-bit FNV-1a checksum + fail-closed semantic validation (`G03`, `TC37–TC39`, `FR11–FR13`), atomic commit-boundary checkpointing (`tick-0`, every `60` ticks, `summon`, `fuse`, `activate-ability`, `wave-start`, `wave-reward`, `pause`) (`G02`, `FR10`), max-3 RAM checkpoint ring buffer (`G04`), crash-safe primary + `.bak` storage rotation (`InMemoryStorageAdapter` & `BrowserLocalStorageAdapter`), newest-first staged recovery (`G05`) with `battleGeneration` increment (`FR4`), uncommitted input cancellation (`FR23`), `RECOVERING` input guard (`FR24`), terminal save cleanup (`FR17–FR18`), separate Victory-only `ProgressionStore` enforcing all 03/11/2026 starter & milestone unlocks (`snow_golem`, `wolf`, `blaze`, 7 recipes) + Achievements/Collection view models (`D-76`–`D-85 = A`).  
**Implementation location:** Local working tree on `main` (parent commit `0040ac5` — ready to commit cleanly).  
**CI evidence:** Local `pnpm --filter @mfd/game test` (174/174), `pnpm --filter @mfd/game-data test` (25/25), `pnpm typecheck` (3/3), and `pnpm build` (`@mfd/web`, uncached) all **PASS**; remote GitHub Actions CI run is **PENDING** push.

## 1. Executive summary

Technical implementation and independent read-only audit against [T-11 Plan v1.0](../development/T-11-SAVE-RESUME-PROGRESSION-IMPLEMENTATION-PLAN.md) confirm that the T-11 changes implement all **10 Owner-approved technical decisions (`D-76`–`D-85 = A`)** and pass **AC-01–AC-19** plus the local checks of **AC-20**.

Active-battle Save/Resume (`G02–G05`) and Persistent Progression (`ProgressionStore`) remain cleanly decoupled: reloading restores exact mid-Wave state (`tick`, `EventQueue`, `rng`, `crystals`, cooldowns, statuses, shields, paused cadences, projectiles), Victory/Defeat clears the active-battle save slot (`FR18`), and only Grassland `victory` outcomes accrue `totalVictories` and `totalVictoryKills` toward unlock milestones (`snow_golem`, `wolf`, `blaze`, and cascading Fusion recipes). `@mfd/game-data` and the production homepage `/` remain completely untouched, and `BattleRuntime` preserves 100% backward compatibility when `persistenceOptions` is omitted.

*(Note: Wiring Save/Resume & Progression UI screens — Main Menu, Defender Collection, Achievements, Continue/Resume prompt — remains part of `T-12: UI, Assets & Playable Integration`.)*

## 2. Implementation scope and contract compliance

T-11 adds five files and updates seven existing files exclusively inside `packages/game`:

| File | Responsibility |
| --- | --- |
| `packages/game/src/persistence/storage-adapter.ts` | `PersistenceStorageAdapter`, `InMemoryStorageAdapter`, `BrowserLocalStorageAdapter` (guarded `globalThis.localStorage`), `writeWithBackup`, `readWithBackupFallback`, `clearWithBackup` (`D-79`) |
| `packages/game/src/persistence/snapshot-codec.ts` | Pure-TS `computeFnv1aHex` (no Node `crypto`), canonical tagged codec (`bigint`, `Map`, `Set`), `SAVE_SCHEMA_VERSION = 1`, `migrateBattleCheckpoint`, `validateBattleCheckpointSemantics`, `SnapshotValidationError` (`D-76`, `D-77`) |
| `packages/game/src/persistence/checkpoint-manager.ts` | `ACTIVE_BATTLE_STORAGE_KEY`, `MAX_RAM_CHECKPOINTS = 3` (`G04`), duplicate commit-boundary coalescing, primary + `.bak` sync, newest-first `findNewestValidCheckpoint` (`G05`, `D-78`, `D-79`) |
| `packages/game/src/persistence/progression-store.ts` | `PROGRESSION_STORAGE_KEY`, `ProgressionStore` (primary + `.bak`, schema migration, Victory-only idempotent accounting), confirmed 03/11/2026 starter/milestone unlocks + cascading 7 recipes, `getAchievementsView`, `getDefenderCollectionView`, `applyProgressionUnlocks` (`D-82`, `D-83`, `D-84`) |
| `packages/game/src/core/simulation-clock.ts` | `isPaused`, `accumulator` getters and validated `restore()` (`tick`, `paused`, `accumulatorMs`) |
| `packages/game/src/core/transaction.ts` | Atomic fail-closed `restore(snapshot)` (validates queue + clones before commit, resets `stopped`/`diagnostic`) |
| `packages/game/src/core/battle-state.ts` | Deterministic `matchKills: number` field initialized to `0` |
| `packages/game/src/events/event-scheduler.ts` | `restore(lastTick)` ensuring `recover()`, `restoreCheckpoint()`, and `fromCheckpoint()` execute subsequent ticks accurately without skipping or re-running committed ticks |
| `packages/game/src/abilities/ability-engine.ts` | Increments `battle.matchKills` whenever an Enemy dies in `resolveCombatDeaths()` (`D-82`) |
| `packages/game/src/systems/battle-runtime.ts` | Optional 7th constructor parameter `persistenceOptions?` (`D-85`), `BattleRuntime.fromCheckpoint()`, `createCheckpoint()`, `restoreCheckpoint()`, `recover()`, `getCheckpoints()`, `getPersistenceMeta()`, `RECOVERING` & `stale-generation` `enqueue()` guards (`FR4`, `FR24`), automatic commit-boundary checkpointing (`G02`, `FR10`), terminal cleanup & progression hook (`FR17–FR18`) |
| `packages/game/src/index.ts` | Public persistence/progression helpers & type exports while keeping `BattleRuntime` internal |
| `packages/game/tests/battle-persistence.test.ts` | 19 focused Vitest unit & integration tests (test-only fixtures) covering `AC-01`–`AC-18` |

Zero edits were made to `packages/game-data/`, `apps/web/app/page.tsx`, `apps/web/components/game/phaser-host.tsx`, `packages/game/src/scenes/hello-scene.ts`, `packages/game/src/create-game.ts`, `package.json`, or `pnpm-lock.yaml` (`AC-18`).

## 3. Acceptance matrix — 20 gates

| Gate | Verdict | Evidence |
| --- | --- | --- |
| **AC-01** — Versioned checkpoint serialization & lossless round-trip | **PASS** | Verified exact round-trip of `bigint` IDs, `Map`, `Set` (`hitEnemyIds`), `occupancy`, `entities`, `resources`, `combat`, `fusion`, `waves`, `abilities`, `EventQueueSnapshot`, `rng`, `tick`, `paused`, `battleGeneration`, `matchKills`, and `accumulatorMs` in `battle-persistence.test.ts` (L376–493). |
| **AC-02** — Checksum & semantic validation fail-closed (`G03`, `TC39`) | **PASS** | Verified `INVALID_JSON`, `CHECKSUM_MISMATCH`, `UNSUPPORTED_VERSION` (`99`), and `SEMANTIC_VIOLATION` (occupancy mismatch, invalid HP, crystals `> 5`, queue order/sequence) throw `SnapshotValidationError` without mutating live `BattleRuntime` (`battle-persistence.test.ts` L495–622). |
| **AC-03** — `G02` checkpoint timing & `FR10` atomic commit boundary | **PASS** | Verified captures at `tick 0`, ticks `60`/`120`, and committed `summon`, `fuse`, `activate-ability`, `wave-start`, `wave-reward`, `setPaused(true)`, duplicate coalescing, and zero capture on `QUEUE_OVERFLOW` rollback (`battle-persistence.test.ts` L624–740). |
| **AC-04** — `G04` RAM ring buffer cap (`MAX_RAM_CHECKPOINTS = 3`) | **PASS** | Verified newest-first cap at 3 checkpoints with eviction of oldest on 4th capture (`battle-persistence.test.ts` L742–778). |
| **AC-05** — Atomic primary + `.bak` storage rotation & fallback | **PASS** | Verified valid rotation to `.bak` and automatic fallback recovery when primary `mfd.active_battle.v1` is corrupted/truncated (`battle-persistence.test.ts` L780–839). |
| **AC-06** — Seamless Resume across reload (`BattleRuntime.fromCheckpoint`, `TC38`, `FR11–FR13`) | **PASS** | Verified mid-Wave resume with enemies, collectibles, cooldowns, `burn`/`slow`/`buff`, `glacial_fortress` shield, `PAUSED` stun cadence, and `piercing_barrage` projectile produces identical future snapshots (`battle-persistence.test.ts` L841–980). |
| **AC-07** — `G05` newest-first recovery & `EventScheduler` tick rollback | **PASS** | Verified skipping corrupted newest RAM slot 0 and restoring slot 1 atomically after `QUEUE_OVERFLOW`, including `EventScheduler.restore()` tick rollback (`battle-persistence.test.ts` L982–1030). |
| **AC-08** — `FR4`, `FR23`, `FR24` Recovery lifecycle | **PASS** | Verified `battleGeneration` increment independent of status `version`, `stale-generation` rejection, discarded uncommitted commands (`FR23`), and `recovering` rejection without spending Crystals (`FR24`) (`battle-persistence.test.ts` L1032–1137). |
| **AC-09** — `FR17–FR18` Terminal closure clears active-battle save | **PASS** | Verified both `victory` (Wave 5) and `defeat` (base breach) clear primary and `.bak` active-battle storage keys (`battle-persistence.test.ts` L1139–1192). |
| **AC-10** — Starter persistent progression profile | **PASS** | Verified fresh `ProgressionStore`: `0` victories, `0` kills, `['iron_golem', 'skeleton']`, `['fusion_skeleton_sniper', 'fusion_steel_guardian']` (`battle-persistence.test.ts` L1194–1209). |
| **AC-11** — First Grassland Victory unlock (`snow_golem`) | **PASS** | Verified victory #1 unlocks `snow_golem` + cascading `fusion_ice_golem` & `fusion_frost_guardian` (`battle-persistence.test.ts` L1211–1225). |
| **AC-12** — Cumulative 50 Victory Kills unlock (`wolf`) | **PASS** | Verified cumulative kills `>= 50` across real `BattleRuntime` victories unlock `wolf` + cascading `fusion_alpha_wolf` (`battle-persistence.test.ts` L1227–1244). |
| **AC-13** — 5 Grassland Victories unlock (`blaze`) | **PASS** | Verified 5 victories unlock `blaze` + cascading `fusion_inferno_archer` and `fusion_flame_fang` (once `wolf` is also unlocked) (`battle-persistence.test.ts` L1246–1277). |
| **AC-14** — Defeat, replay & idempotency rules | **PASS** | Verified `defeat` (with in-match kills) grants `0` victories/`0` kills and unlocks nothing; replay victories count; duplicate `battleId` ignored (`battle-persistence.test.ts` L1279–1346). |
| **AC-15** — Monotonic unlocks & `applyProgressionUnlocks()` gating | **PASS** | Verified permanent unlocks with no duplicate `newlyUnlocked` rewards and live `BattleRuntime` gating of locked vs unlocked `summon` & `fuse` (`battle-persistence.test.ts` L1348–1414). |
| **AC-16** — `getAchievementsView()` & `getDefenderCollectionView()` | **PASS** | Verified progress counters, completion flags, and metadata across 3 milestones, 12 Defenders, and 7 Recipes (`battle-persistence.test.ts` L1416–1460). |
| **AC-17** — Progression crash-safety & migration | **PASS** | Verified `.bak` fallback on corrupted primary progression JSON, fail-closed `UNSUPPORTED_VERSION`, and `migrateProgressionEnvelope()` (`battle-persistence.test.ts` L1462–1515). |
| **AC-18** — Backward compatibility, `BrowserLocalStorageAdapter` & boundary preservation | **PASS** | Verified omitting `persistenceOptions` leaves `snapshot()` keys unchanged (`155` prior tests green), safe `BrowserLocalStorageAdapter` under mock/error/unavailable cases, and `@mfd/game-data` untouched (`battle-persistence.test.ts` L1517–1610+). |
| **AC-19** — Full workspace verification | **PASS** | `@mfd/game` (`174/174`), `@mfd/game-data` (`25/25`), `pnpm typecheck` (`3/3`), and `pnpm build` (`@mfd/web`, uncached) PASS. |
| **AC-20** — Clean workspace build & real remote CI parity | **LOCAL PASS / REMOTE CI PENDING** | Local `AC-19` passes cleanly; remote GitHub Actions CI run pending push. |

## 4. Verification commands and evidence

Local checks executed after the final code edit on the current working tree:

- `pnpm --filter @mfd/game test` → **PASS** (`12` test files, `174/174` tests: `lifecycle-adapter.test.ts` 7, `create-game.test.ts` 4, `battle-runtime.test.ts` 12, `battle-resources.test.ts` 21, `battle-combat.test.ts` 12, `battle-fusion.test.ts` 25, `battle-waves.test.ts` 16, `battle-abilities.test.ts` 22, `battle-persistence.test.ts` 19, `playtest-controller.test.ts` 5, `procedural-pixel-art.test.ts` 2, `simulation-foundation.test.ts` 29)
- `pnpm --filter @mfd/game-data test` → **PASS** (`1` test file, `25/25` tests: `validation.test.ts`)
- `pnpm typecheck` → **PASS** (`3/3` packages: `@mfd/game-data`, `@mfd/game`, `@mfd/web`)
- `pnpm build` → **PASS** (`@mfd/web` Next.js 16.4.5 production build, `0 cached`, routes `/` & `/playtest`)
- Independent read-only audit (`research` subagent `T-11 Gate Auditor`) verified `D-76`–`D-85`, `G02–G05`/`FR4`/`FR10–FR13`/`FR17–FR18`/`FR23–FR24` compliance, `EventScheduler.restore()` tick-0/rollback safety, `ProgressionStore` 03/11/2026 unlock matrix, and `AC-18` scope boundaries.
- Remote CI: **PENDING** push to GitHub `main`.

## 5. Non-blocking observations and remaining boundaries

1. **Remote CI gate (`AC-20`):** Push committed changes to GitHub `main` and confirm the GitHub Actions workflow passes.
2. **UI/Integration handoff (`T-12`):** Integrating Save/Resume prompts, Continue Game flow, Defender Collection, Achievements, and `/playtest` persistence hooks belongs to `T-12` (UI, Assets & Playable Integration).
3. **Production balance still TBD:** Entity base stats (`ENTITY_CATALOG.md` / `GAME_BALANCING.md`) and Wave 1–5 spawn definitions remain TBD for Owner tuning after `/playtest` evaluation.

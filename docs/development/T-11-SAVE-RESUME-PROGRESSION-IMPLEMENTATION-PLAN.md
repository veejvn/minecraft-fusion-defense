# T-11 Save & Resume, Persistent Progression Implementation Plan

Status: APPROVED v1.0 — OWNER DECISIONS D-76–D-85 CONFIRMED (OPTION A); READY FOR IMPLEMENTATION
Last Updated: 2026-11-23
Roadmapped Task: `T-11` — Save & Resume, progression (`docs/product/ROADMAP.md` §3A)
Dependencies: `T-04`, `T-05`, `T-06`, `T-07`, `T-08`, `T-09`, `T-10` (all implemented and verified locally on `main`)

---

## 1. Objective & Scope

`T-11` delivers the headless, deterministic **In-Battle Save/Resume, Checkpoint/Recovery (`G02–G05`), and Persistent Unlock Progression System** in `packages/game/src/persistence/`, integrated with `BattleRuntime` (`packages/game/src/systems/battle-runtime.ts`).

The design bridges the confirmed Product Design rules (`docs/product/ROADMAP.md` §2, `docs/product/GAMEPLAY_MECHANICS.md` §10.2 & §18, `docs/product/GDD.md` §11.1 & §14.1), the `PGD-02` checkpoint/recovery contracts (`G02`–`G06`, `G09` `TC37–TC40`, `FR4`, `FR9–FR13`, `FR17–FR18`, `FR23–FR24`), and crash-safe versioned serialization practices (`.agents/skills/save-systems/SKILL.md`):

1. **Canonical Lossless Battle Snapshot Codec & Checksum (`G03`, `TC37–TC39`):**
   - Serializes and deserializes the complete deterministic `BattleRuntime` state (`tick`, `paused`, `battleGeneration`, `BattleState` including `occupancy`, `entities`, `nextEntityId`, `resources`, `combat`, `fusion`, `waves`, `abilities`, `EventQueueSnapshot` with `insertionSequence` & next sequence counter, and `ResourceRng`) to/from versioned JSON (`schemaVersion: 1`) with lossless `bigint`, `Map`, and `Set` encoding, deterministic FNV-1a/hash checksum, and semantic invariant validation.
2. **In-RAM 3-Checkpoint Ring Buffer & Staged Battle Recovery (`G02`, `G04`, `G05`, `FR4`, `FR10–FR13`, `FR23–FR24`):**
   - Captures immutable checkpoints only at atomic commit boundaries (`FR10`): at **tick 0**, every **60 ticks**, and on meaningful gameplay changes (`summon`, `fuse`, `activate-ability`, `wave-start`, `wave-reward`, and `setPaused(true)`).
   - Stores at most **3 Accepted Checkpoints** in RAM (`G04`).
   - Supports newest-first atomic recovery (`G05`): validates checksum and semantic invariants, increments `battleGeneration` (`FR4`), cancels uncommitted commands (`FR23`), rejects inputs while `RECOVERING` (`FR24`), and resumes exact simulation progress without restart (`TC38`, `FR11–FR13`).
3. **Browser Reload/Close Save & Resume (`GAMEPLAY_MECHANICS.md` §10.2 & §18):**
   - Persists active battle checkpoints through a pluggable storage adapter (`PersistenceStorageAdapter`: `InMemoryStorageAdapter` for headless tests, `BrowserLocalStorageAdapter` for Desktop Web) using atomic primary + `.bak` backup fallback (`save-systems` Skill Pattern #2).
   - Automatically clears the active-battle save slot when a battle resolves to a terminal state (`victory` or `defeat`) (`FR17–FR18`).
4. **Separate Persistent Progression, Unlocks, Achievements & Collection (`ROADMAP.md` §2, `GAMEPLAY_MECHANICS.md` §18):**
   - Maintains a separate versioned persistent profile (`ProgressionProfile`, schema `version: 1`, primary + `.bak` fallback) completely isolated from in-battle saves.
   - Enforces the confirmed 03/11/2026 progression rules:
     - **Starter Unlocks:** Base Defenders `iron_golem`, `skeleton`; Fusion Recipes `fusion_skeleton_sniper` (`skeleton_sniper`), `fusion_steel_guardian` (`steel_guardian`).
     - **Victory-Only Progression:** Only Grassland `victory` increments `totalVictories` (`+1`) and `totalVictoryKills` (`+matchEnemyKills`). `defeat` grants zero progression. Replay victories count; duplicate commit of the same `battleId` is idempotently ignored.
     - **Base Defender Unlocks:** `snow_golem` at `totalVictories >= 1` (First Grassland Victory); `wolf` at `totalVictoryKills >= 50` (50 cumulative Enemy kills in Victory matches); `blaze` at `totalVictories >= 5` (5 Grassland Victories).
     - **Cascading Fusion Recipe Unlocks:** `fusion_ice_golem` (when `snow_golem` unlocked), `fusion_frost_guardian` (when `iron_golem` + `snow_golem` unlocked), `fusion_alpha_wolf` (when `wolf` unlocked), `fusion_inferno_archer` (when `blaze` + `skeleton` unlocked), `fusion_flame_fang` (when `blaze` + `wolf` unlocked).
     - **Permanent & Idempotent:** Unlocks are permanent and never grant duplicate rewards. Exposes read-only view models for `Achievements` and `Defender Collection` screens (`T-12`).

---

## 2. Confirmed Technical Decisions (`D-76` – `D-85` = Option A)

All 10 decisions below were confirmed by the Owner as **Option A** on `2026-11-23` to preserve deterministic simulation, backward compatibility with all 153 existing `@mfd/game` tests, and full compliance with `PGD-02 G02–G05` and the 03/11/2026 confirmed Product Design rules.

### `D-76` — Canonical Versioned Battle Snapshot Schema & Lossless Codec (`G03`, `TC37`, `FR11–FR13`) (**CONFIRMED: Option A**)
- **Option A (Confirmed):** Define a pure-data, versioned JSON schema (`BattleCheckpointEnvelope`, `schemaVersion: 1`) with an explicit deterministic codec (`serializeBattleCheckpoint` / `deserializeBattleCheckpoint`) that losslessly encodes `bigint` IDs (as tagged or validated numeric strings), `Map` entries (in deterministic key order), `Set` values (including `ActiveProjectile.hitEnemyIds`), `SimulationClock` (`tick`, `paused`), `battleGeneration`, `matchKills`, `EventQueueSnapshot` (`nextSequence`, `events`), `ResourceRng` (`seed`), and all sub-states (`occupancy`, `entities`, `resources`, `combat`, `fusion`, `waves`, `abilities`). Stamp every envelope with a deterministic 32-bit FNV-1a checksum over the canonical payload string.
- **Option B:** Use raw `JSON.stringify` without `bigint`/`Map`/`Set` codecs or omit `EventQueue` / `abilities` active projectiles and cadences from saved snapshots.

### `D-77` — Semantic Snapshot Validation & Fail-Closed Rejection (`G03`, `TC39`, `FR11`) (**CONFIRMED: Option A**)
- **Option A (Confirmed):** Before accepting or restoring any checkpoint, validate:
  1. Envelope structure, `schemaVersion === 1` (with pure migration hook `migrateCheckpoint` for future versions), and exact checksum match.
  2. Referential and semantic consistency against the active session definitions:
     - `occupancy` length is `45` (`5 × 9`) and matches living Defender `entities` 1-to-1 (`cellIndex(entity.cell)`).
     - Every runtime entity `id < nextEntityId`, has a valid definition in `CombatSession`, and has a corresponding `CombatEntityState` with `0 < hp <= maxHp`.
     - `resources.crystals` is in `0..5`, `energy >= 0`, `pending >= 0`.
     - Active `statuses`, `shields`, `redirects`, `cadences`, and `projectiles` reference valid ability IDs and finite nonnegative timers/amounts (`PAUSED` cadences must belong to a living disabled Defender per `FR11`).
     - `EventQueue` events are sorted by `(scheduledTick, insertionSequence)` and stay within `4096` capacity and `<= 32` causal depth.
  - Reject any corrupted or semantically inconsistent snapshot with a typed `SnapshotValidationError` — never silently repair or load partial state.
- **Option B:** Trust parsed JSON without checksum or occupancy/entity cross-validation.

### `D-78` — Checkpoint Timing & Atomic Boundary Rules (`G02`, `FR10`) (**CONFIRMED: Option A**)
- **Option A (Confirmed):** When checkpointing is enabled on `BattleRuntime`, capture an immutable checkpoint **only after an atomic transaction or tick commit completes** (`FR10`, never while `TransactionEngine.executing` is true):
  1. At **`tick === 0`** immediately after initial session setup.
  2. Every **`60` ticks** (`tick > 0 && tick % 60 === 0`) after the tick's phase and scheduled events commit.
  3. Immediately after a committed meaningful gameplay transition: successful `summon`, `fuse`, `activate-ability`, `wave-start`, `wave-reward` (Wave completion), or `setPaused(true)`.
  - Duplicate captures at the exact same `(tick, nextSequence, paused)` state are coalesced so the 3-slot ring buffer is not flooded by redundant identical snapshots.
- **Option B:** Capture checkpoints on arbitrary wall-clock `setInterval` timers or mid-transaction.

### `D-79` — RAM Ring Buffer (Max 3 Checkpoints) & Dual-Slot Storage Adapter (`G04`, `save-systems`) (**CONFIRMED: Option A**)
- **Option A (Confirmed):**
  - Keep an in-memory ring buffer of at most **3 Accepted Checkpoints** (`maxCheckpoints = 3`, newest first) inside `CheckpointManager` (`G04`). (Record in docs/code that the `16 MiB` soft / `32 MiB` hard figures in `G04` are unbenchmarked design thresholds, not asserted runtime benchmarks.)
  - Provide a synchronous pluggable `PersistenceStorageAdapter` (`getItem(key)`, `setItem(key, value)`, `removeItem(key)`) with `InMemoryStorageAdapter` and `BrowserLocalStorageAdapter` (wrapping `window.localStorage` safely inside `try/catch`).
  - Persist active battle checkpoints to storage using atomic **primary + `.bak` backup rotation** (`mfd.active_battle.v1` and `mfd.active_battle.v1.bak`): before writing a new valid checkpoint to primary, copy the existing valid primary payload to `.bak`. On browser reload/resume, read primary first and automatically fall back to `.bak` if primary is missing or fails checksum/validation.
- **Option B:** Overwrite a single `localStorage` key in place without backup fallback or RAM ring buffer.

### `D-80` — Battle Recovery, Battle Generation & `RECOVERING` Guard (`G05`, `FR4`, `FR23`, `FR24`) (**CONFIRMED: Option A**)
- **Option A (Confirmed):**
  - Implement `BattleRuntime.recover()` (and optional auto-recover on transaction failure): iterates newest-first through the up to 3 RAM Accepted Checkpoints (falling back to the storage adapter's primary/`.bak` if RAM is empty).
  - Sets runtime state to `RECOVERING` during restoration: while `RECOVERING`, `enqueue()` immediately rejects any new gameplay command with `{ status: 'REJECTED', reason: 'recovering' }` without spending Crystals or mutating state (`FR24`).
  - Restores the first valid checkpoint atomically into `TransactionEngine` and `SimulationClock`, **increments `battleGeneration` by `+1`** (`FR4`, independent of `ActiveStatusInstance.version`), preserves eligible `paused` state (`G05`), and discards any uncommitted commands from the failed step (`FR23` — never auto-replays uncommitted commands).
  - Events tagged with an older `battleGeneration` are rejected if encountered. Once restoration succeeds, exits `RECOVERING` back to `PLAYING` (or `PAUSED` if the checkpoint was paused).
- **Option B:** Reset the entire battle back to tick 0 on error or replay uncommitted inputs after recovery.

### `D-81` — Terminal Battle Closure & Active-Save Cleanup (`FR17`, `FR18`) (**CONFIRMED: Option A**)
- **Option A (Confirmed):** When a battle resolves to a terminal state (`victory` or `defeat`):
  - Finalize the current tick and close gameplay (`FR17`).
  - Remove the active-battle save (`mfd.active_battle.v1` and `.bak`) from the storage adapter (`FR18`) so reloading the browser after Victory/Defeat does not resume an already-finished battle.
  - Trigger persistent progression recording if and only if the terminal result is `victory` (`D-82`).
- **Option B:** Leave terminal battles in the active-save slot so reloading re-opens the finished battle.

### `D-82` — Separate Persistent Progression Profile & Victory-Only Accounting (`ROADMAP.md` §2, `GAMEPLAY_MECHANICS.md` §18) (**CONFIRMED: Option A**)
- **Option A (Confirmed):** Store persistent progression in a dedicated, versioned profile (`ProgressionProfile`, `schemaVersion: 1`, keys `mfd.progression.v1` + `mfd.progression.v1.bak`) completely independent of active-battle saves:
  - Track `totalVictories: number`, `totalVictoryKills: number`, `unlockedDefenderIds: string[]`, `unlockedRecipeIds: string[]`, and `recordedBattleIds: string[]` (bounded idempotency log so the same completed `battleId` can never grant Victory progression twice).
  - Track `matchKills: number` deterministically inside `BattleState` (incremented whenever `resolveCombatDeaths` removes a dead Enemy).
  - On battle termination:
    - If `result === 'victory'` and `battleId` is not yet in `recordedBattleIds`: add `+1` to `totalVictories`, add `+matchKills` to `totalVictoryKills`, record `battleId`, evaluate all unlock rules (`D-83`), and persist atomically (primary + `.bak`).
    - If `result === 'defeat'`: **do not** increment `totalVictories` or `totalVictoryKills`, and **do not** unlock anything.
- **Option B:** Count Enemy kills from Defeat matches toward Wolf's 50-kill threshold or couple progression storage inside the active-battle save file.

### `D-83` — Confirmed Unlock Matrix & Cascading Recipe Unlocks (`03/11/2026` Product Decision) (**CONFIRMED: Option A**)
- **Option A (Confirmed):** Encode the exact confirmed MVP unlock matrix in `packages/game/src/persistence/progression-store.ts`:
  - **Initial / Starter Unlocks (always present in a new profile):**
    - Base Defenders: `iron_golem`, `skeleton`.
    - Fusion Recipes: `fusion_skeleton_sniper` (output `skeleton_sniper`), `fusion_steel_guardian` (output `steel_guardian`).
  - **Milestone Base Defender Unlocks (evaluated on Victory):**
    - `snow_golem`: unlocked when `totalVictories >= 1` (*First Grassland Victory*).
    - `wolf`: unlocked when `totalVictoryKills >= 50` (*50 cumulative Enemy kills across Victory matches*).
    - `blaze`: unlocked when `totalVictories >= 5` (*5 cumulative Grassland Victories*).
  - **Cascading Fusion Recipe Unlocks (evaluated whenever Base Defender unlocks update):**
    - `fusion_ice_golem` (`ice_golem`): unlocked when `snow_golem` is unlocked.
    - `fusion_frost_guardian` (`frost_guardian`): unlocked when `iron_golem` AND `snow_golem` are unlocked.
    - `fusion_alpha_wolf` (`alpha_wolf`): unlocked when `wolf` is unlocked.
    - `fusion_inferno_archer` (`inferno_archer`): unlocked when `blaze` AND `skeleton` are unlocked.
    - `fusion_flame_fang` (`flame_fang`): unlocked when `blaze` AND `wolf` are unlocked.
  - Unlocks are monotonic/permanent (never removed once granted) and return a `newlyUnlocked: { defenders: string[]; recipes: string[] }` diff on Victory for UI reward notifications.
- **Option B:** Require separate manual currency purchases to unlock recipes after their ingredient Defenders unlock.

### `D-84` — Achievements, Defender Collection & Session Filtering Helpers (**CONFIRMED: Option A**)
- **Option A (Confirmed):** Export pure headless helpers from `packages/game/src/persistence/progression-store.ts`:
  - `getAchievementsView(profile)`: returns the 3 confirmed milestone achievements (`first_grassland_victory` → `snow_golem`, `victory_hunter_50_kills` → `wolf`, `grassland_veteran_5_victories` → `blaze`) with `current`, `target`, `completed`, and `rewardDefenderId`.
  - `getDefenderCollectionView(profile)`: returns all 5 Base Defenders and 7 Fusion Defenders/Recipes with `unlocked: boolean` and unlock requirement description.
  - `applyProgressionUnlocks(profile, resourceInput, fusionInput)`: returns cloned `ResourceSessionInput` and `FusionSessionInput` with each Defender's and Recipe's `unlocked` flag synchronized to `profile` so `BattleRuntime` automatically enforces locked vs unlocked Defenders/Recipes during gameplay!
- **Option B:** Defer collection/achievement view models and session unlock synchronization entirely to UI components.

### `D-85` — `BattleRuntime` Backward Compatibility & Optional Persistence Wiring (**CONFIRMED: Option A**)
- **Option A (Confirmed):** Keep `BattleRuntime`'s existing 6-parameter constructor (`config, resourceInput?, combatInput?, fusionInput?, waveInput?, abilityInput?`) 100% backward compatible, and add an optional 7th parameter `persistenceOptions?: BattlePersistenceOptions` (or static `BattleRuntime.fromCheckpoint(...)` factory + `runtime.createCheckpoint()`, `runtime.restoreCheckpoint()`, `runtime.recover()`, `runtime.getCheckpoints()`):
- **Option A (Recommended):** Keep `BattleRuntime`'s existing 6-parameter constructor (`config, resourceInput?, combatInput?, fusionInput?, waveInput?, abilityInput?`) 100% backward compatible, and add an optional 7th parameter `persistenceOptions?: BattlePersistenceOptions` (or static `BattleRuntime.fromCheckpoint(...)` factory + `runtime.createCheckpoint()`, `runtime.restoreCheckpoint()`, `runtime.recover()`, `runtime.getCheckpoints()`):
  - When `persistenceOptions` is omitted, all 153 existing `@mfd/game` tests run with zero changes and `snapshot()` shape remains 100% backward compatible.
  - Also wire Save/Resume & Progression Controls into the `/playtest` sandbox (`PlaytestController` / `PlaytestHost`) so the Owner can test saving, reloading the browser page mid-wave, resuming seamlessly, and inspecting persistent Victory unlocks directly!
- **Option B:** Require a storage adapter in every `BattleRuntime` constructor call.

---

## 3. Planned Module Architecture (`packages/game/src/persistence/`)

1. **`packages/game/src/persistence/storage-adapter.ts` (`T-11.1`)**
   - Defines `PersistenceStorageAdapter`, `InMemoryStorageAdapter`, `BrowserLocalStorageAdapter`, and atomic `writeWithBackup(storage, key, payload, validator)` / `readWithBackupFallback(storage, key, validator)` helpers.
2. **`packages/game/src/persistence/snapshot-codec.ts` (`T-11.2`)**
   - Defines `SAVE_SCHEMA_VERSION = 1`, `BattleCheckpointEnvelope`, deterministic FNV-1a checksum (`computeCanonicalChecksum`), `serializeBattleCheckpoint()`, `deserializeBattleCheckpoint()`, `migrateBattleCheckpoint()`, and `validateBattleCheckpointSemantics()` (`G03`, `TC37–TC39`, `FR11–FR13`).
3. **`packages/game/src/persistence/checkpoint-manager.ts` (`T-11.3`)**
   - Implements the 3-slot RAM ring buffer (`G04`), `G02` trigger predicate (`tick === 0`, `tick % 60 === 0`, meaningful gameplay commits), active-battle storage sync, and newest-first staged recovery (`G05`).
4. **`packages/game/src/persistence/progression-store.ts` (`T-11.4`)**
   - Implements `ProgressionProfile` (`schemaVersion: 1`), `ProgressionStore` (atomic primary + `.bak` persistence), starter unlocks, Victory-only kill/victory accounting, idempotent `battleId` deduplication, cascading recipe unlocks, `getAchievementsView()`, `getDefenderCollectionView()`, and `applyProgressionUnlocks()`.
5. **`packages/game/src/systems/battle-runtime.ts` & `packages/game/src/core/battle-state.ts` (`T-11.5`)**
   - Tracks `matchKills` and `battleGeneration` on `BattleState`.
   - Integrates optional `BattlePersistenceOptions`, `createCheckpoint()`, `restoreCheckpoint()`, `recover()`, `RECOVERING` input guard (`FR24`), automatic checkpoint capture at atomic commit boundaries (`G02`, `FR10`), and terminal active-save cleanup + Victory progression commit (`FR17–FR18`).
6. **`packages/game/tests/battle-persistence.test.ts` (`T-11.6`)**
   - Comprehensive Vitest unit & integration suite covering `AC-01` through `AC-20`.

---

## 4. Implementation Slices

| Slice | Deliverable | Owner / Agent Role |
| --- | --- | --- |
| `T-11.1` | `storage-adapter.ts`: `InMemoryStorageAdapter`, `BrowserLocalStorageAdapter`, atomic primary + `.bak` write/read-fallback helpers | `persistence-core-implementer` |
| `T-11.2` | `snapshot-codec.ts`: Lossless JSON codec (`bigint`, `Map`, `Set`), deterministic checksum, version migration hook, and fail-closed semantic validator (`G03`, `FR11–FR13`) | `persistence-core-implementer` |
| `T-11.3` | `checkpoint-manager.ts`: `G02` checkpoint triggers (tick 0, every 60 ticks, meaningful changes), `G04` 3-checkpoint RAM ring buffer, `G05` newest-first recovery | `persistence-core-implementer` |
| `T-11.4` | `progression-store.ts`: Persistent `ProgressionProfile`, Victory-only kill & win tracking, starter & milestone unlocks (`snow_golem`, `wolf`, `blaze` + 7 recipes), Achievements & Collection views | `persistence-core-implementer` |
| `T-11.5` | `battle-state.ts` & `battle-runtime.ts` integration (`matchKills`, `battleGeneration`, `RECOVERING` guard, `createCheckpoint`, `restoreCheckpoint`, `recover`, `BattleRuntime.fromCheckpoint`, terminal cleanup & progression hook) | `persistence-runtime-integrator` |
| `T-11.6` | `packages/game/tests/battle-persistence.test.ts` covering `AC-01`–`AC-20` + full workspace verification | `persistence-test-author` & `T-11 Gate Auditor` |

---

## 5. Confirmed Acceptance Gates (`AC-01` – `AC-20`)

| Gate | Requirement | Verification Target |
| --- | --- | --- |
| `AC-01` | Versioned checkpoint serialization & lossless round-trip of `BattleState` (`bigint`, `Map`, `Set`, `occupancy`, `entities`, `resources`, `combat`, `fusion`, `waves`, `abilities`, `EventQueue`, `rng`, `tick`, `paused`, `battleGeneration`, `matchKills`) | `battle-persistence.test.ts` |
| `AC-02` | Deterministic canonical checksum & fail-closed semantic validation (`G03`, `TC39`): rejects wrong checksum, future schema version, occupancy/entity mismatch, invalid HP/crystals, or invalid queue ordering without mutating live state | `battle-persistence.test.ts` |
| `AC-03` | `G02` Checkpoint timing & `FR10` atomic commit boundary: captures immutable checkpoints at `tick 0`, every `60` ticks, and after meaningful gameplay commits (`summon`, `fuse`, `activate-ability`, `wave-start`, `wave-reward`, `setPaused(true)`), never mid-transaction | `battle-persistence.test.ts` |
| `AC-04` | `G04` RAM ring buffer cap: retains at most `3` Accepted Checkpoints in RAM ordered newest-first, evicting the oldest when a 4th checkpoint is accepted | `battle-persistence.test.ts` |
| `AC-05` | Atomic primary + `.bak` storage rotation (`save-systems`): when primary save is corrupted/truncated, `load`/`resume` automatically falls back to the last valid `.bak` checkpoint | `battle-persistence.test.ts` |
| `AC-06` | Seamless Resume across reload (`TC38`, `TC40`, `FR11–FR13`): a battle saved mid-Wave with active enemies, collectibles, cooldowns, statuses (`Burn`, `Slow`, `Buff`), shields (`creationOrder`), multihit cadences (including `PAUSED` under Stun), and in-flight projectiles (`hitEnemyIds`) produces identical future snapshots after `BattleRuntime.fromCheckpoint()` as an uninterrupted battle | `battle-persistence.test.ts` |
| `AC-07` | `G05` Newest-first Recovery & fallback: if the newest checkpoint in the 3-slot buffer is corrupted, `recover()` automatically skips it and restores the next newest valid checkpoint atomically | `battle-persistence.test.ts` |
| `AC-08` | `FR4`, `FR23`, `FR24` Recovery lifecycle: recovery increments `battleGeneration` (keeping status `version` independent), cancels uncommitted commands from the failed step without replaying them (`FR23`), and rejects inputs during `RECOVERING` without spending Crystals (`FR24`) | `battle-persistence.test.ts` |
| `AC-09` | `FR17–FR18` Terminal battle closure: reaching `victory` or `defeat` clears the active-battle save slot so reloading does not resume a finished match | `battle-persistence.test.ts` |
| `AC-10` | Starter persistent progression profile: a fresh `ProgressionStore` starts with `totalVictories: 0`, `totalVictoryKills: 0`, unlocked Base Defenders `['iron_golem', 'skeleton']`, and unlocked Fusion Recipes `['fusion_skeleton_sniper', 'fusion_steel_guardian']` | `battle-persistence.test.ts` |
| `AC-11` | First Grassland Victory unlock: resolving `victory` #1 increments `totalVictories` to `1` and unlocks `snow_golem` plus cascading recipes `fusion_ice_golem` (`ice_golem`) and `fusion_frost_guardian` (`frost_guardian`) | `battle-persistence.test.ts` |
| `AC-12` | Cumulative 50 Victory Kills unlock: accumulating `>= 50` Enemy kills across one or multiple `victory` matches unlocks `wolf` plus cascading recipe `fusion_alpha_wolf` (`alpha_wolf`) | `battle-persistence.test.ts` |
| `AC-13` | 5 Grassland Victories unlock: reaching `totalVictories >= 5` unlocks `blaze` plus cascading recipes `fusion_inferno_archer` (`inferno_archer`, since `skeleton` is unlocked) and `fusion_flame_fang` (`flame_fang`, when `wolf` is also unlocked) | `battle-persistence.test.ts` |
| `AC-14` | Defeat & replay rules: a `defeat` match (even with 100 kills) adds `0` to `totalVictories` and `0` to `totalVictoryKills` and unlocks nothing; replay victories count; duplicate commit of the same `battleId` is idempotently ignored | `battle-persistence.test.ts` |
| `AC-15` | Permanent unlocks & session synchronization: once unlocked, Defenders/Recipes never re-lock and never emit duplicate unlock rewards; `applyProgressionUnlocks()` accurately gates locked vs unlocked Defenders (`summon`) and Recipes (`fuse`) in `BattleRuntime` | `battle-persistence.test.ts` |
| `AC-16` | Achievements & Defender Collection read models: `getAchievementsView()` and `getDefenderCollectionView()` report accurate progress, completion flags, and locked/unlocked status for all 12 Defenders and 7 Recipes | `battle-persistence.test.ts` |
| `AC-17` | Progression profile crash-safety & migration: corrupted primary progression save falls back to `.bak`; future schema version is rejected fail-closed; migration hook upgrades older versions cleanly | `battle-persistence.test.ts` |
| `AC-18` | Backward compatibility & boundary preservation: omitting `persistenceOptions` leaves all 153 existing `@mfd/game` tests passing unchanged; `@mfd/game-data` remains untouched | `git diff` & Vitest |
| `AC-19` | Full workspace verification: `pnpm --filter @mfd/game test`, `pnpm --filter @mfd/game-data test`, `pnpm typecheck`, and `pnpm build` all pass | Local CLI verification |
| `AC-20` | CI / clean workspace build & test parity | Local & GitHub Actions CI |

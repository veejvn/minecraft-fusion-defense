# T-09 — Grassland Five Waves, Victory & Defeat: Implementation Plan v1.0

**Project:** Minecraft Fusion Defense  
**Status:** **IMPLEMENTED LOCALLY — 19/20 GATES LOCAL PASS, AC-20 REMOTE CI PENDING COMMIT & PUSH (D-49–D-58 = A; Wave 1–5 Production Data Remains TBD)**  
**Scope:** Headless `packages/game` 5-Wave session validation, Spawn Group scheduling and lane selection (`fixed`, `sequential`, `random`), Wave progression and completion, T-06 Wave Reward triggering, Wave 5 Victory detection, G07 simultaneous Victory/Defeat arbitration, and Pause/Terminal Wave timer guards; see [T-09 Final Acceptance Report](../reports/T-09-FINAL-ACCEPTANCE.md).  
**Dependency:** [T-05 acceptance](../reports/T-05-FINAL-ACCEPTANCE.md), [T-06 acceptance](../reports/T-06-FINAL-ACCEPTANCE.md), [T-07 acceptance](../reports/T-07-FINAL-ACCEPTANCE.md), [T-08 acceptance](../reports/T-08-FINAL-ACCEPTANCE.md), T-04 simulation contracts.  
**Authority:** [Documentation Policy](../DOCUMENTATION_POLICY.md); [Gameplay Mechanics](../product/GAMEPLAY_MECHANICS.md) §9–§10, §12, §14.5, §15; [Level Design](../game-design/LEVEL_DESIGN.md) §5–§13; [Game Balancing](../game-design/GAME_BALANCING.md) §8, §10, §15-F; [PGD-02 G07 Terminal Priority Owner Decision (2026-11-20)](../decisions/PGD-02/owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md).

## 1. Objective and scope

Extend the accepted T-05/T-06/T-07/T-08 headless runtime with deterministic **5-Wave Level orchestration and Victory/Defeat completion**:
- Validate an immutable Grassland 5-Wave configuration (`waveCount === waves.length === 5`) with fail-closed checks on all delays, intervals, enemy IDs, spawn counts, allowed lanes, and rewards (rejecting any `null` / `TBD` placeholder at runtime).
- Schedule Wave start delays, Spawn Group offsets/intervals, and inter-wave transitions on the unified T-04 `EventQueue` using tick-based Game Time deadlines.
- Spawn Enemies deterministically through T-07's combat/entity registration (`fixed`, `sequential`, or seeded-Mulberry32 `random` lane selection).
- Detect Wave completion only when **all Spawn Groups in the active Wave have finished spawning AND zero living Enemies remain on the battlefield AND no terminal result is committed**.
- Trigger T-06 `wave-reward` idempotently once per completed Wave, transition to the next Wave after `delayBeforeNextWaveSeconds`, and enqueue `{ type: 'terminal', result: 'victory' }` when Wave 5 completes.
- Preserve **PGD-02.G07.TERMINAL-PRIORITY = B** (first valid resolved terminal event in `scheduledTick + insertionSequence` order wins, cancelling Pending Wave Rewards and stopping all subsequent spawns, combat, and timers).

**Out of scope:** Production Wave 1–5 composition/balance values and Wave reward numbers (remain `TBD`), Special Abilities (T-10), Save & Resume and persistent Victory progression counters across battles (T-11), Phaser/React Wave HUD, banners, and animations (T-12), new dependencies, and public host APIs.

## 2. Confirmed gameplay invariants (must be preserved)

- **Grassland 5 Waves:** Single-player Grassland Campaign has exactly **5 Waves** on the **5 Rows × 9 Columns** battlefield (Level Design §2, §11.1).
- **Spawn Group execution:** Each Enemy in a Spawn Group is spawned **exactly once** from the right side (`spawnX`) into a valid allowed lane `0..4`. Pause freezes Wave timers; Resume never duplicates or skips a spawn (Level Design §5.2, §12).
- **Wave completion rule:** A Wave completes if and only if: (1) all Spawn Groups of that Wave have finished spawning, (2) no active/living Enemy remains on the battlefield, and (3) Defeat has not occurred. Killing all currently active Enemies before a Spawn Group finishes spawning must **not** complete the Wave early; finishing all spawns while Enemies remain alive must **not** grant the Wave Reward early (GM §9.5, Level Design §7, §12).
- **Wave Reward delivery:** On valid Wave completion, grant the Wave's Power Crystal reward **exactly once** via T-06 `wave-reward` (filling storage up to cap 5 and sending overflow to uncapped `Pending Wave Reward`). If the match terminates, clear `Pending Wave Reward` and cancel ungranted rewards (Level Design §8.2–8.3, §12).
- **Victory & Defeat (G07):**
  - **Victory:** All 5 Waves are completed and no active Enemy remains on the battlefield.
  - **Defeat:** Any Enemy crosses the Base Boundary (`x < 0`); no Base HP/Lives.
  - **Simultaneous terminal events (Confirmed 2026-11-20 G07 Owner Decision):** Events resolve by `scheduledTick`, then `insertionSequence`. The **first valid resolved terminal event** decides the match; there is no blanket Defeat or Victory priority, and a later terminal event cannot overwrite a committed result.

## 3. Owner-approved technical decisions (2026-11-21)

All **10 decisions D-49 through D-58** are approved as **Option A**:

| ID | Topic | Approved choice |
| --- | --- | --- |
| **D-49** | Wave session contract & cross-validation | **A:** Inject immutable `WaveSessionInput` (`levelId`, `waveCount: 5`, `waves` array of length 5 with `id`, `initialDelaySeconds`, `delayBeforeNextWaveSeconds`, `spawnGroups`) cross-validated against `CombatSession` (every `enemyId` exists in `combat.enemiesById`) and `ResourceSession` (every `wave.id` exists in `resources.waves` when resources are enabled). Reject `null`/missing fields fail-closed. |
| **D-50** | Wave & Spawn Group deadline math | **A:** Convert `initialDelaySeconds`, `delayBeforeNextWaveSeconds`, `startOffsetSeconds`, and `intervalSeconds` using T-06 D-08 absolute anchor deadlines (`originTick + Math.ceil(seconds * rate)`), allowing `0` seconds for immediate/burst scheduling at `originTick` and preventing cumulative drift across repeated spawns (`k * intervalSeconds`). |
| **D-51** | Spawn Group lane selection modes | **A:** Each Spawn Group declares `allowedLanes: readonly number[]` (non-empty, unique valid lanes `0..4`) and `laneMode: 'fixed' \| 'sequential' \| 'random'`: `'fixed'` requires `allowedLanes.length === 1`; `'sequential'` picks `allowedLanes[spawnIndex % allowedLanes.length]`; `'random'` draws uniformly from `allowedLanes` via transactional Mulberry32 (`uniformIndex(rng, allowedLanes.length)`) at spawn execution time (requires `ResourceRng` / seed when `'random'` is used). |
| **D-52** | Wave timer & spawn queue events | **A:** Schedule internal Wave events (`wave-start`, `wave-spawn`) on the single T-04 `EventQueue` (ordered by `scheduledTick + insertionSequence`, `causalDepth: 0`), spawning Enemies at `combatSession.spawnX` and registering their `CombatEntityState` atomically; track processed spawn identities `(waveIndex, groupIndex, spawnIndex)` so no Enemy ever spawns twice. |
| **D-53** | Wave completion detection | **A:** A Wave `w` completes when: `w` is active (`status === 'spawning' \| 'active'`), `spawnedCount === totalPlannedCount` for Wave `w`, `livingEnemyCount === 0` in `battle.entities`, and battle is not terminal. Evaluate completion deterministically at the end of `runCombatPhase` (after Phase C deaths) and after queue events (`wave-spawn` / `remove`) in `BattleRuntime`. |
| **D-54** | Wave completion actions & Victory enqueue order | **A:** When Wave `w` completes at `tick`, mark Wave `w` completed once, enqueue `{ type: 'wave-reward', sourceId: wave.id }` at `scheduledTick: tick` (if `battle.resources` is active), and: if `w < 4`, schedule `wave-start` for Wave `w + 1` at `tick + Math.ceil(delayBeforeNextWaveSeconds * rate)`; if `w === 4` (Wave 5), enqueue `{ type: 'terminal', result: 'victory' }` at `scheduledTick: tick`. |
| **D-55** | Simultaneous Victory & Defeat (G07) | **A:** Both breach `{ type: 'terminal', result: 'defeat' }` and Wave-5 `{ type: 'terminal', result: 'victory' }` resolve through the single T-04 `EventQueue` by `scheduledTick + insertionSequence`. First valid resolved terminal event commits `terminal`, clears `Pending Wave Reward`, and causes all subsequent queued terminal, spawn, reward, and command events to no-op. |
| **D-56** | Pause & Terminal lifecycle for Waves | **A:** `setPaused(true)` freezes `SimulationClock` so no `wave-start` or `wave-spawn` executes during Pause, and Resume continues from the exact tick without shifting deadlines; committed `terminal` stops all future `wave-start`, `wave-spawn`, and `wave-reward` executions immediately. |
| **D-57** | RNG availability for `'random'` lane mode | **A:** When `resourceInput` is provided, share its transactional Mulberry32 `ResourceRng`; if `waveInput` is used without `resourceInput`, accept an optional `seed?: number` (`uint32`, default validated if `'random'` laneMode is present, fail closed if `'random'` is used without any seed). |
| **D-58** | Session wiring on `BattleRuntime` | **A:** Add optional 5th constructor parameter `waveInput?: WaveSessionInput` on `BattleRuntime` (requires `combatInput`; cross-validates against `resourceInput` and `combatInput`; omits `snapshot().waves` when `waveInput` is undefined so all 110 existing `@mfd/game` tests pass unchanged). |

## 4. Implementation slices (approved scope; coding awaits separate authorization)

| Slice | Work | Exit evidence |
| --- | --- | --- |
| **T-09.1 — Wave session validation** | `WaveSessionInput`, 5-Wave schema, `allowedLanes`/`laneMode`, fail-closed cross-validation with `CombatSession` & `ResourceSession`, deep freeze | Validation & fail-closed unit tests |
| **T-09.2 — Wave state & spawn scheduling** | `WaveState`, tick-0 Wave 1 scheduling, `initialDelaySeconds`, group `startOffsetSeconds` & `intervalSeconds`, `fixed`/`sequential`/`random` lane selection | Spawn timing, fractional tick rate, and seeded lane selection tests |
| **T-09.3 — Wave completion, reward & transition** | Completion check (`allSpawned && livingEnemies === 0`), idempotent `wave-reward` enqueue, `delayBeforeNextWaveSeconds` transition across Waves 1→5 | Early-kill guard, surviving-enemy guard, reward overflow, and multi-wave transition tests |
| **T-09.4 — Victory, Defeat & G07 arbitration** | Wave 5 completion → `terminal: victory`, simultaneous Victory/Defeat queue resolution, Pending Wave Reward cancellation, post-terminal spawn cancellation | Full 5-wave Victory playthrough test, Breach Defeat test, and G07 same-tick tie-break tests |
| **T-09.5 — Pause, Rollback & Regression** | Pause/Resume during active spawns & wave delays, `QUEUE_OVERFLOW`/contract rollback, deterministic replay, T-04–T-08 regressions | Pause/Resume, rollback, replay, and full 110+ test regression suite |

## 5. Acceptance gates — 20 gates (19/20 local PASS, AC-20 remote CI pending commit & push — see [Acceptance Report](../reports/T-09-FINAL-ACCEPTANCE.md))

| Gate | Requirement |
| --- | --- |
| **AC-01** | Wave session validates 5 Waves (`waveCount === waves.length === 5`), unique Wave IDs, non-empty Spawn Groups, positive integer `count`, non-negative delays/intervals, valid `allowedLanes` (`0..4`), `laneMode`, and cross-session Enemy/Wave-reward links fail-closed (rejecting `null`/missing fields) |
| **AC-02** | Wave 1 schedules at battle initialization (`t = 0`) and spawns its first Enemy only after `initialDelaySeconds + startOffsetSeconds` of Game Time |
| **AC-03** | Spawn Groups with multiple Enemies (`count > 1`) spawn at exact `startOffsetSeconds + k * intervalSeconds` deadlines without cumulative rounding drift at fractional tick rates (`intervalSeconds === 0` spawns burst in the same tick) |
| **AC-04** | Each scheduled Enemy spawns **exactly once** at `combatSession.spawnX` with full combat state (`hp = maxHp`) |
| **AC-05** | `laneMode: 'fixed'`, `'sequential'`, and `'random'` (transactional Mulberry32) assign valid lanes from `allowedLanes` deterministically |
| **AC-06** | Killing all currently active Enemies **before** a Wave's Spawn Groups finish spawning does **not** complete the Wave early |
| **AC-07** | Finishing all Spawn Groups of a Wave while at least one Enemy remains alive does **not** complete the Wave or grant its reward until the last Enemy dies |
| **AC-08** | When the final Enemy of Wave `w` (`1..4`) dies after all groups have spawned, Wave `w` marks completed, enqueues T-06 `wave-reward` once, and schedules Wave `w + 1` after `delayBeforeNextWaveSeconds` |
| **AC-09** | Wave Reward fills Power Crystal storage up to cap 5 and moves overflow to `Pending Wave Reward`, deduplicated by `wave.id` |
| **AC-10** | When Wave 5 completes (all 5 Waves spawned and 0 living Enemies remain), `{ type: 'terminal', result: 'victory' }` is enqueued and resolves Victory |
| **AC-11** | If an Enemy breaches Base Boundary (`x < 0`) during any Wave `1..5`, `{ type: 'terminal', result: 'defeat' }` resolves Defeat immediately |
| **AC-12** | Simultaneous Victory and Defeat events in the same tick resolve strictly by `scheduledTick + insertionSequence` (G07 first valid resolved terminal event wins; later terminal events cannot overwrite it) |
| **AC-13** | Resolved Victory or Defeat clears `Pending Wave Reward` and cancels all remaining scheduled Wave spawns, transitions, and ungranted rewards |
| **AC-14** | Pause freezes Wave initial delays, Spawn Group intervals, and inter-wave transition delays; Resume continues without duplicate or skipped spawns |
| **AC-15** | Defenders (Base and T-08 Fusion Defenders) engage, damage, and kill Wave-spawned Enemies and trigger T-06 Enemy-death rewards normally across all 5 Waves |
| **AC-16** | Fusion remains optional for Grassland Victory (a full 5-Wave battle can reach Victory using Base Defenders alone, or with Fusion Defenders) |
| **AC-17** | Failed transactions (e.g. `QUEUE_OVERFLOW` during Wave spawn/completion scheduling) roll back Wave state, entities, RNG, resources, and staged events atomically |
| **AC-18** | Identical validated config, seed, and player commands replay an entire 5-Wave battle to identical snapshots |
| **AC-19** | Omitting `waveInput` leaves `BattleRuntime.snapshot()` shape unchanged, and all existing T-04, T-05, T-06, T-07, and T-08 tests pass |
| **AC-20** | `@mfd/game` tests, `@mfd/game-data` tests, workspace `typecheck`, and production `build` pass; remote CI PASS only after a real workflow run |

## 6. Production-data blockers (not permission to invent values)

- Wave 1–5 Enemy composition, Enemy counts, allowed rows, `initialDelay`, `startOffset`, `interval`, `delayBeforeNextWave`, and Wave 1–5 Power Crystal reward amounts remain **TBD** (Level Design §6, §11, §14; Game Balancing §8, §10, §15-D/F).
- Enemy and Defender production combat stats remain **TBD**.

Headless engine implementation and full 5-Wave integration tests will use explicitly labeled test-only fixtures once coding is separately authorized.

## 7. Stop conditions

Stop and ask the Owner before: inventing production Wave 1–5 spawn tables or Crystal reward numbers; changing G07 first-resolved-terminal-wins arbitration; requiring Fusion as a Victory condition; adding Base HP / multiple leak tolerance; modifying `@mfd/game-data` schemas without approval; or touching `apps/web` / Phaser scenes.

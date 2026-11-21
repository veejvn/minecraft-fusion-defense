# T-06 — Summon, Placement & Resources: Final Implementation Plan v1.0 + Pre-Implementation Readiness Review v1.1

**Project:** Minecraft Fusion Defense  
**Status:** **OWNER-APPROVED PLAN v1.0 + OWNER-APPROVED READINESS REVIEW v1.1 (2026-11-21) — CONDITIONAL READY; CODING NOT AUTHORIZED; IMPLEMENTATION NOT VERIFIED**  
**Scope:** Headless `packages/game` resource gameplay; documentation-only approval and publication.  
**Dependency:** [T-05 technical acceptance](../reports/T-05-FINAL-ACCEPTANCE.md), T-04 simulation contracts, validated Game Data.  
**Authority:** [Documentation Policy](../DOCUMENTATION_POLICY.md); [Gameplay Mechanics](../product/GAMEPLAY_MECHANICS.md), [Game Balancing](../game-design/GAME_BALANCING.md), [Level Design](../game-design/LEVEL_DESIGN.md), [Game Engine Architecture](../architecture/GAME_ENGINE_ARCHITECTURE.md), [Data Architecture](../architecture/DATA_ARCHITECTURE.md), G02–G07 and the later explicit G07 terminal-priority Owner decision.

## 1. Objective and scope

Extend the accepted T-05 headless Battlefield/Entity Registry with **Summon and placement**, **Energy and Power Crystal resources**, **passive Energy**, **Energy/Crystal collectible lifecycle**, **deterministic random spawn**, **Enemy-death reward hooks**, **Pending Wave Rewards** and minimal lifecycle guards. Reuse the existing T-04 `SimulationClock`, `TransactionEngine`, `EventQueue`, `EventScheduler`; do not create a second transaction engine or mutable backdoor.

**Out of scope:** Combat, Enemy movement, targeting, Fusion, Special Ability activation/cost, Wave orchestration, terminal detection/arbitration, Save & Resume, persistent progression, React/Phaser HUD and gameplay integration, asset production, production balance invention, new dependencies and public host APIs. T-06 supplies internal hooks for later T-07/T-09 integration only.

## 2. Owner-approved technical decisions

| ID | Choice | Binding contract |
| --- | --- | --- |
| D-04 | **A** | Tick-based Game Time; convert durations using the configured tick rate, not render FPS |
| D-05 | **A** | One event queue; resolve by `scheduledTick` then `insertionSequence`; no hidden phase priority |
| D-06 | **A** | Inject a validated Defender availability/unlock snapshot; no persistent progression implementation |
| D-07 | **A** | Transactional seeded PRNG; RNG state stages, commits and rolls back with state/queue |
| D-08 | **B** | Deadline executes on the first tick reaching or exceeding its specified Game Time; never early |
| D-09 | **A** | Summon auto-collects **Crystal Items only**, oldest-first; Energy Items require click |
| D-10 | **A** | Minimal Playing/Paused/terminal resource guard and internal terminal notification; no full Game State machine |
| D-11 | **A** | Energy Item spawn is validated Level Config-driven; no invented production spawn rate/amount |
| D-12 | **A** | Energy Item positions use normalized battlefield coordinates, independent of pixels/Phaser |
| D-13 | **A** | Validated definitions, summon costs and unlock snapshot are immutable for the battle session |
| D-14 | **A** | Enemy/Wave reward delivery uses stable source identity and idempotent processed-source tracking |
| D-15 | **A** | Mulberry32 PRNG, deterministic 32-bit state |
| D-16 | **A** | Uniform selection of eligible Crystal spawn interval ticks and Defender-free cells |
| D-17 | **A** | Seed is injected at BattleRuntime/session creation; no runtime-generated seed |
| D-18 | **A** | Seed is uint32 integer in inclusive range 0–4,294,967,295; zero is valid |
| D-19 | **A** | Uniform integer tick selection in inclusive interval `ceil(30*r)` through `floor(60*r)`; reject config with no eligible tick |
| D-20 | **A** | Event-driven expiration: Item remains until its Expire event actually executes, including when deferred by event budget |
| D-21 | **A** | Draw random cell only when at least one eligible cell exists; skipped attempt still schedules next interval |
| D-22 | **A** | Enqueue future timer event when timer is created/renewed, preserving insertion sequence and transactional rollback |
| D-23 | **A** | Record gameplay rejection as transactional internal gameplay outcome; do not change T-04 `TransactionResult` or fail-stop on normal rejection |
| D-24 | **A** | One validated session contract; test harness supplies explicit fixtures, no separate test/production runtime modes |

All **21 decisions D-04–D-24** are Owner-approved for T-06 design, **not** authorization to implement. Mulberry32, uint32 seed, uniform eligible-tick/cell selection, conditional cell draw, event-driven expiration and timer enqueue policy are now settled. Unapproved production balance, Energy Item position distribution and new public/persistent contracts remain Owner-review gates.

## 3. Confirmed gameplay invariants

- Battlefield: **5 rows × 9 columns**. Defender Summon requires available/unlocked validated Base Defender, sufficient Energy, valid empty cell and other explicitly approved requirements. Successful Summon spends Energy and creates one Defender atomically. Rejected Summon spends nothing and allocates no committed entity ID.
- Energy: initial **0**, direct **+50 at gameplay t=0 once**, then direct **+50 every 3 seconds of Game Time**; no gameplay cap. Energy Items are click-to-collect, last **10 seconds Game Time**, and have random valid interactive positions (not necessarily grid-snapped). Energy Item amount and spawn rate remain **TBD**.
- Power Crystal: initial **0**, storage cap **5**; Crystal Items last **10 seconds Game Time**. Full storage prevents collection without deleting the Item or resetting its deadline. Items can overlap and have no separate gameplay count cap.
- Random Crystal spawn: first attempt after random **30–60 seconds Game Time**; each subsequent attempt after another random **30–60 seconds**. Successful attempt creates **one Item worth 1 Crystal** in a random cell without a Defender; if no cell qualifies, skip the attempt. Multiple Items may share a cell. Crystal interval and eligible-cell choices follow approved uniform distributions D-16/D-19; no additional distribution may be invented.
- Summon on a cell with Crystal Items is allowed; auto-collect **oldest-first** only until cap. Uncollected Items retain their original expiration, including after the Defender is removed. Click on Item has UI priority over Defender (UI implementation is out of scope).
- Enemy death: validated Enemy reward values grant Energy **directly** and generate **one Crystal Item per Crystal reward** at the Enemy death position, even if storage is full. Current confirmed examples: Zombie 50/0; Husk 100/0; Spider 150/1; Pillager 200/1 (Energy/Crystal). T-06 does not implement death detection.
- Wave reward: grant once per stable Wave-completion source; fill Crystal storage up to 5 and move overflow to **Pending Wave Reward**, which has no gameplay cap. Manual claim takes only available storage capacity. Pending is cleared on valid terminal notification. Wave 1–5 reward amounts are **TBD**.
- Pause stops Game Time timers and forbids collect/claim. Terminal notification stops resource generation and clears pending without implementing Victory/Defeat detection. Preserve later explicit G07 terminal decision: first **valid resolved** terminal event wins.

## 4. Technical contracts and event semantics

### 4.1 Session inputs and state ownership

- Validate all required Defender definitions, technical IDs, summon costs, unlock availability, resource/level configuration and seed **before** session start. Freeze the accepted session inputs. No implicit cost=0, cooldown default, production spawn rate or amount.
- Extend the existing structured-clone-compatible `BattleState` with Energy, Crystal, Pending, collectible registry and counter, timer deadlines and processed reward source identities. Preserve existing occupancy, entities and entity counter. Store seeded RNG state in the same `TransactionEngine` transaction snapshot (replace the T-05 `null` RNG parameter without a second engine).
- Use finite safe integers for counts/amounts/ticks; reject unsafe arithmetic rather than overflow. No arbitrary gameplay cap for Energy, Pending or number of Items.
- Keep runtime IDs separate from static definition IDs. Item ID allocation, entity ID allocation, resource changes, queue additions and RNG consumption are rollback-safe.
- Snapshots must be detached; immutable validated session configuration must not become a mutable live-state backdoor.

### 4.2 Clock and deadlines

- Convert a duration `d` seconds at configured tick rate `r` to the **first tick at or after the real Game Time deadline**. A single duration starting at tick `t` has an earliest eligible tick `t + ceil(d*r)`, subject to safe-integer validation.
- For repeating timers, retain an exact logical schedule/phase rather than repeatedly adding rounded tick intervals, to avoid cumulative drift. Define and test boundary semantics at non-integer `d*r`; do not assume 60 ticks/s or derive time from wall-clock/render FPS.
- Direct +50 initial Energy is applied **once** at gameplay t=0; no duplicate grant from repeated initialization or first `advance()`. First periodic grant is after 3 seconds, not at t=0.
- Preserve T-04 catch-up bound and Pause. If a precise scheduling representation conflicts with the existing clock/event contract, **stop for Owner review** before changing it.

### 4.3 Queue, rejection and fail-stop

- Timer, spawn, expiration and internal player commands use **one** T-04 event queue ordered by `scheduledTick`, then `insertionSequence`. Collect and Expire at the same tick follow that order; no hidden priority or extra phase.
- Gameplay rejections (insufficient Energy, occupied cell, expired/collected Item, full Crystal storage, already-processed reward) must be deterministic **non-mutating gameplay outcomes**, not uncaught handler exceptions that trigger T-04 fail-stop. `REJECTED`, if exposed, is a gameplay-level result, **not** a change to T-04 `TransactionResult` enum.
- True invariant/contract violations preserve T-04 atomic rollback and fail-stop semantics. Keep **250 events/tick**, queue capacity **4096**, max causal depth **32**, insertion order and deferred-event behavior.
- Explicitly test commands enqueued near deadlines, event budget exhaustion and simultaneous same-tick operations. Do not silently modify T-04 contracts to simplify T-06.

### 4.4 Collectibles, random and rewards

- Every Item has a stable unique ID, kind, validated amount, spawn source, position, creation order and original expiration deadline. Energy positions use validated normalized battlefield coordinates and a separately validated interactive region; Crystal random spawn uses valid unoccupied **cells**. Enemy-drop Crystal positions follow the source Enemy death position, without inventing UI/pixel conversion.
- Energy Item spawn rate/amount and position distribution are injected via validated Level Config; use clearly labeled **test-only fixtures** until production values are approved. A missing required production config must **fail closed**, not silently create a default or claim the feature is production-ready.
- Random Crystal attempts use seeded transactional PRNG, deterministic eligible-cell selection and a new valid 30–60-second interval each time, including after a skipped attempt. Mulberry32 with injected uint32 seed and approved uniform eligible-tick/cell sampling is binding (D-15–D-19). Sample a cell only if eligible cells exist (D-21). Other random policies, especially Energy Item position distribution, remain unapproved.
- For Crystal auto-collect, sort by stable creation order with deterministic tie-breaker. No Energy Item auto-collect. Full storage leaves Items intact; uncollected Items retain deadline.
- Reward source identities distinguish Enemy-death and Wave-completion sources; a repeated source must not grant again. Reward validation, processed-source recording and all resource/item grants commit atomically. Terminal notification must not implement or override G07 arbitration.

## 5. Implementation slices

| Slice | Work | Exit evidence |
| --- | --- | --- |
| **T-06.1 — Resource Foundation** | Resource state, safe arithmetic, immutable validated session input, snapshots | Initialization, caps, overflow/rejection/rollback tests |
| **T-06.2 — Summon & Placement** | Availability/cost validation; atomic Energy spending and Defender creation | Valid/invalid Summon, occupancy and ID rollback tests |
| **T-06.3 — Game Time & Passive Energy** | Tick deadlines, initial/periodic grants, Pause | t=0, 3-second boundary, non-integer tick-rate and Pause tests |
| **T-06.4 — Collectible Lifecycle** | Energy/Crystal Item registry, click collection, expiry, Summon auto-collect | Duplicate/full-cap/oldest-first/same-tick tests |
| **T-06.5 — Random Spawn & Rewards** | Transactional seeded RNG, random Crystal attempts, config-driven Energy spawn, idempotent reward hooks, pending/terminal guards | Replay, skipped attempts, reward deduplication and claim tests |
| **T-06.6 — Regression & Evidence** | Full T-04/T-05 regression, unit tests, typecheck, build, acceptance report | 26-gate PASS/FAIL/BLOCKED matrix with evidence and actual CI status |

These slices describe intended boundaries, **not** authorization to code or to invent intermediate product rules.

## 6. Acceptance matrix — 26 gates (all PENDING implementation)

| Gate | Acceptance requirement |
| --- | --- |
| **AC-01** | Energy starts at 0 and receives +50 direct credit exactly once at gameplay t=0 |
| **AC-02** | Crystal starts at 0 with cap 5; Energy has no gameplay cap |
| **AC-03** | Summon accepts only validated, available Base Defender with approved valid summon cost; missing cost fails closed |
| **AC-04** | Reject invalid/out-of-range/non-integer/occupied Defender cells |
| **AC-05** | Insufficient Energy rejects Summon without spending Energy, creating Entity or consuming committed ID |
| **AC-06** | Successful Summon atomically spends exact Energy, creates one Defender and updates occupancy |
| **AC-07** | +50 passive Energy every 3 seconds Game Time; no render-FPS dependence or cumulative rounding drift |
| **AC-08** | Pause freezes Game Time/timers and prevents collect/claim; Resume preserves remaining lifetime |
| **AC-09** | Energy/Crystal Items have unique IDs, valid positions and 10-second Game Time lifetime |
| **AC-10** | Valid collection grants correct amount exactly once and removes Item; duplicates grant nothing |
| **AC-11** | Collect/Expire in the same tick obey `scheduledTick + insertionSequence` |
| **AC-12** | Full Crystal storage prevents collection without deleting Item or resetting deadline |
| **AC-13** | Summon on Crystal Item cell is valid; auto-collect Crystal only, oldest-first to cap; never auto-collect Energy |
| **AC-14** | Uncollected Items keep original deadlines; removing Defender does not remove Items |
| **AC-15** | First and subsequent random Crystal attempts each occur after independently selected 30–60 seconds Game Time |
| **AC-16** | Successful random Crystal attempt creates one 1-Crystal Item in an eligible Defender-free cell |
| **AC-17** | No eligible cell causes safe skipped attempt; no invalid/off-grid Item |
| **AC-18** | No separate gameplay Item count cap; multiple Items may share a cell |
| **AC-19** | Enemy-death hook grants validated direct Energy and per-Crystal Items at death position, exactly once per source |
| **AC-20** | Wave Reward grants once per source, fills Crystal storage up to 5 and sends overflow to uncapped Pending |
| **AC-21** | Manual claim transfers only available capacity; cannot double-claim or claim while Paused |
| **AC-22** | Valid terminal notification clears Pending and stops resource generation without resolving terminal priority |
| **AC-23** | Failed transaction rolls back RNG, entity/item counters, resources, Item/Entity state and staged events |
| **AC-24** | Identical validated config, seed, inputs and event order reproduce identical simulation results |
| **AC-25** | Snapshot isolation and T-04/T-05 regressions: ordering, 250 events/tick, 4096 queue capacity, causal depth 32, fail-stop |
| **AC-26** | Game/Game Data tests, workspace typecheck and production build pass; remote CI PASS only after a real successful run |

**Supplementary test requirements:** normal gameplay rejection must not fail-stop; malformed commands/invariants must not partially commit; no unapproved Energy production config; event saturation, late same-tick commands, duplicate reward sources, non-integer tick rates, terminal/pause boundaries, and unchanged Phaser/React Host behavior.

## 7. Known production-data gaps and stop conditions

| Gap | Required treatment |
| --- | --- |
| Energy Item spawn rate, amount and random position distribution | No invented production defaults; validated config and test-only fixtures |
| Summon costs/cooldowns for Base Defenders | Use validated approved definitions; missing values do not become zero |
| Enemy reward values | Use validated Enemy definitions; preserve confirmed current values and per-Crystal Item delivery |
| Wave 1–5 reward amounts | Internal reward hook only until approved Wave Config |
| Crystal PRNG, seed and random interval/cell distribution | **APPROVED D-15–D-19, D-21**; preserve exact deterministic implementation contract |
| Energy Item position distribution | **TBD**; use explicit validated test fixtures only; no invented production rule |
| Runtime config/schema details, overflow/serialization | Preserve T-04/T-05; request Owner approval for new public/persistent contracts |

**Stop and ask Owner before:** changing T-04 simulation contracts; choosing an unapproved PRNG/distribution or production balance; changing terminal arbitration or queue priority; introducing public APIs, dependencies, Phaser/React changes or persistence; altering reward idempotency; resolving conflicting source authority without approval; or expanding beyond T-06.

## 8. Verification and reporting

Before any **separately authorized** coding: inspect local `git status` and all staged/unstaged/untracked changes; read `AGENTS.md`, documentation policy, workflow/AI guidelines, relevant G02–G07 and T-04/T-05 contracts, current game/game-data code and tests. Preserve unrelated work and Project Skills.

When implementation is separately authorized, run and report actual results:

```bash
pnpm --filter @mfd/game test
pnpm --filter @mfd/game-data test
pnpm typecheck
pnpm build
```

Produce an acceptance report with **PASS / FAIL / BLOCKED** and file/test evidence for every AC-01–AC-26. Do not claim CI PASS before a real workflow run on the implementation commit.

## 9. Git and authorization boundary

**Owner approvals dated 2026-11-21:** T-06 Final Implementation Plan v1.0, Readiness Review v1.1, **D-04 through D-24** and 26 acceptance gates are approved. The Owner separately authorized **only this T-06 plan update and the Roadmap update**, with documentation-only commits/push to GitHub `main`. This does not authorize code.

**NOT AUTHORIZED:** T-06 coding, Codex coding prompt, local working-tree modification, branch creation/switching, checkout, merge, cherry-pick, reset, clean, unstage, code commit/push, Project Skills changes, or unrelated file changes. A later, specific Owner instruction is required for implementation and for any exception to existing Git limits.

**Acceptance status:** 26/26 gates **PENDING**; no T-06 implementation or CI success is asserted by this plan.

## 10. Owner-approved Pre-Implementation Readiness Review v1.1 (2026-11-21)

**Readiness verdict: CONDITIONAL READY for a separately authorized headless implementation; NOT production-gameplay ready.** D-04–D-24 (21 decisions) are closed. The existing 26 acceptance gates remain **PENDING** and retain their original IDs and criteria. No coding, Codex prompt, tests or CI run is claimed.

### 10.1 Binding RNG and time contract

- Inject one validated **uint32** seed (including 0) in immutable session inputs. Use **Mulberry32** with transactional state; never use `Math.random()` for simulation. Replaying equal seed, config and ordered commands must reproduce state, queue and RNG progression.
- Random Crystal spawn interval uses a **uniform integer tick** selected inclusively from `ceil(30*ticksPerSecond)` through `floor(60*ticksPerSecond)`. Reject an invalid configuration with no eligible integer tick; validate safe tick arithmetic and RNG sampling without modulo bias where required to preserve uniformity.
- Uniformly select among eligible Defender-free battlefield cells; draw a cell RNG value **only if** at least one cell qualifies. After any attempt (including skipped), select and enqueue the next valid interval. The exact consumption order and implementation must be documented and covered by replay tests; do not invent other draws.
- Duration-based Item expiration and passive Energy grants continue to obey D-08 first-tick-at-or-after deadlines and absolute timer baselines; do not convert these fixed-duration deadlines to the random-tick policy. Never use rendering FPS as Game Time.
- **D-20:** An Item stays present until its queued Expire event executes. If the 250-events/tick budget defers expiration, a previously ordered Collect may still succeed before Expire actually executes. Same-tick results follow queue insertion sequence, without a hidden expiration priority.

### 10.2 Binding timer, transaction and config contract

- **D-22:** Enqueue each future timer event when the timer is created or renewed, within the appropriate staged transaction. Preserve event queue order, capacity 4096, 250 events/tick, max causal depth 32 and rollback. For canceled/obsolete timers, verify validity at execution time; do not silently reorder or grant resources after terminal.
- **D-23:** Normal gameplay rejection (insufficient Energy, occupied cell, full Crystal storage, duplicate source, invalid collect) is a deterministic **internal transactional gameplay outcome**, not an exception or a new T-04 transaction status. The outcome may be stored in staged state/internal result log, with no gameplay resource/entity/ID/RNG mutation from the rejected action. True contract errors retain T-04 fail-stop.
- **D-24:** Use **one validated immutable session-input contract** for runtime; tests inject explicitly labeled fixture values through the test harness. Do not add separate `test` and `production` modes or production defaults. Missing required production config fails closed.
- Keep T-04/T-05 headless runtime, detached snapshots and internal command boundary; no public React/Phaser interface, new dependencies, Save or progression. If compatibility requires changing accepted T-04/T-05 behavior, stop for Owner review.

### 10.3 Readiness matrix and remaining blockers

| Area | Status | Implementation gate |
| --- | --- | --- |
| Resources and Summon | **CONDITIONAL READY** | Validated Base Defender costs and availability; transactional placement and gameplay rejection |
| Game Time, timers and Pause | **CONDITIONAL READY** | Verify tick-0 +50 once, absolute 3-second grants, enqueue order, no drift and no generation after terminal |
| Collectibles | **CONDITIONAL READY** | Validate normalized positions, expiry ordering, oldest-first Crystal-only auto-collect, cap behavior |
| Crystal random spawn | **CONDITIONAL READY** | Mulberry32 replay, uniform eligible ticks/cells, skipped attempt draw policy, queue saturation |
| Energy Item random spawn | **BLOCKED FOR PRODUCTION DATA** | Amount, rate, interactive region and position distribution are unapproved; test fixtures only |
| Enemy/Wave rewards | **CONDITIONAL READY HOOKS ONLY** | Idempotent source IDs, validated reward input; no Combat/Wave orchestration |
| Verification | **PENDING** | 26 acceptance gates, game/game-data tests, typecheck/build; real CI evidence only after authorized code push |

**Production-data blockers (not permission to invent values):** Base Defender Summon costs and any applicable cooldown contracts; Energy Item spawn rate, amount, interactive region and position distribution; Wave 1–5 Crystal Reward amounts. These need separate Owner approval before declaring complete production gameplay. Headless engine components may be tested with explicit validated fixtures only after separate coding authorization.

**Implementation risk checks:** staged RNG/counters/queue rollback; ordinary rejection not fail-stop; tick-rate floating-point boundaries; obsolete timers and terminal; deferred Expire behavior; queue/event budget saturation; source identity deduplication; safe-integer overflow; snapshot isolation; and unchanged T-04/T-05 regressions. Report PASS/FAIL/BLOCKED per AC-01–AC-26, not a blanket readiness pass.

### 10.4 Proposed next approval gate — not yet authorized

1. Owner confirms the documentation-only readiness publication (this v1.1 and Roadmap).
2. If desired, Owner **separately** authorizes T-06 implementation scope/slices and Git limits. No approval is implied by this document.
3. Before coding, inspect local working-tree state, all source authority and T-04/T-05 tests; preserve staged, unstaged and untracked changes, and Project Skills.
4. Implement only approved headless contracts using explicit test fixtures for TBD values; stop on contract conflicts or unapproved production decisions.
5. Collect actual evidence for all 26 gates; seek separate authorization for any commit/push of code.

**Git boundary for this publication:** only this Markdown plan and `docs/product/ROADMAP.md` may be updated on remote `main`; no local working-tree operations, branch/checkout/merge/reset/clean/unstage, code changes, Codex prompt or Project Skills edits.

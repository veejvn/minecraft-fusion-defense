# T-05 — Battlefield & Runtime Integration Implementation Plan

**Status:** OWNER-APPROVED PLAN (2026-11-21); **IMPLEMENTED AND OWNER-ACCEPTED TECHNICALLY (2026-11-21)** — see [T-05 Final Acceptance](../reports/T-05-FINAL-ACCEPTANCE.md)  
**Target:** `packages/game`, local `main` when the Owner later explicitly authorizes coding.  
**Type:** Original implementation plan and acceptance contract; subsequent implementation and CI evidence are recorded in the [final acceptance report](../reports/T-05-FINAL-ACCEPTANCE.md).

## 1. Goal

Build a deterministic, headless battlefield foundation for the Confirmed Grassland **5 rows × 9 columns**. Integrate Defender cell occupancy, Defender/Enemy runtime entity identity, transactional Battle State, a deterministic entity ID counter and internal command/test boundaries with the already implemented T-04 simulation primitives.

This work must not silently create new gameplay rules, balance defaults or production definitions. **Historical planning note:** At initial plan approval, the Codex prompt and coding authorization were pending. The Owner subsequently authorized coding, and later accepted the implementation; see the linked final acceptance report.

## 2. Approved decisions

| Decision | Owner-approved choice | Consequence |
| --- | --- | --- |
| D-01 | **A — Deterministic counter** | Counter belongs to transactional Battle State, is snapshot-capable and rolls back on unsuccessful transactions; no global or random entity IDs |
| D-02 | **A — Headless-first** | Pure TypeScript runtime, no new Phaser Scene, no React Host or `createGame()` changes |
| D-03 | **A — Internal commands only** | Test/internal simulation commands only; no new public React/Phaser command contract |

These decisions govern T-05, not future systems beyond its approved scope.

## 3. Source authority and prerequisite review

Before coding, inspect `git status`, existing implementation and tests, and read:

- `AGENTS.md`, `docs/DOCUMENTATION_POLICY.md`, `docs/development/DEVELOPMENT_WORKFLOW.md`, `docs/development/AI_AGENT_GUIDELINES.md`.
- `docs/product/MVP_SCOPE.md`, `docs/product/ROADMAP.md`, `docs/product/GAMEPLAY_MECHANICS.md`.
- `docs/architecture/GAME_ENGINE_ARCHITECTURE.md`, `docs/architecture/DATA_ARCHITECTURE.md`.
- `docs/development/T-04-CORE-SIMULATION-IMPLEMENTATION-PLAN.md` and relevant T-04 acceptance evidence.
- `docs/decisions/PGD-02/systems/G02.md`–`G07.md`, `docs/decisions/PGD-02/contracts/G09-TECHNICAL-CONTRACT.md`.
- `docs/decisions/PGD-02/owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md`.
- Existing `packages/game/src/core/`, `packages/game/src/events/`, `packages/game/src/entities/`, `packages/game/src/systems/` and `packages/game/tests/`, plus `packages/game-data` schemas and tests.
- Relevant locally installed repository game-development skills, if available; do not commit, copy or modify those skills.

Repository Markdown under `docs/` is authoritative. Preserve Confirmed gameplay decisions; treat Draft/Proposed/Prototype/TBD as unapproved. The newer explicit G07 Owner decision governs future terminal priority: first **valid resolved** terminal event wins. Terminal resolution is out of scope here. Historical G07 provenance remains pending.

## 4. Implementation slices

### T-05.1 — Battlefield Grid

- Represent exactly 5 rows × 9 columns and validate cell coordinates, including out-of-range and non-integer input.
- Track Defender occupancy with consistent cell-to-entity references.
- Reject conflicting Defender occupancy atomically.
- Enemy runtime positions are lane-based and continuous, not Defender cell occupancy; do not implement movement.
- Do not implement Energy spending, summon availability or placement gameplay rules.

### T-05.2 — Entity Registry and IDs

- Track distinct Defender and Enemy runtime instances; separate runtime entity identity from static definition IDs.
- Support minimal internal create/query/remove operations needed to exercise state invariants; do not introduce HP, damage, death, status or Fusion mechanics.
- Use an Owner-approved deterministic counter stored in transactional Battle State; allocation is staged and rollback-safe.
- Prevent duplicate IDs, dangling occupancy and removal inconsistencies.
- If a concrete ID format, counter overflow behavior or required entity field introduces an unapproved gameplay/contract decision, stop and request Owner review rather than silently choose a production rule.

### T-05.3 — Transactional Battle State

- Compose grid, entity registry data and ID counter into structured-clone-compatible Battle State.
- Reuse existing `TransactionEngine` and `EventQueue`; no second transaction engine and no independent mutable live-state backdoor.
- Ensure unsuccessful transactions cannot partially commit occupancy, registry or ID allocation.
- Maintain snapshot isolation; changing a returned snapshot must not mutate live state.
- Do not claim G03 canonical/checksummed persistence snapshots, G04 checkpoint storage or G05 recovery have been implemented.

### T-05.4 — Headless runtime and internal commands

- Compose existing `SimulationClock`, `EventScheduler` and transactional state in a TypeScript-only coordinator.
- Provide only internal/test commands and read-only snapshots; no public web/Phaser API.
- Explicitly configure tick rate and catch-up bound in tests; never infer a product tick rate from 60 FPS rendering.
- PAUSED freezes simulation time and gameplay event processing. Preserve T-04 event ordering, execution budget and fail-stop semantics.
- Avoid changing the accepted T-04 engine contracts. If a change proves unavoidable, stop, document the need and request Owner approval before modifying them.

### T-05.5 — Tests and verification

- Add focused `*.test.ts` unit tests and regression cases for all acceptance gates below.
- Run `pnpm --filter @mfd/game test`, `pnpm --filter @mfd/game-data test`, `pnpm typecheck`, `pnpm build` and report exact results.
- CI PASS requires a real GitHub Actions run after an Owner-authorized push; local results do not imply remote CI success.
- Produce an acceptance report with PASS/FAIL/BLOCKED for each gate, evidence paths and any unresolved decisions.

## 5. Acceptance matrix

| ID | Required evidence |
| --- | --- |
| AC-01 | Exactly 5 × 9 valid battlefield cells |
| AC-02 | Invalid/out-of-range coordinates rejected |
| AC-03 | Two Defenders cannot occupy the same cell |
| AC-04 | Enemies do not consume Defender cell occupancy |
| AC-05 | Runtime entity IDs unique and deterministic for equal initial state/input |
| AC-06 | Failed/rolled-back transaction does not consume entity IDs |
| AC-07 | Entity add/remove leaves no stale cell occupancy |
| AC-08 | Invalid operation cannot partially commit Battle State |
| AC-09 | Pause freezes simulation ticks and associated gameplay processing |
| AC-10 | Existing T-04 scheduler/event execution budget and ordering preserved |
| AC-11 | Returned snapshots cannot mutate live state |
| AC-12 | Identical initial state and command sequence produce identical results |
| AC-13 | Phaser Host, Hello Scene and `createGame()` behavior unchanged |
| AC-14 | Game tests, Game Data tests, workspace typecheck and production build pass; report CI only after real run |

**Post-implementation status:** All 14 gates were accepted as PASS by the Owner on 2026-11-21, supported by implementation commit `3ee3d30fe455624ae52f35e00cb31744ce6639f6` and successful GitHub Actions run `44846418049`. See [final acceptance](../reports/T-05-FINAL-ACCEPTANCE.md). T-05 does not deliver production gameplay, browser playability, canonical persistence snapshots or recovery.

## 6. Expected file touchpoints (not mandatory structure)

- `packages/game/src/battlefield/`: grid and occupancy.
- `packages/game/src/entities/`: runtime registry.
- `packages/game/src/core/`: Battle State as needed.
- `packages/game/src/systems/`: headless coordinator as needed.
- `packages/game/tests/`: T-05 unit and regression tests.

Follow existing conventions and minimize changes. No production data changes, no edits to `packages/game-data/src/runtime.ts` to bypass ability validation, and no `apps/web`, `create-game.ts` or Hello Scene edits.

## 7. Explicit exclusions and stop conditions

Out of scope: Summon/placement gameplay, Energy or Power Crystal costs, combat, movement, targeting, Fusion, Abilities, Waves, Victory/Defeat resolution, unlock progression, Save & Resume, full G03–G05 recovery, UI, asset production, browser integration and new dependencies.

Stop and ask the Owner before: changing a T-04 contract; changing public host APIs; adding dependencies; inventing game balance or a production effect; changing terminal arbitration; selecting among conflicting gameplay sources; implementing a new public command API; or extending T-05 beyond the approved scope.

## 8. Git and delivery restrictions

**When coding is separately authorized:** work only on existing local `main`; inspect and preserve all staged, unstaged and untracked changes. Do not create/switch branches, checkout, merge, cherry-pick, reset, clean, unstage, commit or push. Do not modify or commit local Project Skills. Do not overwrite unrelated work.

The Owner reviews changes and decides whether to commit/push. A later, specific Owner authorization may override the no-commit/no-push rule for the expressly named task only.

## 9. Relationship to roadmap and CI

The Owner-approved dependency sequence is documented in `docs/product/ROADMAP.md`. The separate CI improvement adds `pnpm --filter @mfd/game-data test` to `.github/workflows/ci.yml`. Those documentation/CI changes do not authorize T-05 coding or certify its implementation.

**Historical plan approval:** The Owner approved this plan and D-01=A, D-02=A, D-03=A on 2026-11-21. **Subsequent record:** Coding was explicitly authorized, implementation was committed as `3ee3d30`, GitHub CI passed, and the Owner accepted T-05 technically on 2026-11-21. [Acceptance report](../reports/T-05-FINAL-ACCEPTANCE.md). **No T-06 coding authorization is implied.**

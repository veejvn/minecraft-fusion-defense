# T-04 — Core Simulation Implementation Plan

**Status:** OWNER-APPROVED IMPLEMENTATION SCOPE — NOT IMPLEMENTATION VERIFIED  
**Execution target:** local `main` branch, after Owner pulls this plan.  
**This document is a coding plan, not a coding report or an audit.**

## 1. Goal and approved scope

Implement a deterministic, testable simulation foundation in the existing `packages/game` workspace, without changing existing Phaser Host / Hello Scene behavior.

Owner-approved T-04 scope:
1. Configurable fixed-timestep Game Tick, independent of rendering, with bounded catch-up and Pause.
2. Unified Event Queue ordered by `(scheduledTick, insertionSequence)`.
3. Atomic transactions using speculative/staged execution, including state, queue, RNG, entity/event IDs and sequence allocations.
4. Scheduler enforcing 250 executed events per Game Tick, preserving deferred FIFO and original scheduled tick/sequence.
5. Structured failure signals/diagnostics for subsequent G05 Recovery integration; **do not implement full checkpoint restoration in T-04**.
6. Deterministic unit/regression tests.

Out of scope: new Defender/Enemy/Fusion mechanics, balance, Steel Guardian Crushing Strike effect (TBD), new ability implementations, full G03–G05 recovery, G04 storage, new UI, unrelated refactoring, dependency installation without approval, and GitHub audit reports.

## 2. Authority and prerequisite checks

Read `AGENTS.md`, `docs/DOCUMENTATION_POLICY.md`, `docs/development/AI_AGENT_GUIDELINES.md`, `docs/decisions/PGD-02/systems/G02.md` through `G07.md`, `docs/decisions/PGD-02/contracts/G09-TECHNICAL-CONTRACT.md`, and `docs/architecture/GAME_ENGINE_ARCHITECTURE.md`. The later explicit Owner decision in `docs/decisions/PGD-02/owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md` supersedes the historical G07 terminal-priority ambiguity for future gameplay, though terminal arbitration is out of scope here.

At start, inspect `git status`, existing source/tests and locally installed repository skills. Do not overwrite uncommitted changes. The Owner will execute coding **directly on local `main`**, with no feature branch, no automatic commit and **no push**. Do not checkout, merge or cherry-pick any feature branch as part of T-04.

Read any relevant game-development skills installed **locally in the repository** (including `skills/`, `.agents/skills/`, `.codex/skills/` or paths documented by the repo, if present). Follow their `SKILL.md` instructions when relevant to Phaser, game-loop architecture, deterministic simulation, testing or TypeScript. These local skills are intentionally not committed/pushed; do not add them to git or copy their contents into documentation. Do not invent skill names or require unavailable skills.

## 3. Confirmed G06 Owner decisions (D-02.A–M)

- **A:** Queue overflow -> fail-stop and recovery signal, not silent drop.
- **B:** Roll back the whole current uncommitted transaction; preserve committed state.
- **C:** At most three recovery attempts for recurrent overflow (implemented later in G05).
- **D:** Do not retry a checkpoint that has already re-triggered overflow in the same recovery sequence (G05 later).
- **E:** Causal depth above 32 -> fail-stop and recovery signal.
- **F:** Hard cap 250 executed events per Game Tick; excess due events remain deferred FIFO.
- **G:** If remaining tick budget cannot accommodate an indivisible transaction, defer the entire transaction.
- **H:** Transaction requiring more than 250 executed events -> reject and signal fail-stop/recovery.
- **I:** Deferred events preserve original scheduled tick and insertion sequence; overdue events precede newer later-scheduled events.
- **J:** Queue can hold exactly 4,096 events; attempting the 4,097th is overflow.
- **K:** One shared budget of three recovery attempts across overflow types within a recovery sequence (G05 later).
- **L:** Diagnostic fields: error code, tick, event ID, causal depth, queue size, checkpoint ID and recovery attempt.
- **M:** When recovery is exhausted, battle -> FAILED; stop gameplay and retain diagnostics (G05 later).

Additional Owner decision **N=B**: run the whole transaction speculatively in staged state; commit only if its executed-event count fits the remaining tick budget and all validations succeed. This is not permission to exceed the hard cap during committed gameplay. A speculative execution that returns DEFERRED must leave **all** live state, queue, RNG, IDs and counters untouched. An event count above 250 must return a typed failure; do not mislabel it as queue-capacity overflow.

## 4. Clock and scheduler contract

- **R=D:** Tick rate configurable; do not hardcode a product tick rate or infer it from the 60 FPS rendering target. Tests may use explicitly supplied example tick rates.
- **S=A:** Fixed timestep, rendering independent, bounded catch-up to avoid spiral of death. Catch-up bound is a configuration parameter; do not silently promote a chosen number to approved gameplay default.
- PAUSED freezes simulation tick and gameplay timers; rendering may continue.
- Deterministic processing order is `scheduledTick` ascending then `insertionSequence` ascending; preserve original ordering across deferral.
- A transaction is atomic, but a causal chain may comprise multiple transactions. Do not assume one entire causal chain is one transaction.
- **Prevent starvation:** A transaction deferred because the current tick has insufficient budget should remain first among eligible events at the next tick; do not allow later events to overtake it.
- Event count means events actually processed by a transaction, not merely enqueued events; enqueued future events consume queue capacity but not execution budget until processed. Instrument the speculative executor to count actual processed events; do not rely on an untrusted callback returning an arbitrary count. When this distinction cannot be established for a handler, stop and ask the Owner before implementing that handler.
- A transaction producing new due events must preserve deterministic scheduling and must not escape tick budget accounting.
- Validate scheduled tick, depth, sequence, IDs and payload contracts at boundaries. Do not allow arbitrary mutable references to bypass staging.

## 5. Transaction and failure contract

- Use isolated staged state/queue/PRNG/ID and insertion sequence; atomic commit on success only.
- On DEFERRED, rollback staging, leave the triggering event in the live queue and retry at a later tick.
- On typed overflow or contract failure, do not partially commit. Report failure to the future Recovery coordinator; do not mark player Defeat.
- Provide explicit typed results such as APPLIED/DEFERRED/SKIPPED/FAILED as appropriate to the existing G09 contract; distinguish gameplay invalidation from system failures.
- Diagnostic metadata is not allowed to mutate canonical gameplay state or RNG. Preserve enough context to integrate checkpoint ID and recovery attempt later.
- Preserve canonical ordering and next insertion sequence on snapshot/restore interface; actual accepted checkpoint storage/recovery is outside T-04.
- Do not introduce a new production PRNG algorithm as an approved game rule without confirming the existing contract; a testable injected deterministic RNG interface is acceptable.
- Do not add broad runtime dependencies or integrate into the Phaser Host until the isolated foundation passes tests.

## 6. Suggested modules (adjust only to existing repo conventions)

```text
packages/game/src/core/simulation-clock.ts
packages/game/src/core/transaction.ts
packages/game/src/events/event-types.ts
packages/game/src/events/event-queue.ts
packages/game/src/events/event-scheduler.ts
packages/game/src/systems/simulation-runtime.ts
packages/game/tests/simulation-clock.test.ts
packages/game/tests/event-queue.test.ts
packages/game/tests/transaction.test.ts
packages/game/tests/event-scheduler.test.ts
packages/game/tests/deterministic-replay.test.ts
```

These are proposed file paths, not mandatory architecture or permission to modify unrelated files. Reuse existing modules when appropriate. Keep `create-game.ts`, `lifecycle-adapter.ts`, web host and existing tests behavior unchanged.

## 7. Acceptance tests

1. Scheduled-tick priority; insertion-sequence tie order; overdue event retains priority.
2. Queue capacity 4,096 succeeds; 4,097th fails without mutation.
3. Causal depth 32 succeeds; 33 fails without mutation.
4. Exactly 250 executed events/tick; 251st deferred, never dropped or reordered.
5. Transaction requiring 2 events with only 1 slot left defers atomically; next tick processes it before later events.
6. Transaction requiring >250 executed events produces typed failure, no live mutation.
7. Speculative execution and rollback preserve state, queue, RNG, IDs and next sequence on DEFERRED or FAILED.
8. Generated due events are counted when executed and cannot bypass the tick limit.
9. Deterministic replay from identical state, queue, inputs and RNG seed yields identical canonical state/event ordering.
10. Pause freezes simulation; bounded catch-up and configured tick rate behave predictably.
11. Existing `@mfd/game` tests and TypeScript checks remain passing; no Phaser lifecycle regression.
12. Failure diagnostics include required fields without inventing checkpoint data.

## 8. Execution order and reporting

1. Inspect local Git status, skill instructions, package scripts, current source/tests.
2. Implement isolated event types/queue and tests.
3. Implement speculative transaction and tests.
4. Implement fixed clock and tests.
5. Implement scheduler and deterministic replay tests.
6. Add minimal runtime composition only if it can be done without choosing unapproved gameplay/system update order.
7. Run `pnpm --filter @mfd/game test`, `pnpm --filter @mfd/game typecheck` and other existing relevant checks as available; report commands, outputs and any blocked checks truthfully.
8. Report changed files, behavioral guarantees, test results and unresolved blockers **in chat**, not as a GitHub audit report.

**Do not commit, push, create branches, alter unrelated docs or install dependencies without new Owner authorization.** Coding directly in local `main` means editing its working tree; it does not imply permission to commit or push.

## 9. Deferred decisions / later phase

- **P=B:** G04 storage evicts oldest accepted checkpoint FIFO without exceptions.
- **Q=A:** Reject a new checkpoint if it cannot fit the 32 MiB hard memory limit while preserving a valid existing store; 16 MiB soft threshold is unbenchmarked.
- **Checkpoint tick 0=A:** Create immutable tick-0 checkpoint; it may later be evicted by FIFO. Immutability means snapshot contents do not change, not that it is permanently retained.
- **T=D:** Crushing Strike crowd-control mechanic remains TBD; do not implement its effect.
- **U=B:** Code testable, well-specified modules while tracking source-pending decisions; do not claim global Design Complete.
- **V=A:** T-04 starts with Game Tick + Event Queue + Transaction + deterministic tests.
- Full G03/G04/G05 recovery, three-attempt orchestration, FAILED terminal transition, terminal event arbitration and gameplay systems are subsequent phases.

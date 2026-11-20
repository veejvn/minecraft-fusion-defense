# PGD-02 — G01–G08 Cross-System Expansion and G09 Integration Review

**Scope:** G01–G08 foundation systems and their dependencies on G09.  
**Document status:** Design documentation review; **not** implementation verification.  
**Evidence policy:** G01–G08 values below come from previously recorded conversation summaries and the existing PGD-02 system files. The original 199 individual Owner approvals are **not** linked, so their evidence status is **Confirmed — Source Pending Verification**, not Source Verified. Repository GDD, Gameplay Mechanics and Game Engine Architecture were reopened for comparison. Cross-system interpretations are labeled as integration checks, **not new approved decisions**.

## G01 — Runtime Failure Handling

**Recorded design:** up to three retry attempts; 500 ms timeout; 100 ms cancellation grace; worker isolation; monotonic wall-clock measurement.

**System boundary:** runtime failure detection and isolation. G01's timeout values are wall-clock concepts; G02/G06/G09 Game Tick timers are gameplay-time concepts. Do not equate them without a source-backed rule.

**G09 integration checks (not additional approvals):**
- TC43–TC45 and FR19 distinguish gameplay invalidation (SKIPPED), committed application (APPLIED), and execution failure (FAILED).
- Atomic rollback and safe isolation/fail-stop apply to a failed event; no partial mutation may survive a failed precommit.
- Confirm whether any retry path could duplicate a Crystal spend, Damage Event, or ID allocation; no retry algorithm is specified here.

**Evidence gaps:** original G01 choice records; actual timeout tests, isolation tests and performance measurements.

## G02 — Checkpoint Scheduling

**Recorded design:** checkpoint at tick 0, every 60 ticks, and on meaningful gameplay changes; snapshots immutable.

**G09 integration:** FR9/FR10 require snapshots only at an atomic State + Queue commit boundary. A due checkpoint during an open transaction must be deferred until the boundary. This is a dependency on FR10, not a new scheduling interval.

**Review questions:** ensure all committed Activation, Shield, Status, Projectile, RNG and queue changes are represented in any checkpoint; do not capture half a Crystal activation.

**Evidence gaps:** precise original definition of 'meaningful change', individual G02 approvals, checkpoint test results.

## G03 — Snapshot Schema and Integrity

**Recorded design:** versioned canonical checksummed snapshot; semantic validation of complete gameplay state.

**G09 integration:** TC36–TC40 and FR11–FR13 require complete Activation progress, pending actions and remaining delay, Status/Shield/Projectile instances, hit registries, Effect Version, Battle Generation, insertion sequence and next counter. FR16 requires transactional RNG and ID state. FR11 rejects inconsistent PAUSED Activation snapshots rather than auto-repairing.

**Review questions:** verify exact schema coverage and canonical ordering against source-backed contract; do not invent a checksum algorithm or serialization format.

**Evidence gaps:** concrete snapshot schema, checksum choice, validation tests and original approvals.

## G04 — In-Memory Checkpoint Retention

**Recorded design:** RAM-only; at most three Accepted Checkpoints; 16 MiB soft / 32 MiB hard reported thresholds, **unbenchmarked**.

**G09 integration:** G03 completeness must not be sacrificed silently to meet memory thresholds. Projectile cursors, queued events, hit sets, Status versions, and transactional counters are part of required deterministic state.

**Review questions:** measure actual snapshot sizes with worst-case valid gameplay, verify oldest/newest retention behavior against original G04 approvals, and distinguish soft/hard policy from measured capacity.

**Evidence gaps:** benchmark data and original handling rules for memory threshold breaches. Do not invent eviction/compression behavior.

## G05 — Recovery

**Recorded design:** newest-first recovery from at most three Accepted Checkpoints, semantic validation, staged atomic restore, new Battle Generation, pause preservation, old-generation event rejection.

**G09 integration:**
- FR4: Battle Generation changes on restore; Effect Version changes only on actual refresh.
- FR11: preserve PAUSED Activation semantics and pending multihit remaining delay; reject invalid snapshot.
- FR12: restore Projectile cursor and committed hit registry; do not duplicate or skip collisions.
- FR13: preserve original event insertion sequences and next counter.
- FR23: uncommitted activation commands are canceled, **not** replayed.
- FR24: reject new gameplay inputs during RECOVERING, with no Crystal spend, Activation or deferred queue.
- FR18: committed terminal result must not be bypassed by restoring a preterminal PLAYING checkpoint.

**Review questions:** test staged restore failure and checkpoint fallback without mutating the live battle until commit.

**Evidence gaps:** original G05 approvals, implementation and recovery tests.

## G06 — Unified Event Queue

**Recorded design:** deterministic order by Scheduled Tick + Insertion Sequence; deferred FIFO; atomic commit; safe isolation or fail-stop; target 250 events/tick (**unbenchmarked**); causal depth 32; queue cap 4096 (**unbenchmarked**).

**G09 integration:**
- TC36–TC40: events survive checkpoint/restore with deterministic order and valid identity/generation/version.
- CR4, CR10, CR14–CR16, CR19, CR21, CR23, CR25: same-tick interactions resolve in queue order, rechecking state.
- FR7: same-instant multi-target collision Hit Events sort by stable Entity ID; Piercing Barrage trajectory ordering remains distinct.
- FR8/FR9: Hit Claim + Damage and State + Queue mutations are atomic.
- FR13/FR16: insertion sequence, RNG and IDs advance only with committed transactions.
- FR19: APPLIED, SKIPPED and FAILED outcomes must be handled according to safe isolation/fail-stop policy.

**Important:** queue ordering alone does **not** resolve G07's disputed terminal winner rule. Keep GAP-01 open.

**Evidence gaps:** actual throughput/cap measurements, original G06 approvals, runtime deterministic replay tests.

## G07 — Battle State and Terminal Lifecycle

**Recorded state set:** INITIALIZING, PLAYING, PAUSED, RECOVERING, TERMINAL, FAILED, CLEANING_UP, ENDED. PAUSED freezes Game Time, related gameplay timers and events; guarded restart and terminal boundary.

**G09 integration:**
- FR3: Stun pauses pending multihit cadence while the battle remains active; Battle Pause separately freezes Game Time.
- FR17: finalize current tick then close gameplay execution after terminal commit; cancel pending actions in cleanup.
- FR18: terminal result cannot be undone by preterminal recovery.
- FR23/FR24: no replay or new gameplay commands during RECOVERING.
- FR21 C / FR22 A: seek original G07 Owner approval and retain terminal conflict as PENDING EVIDENCE.

### GAP-01 — unresolved terminal priority

1. Conversation-derived G07 summary reports **Defeat Priority** for simultaneous terminal conditions.
2. Repository [GDD](../../../product/GDD.md), [Gameplay Mechanics](../../../product/GAMEPLAY_MECHANICS.md) and [Game Engine Architecture](../../../architecture/GAME_ENGINE_ARCHITECTURE.md) describe simultaneous Defender attacks and Enemy movement, followed by Event Queue resolution in insertion order, with **no fixed Victory/Defeat priority**.

**Do not choose either policy, relabel one as superseded, or claim Design Complete.** Obtain original G07 confirmation or an explicit new Owner decision.

## G08 — Special Ability Architecture and Verification

**Recorded design:** 27 Confirmed framework decisions (individual IDs pending recovery), 12 MVP Special Abilities, typed primitives, effect provenance, deterministic Projectile states and atomic activation. Candidate primitives: DAMAGE, APPLY_STATUS, MODIFY_STAT, GRANT_SHIELD, SPAWN_PROJECTILE; candidate status is **not** implementation approval.

**G09 integration:**
- TC1–TC5: Ability Executor orchestrates Damage, Status, Shield and Projectile subsystems; typed deterministic atomic transitions.
- TC6–TC35: effect/source identity, Damage, Status, Shield, Projectile and Activation contracts.
- TC36–TC45: Event Queue integration, snapshot, restore, eligibility rechecks and execution results.
- TC46–TC50: primitive-level and per-ability verification, canonical replay comparison, strict PASS criteria.
- Twelve ability definitions are transcribed in [G09 Ability Register](../registers/G09-ABILITY-REGISTER.md); this is not equivalent to recovering all 216 original ability-specific decision IDs.

**Repository sync:** [Game Engine Architecture](../../../architecture/GAME_ENGINE_ARCHITECTURE.md) and [Ability Catalog](../../../game-design/ABILITY_CATALOG.md) still mark some Ability effects, Crystal commit timing and implementation contracts TBD/Draft. Record **DOCUMENTATION SYNC**, not automatic invalidation of later conversation-derived choices. No old file was edited.

**Evidence gaps:** original G08 individual approvals, primitive implementation approval, runtime unit/integration/E2E results.

## Dependency matrix

| Foundation | G09 dependencies | Review status |
|---|---|---|
| G01 | TC41–TC45, FR9, FR16, FR19 | Source Pending Verification; implementation not verified |
| G02 | FR9–FR10, FR16 | Source Pending Verification; checkpoint boundary rule documented |
| G03 | TC36–TC40, FR4, FR11–FR13, FR16 | Source Pending Verification; schema/test evidence missing |
| G04 | G03 completeness, FR10–FR13 | Unbenchmarked capacity |
| G05 | FR4, FR11–FR13, FR18, FR23–FR24 | Source Pending Verification; runtime not verified |
| G06 | CR4/10/14–16/19/21/23/25, FR7–FR9, FR13/16/19 | Determinism contract recorded; runtime not verified |
| G07 | FR3, FR17–FR18, FR21–FR24 | **GAP-01 PENDING EVIDENCE** |
| G08 | TC1–TC50, 12 MVP abilities | Framework documented; implementation not verified |

## Review conclusion

- **No original source verification claim** for the 199 G01–G08 decisions.
- **No new gameplay decision** is approved by this review; the integration checks are documentation analysis.
- **No runtime PASS** or benchmark is claimed.
- **No existing repository file** needs modification for this review.
- **GAP-01 remains a Design Closure blocker**; DOCSYNC items remain separate.
- Next evidence work: recover original G01–G08 decision IDs and approval messages; reconcile terminal priority only through Owner evidence/decision.

Related: [Decision Index](../DECISION_INDEX.md), [Source Register](../SOURCE_REGISTER.md), [G09 Decision Register](../registers/G09-DECISION-REGISTER.md), [G09 Technical Contract](../contracts/G09-TECHNICAL-CONTRACT.md), [GAP Register](GAP_REGISTER.md).

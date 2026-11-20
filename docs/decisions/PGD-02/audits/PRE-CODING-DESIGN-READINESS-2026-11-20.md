# PGD-02 — Pre-Coding Design Readiness & TBD Register

**Date:** 2026-11-20  
**Owner instruction:** Option C — resolve missing design points before coding; **do not overwrite existing documents**.  
**Status:** REVIEW / OWNER DECISIONS REQUIRED; no implementation authorized by this document.  
**Method:** Read-only inspection of original repository documents, followed by creation of this separate report. This report does **not** choose gameplay behavior.

## Sources inspected

- [GAP Register](GAP_REGISTER.md)
- [G09 Final Audit](G09-FINAL-AUDIT.md)
- [G04 Checkpoint Storage](../systems/G04.md)
- [G06 Unified Event Queue](../systems/G06.md)
- [PGD-01 Steel Guardian](../../PGD-01-STEEL-GUARDIAN.md)
- [G09 Test Coverage Audit](G09-TEST-COVERAGE-AUDIT-2026-11-20.md)
- [G09 Test Gap Extension](../tests/G09-TEST-GAP-EXTENSION-2026-11-20.md)
- [G07 explicit Owner B decision](../owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md)
- [GAP-01 Resolution Addendum](GAP-01-RESOLUTION-ADDENDUM-2026-11-20.md)
- [Ability Catalog G09 Addendum](../addenda/ABILITY-CATALOG-G09-ADDENDUM-2026-11-20.md)
- [Steel Guardian G09 Addendum](../addenda/STEEL-GUARDIAN-IRON-BASTION-G09-ADDENDUM-2026-11-20.md)

## Readiness by implementation scope

| Scope | Design readiness | Caveat |
|---|---|---|
| Deterministic Game Tick / State Machine / Event Queue | **Sufficient for isolated prototype with documented assumptions** | No arbitrary choice of overflow handling, causal depth failure policy or event-generation order |
| G07 Terminal Priority | **Rule resolved by explicit new Owner decision B** | Original historical approval remains pending |
| Snapshot / Checkpoint / Recovery | **Core contract documented** | G04 memory thresholds are unbenchmarked; exact capacity/eviction semantics require review |
| Combat / Damage / Status / Shield | **G09 later transcription available** | Individual source approvals pending; do not promote transcription to Source Verified |
| 12 Special Abilities | **Detailed later transcription available** | Exact source evidence for 216 individual decisions not recovered |
| Steel Guardian normal attack (Crushing Strike) | **NOT executable-spec ready** | Stun/Knockback/Slow, targeting, Damage and timing still TBD in PGD-01 |
| Test coverage | **113 cases designed** | 0 executed; 11 governance/evidence requirements require separate checklist |
| Whole-game release readiness | **NOT established** | Runtime, source verification and outstanding gameplay details unresolved |

## Owner decision queue (no selections made)

### D-01 — Crushing Strike effect [Gameplay blocker for complete Steel Guardian]

PGD-01 confirms only the **name** and intent of a powerful melee interrupt attack; it explicitly leaves Stun, Knockback, Slow or other effect, conditions, targeting, duration, Damage and combat values **TBD**.

**Owner needs to decide:** whether to specify Crushing Strike now, defer Steel Guardian implementation, or implement only its confirmed identity and separately specified Iron Bastion without a fabricated normal attack. No default is chosen.

### D-02 — G06 queue limit and overflow behavior [Engine implementation blocker]

G06 reports deterministic ordering (Scheduled Tick, Insertion Sequence), deferred FIFO, causal depth **32**, queue cap **4096**, and **250 events/tick** target. It does **not** provide a verified precise disposition when causal depth or queue cap is exceeded.

**Owner needs to decide or provide source:** overflow action (reject event, fail-stop, recovery trigger, etc.), whether limits are hard invariants or targets, and diagnostic behavior. Do not invent a policy. The 250 events/tick figure is **unbenchmarked**.

### D-03 — G04 memory and checkpoint retention [Reliability implementation blocker]

G04 specifies **RAM only**, at most **3 Accepted Checkpoints**, reported **16 MiB soft / 32 MiB hard** thresholds. Precise action at threshold and eviction ordering are not established by inspected summary.

**Owner needs to decide or provide source:** how soft/hard limits affect checkpoint admission, memory pressure, recovery availability and eviction; whether to defer memory-budget enforcement until profiling. No unapproved behavior assumed.

### D-04 — Game Tick timing / scheduler configuration [Implementation planning decision]

G09 TC9 prohibits assuming a fixed tick rate; Game Time and monotonic wall-clock watchdog must remain distinct. The concrete tick-rate/runtime scheduler and test conversion from seconds to ticks require implementation planning or source confirmation.

**Owner needs to decide:** approve a runtime-configurable timing abstraction and defer numeric tick-rate selection, or specify an explicit tick-rate policy. This document does not pick one.

### D-05 — Documentation and provenance [Evidence gate, not a new mechanic]

The later G09 summaries and Addenda are marked **Confirmed — Source Pending Verification**. Original individual Owner approvals for reported 538 decisions remain incompletely traced. DOCSYNC-01/02 have addenda, but original Catalog and PGD-01 remain unchanged as instructed.

**Owner needs to decide:** permit implementation against source-pending transcriptions with explicit traceability/assumption logs, or require original approvals first. Neither is implicitly authorized.

## What is already settled

- **G07:** First valid terminal event resolved by deterministic queue order wins, as explicitly confirmed by Owner B on 2026-11-20. Do **not** reopen terminal priority merely because older GAP Register is stale.
- **Non-destructive documentation:** addenda and test documents are separate new files; original sources remain historical evidence.
- **Testing:** 83 baseline + 30 extension = **113 designed**, **zero executed**; no PASS or Design Complete claim.

## Recommended sequencing (proposal only)

1. Obtain Owner decisions on D-01 through D-05 **before full gameplay coding**; the user can prioritize one at a time.
2. If Owner authorizes a narrow prototype, build Game Tick/State/Queue without undocumented overflow or memory policies; record any blocked branch rather than silently fill it.
3. Write tests against confirmed rules and mark undecided or unverified behavior BLOCKED.
4. Keep provenance, gameplay design, documentation sync and runtime verification as separate status tracks.

**Preservation:** This report is the only proposed new artifact; no existing Markdown or source code is modified.

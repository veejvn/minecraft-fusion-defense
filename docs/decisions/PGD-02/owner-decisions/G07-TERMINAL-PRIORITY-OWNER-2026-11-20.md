# PGD-02.G07.TERMINAL-PRIORITY — New Owner Decision

**Decision ID:** PGD-02.G07.TERMINAL-PRIORITY  
**Selected option:** **B — First Resolved Terminal Event Wins**  
**Decision date:** 2026-11-20  
**Authority:** Explicit new Owner confirmation in the current project conversation, following PGD-02.DOC-07 B  
**Status:** **CONFIRMED — NEW OWNER DECISION**  
**Scope:** Terminal result arbitration for simultaneous Victory and Defeat events in one Game Tick.

## Decision

When Victory and Defeat terminal events are both generated in the same Game Tick, the **first valid terminal event resolved by the deterministic Unified Event Queue** determines the battle result.

- The queue resolves events by **Scheduled Tick**, then **Insertion Sequence**.
- **There is no blanket Defeat Priority** and no blanket Victory Priority.
- Once a terminal result is committed, a later terminal event cannot change the result of the same battle.
- Event validity and gameplay state must be checked at resolution; the first *valid resolved* terminal event wins, not necessarily the first candidate event generated.
- The detailed event-generation ordering and other implementation edge cases not already confirmed remain outside this decision; do not invent additional tie-breaking rules.

## Example

Two valid terminal events are queued for the same Game Tick:

| Event | Insertion Sequence | Outcome under option B |
|---|---:|---|
| Victory | 41 | **Victory**, if resolved validly first |
| Defeat | 42 | Does not replace committed Victory |

If Defeat resolves validly first instead, the battle ends in **Defeat**.

## Relationship to existing sources

- [GDD](../../../product/GDD.md) §10.3 and §11.1, [Gameplay Mechanics](../../../product/GAMEPLAY_MECHANICS.md), and [Game Engine Architecture](../../../architecture/GAME_ENGINE_ARCHITECTURE.md) already describe first-resolved terminal-event behavior.
- [G07 system summary](../systems/G07.md) records an earlier conversation-derived **Defeat Priority** statement, but the original G07 Owner approval was not recovered.
- [Source trace audit](../audits/G01-G08-SOURCE-TRACE-2026-11-20.md) documents the historical discrepancy.

**Supersession boundary:** This **new explicit Owner decision** governs the Terminal Priority rule from 2026-11-20 onward, regardless of the unresolved provenance of the earlier G07 summary. It **does not establish what the original G07 Owner chose** and does not retroactively label that summary false or source-verified.

## GAP-01 disposition

**Gameplay rule ambiguity: RESOLVED BY NEW OWNER DECISION.**  
**Historical original-G07 provenance: STILL PENDING EVIDENCE.**

This decision resolves which gameplay rule should be used going forward. It does **not** recover the missing historical original G07 decision record. Existing GAP Register and audit files are intentionally preserved unchanged under Owner's no-overwrite instruction; they describe the **earlier audit state** and should be read together with this newer Owner decision. A future authorized documentation-sync pass may update their status labels without deleting historical evidence.

## Interaction with other confirmed contracts

- **G06:** deterministic Scheduled Tick + Insertion Sequence ordering and atomic Event Queue commits.
- **G09.FR17:** finish current tick at terminal boundary under the established lifecycle contract; do not execute further gameplay after committed terminal state.
- **G09.FR18:** once terminal is committed, do not restore a preterminal PLAYING checkpoint to change the result.
- **G09.FR21 C / FR22 A:** historical evidence hold remains documented; this newer Owner confirmation is the explicitly authorized resolution path for the gameplay rule.

## Verification boundary

**Design decision only.** No runtime code, tests or benchmark were executed. Do not claim Implementation Verified, complete G01–G08 source traceability, or global PGD-02 Design Complete.

## Preservation and traceability

This is a **new file**, not an edit to any pre-existing document. All earlier G07 and GAP-01 audit statements remain intact as historical records. Original Owner confirmation: current project conversation message beginning `PGD-02.G07.TERMINAL-PRIORITY B. Tôi xác nhận đây là quyết định Owner mới...`.

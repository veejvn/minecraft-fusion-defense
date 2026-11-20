# PGD-02 — GAP-01 Resolution Addendum

**Addendum date:** 2026-11-20  
**Authorization:** PGD-02.DOC-08 A — create an additional status report without overwriting any existing file.  
**Decision authority:** [PGD-02.G07.TERMINAL-PRIORITY — new Owner confirmation, option B](../owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md)  
**Scope:** G07.GAP-01 terminal priority ambiguity only.  
**Classification:** Historical audit addendum and status reconciliation, **not a new independent gameplay choice**.

## Resolution statement

**GAP-01 gameplay rule conflict: RESOLVED BY NEW OWNER DECISION (2026-11-20).**

The Owner explicitly selected **B — First Resolved Terminal Event Wins**. When Victory and Defeat terminal events both arise within one Game Tick, the first **valid terminal event resolved** by the deterministic Unified Event Queue determines the result. Queue order uses Scheduled Tick followed by Insertion Sequence. There is no blanket Victory or Defeat priority. Once the result is committed, later terminal events do not change it.

**Original historical G07 decision provenance: PENDING EVIDENCE.** This addendum does not claim to have recovered the earlier G07 Owner message, nor to have proved why the earlier conversation summary reported Defeat Priority.

## Before / after

| Item | Earlier audit state | State after explicit Owner decision |
|---|---|---|
| G07 terminal gameplay rule | GAP-01 PENDING EVIDENCE / competing descriptions | **RESOLVED — Owner chose option B** |
| Rule governing future design | Ambiguous between Defeat Priority and first resolved event | **First valid resolved terminal event wins** |
| Original G07 approval message | Not located | **Still not located** |
| GDD / Gameplay Mechanics / Engine Architecture | Already describe first resolved event | **No change required to these texts for this specific rule** |
| Historical G07 summary | Records earlier Defeat Priority claim | Preserved as historical secondary-source record |
| Runtime implementation/tests | Not verified | **Still not verified** |
| Global PGD-02 Design Complete | Not established | **Still not established** |

## Evidence and precedence

1. **Current Owner confirmation (primary evidence for the new rule):** [Owner Decision](../owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md), quoting the explicit user confirmation beginning `PGD-02.G07.TERMINAL-PRIORITY B. Tôi xác nhận đây là quyết định Owner mới...`.
2. **Repository baseline corroboration:** [GDD](../../../product/GDD.md), [Gameplay Mechanics](../../../product/GAMEPLAY_MECHANICS.md), [Game Engine Architecture](../../../architecture/GAME_ENGINE_ARCHITECTURE.md), and [Documentation Status](../../../DOCUMENTATION_STATUS.md) record first-resolved terminal behavior.
3. **Earlier audit record:** [G01–G08 source trace](G01-G08-SOURCE-TRACE-2026-11-20.md) and [GAP Register](GAP_REGISTER.md) describe the earlier PENDING EVIDENCE state and must be read **as of their creation**, not as the latest gameplay-rule disposition.
4. **Historical discrepancy:** [G07 system summary](../systems/G07.md) contains the older Defeat Priority report; its original approval remains unavailable.

**Precedence for the gameplay rule:** The explicit new Owner confirmation governs from 2026-11-20. This precedence does **not** establish historical accuracy of older summaries or change their original text.

## G06 / G07 / G09 integration boundaries

- **G06:** deterministic Scheduled Tick + Insertion Sequence and atomic Event Queue processing; first *valid resolved* terminal event, not merely first generated candidate.
- **G07:** committed TERMINAL result is stable; PAUSED and RECOVERING lifecycle behavior remains governed by existing decisions.
- **G09.FR17:** terminal boundary closes further gameplay processing under the established lifecycle; no post-terminal result override.
- **G09.FR18:** committed terminal result cannot be reversed by restoring a preterminal PLAYING checkpoint.
- **Detailed event generation and other unresolved implementation edge cases:** remain Coding Planning / verification work, **not decided by this addendum**.

## Status classification after this addendum

| Tracking key | Latest disposition | Remaining work |
|---|---|---|
| **GAP-01-RULE** | **RESOLVED — NEW OWNER DECISION B** | Apply rule in future implementation and tests |
| **GAP-01-HISTORY** | **PENDING EVIDENCE** | Recover original G07 approval only if historical traceability is required |
| DOCSYNC-01 | OPEN | Ability Catalog synchronization requires separate authorization |
| DOCSYNC-02 | OPEN | PGD-01 Steel Guardian synchronization requires separate authorization |
| EVIDENCE-01 | PENDING | Original individual approval evidence for reported 538 decisions |
| EVIDENCE-02 | PENDING | G01–G09 cross-system primary-source verification |
| VERIFY-01 | IMPLEMENTATION NOT VERIFIED | Runtime and acceptance testing |

The tracking suffixes `-RULE` and `-HISTORY` are **audit subcategories introduced by this report**, not newly approved gameplay Decision IDs.

## Preservation guarantee

This file is **additive**. It does not edit, replace, rewrite, or delete `GAP_REGISTER.md`, `systems/G07.md`, `G01-G08-SOURCE-TRACE-2026-11-20.md`, GDD, Gameplay Mechanics, Game Engine Architecture, or any existing PGD-02 file. Historic audit statuses remain intact. **Use this newer addendum together with the Owner Decision to interpret the latest GAP-01 status.**

**No runtime tests were executed. No Design Complete or Implementation Verified claim is made.**

# PGD-02 — G01–G08 Primary-Source Trace Attempt (2026-11-20)

**Scope:** DOC-06 A — recover original G01–G08 decision evidence, prioritizing G07.GAP-01.  
**Outcome:** Repository evidence located and directly inspected; **original G01–G08 Owner decision messages not recovered**. This is an evidence report, not a new gameplay decision. No existing file changed.

## Method and source boundary

- Read current repository tree and the G01–G08 files under `docs/decisions/PGD-02/systems/`.
- Read original repository documents directly: GDD, Gameplay Mechanics, Game Engine Architecture, Documentation Status.
- Searched repository code for `G07` and `Defeat Priority`; searched repository commits for `terminal` and issues for `G07`. **No matching results returned from those searches**; this does not prove no historical source exists outside the searchable scope.
- Inspected the repository tree for archived decision or historical files; no separate original G07 decision transcript was found in that tree.
- Project conversation summaries remain **secondary evidence**; they cannot be promoted to original Owner confirmations.

## G07.GAP-01 — direct repository evidence

| Evidence ID | Exact source | Observed statement | Evidence classification |
|---|---|---|---|
| G07-REPO-01 | [GDD § terminal](../../../product/GDD.md), around lines 461–463 | Confirmed 03/11/2026: simultaneous attack/movement; resolve terminal events by insertion-sequence queue order; no fixed Victory/Defeat priority. Explicitly says not to use old always-Defeat-priority rule. | **Repository text inspected**, not original Owner chat |
| G07-REPO-02 | [Gameplay Mechanics](../../../product/GAMEPLAY_MECHANICS.md), around lines 485–487 and 939–941 | No blanket Defeat priority; the first resolved terminal event determines outcome. | **Repository text inspected**, not original Owner chat |
| G07-REPO-03 | [Game Engine Architecture](../../../architecture/GAME_ENGINE_ARCHITECTURE.md), around lines 77 and 89 | Same-tick terminal resolution via insertion sequence, no fixed Victory/Defeat priority. | **Repository text inspected**, not original Owner chat |
| G07-REPO-04 | [Documentation Status](../../../DOCUMENTATION_STATUS.md), around lines 200, 259 and 320 | Reports old blanket Defeat priority superseded by first resolved terminal event. | **Repository text inspected**, not original Owner chat |
| G07-SUMMARY-01 | [PGD-02 G07](../systems/G07.md) | Conversation-derived G07 summary reports **Defeat Priority**. | **Secondary conversation summary**; original message missing |
| G07-FR21/22 | [G09 Decision Register](../registers/G09-DECISION-REGISTER.md) | FR21 C: seek original G07 approval; FR22 A: hold GAP-01 Pending Evidence. | **Conversation-derived decisions**, original approval links not recovered |

### Assessment

Current repository documents consistently support **first resolved terminal event wins**, and explicitly identify blanket Defeat Priority as an older rule. However, the **original G07 Owner decision** corresponding to the later conversation summary was not located. It is therefore **not established** whether G07 intentionally superseded the 03/11/2026 repository baseline, whether the summary omitted a qualifier, or whether a conflict arose in transcription.

**GAP-01 remains PENDING EVIDENCE** per FR21 C and FR22 A. Do not infer a new Owner choice from this audit, rewrite G07, or implement either conflicting rule solely from this report.

## G01–G08 evidence recovery inventory

| System | Current accessible source | Original individual Owner approvals | Result |
|---|---|---|---|
| G01 | [G01 summary](../systems/G01.md) | Not located | Source Pending Verification |
| G02 | [G02 summary](../systems/G02.md) | Not located | Source Pending Verification |
| G03 | [G03 summary](../systems/G03.md) | Not located | Source Pending Verification |
| G04 | [G04 summary](../systems/G04.md) | Not located | Source Pending Verification |
| G05 | [G05 summary](../systems/G05.md) | Not located | Source Pending Verification |
| G06 | [G06 summary](../systems/G06.md) | Not located | Source Pending Verification |
| G07 | [G07 summary](../systems/G07.md) + four directly inspected repository sources | Original G07 Owner approval not located | **GAP-01 PENDING EVIDENCE** |
| G08 | [G08 summary](../systems/G08.md) | Not located | Source Pending Verification |

**Counts:** G01–G08 are reported as **199 Confirmed** in conversation summaries. This report recovers **zero original individual decision IDs/approval messages**. Do not recalculate or redistribute the 199 across systems without original evidence.

## Evidence acquisition needed

1. Original G07 Owner message deciding simultaneous Victory/Defeat and its date/context, preferably with any later superseding decision.
2. Original G01–G08 decision records containing ID, options, selected answer, date, and surrounding rationale.
3. When supplied, compare verbatim decisions against the repository baseline and conversation summaries; only then change evidence labels or request an Owner resolution.
4. If the original G07 decision cannot be recovered, ask the Owner to explicitly select a rule **as a new decision**; never imply that such a selection has already happened.

## Preservation

No gameplay decision, existing document, runtime code or test status is changed by this audit. Source verification applies **only to the directly inspected repository text**, not to the unlocated original approvals. See [GAP Register](GAP_REGISTER.md) and [Source Register](../SOURCE_REGISTER.md).

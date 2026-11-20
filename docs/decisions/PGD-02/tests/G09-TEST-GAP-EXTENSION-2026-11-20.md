# PGD-02.DOC-14 A — G09 Test Gap Extension

**Date:** 2026-11-20  
**Status:** TEST DESIGN ONLY — ALL NOT RUN  
**Authorization:** PGD-02.DOC-14 A; new file only; no overwrites.  
**Original baseline:** [83-case Test Specification](G01-G09-TEST-SPECIFICATION-2026-11-20.md)  
**Audit:** 83-case coverage audit (historical baseline report removed from main)  
**Decision evidence:** [G09 Decision Register](../registers/G09-DECISION-REGISTER.md), [Technical Contract](../contracts/G09-TECHNICAL-CONTRACT.md); original approvals **Source Pending Verification**.

## Accounting and methodology

This adds **30 designed cases**, one for each of the **5 Gaps** and **25 Partial Coverage** decisions identified in DOC-13. New IDs EXT-01–EXT-30 are **test IDs, not Owner decision IDs**. Existing 83 cases remain untouched: **113 designed cases across two files, zero executed**. The P/G column records **prior audit classification**; it is not automatically upgraded to Direct without a subsequent audit.

Use a deterministic fixture with controlled Game Tick, Scheduled Tick, Insertion Sequence, Stable Entity IDs, Power Crystals, current/Max HP, Buff/Status/Shield/Projectile identity and provenance, snapshot/replay logs and Game Time clock. For queue-order cases, run **both order permutations** using separate fixtures. Do not infer event generation order. Convert duration to ticks only with an approved tick-rate configuration.

## 30 extension cases

| New ID | Decision | Prior | Related original | Setup / action | Expected assertion |
|---|---|---|---|---|---|
| EXT-01 | G09.CR4 | P | CORE-05 | Two same-tick Damage Events; first kills target | Second event rechecks eligibility and cannot damage dead target |
| EXT-02 | G09.CR8 | G | — | Buff expires after normal attack interval scheduled | Scheduled interval unchanged; next attack uses post-expiry Attack Speed |
| EXT-03 | G09.CR11 | P | CORE-08 | Create multiple Shields same tick in different insertion orders and stable-ID ties | Creation/absorption ordering follows queue and stable-ID tie rule |
| EXT-04 | G09.CR15 | P | ABL-06 | Fusion before pending shot, then reverse order | Fusion-first cancels unfired shot; shot-first projectile persists |
| EXT-05 | G09.CR18 | P | ABL-08 | Stun owner through Pack Frenzy expiry, then release | Buff expires during Stun and does not return |
| EXT-06 | G09.CR19 | P | ABL-16 | Shield break and Fusion in both queue orders | Only committed-first action takes effect; no stale Shield/area after Fusion |
| EXT-07 | G09.CR20 | P | ABL-22 | Recast Alpha Howl same source before expiry | Refresh without stacking; stale expiry cannot remove new version |
| EXT-08 | G09.CR21 | G | — | Queue lethal Damage before Heal, then Heal before Damage | No resurrection after death; sequential processing follows queue |
| EXT-09 | G09.CR23 | P | ABL-24 | Direct and redirected Guardian Damage in reversed orders | Recheck Guardian survival/eligibility after each committed Damage |
| EXT-10 | G09.CR24 | G | — | Kill Burn/Stun-affected Enemy before queued tick and expiry | Death clears statuses; old events inert |
| EXT-11 | G09.CR25 | P | CORE-02 | Queue Crystal activation vs owner death in both orders | Activation-first commits if valid; death-first rejects without spend |
| EXT-12 | G09.GR6 | P | ABL-23 | Increase Max HP after Iron Bastion Shield exists | Existing Shield unchanged without recast |
| EXT-13 | G09.GR7 | P | ABL-23 | Decrease Max HP after Iron Bastion Shield exists | Existing Shield unchanged without recast |
| EXT-14 | G09.GR8 | G | — | Decrease Max HP below current HP | Current HP clamps to new Max HP |
| EXT-15 | G09.GR10 | P | ABL-23 | Max HP update and Bastion activation same tick, both orders | Shield snapshots current Max HP at activation resolution |
| EXT-16 | G09.TC1 | P | ARCH-01 | Create valid/invalid typed Damage Status Shield Projectile payloads | Accept valid; reject malformed atomically; no invented schema field names |
| EXT-17 | G09.TC4 | P | ARCH-01 | Repeat transition from identical canonical state, then inject precommit fault | Deterministic output; fault causes no partial State/Queue mutation |
| EXT-18 | G09.TC5 | P | ARCH-03 | Inspect scheduled Arrow Storm multihit actions | Each action resolves through Unified Event Queue |
| EXT-19 | G09.TC8 | P | ABL-05 | Change Attack Damage between arrow shots and after a shot fires | Each effect uses snapshot at defined firing/execution boundary |
| EXT-20 | G09.TC9 | G | — | Run identical gameplay duration under differing configurable tick rates and pause; separate wall-clock watchdog | Game Tick is authoritative for gameplay scheduling, no fixed tick-rate assumption; wall-clock worker timeout independent |
| EXT-21 | G09.TC11 | P | CORE-05 | Issue typed Physical/Fire/piercing Damage with provenance | Damage type and piercing flags preserved; invalid type rejected |
| EXT-22 | G09.TC17 | P | CORE-07 | Reapply same Status from same and different source | Same-source refreshes ID; different source independent |
| EXT-23 | G09.TC20 | P | CORE-08 | Combine Slow Burn Stun Freeze from distinct sources | Strongest Slow, independent Burn ticks, independent action blockers |
| EXT-24 | G09.TC25 | P | ABL-26 | Kill/Fusion owners of fired/unfired projectiles Burn Alpha Howl Iron Bastion | Per-ability cleanup and persistence respected |
| EXT-25 | G09.TC26 | P | ABL-11 | Create two projectiles from separate activations | Distinct stable IDs, provenance, cursor and hit registry |
| EXT-26 | G09.TC43 | P | UEQ-04 | Resolve valid, stale invalidated, and failed events | APPLIED/SKIPPED/FAILED with appropriate reasons |
| EXT-27 | G09.TC45 | P | RT-01 | Inject gameplay invalidation, contract violation and worker exception | Distinct classification, diagnostics and atomic failure behavior |
| EXT-28 | G09.TC48 | P | CORE-14 | Replay checkpoint twice, compare full canonical states and event logs | Identical canonical state and ordered event traces |
| EXT-29 | G09.FR5 | P | ABL-22 | Apply same Buff type with varying Target Source Ability keys | Target+Type+Source+Ability determines refresh vs independence |
| EXT-30 | G09.FR6 | P | ABL-22 | Kill/Fusion source then separately recipient of Alpha Howl | Recipient retains Buff after source loss; recipient loss clears Buff |

## Implementation-neutral acceptance rules

- Every case begins **NOT RUN**. No code, test runner, runtime measurements or PASS/FAIL assertions have been executed.
- Preserve queue ordering (Scheduled Tick then Insertion Sequence), atomic transitions and the new [G07 Owner Terminal Priority B](../owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md). No unapproved event-generation tie-breaker is invented.
- Typed contracts are semantic; exact schema and API field names remain unapproved where source says TBD.
- Where source summaries lack precise parameters, assert the documented invariant and flag finer-grained numeric oracle as BLOCKED rather than invent values.
- This document does **not** independently verify the 110 G09 Owner approvals, reported 216 ability-specific approvals, or G01–G08 original decisions.
- **11 governance/evidence decisions** (TC46, TC47, TC49, TC50; FR1, FR14, FR15, FR20, FR21, FR22, FR25) require separate process checklists, not ordinary runtime cases.
- G04/G06 memory and queue benchmark limits remain unbenchmarked; Crushing Strike remains TBD; DOCSYNC-01/02 in-place synchronization remains open.

## Suggested next steps (Owner approval required)

1. Re-audit semantic coverage against the **combined 83+30** designed cases; do not presume all earlier P/G ratings have been resolved.
2. Optionally prepare test execution plan/harness design, without code.
3. Continue source verification for G09 and individual ability decisions before labeling anything Source Verified.

**Preservation:** Only this new file is added. No existing test specification, audit, decision register, addendum, or source file is edited, overwritten, or deleted.

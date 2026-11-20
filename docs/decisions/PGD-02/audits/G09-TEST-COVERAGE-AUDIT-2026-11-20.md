# PGD-02.DOC-13 A — Test Coverage Audit (G09 CR/GR/TC/FR)

**Date:** 2026-11-20  
**Scope:** Review existing [83-case G01–G09 Test Specification](../tests/G01-G09-TEST-SPECIFICATION-2026-11-20.md) against the [G09 110-ID Decision Register](../registers/G09-DECISION-REGISTER.md) and [G09 Technical Contract](../contracts/G09-TECHNICAL-CONTRACT.md).  
**Authorization:** Owner selected PGD-02.DOC-13 A, read-only comparison and a **new** report; do not overwrite any existing document.  
**Status:** COVERAGE AUDIT ONLY — NOT EXECUTED, NOT IMPLEMENTATION VERIFIED.  
**Evidence:** G09 decision register is conversation-derived; original approvals still Source Pending Verification.

## Method and rating

This is a **semantic manual coverage assessment**, not a text search for IDs. Ranges in the existing specification (e.g., TC1–10) are not automatically counted as ten covered requirements. Each decision is classified once:

- **D — Direct:** at least one existing case's setup and expected assertion meaningfully checks the core rule. Does not imply all edge cases are covered.
- **P — Partial:** related scenario exists but misses a distinct assertion, ordering permutation, or full edge condition.
- **G — Gap:** no sufficiently relevant existing assertion; add a test if Owner later authorizes a test-spec extension.
- **M — Meta/governance:** review, evidence, design-closure or test-process requirement; assess by documentation workflow rather than a runtime test.
- **NOT RUN:** all 83 tests, regardless of D/P/G/M.

A listed test ID is the **closest existing test**, not proof that the source decision is fully verified. G07 Owner B is treated separately from the older historical G07 source discrepancy.

## Summary

| Group | D | P | G | M | Total |
|---|---:|---:|---:|---:|---:|
| CR | 14 | 8 | 3 | 0 | 25 |
| GR | 6 | 3 | 1 | 0 | 10 |
| TC | 33 | 12 | 1 | 4 | 50 |
| FR | 16 | 2 | 0 | 7 | 25 |
| **TOTAL** | **69** | **25** | **5** | **11** | **110** |

**Interpretation:** 69 decisions have a directly relevant designed assertion; 25 have partial coverage; 5 are missing; 11 are governance/evidence requirements not suited to simple gameplay runtime assertions. These are **audit classifications**, not test PASS results. A D classification does not certify full decision coverage or original Owner source verification.

## Decision-by-decision traceability

### G09.CR1–CR25

| Decision | Closest existing case | Rating |
|---|---|---|
| G09.CR1 | CORE-05 | D |
| G09.CR2 | CORE-09 | D |
| G09.CR3 | ABL-20 | D |
| G09.CR4 | CORE-05 | P |
| G09.CR5 | ABL-26 | D |
| G09.CR6 | ABL-10 | D |
| G09.CR7 | CORE-12 | D |
| G09.CR8 | — | G |
| G09.CR9 | CORE-08 | D |
| G09.CR10 | CORE-04 | D |
| G09.CR11 | CORE-08 | P |
| G09.CR12 | ABL-17 | D |
| G09.CR13 | ABL-13 | D |
| G09.CR14 | CORE-08 | D |
| G09.CR15 | ABL-06 | P |
| G09.CR16 | ABL-10 | D |
| G09.CR17 | CORE-12 | D |
| G09.CR18 | ABL-08 | P |
| G09.CR19 | ABL-16 | P |
| G09.CR20 | ABL-22 | P |
| G09.CR21 | — | G |
| G09.CR22 | CORE-06 | D |
| G09.CR23 | ABL-24 | P |
| G09.CR24 | — | G |
| G09.CR25 | CORE-02 | P |

### G09.GR1–GR10

| Decision | Closest existing case | Rating |
|---|---|---|
| G09.GR1 | CORE-06 | D |
| G09.GR2 | CORE-09 | D |
| G09.GR3 | ABL-26 | D |
| G09.GR4 | ABL-25 | D |
| G09.GR5 | CORE-07 | D |
| G09.GR6 | ABL-23 | P |
| G09.GR7 | ABL-23 | P |
| G09.GR8 | — | G |
| G09.GR9 | ABL-23 | D |
| G09.GR10 | ABL-23 | P |

### G09.TC1–TC50

| Decision | Closest existing case | Rating |
|---|---|---|
| G09.TC1 | ARCH-01 | P |
| G09.TC2 | ARCH-03 | D |
| G09.TC3 | ARCH-03 | D |
| G09.TC4 | ARCH-01 | P |
| G09.TC5 | ARCH-03 | P |
| G09.TC6 | ARCH-02 | D |
| G09.TC7 | ARCH-02 | D |
| G09.TC8 | ABL-05 | P |
| G09.TC9 | — | G |
| G09.TC10 | CORE-02 | D |
| G09.TC11 | CORE-05 | P |
| G09.TC12 | CORE-05 | D |
| G09.TC13 | CORE-05 | D |
| G09.TC14 | ABL-24 | D |
| G09.TC15 | CORE-06 | D |
| G09.TC16 | CORE-07 | D |
| G09.TC17 | CORE-07 | P |
| G09.TC18 | CORE-07 | D |
| G09.TC19 | CORE-07 | D |
| G09.TC20 | CORE-08 | P |
| G09.TC21 | CORE-11 | D |
| G09.TC22 | CORE-08 | D |
| G09.TC23 | CORE-09 | D |
| G09.TC24 | CORE-11 | D |
| G09.TC25 | ABL-26 | P |
| G09.TC26 | ABL-11 | P |
| G09.TC27 | ABL-05 | D |
| G09.TC28 | CORE-10 | D |
| G09.TC29 | CORE-10 | D |
| G09.TC30 | ABL-06 | D |
| G09.TC31 | ARCH-04 | D |
| G09.TC32 | CORE-01 | D |
| G09.TC33 | ARCH-04 | D |
| G09.TC34 | CORE-13 | D |
| G09.TC35 | ABL-06 | D |
| G09.TC36 | UEQ-01 | D |
| G09.TC37 | SN-04 | D |
| G09.TC38 | CORE-14 | D |
| G09.TC39 | REC-04 | D |
| G09.TC40 | CORE-14 | D |
| G09.TC41 | ARCH-01 | D |
| G09.TC42 | CORE-02 | D |
| G09.TC43 | UEQ-04 | P |
| G09.TC44 | UEQ-04 | D |
| G09.TC45 | RT-01 | P |
| G09.TC46 | — | M |
| G09.TC47 | — | M |
| G09.TC48 | CORE-14 | P |
| G09.TC49 | — | M |
| G09.TC50 | — | M |

### G09.FR1–FR25

| Decision | Closest existing case | Rating |
|---|---|---|
| G09.FR1 | — | M |
| G09.FR2 | CORE-11 | D |
| G09.FR3 | CORE-13 | D |
| G09.FR4 | REC-04 | D |
| G09.FR5 | ABL-22 | P |
| G09.FR6 | ABL-22 | P |
| G09.FR7 | CORE-10 | D |
| G09.FR8 | CORE-15 | D |
| G09.FR9 | UEQ-04 | D |
| G09.FR10 | CP-04 | D |
| G09.FR11 | REC-03 | D |
| G09.FR12 | SN-04 | D |
| G09.FR13 | SN-04 | D |
| G09.FR14 | — | M |
| G09.FR15 | — | M |
| G09.FR16 | UEQ-05 | D |
| G09.FR17 | TERM-05 | D |
| G09.FR18 | REC-08 | D |
| G09.FR19 | RT-03 | D |
| G09.FR20 | — | M |
| G09.FR21 | TERM-07 | M |
| G09.FR22 | TERM-07 | M |
| G09.FR23 | REC-05 | D |
| G09.FR24 | REC-06 | D |
| G09.FR25 | — | M |

## Priority gaps and recommended additions (not created)

| Priority | Decision(s) | What the current 83-case spec does not assert clearly | Suggested future case |
|---|---|---|---|
| High | CR8 | Attack Speed Buff expiry changes **next** normal attack, not already scheduled interval | New Attack Speed scheduler-expiry test |
| High | CR21 | Damage vs heal same-tick ordering; death is not undone by later healing | New lethal Damage/heal ordering test |
| High | CR24 | Enemy death clears statuses; queued expiry/ticks become inert | New death/status cleanup test |
| High | GR8 | Max HP decrease clamps current HP to new maximum | New Max HP clamp test |
| High | TC9 | No fixed tick-rate assumption; Game Time vs wall-clock conversion | New clock abstraction test |
| Medium | CR4/CR23 | Sequential same-tick target revalidation and direct vs redirected Guardian Damage | Separate ordering permutations |
| Medium | CR11/CR19 | Shield creation/break vs Fusion tie-order cases | Queue-order Shield/Fusion tests |
| Medium | CR12/CR15/CR20/CR25 | Multihit snapshot, Fusion vs shot, same-source Alpha Howl refresh, activation vs owner death | Focused per-order tests |
| Medium | TC8/TC20/TC26/TC43/TC45 | Per-effect snapshots, status aggregation, projectile identity, result codes and failure taxonomy | Dedicated contract-level assertions |
| Medium | FR5/FR6 | Buff key and source/recipient lifetime across Fusion/death | Explicit provenance and lifecycle matrix |
| Governance | TC46/47/49/50; FR1/14/15/20/21/22/25 | Test matrix/closure/evidence handoff not executable gameplay assertions | Separate documentation/audit checklist |

**Other partial cases:** See the full P rows in the traceability tables. The recommended new tests are **proposals**, not new approved gameplay decisions. No test IDs or files have been added to the original specification.

## Additional cross-system and ability limitations

- **12/12 abilities represented:** 26 dedicated ABL tests, but not all G09 per-ability edge cases and the reported 216 original ability decisions are independently mapped.
- **G01–G08:** existing system tests cover major reported contracts, but 199 original individual decisions remain unverified.
- **G04/G06 performance:** 16MiB soft, 32MiB hard, 250 events/tick remain unbenchmarked; exact threshold/overflow behavior needs source clarification before precise PASS assertions.
- **Crushing Strike:** still TBD; do not invent a test oracle for its mechanics.
- **G07:** TERM-01/02/03 explicitly test **Owner B First Resolved Terminal Event Wins**; TERM-07 is a documentation evidence check, not a runtime test. Original historical G07 provenance remains pending.
- **DOCSYNC-01/02:** Addenda exist, but in-place documentation synchronization remains open; this audit does not close those tracks.

## Proposed next steps — Owner choice required

A. Create a **separate test-gap extension** for G/P cases, without modifying the 83-case original.  
B. Prepare a **test execution plan** and harness design, without code.  
C. Continue **original source verification** before expanding tests.  
D. Hold existing specification and audit as-is.

No option is auto-selected. This report creates no gameplay rules, does not execute tests, and does not modify any existing file.

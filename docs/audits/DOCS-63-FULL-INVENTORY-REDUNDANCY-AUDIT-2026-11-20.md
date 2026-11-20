# DOCS-63 — Full Documentation Redundancy & Consistency Audit

**Repository:** `veejvn/minecraft-fusion-defense` / `main`  
**Date:** 2026-11-20  
**Owner authorization:** Deep review (option B), **no delete, move or overwrite** without explicit approval.  
**Scope:** all **63 files** under `docs/`: **61 Markdown**, one `.gitkeep`, one PNG.  
**Audit mode:** GitHub tree inventory + direct reading of each Markdown document. This is a documentation review, **not** a fresh code execution, link HTTP availability test, or implementation acceptance.

## Executive findings

1. **No proven byte-for-byte redundant document recommended for deletion.** Similar subject matter is not enough to declare a historical decision, proposal, audit, implementation report or acceptance gate redundant.
2. **Highest-risk problem is stale current-state language**, especially G07 terminal priority: the new explicit [Owner B decision](decisions/PGD-02/owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md) and [GAP-01 resolution addendum](decisions/PGD-02/audits/GAP-01-RESOLUTION-ADDENDUM-2026-11-20.md) resolve the **current gameplay rule**. The historical original G07 approval remains **PENDING EVIDENCE**. Older documents below preserve the earlier state and must not override Owner B.
3. **DOCSYNC-01/02 are only partially reconciled** by two new addenda; original Ability Catalog and PGD-01 are intentionally untouched. Their Draft/TBD statements are historical, not automatic overrides of later conversation-derived G09 descriptions. Original individual G09 approval evidence remains pending.
4. **T-03 FAIL and subsequent PASS are chronological, not duplicates.** [T-03 Final Acceptance](reports/T-03-FINAL-ACCEPTANCE.md) records pre-remediation failure; [T-03 Recheck](reports/T-03-FINAL-ACCEPTANCE-RECHECK.md) records post-remediation technical PASS, with runtime gameplay dataset still blocked.
5. **Tests are complementary:** original 83-case specification + 30-case extension = 113 designed cases, **zero G01–G09 runtime cases executed**. DOC-13 coverage audit is a pre-extension baseline, not current 113-case coverage proof.
6. **Documentation Policy** explicitly says a file being in GitHub does not make Draft/Proposed/TBD approved. Do not silently resolve conflicts by publication date alone.

## Inventory: every path and recommended retention

Classification is a **review recommendation**, not an Owner-approved deletion/archival action:
- **CORE:** keep active reference, subject to provenance/status qualifications.
- **HIST:** retain historical audit, proposal, implementation or acceptance evidence.
- **INDEX:** keep index/register; may need a separate current-status pointer.
- **ARTIFACT:** retain asset or placeholder; no deletion proposed.

| # | Path | Classification | Observation |
|---:|---|---|---|
| 1 | `docs/DOCUMENTATION_POLICY.md` | CORE | Distinct topical reference; keep |
| 2 | `docs/DOCUMENTATION_STATUS.md` | CORE | Long historical Notion sections; repository policy overrides old Notion authority |
| 3 | `docs/architecture/CODING_STANDARDS.md` | CORE | Distinct topical reference; keep |
| 4 | `docs/architecture/DATA_ARCHITECTURE.md` | CORE | Distinct topical reference; keep |
| 5 | `docs/architecture/GAME_ENGINE_ARCHITECTURE.md` | CORE | Distinct topical reference; keep |
| 6 | `docs/architecture/TECHNICAL_ARCHITECTURE.md` | CORE | Distinct topical reference; keep |
| 7 | `docs/assets/ASSET_GUIDELINES.md` | CORE | Distinct topical reference; keep |
| 8 | `docs/assets/AUDIO_GUIDELINES.md` | CORE | Distinct topical reference; keep |
| 9 | `docs/assets/SPRITE_GUIDELINES.md` | CORE | Distinct topical reference; keep |
| 10 | `docs/decisions/ADR/.gitkeep` | ARTIFACT | Empty ADR directory placeholder; low-value candidate only |
| 11 | `docs/decisions/PGD-01-STEEL-GUARDIAN.md` | CORE | Distinct topical reference; keep |
| 12 | `docs/decisions/PGD-02/DECISION_INDEX.md` | INDEX | Traceability/index; source verification still required |
| 13 | `docs/decisions/PGD-02/README.md` | INDEX | Contains pre-Owner-B G07 status; interpret historically |
| 14 | `docs/decisions/PGD-02/SOURCE_REGISTER.md` | INDEX | Traceability/index; source verification still required |
| 15 | `docs/decisions/PGD-02/addenda/ABILITY-CATALOG-G09-ADDENDUM-2026-11-20.md` | CORE | Later G09 transcription, original Owner approvals pending |
| 16 | `docs/decisions/PGD-02/addenda/STEEL-GUARDIAN-IRON-BASTION-G09-ADDENDUM-2026-11-20.md` | CORE | Later G09 transcription, original Owner approvals pending |
| 17 | `docs/decisions/PGD-02/audits/DOCSYNC-ABILITY-STEEL-GUARDIAN-AUDIT-2026-11-20.md` | HIST | Time-scoped evidence or proposal; do not treat as latest approval |
| 18 | `docs/decisions/PGD-02/audits/G01-G08-CROSS-SYSTEM-REVIEW.md` | HIST | Contains pre-Owner-B G07 status; interpret historically |
| 19 | `docs/decisions/PGD-02/audits/G01-G08-SOURCE-TRACE-2026-11-20.md` | HIST | Contains pre-Owner-B G07 status; interpret historically |
| 20 | `docs/decisions/PGD-02/audits/G09-FINAL-AUDIT.md` | HIST | Contains pre-Owner-B G07 status; interpret historically |
| 21 | `docs/decisions/PGD-02/audits/G09-TEST-COVERAGE-AUDIT-2026-11-20.md` | HIST | Coverage snapshot of 83 tests; predates 30-case extension |
| 22 | `docs/decisions/PGD-02/audits/GAP-01-RESOLUTION-ADDENDUM-2026-11-20.md` | HIST | Time-scoped evidence or proposal; do not treat as latest approval |
| 23 | `docs/decisions/PGD-02/audits/GAP_REGISTER.md` | HIST | Contains pre-Owner-B G07 status; interpret historically |
| 24 | `docs/decisions/PGD-02/audits/PRE-CODING-DESIGN-READINESS-2026-11-20.md` | HIST | Time-scoped evidence or proposal; do not treat as latest approval |
| 25 | `docs/decisions/PGD-02/contracts/G09-TECHNICAL-CONTRACT.md` | CORE | Contains pre-Owner-B G07 status; interpret historically |
| 26 | `docs/decisions/PGD-02/owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md` | CORE | Current explicit Owner B decision, high authority |
| 27 | `docs/decisions/PGD-02/proposals/DOCSYNC-ABILITY-STEEL-GUARDIAN-PROPOSAL-2026-11-20.md` | HIST | Proposal partially realized by two addenda; retain history |
| 28 | `docs/decisions/PGD-02/registers/G09-ABILITY-REGISTER.md` | INDEX | Contains pre-Owner-B G07 status; interpret historically |
| 29 | `docs/decisions/PGD-02/registers/G09-DECISION-REGISTER.md` | INDEX | Traceability/index; source verification still required |
| 30 | `docs/decisions/PGD-02/systems/G01.md` | CORE | Distinct topical reference; keep |
| 31 | `docs/decisions/PGD-02/systems/G02.md` | CORE | Distinct topical reference; keep |
| 32 | `docs/decisions/PGD-02/systems/G03.md` | CORE | Distinct topical reference; keep |
| 33 | `docs/decisions/PGD-02/systems/G04.md` | CORE | Distinct topical reference; keep |
| 34 | `docs/decisions/PGD-02/systems/G05.md` | CORE | Distinct topical reference; keep |
| 35 | `docs/decisions/PGD-02/systems/G06.md` | CORE | Distinct topical reference; keep |
| 36 | `docs/decisions/PGD-02/systems/G07.md` | CORE | Contains pre-Owner-B G07 status; interpret historically |
| 37 | `docs/decisions/PGD-02/systems/G08.md` | CORE | Distinct topical reference; keep |
| 38 | `docs/decisions/PGD-02/systems/G09.md` | CORE | Distinct topical reference; keep |
| 39 | `docs/decisions/PGD-02/tests/G01-G09-TEST-SPECIFICATION-2026-11-20.md` | CORE | Designed test cases, NOT RUN; complementary files |
| 40 | `docs/decisions/PGD-02/tests/G09-TEST-GAP-EXTENSION-2026-11-20.md` | CORE | Designed test cases, NOT RUN; complementary files |
| 41 | `docs/development/AI_AGENT_GUIDELINES.md` | CORE | Distinct topical reference; keep |
| 42 | `docs/development/DEPLOYMENT.md` | CORE | Distinct topical reference; keep |
| 43 | `docs/development/DEVELOPMENT_WORKFLOW.md` | CORE | Distinct topical reference; keep |
| 44 | `docs/development/TESTING_STRATEGY.md` | CORE | Distinct topical reference; keep |
| 45 | `docs/game-design/ABILITY_CATALOG.md` | CORE | Distinct topical reference; keep |
| 46 | `docs/game-design/ENTITY_CATALOG.md` | CORE | Distinct topical reference; keep |
| 47 | `docs/game-design/FUSION_RECIPES.md` | CORE | Distinct topical reference; keep |
| 48 | `docs/game-design/GAME_BALANCING.md` | CORE | Distinct topical reference; keep |
| 49 | `docs/game-design/LEVEL_DESIGN.md` | CORE | Distinct topical reference; keep |
| 50 | `docs/product/GAMEPLAY_MECHANICS.md` | CORE | Distinct topical reference; keep |
| 51 | `docs/product/GDD.md` | CORE | Distinct topical reference; keep |
| 52 | `docs/product/MVP_SCOPE.md` | CORE | Distinct topical reference; keep |
| 53 | `docs/product/ROADMAP.md` | CORE | Distinct topical reference; keep |
| 54 | `docs/reports/AGENTS-GUIDE-2026-11-13.md` | HIST | Time-scoped evidence or proposal; do not treat as latest approval |
| 55 | `docs/reports/T-02-FINAL-ACCEPTANCE.md` | HIST | Time-scoped evidence or proposal; do not treat as latest approval |
| 56 | `docs/reports/T-02-LOADING-REMOUNT-HARDENING.md` | HIST | Time-scoped evidence or proposal; do not treat as latest approval |
| 57 | `docs/reports/T-02-PRODUCTION-IMPLEMENTATION.md` | HIST | Time-scoped evidence or proposal; do not treat as latest approval |
| 58 | `docs/reports/T-02-R07-CONTROLLED-POC-EXECUTION.md` | HIST | Time-scoped evidence or proposal; do not treat as latest approval |
| 59 | `docs/reports/T-03-FINAL-ACCEPTANCE-RECHECK.md` | HIST | Later technical PASS; gameplay dataset still blocked |
| 60 | `docs/reports/T-03-FINAL-ACCEPTANCE.md` | HIST | Earlier FAIL, superseded for current technical gate but preserve evidence |
| 61 | `docs/reports/T-03-GAME-DATA-FOUNDATION-IMPLEMENTATION.md` | HIST | Time-scoped evidence or proposal; do not treat as latest approval |
| 62 | `docs/reports/T-03-R01-RUNTIME-BOUNDARY-REMEDIATION.md` | HIST | Time-scoped evidence or proposal; do not treat as latest approval |
| 63 | `docs/reports/artifacts/T-02-hello-scene-candidate.png` | ARTIFACT | Owner-approved T-02 screenshot baseline; retain |

## A. Concrete stale-status conflicts (high priority)

| File | Historical/stale wording | Governing newer evidence | Risk |
|---|---|---|---|
| `docs/decisions/PGD-02/README.md` | G07 conflict or GAP-01 still described as open/pending | [Owner B](decisions/PGD-02/owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md) + [GAP-01 addendum](decisions/PGD-02/audits/GAP-01-RESOLUTION-ADDENDUM-2026-11-20.md) | Reader may implement wrong terminal rule |
| `docs/decisions/PGD-02/audits/GAP_REGISTER.md` | G07 conflict or GAP-01 still described as open/pending | [Owner B](decisions/PGD-02/owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md) + [GAP-01 addendum](decisions/PGD-02/audits/GAP-01-RESOLUTION-ADDENDUM-2026-11-20.md) | Reader may implement wrong terminal rule |
| `docs/decisions/PGD-02/audits/G09-FINAL-AUDIT.md` | G07 conflict or GAP-01 still described as open/pending | [Owner B](decisions/PGD-02/owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md) + [GAP-01 addendum](decisions/PGD-02/audits/GAP-01-RESOLUTION-ADDENDUM-2026-11-20.md) | Reader may implement wrong terminal rule |
| `docs/decisions/PGD-02/systems/G07.md` | G07 conflict or GAP-01 still described as open/pending | [Owner B](decisions/PGD-02/owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md) + [GAP-01 addendum](decisions/PGD-02/audits/GAP-01-RESOLUTION-ADDENDUM-2026-11-20.md) | Reader may implement wrong terminal rule |
| `docs/decisions/PGD-02/contracts/G09-TECHNICAL-CONTRACT.md` | G07 conflict or GAP-01 still described as open/pending | [Owner B](decisions/PGD-02/owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md) + [GAP-01 addendum](decisions/PGD-02/audits/GAP-01-RESOLUTION-ADDENDUM-2026-11-20.md) | Reader may implement wrong terminal rule |
| `docs/decisions/PGD-02/registers/G09-ABILITY-REGISTER.md` | G07 conflict or GAP-01 still described as open/pending | [Owner B](decisions/PGD-02/owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md) + [GAP-01 addendum](decisions/PGD-02/audits/GAP-01-RESOLUTION-ADDENDUM-2026-11-20.md) | Reader may implement wrong terminal rule |
| `docs/decisions/PGD-02/audits/G01-G08-CROSS-SYSTEM-REVIEW.md` | G07 conflict or GAP-01 still described as open/pending | [Owner B](decisions/PGD-02/owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md) + [GAP-01 addendum](decisions/PGD-02/audits/GAP-01-RESOLUTION-ADDENDUM-2026-11-20.md) | Reader may implement wrong terminal rule |
| `docs/decisions/PGD-02/audits/G01-G08-SOURCE-TRACE-2026-11-20.md` | G07 conflict or GAP-01 still described as open/pending | [Owner B](decisions/PGD-02/owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md) + [GAP-01 addendum](decisions/PGD-02/audits/GAP-01-RESOLUTION-ADDENDUM-2026-11-20.md) | Reader may implement wrong terminal rule |

**Nuance:** Old G07 material is not necessarily wrong about *historical provenance*. The **current gameplay rule** is resolved; the **historical source trail** remains unresolved. Preserve that distinction.

## B. Overlap groups and safe interpretation

| Cluster | Overlapping files | Audit finding | Recommended handling |
|---|---|---|---|
| DOCSYNC Ability/Guardian | DOCSYNC audit, DOCSYNC proposal, two G09 addenda, original Ability Catalog and PGD-01 | Different stages: finding → proposal → addendum; original remains unchanged | Mark proposal historical/partially implemented in a **new** index; no deletion |
| G07 evidence | G07 summary, GAP Register, G01–G08 review/source trace, G09 Final Audit, Owner B decision, GAP-01 addendum | Earlier pending rule vs newer explicit decision | Pin Owner B as current; older evidence preserved |
| G09 specification | G09 summary, Technical Contract, Decision Register, Ability Register, two addenda | Summaries vs per-decision indexes vs effect details; overlap intentional | Keep; establish reading order and source-evidence labels |
| Test design | 83 baseline, 30 extension, 83-case coverage audit | Extension adds distinct EXT IDs; coverage audit predates extension | Keep both test sets; new combined coverage audit optional |
| T-02 reports | PoC, implementation, loading/remount hardening, final acceptance | Progressive evidence with separate scopes | Keep final gate as latest T-02 acceptance, retain prior reports |
| T-03 reports | Implementation, initial FAIL, R01 remediation, final PASS recheck | Chronological failure/remediation/recheck | Keep all; latest recheck governs technical gate at its recorded commit |
| Product vs catalogs | GDD, Gameplay Mechanics, Entity/Fusion/Ability/Balance/Level catalogs | Scope-level repetition, but detailed responsibilities differ | Do not merge without line-by-line semantic/Owner review |
| Architecture vs development | Technical/Game Engine/Data architecture, coding standards/workflow/agent guide/testing | Related responsibilities but not duplicates | Keep; avoid treating Proposed interfaces as approved |

## C. Coding-risk findings (not redundancy)

- `docs/game-design/ABILITY_CATALOG.md` retains Draft/TBD cost, cooldown and effect text, while later G09 Addendum records one Crystal, no cooldown and detailed ability rules **as conversation-derived source-pending specifications**.
- `docs/decisions/PGD-01-STEEL-GUARDIAN.md` confirms identity, fusion recipe, Crushing Strike name and Iron Bastion name; Crushing Strike details remain **TBD**. Later G09 Iron Bastion mechanics are separately documented, not individually source verified.
- `docs/decisions/PGD-02/systems/G04.md`: 16MiB/32MiB thresholds unbenchmarked; eviction/admission policy missing.
- `docs/decisions/PGD-02/systems/G06.md`: 4096 queue/32 causal-depth limits reported, overflow policy not established; 250 events/tick unbenchmarked.
- `docs/reports/T-03-FINAL-ACCEPTANCE-RECHECK.md`: game-data infrastructure PASS is **not** production runtime dataset approval.
- `docs/DOCUMENTATION_STATUS.md`: extensive archived Notion sync/history; explicit header says GitHub Markdown authority, so archived links do not reintroduce Notion as authority.

## D. Deletion candidates — evidence standard

| Candidate | Reason for review | Current decision |
|---|---|---|
| `docs/decisions/ADR/.gitkeep` | Placeholder with zero bytes | **Do not delete**: directory placeholder may still be intentional |
| DOCSYNC Proposal | Two addenda already created | **Do not delete**: preserves rationale and non-applied alternatives |
| G09 83-case coverage audit | 30-case extension later created | **Do not delete**: accurate historical baseline; needs fresh combined audit |
| T-03 initial FAIL | Later technical PASS recheck | **Do not delete**: critical remediation evidence |
| Earlier G07 reports | Owner B newer decision | **Do not delete**: important historical source discrepancy |

**No approved deletion, move, merge or overwrite.**

## E. Link audit boundaries

Directly reviewed Markdown link targets and relative reference patterns while reading the files; **no exhaustive automated validation of every internal anchor, raw text path, external URL HTTP status or historical commit URL was completed**. This report therefore does **not** claim zero broken links. The `docs/DOCUMENTATION_STATUS.md` file includes numerous archival Notion URLs, which are not current documentation dependencies.

## F. Suggested Owner choices (not applied)

1. **New CURRENT_STATUS_INDEX.md**: one additive map of current decisions, historical reports, pending source evidence, coding blockers and 113 designed tests.
2. **New link-integrity report**: automated full relative-link/anchor/path validation, plus external URLs separately where possible.
3. **New combined 113-test coverage re-audit**: update coverage conclusions without editing old DOC-13 audit.
4. **Hold**: retain everything unchanged.

## Integrity statement

Only this **new audit report** is added. No existing file is deleted, renamed, moved, merged or overwritten; no gameplay rule is invented or promoted to Owner-confirmed status. No code/tests were run.

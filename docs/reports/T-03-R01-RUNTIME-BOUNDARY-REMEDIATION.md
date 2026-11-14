# T-03-R01 — Runtime Boundary Remediation

**Project:** Minecraft Fusion Defender  
**Date:** 2026-11-14 (Asia/Bangkok)  
**Scope:** Owner-approved minimal source and test correction for F-01/F-02  
**Publication:** Not authorized

## 1. Executive Summary

**T-03-R01 REMEDIATION: PASS.** `loadRuntimeData()` now fails closed for every Ability until an authoritative executable effect contract exists. Its Zod error points to each `abilities[i].effects`. A bundle's self-declared `contentStatus: approved` cannot bypass this check. The unconditional requirement for `cooldownSeconds` was removed; an omitted cooldown stays omitted, while a supplied invalid value still fails the existing category schema. No effect, cooldown rule, technical ID, or gameplay content was invented.

**RUNTIME DATASET: BLOCKED BY UNAPPROVED CONTENT.** The runtime boundary intentionally cannot return a full MVP bundle while Ability effects remain unspecified. This report does not change the earlier T-03 Final Acceptance verdict.

## 2. Owner Authorization

The Owner authorized only the F-01/F-02 remediation, related test updates, and this report. The existing Ability category schema, bundle validation, Phaser runtime, React Host, dependencies, lockfile, prior reports, and approved screenshot were outside the change scope and remain unchanged. No commit, push, PR, deployment, or Notion update was authorized.

## 3. Initial Git State

- Branch: `main`.
- HEAD: `e944f88c843ef0a8653879057f430f668404c30a`.
- Initial `git status --short --untracked-files=all`: empty; no pre-existing changes.
- Actual package scripts: `@mfd/game-data` has `typecheck: tsc --noEmit` and `test: vitest run`; `@mfd/game` has the same script names; web has `build`, `test:e2e`, and `test:production`; root has `typecheck` through Turbo.
- Initial `pnpm --filter @mfd/game-data test` exited `0`, with 22/22 tests passing before edits.

## 4. F-01 Root Cause

`packages/game-data/src/schemas/ability.ts` intentionally has no executable effect contract because Ability effects are TBD. The previous runtime boundary only required cost and cooldown, so its synthetic bundle with twelve effectless Abilities and `contentStatus: approved` passed. The status field is a caller declaration and cannot establish Ability completeness. The prior Final Acceptance report identified this as F-01.

## 5. F-02 Root Cause

The Ability category schema represented `cooldownSeconds` as optional, matching the unresolved per-Ability cooldown decision in `ABILITY_CATALOG.md`. The runtime boundary nevertheless rejected every Ability without that field. This imposed a universal cooldown requirement before the Owner had made that gameplay decision.

## 6. Source Changes

Only `packages/game-data/src/runtime.ts` changed in production source. Its per-Ability runtime check now emits a custom Zod issue at `abilities[index].effects` explaining that the executable Ability effect contract is not approved. This issue is unconditional while the contract is absent, so a nominally approved bundle remains non-runnable. The unconditional `cooldownSeconds` presence check was removed. Existing cost, MVP count, stat, Wave, Level, resource, structural, version, and reference checks were retained.

Neither `ability.ts` nor `bundle.ts` changed. No fake effect schema, completeness flag, default cooldown, or migration path was introduced.

## 7. Test Changes

Only `packages/game-data/tests/validation.test.ts` changed. It now verifies that an effect-incomplete Ability remains valid at the category level, valid/invalid supplied cooldown values are distinguished, an explicitly incomplete bundle still passes structural validation, and runtime validation rejects effectless Abilities even when `contentStatus` says `approved`. The old runtime-success assertion was replaced. A separate test removes one cooldown, confirms it stays undefined after structural parsing, confirms the effect issue remains, and confirms no cooldown-required issue appears.

Runtime tests inspect relevant Zod issue paths and messages, so the effect, content-status, Defender-stat, Level, and Wave assertions cannot pass solely due to an unrelated validation failure. Existing ID/reference, version, Fusion order independence, and resource cases remain in the same suite. No fictional fixture values were changed or promoted to gameplay data.

## 8. Validation Evidence

| Exact command | Exit | Tests | Result | Evidence |
| --- | ---: | ---: | --- | --- |
| `pnpm --filter @mfd/game-data test` (pre-edit baseline) | 0 | 22/22 | PASS | Existing behavior baseline. |
| `pnpm --filter @mfd/game-data test` (new tests, before source fix) | 1 | 22 passed, 3 failed of 25 | EXPECTED FAIL | Missing-effect rejection cases exposed the old runtime behavior; structural cases stayed passing. |
| `pnpm --filter @mfd/game-data typecheck` (after source fix) | 0 | — | PASS | Fresh `tsc --noEmit`. |
| `pnpm --filter @mfd/game-data test` (after source fix) | 0 | 25/25 | PASS | All structural, reference, runtime, and new regression cases passed. |
| `pnpm --filter @mfd/game test` | 0 | 11/11 | PASS | Existing Game Factory/lifecycle unit tests. |
| `pnpm typecheck` | 0 | 3/3 package tasks | PASS | Game Data recompiled; Turbo replayed cached game/web typechecks. Web build then ran its TypeScript phase. |
| `pnpm --filter @mfd/web build` | 0 | — | PASS | Next.js 16.4.5 compiled and generated static `/`. |
| `pnpm --filter @mfd/web exec playwright test --config tests/e2e/hardening.config.cjs` | 0 | 6/6 | PASS | Chromium Host hardening suite. |
| `pnpm --filter @mfd/web test:e2e` | 0 | 6/6 | PASS | Real Phaser Host fixture suite; approved screenshot preserved. |
| `pnpm --filter @mfd/web test:production` | 0 | 1/1 | PASS | Built homepage hydration. |
| `git diff --check` | 0 | — | PASS | No whitespace errors; Git printed only line-ending conversion warnings. |

## 9. T-02 Regression Evidence

No T-02 production or test file was edited. The Game Factory/adapter tests passed 11/11, Host hardening 6/6, real Phaser E2E 6/6, and production homepage 1/1. The real browser suite preserved the screenshot candidate; SHA-256 remains `63D90389565B11803A97FC881292E54B2882343D6D4B0D4448DCCFC683971F15`.

## 10. Remaining Ability TBDs

The executable Ability effect contract, individual effects and targeting, Power Crystal costs, whether any particular Ability has a cooldown, cooldown durations where applicable, and Steel Guardian's Ability technical ID/details remain unapproved. This task assigned none of those values.

## 11. Runtime Boundary Limitations

The current boundary deliberately rejects every full MVP candidate because its twelve Abilities cannot yet be validated for executable effects. `validateGameData()` continues to accept structurally valid incomplete bundles; that is separate from runtime readiness. The boundary still has no production Game Definition dataset and is not integrated into Phaser. Future approved effect contracts and content must be modeled and verified before a runtime bundle can be returned. No actual production dataset is now executable.

## 12. Files Modified

- Modified `packages/game-data/src/runtime.ts` for fail-closed Ability validation and removal of the universal cooldown presence check.
- Modified `packages/game-data/tests/validation.test.ts` for targeted F-01/F-02 and preserved-invariant assertions.
- Created this remediation report.
- No schema, bundle, dependency, lockfile, T-02 file, previous report, or screenshot was modified.

## 13. Final Git State

Branch and HEAD remain `main` and `e944f88c843ef0a8653879057f430f668404c30a`. Final `git status --short --untracked-files=all`:

```text
 M packages/game-data/src/runtime.ts
 M packages/game-data/tests/validation.test.ts
?? docs/reports/T-03-R01-RUNTIME-BOUNDARY-REMEDIATION.md
```

`git diff --check` exited `0`; `git diff --stat` showed 4 changed lines in `runtime.ts` and 52 changed lines in `validation.test.ts`. The report is untracked and therefore absent from `git diff --stat`. No pre-existing user work was overwritten and nothing was staged or published.

## 14. Final Remediation Verdict

**F-01: REMEDIATED — FAIL-CLOSED**  
**F-02: REMEDIATED — NO UNIVERSAL COOLDOWN REQUIREMENT**  
**T-03-R01 REMEDIATION: PASS**  
**RUNTIME DATASET: BLOCKED BY UNAPPROVED CONTENT**

The previous T-03 Final Acceptance verdict remains unchanged. This corrective task is not a new final acceptance gate.

## 15. Owner Review Required

The Owner can review the two-file diff and current test evidence. A later, separately authorized decision must define the executable Ability effect contract and approved content before runtime data can become ready. Commit, push, PR, and deployment remain unauthorized.

**STOP — WAIT FOR OWNER REVIEW.**

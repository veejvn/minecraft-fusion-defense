# T-02 Loading / Remount Hardening — Execution Report

**Project:** Minecraft Fusion Defender  
**Date:** 2026-11-13 (Asia/Bangkok)  
**Scope:** Controlled loading/remount bug fix; no publication authorized.

## 1. Executive Summary

Two Host behaviors were reproduced before changing production code: with animation frames suspended, a terminal cleanup failure left `Loading Phaser...` visible; with a temporarily owned host, the factory was called 30 times in roughly 400 ms. The Host now retries with a cancellable timer and exponential backoff (50 ms to 500 ms). A host still owned after 6 seconds produces the existing `Failed to initialize Phaser.` message. The time limit reports failure only; it never releases ownership or creates a Game.

The Phaser adapter, factory, public `GameHandle`, Hello Scene, dependency versions, and gameplay code were unchanged. Final hardening and T-02 regression checks passed. The original screenshot candidate remains unapproved and byte-identical.

## 2. Initial Git State

- Branch: `main`; HEAD: `700c7498085fdd48b9051060c792f53f777bf2e8`.
- Initial `git status --short`: empty; no pre-existing modifications or untracked files.
- The T-02 implementation and its original report were present at HEAD and matched the approved Phaser 3.90.0 baseline.
- Installed direct versions checked with `pnpm list --depth 0`: `phaser 3.90.0`, `vitest 3.2.4`, `@playwright/test 1.56.1`, `vite 7.0.0`.
- The existing screenshot candidate SHA-256 was `63D90389565B11803A97FC881292E54B2882343D6D4B0D4448DCCFC683971F15`.

## 3. Confirmed Defects vs Hypotheses

**Confirmed before fix:** (1) the real production React Host remained in loading after a test-only game module changed from `HostOwnedError` to `HostCleanupError` while `requestAnimationFrame` callbacks were suspended; (2) ownership retry called the factory once per frame, 30 times over about 400 ms in Chromium.

**Not independently reproduced with real Phaser:** a naturally stalled or throwing `runDestroy`, and actual browser background-tab timer throttling. The existing adapter unit tests inject incomplete, throwing, and stalled teardown; the new browser fixture injects only the game-module outcomes while rendering the actual production Host.

## 4. Reproduction Evidence

The new isolated Vite fixture aliases `@mfd/game` to a test-only module. It imports the unchanged production `PhaserHost` through the existing React fixture. The fake module can report an owned, failed, or free host; it does not duplicate Host logic or alter production bundles.

Before the fix, `pnpm --filter @mfd/web exec playwright test --config tests/e2e/hardening.config.cjs` exited `1`: two tests failed and two passed. The suspended-frame test timed out waiting for `Failed to initialize Phaser.` after a terminal failure. The retry-rate test recorded `OWNED_RETRY_ATTEMPTS=30` against a limit of four in 400 ms. The unmount-cancellation and verified-release recovery tests passed before the fix.

## 5. Root Cause Analysis

The Host handled `HostOwnedError` only by scheduling `requestAnimationFrame(create)`. A suspended animation-frame queue prevented the Host from making another factory call, so it could not observe the adapter's later terminal `HostCleanupError`. While frames ran normally, it retried at display refresh frequency regardless of whether cleanup had progressed. The adapter's five-second watchdog correctly retained ownership and reported a stall; it had no public status field or callback in the approved `GameHandle`, and no API change was needed for the Host fix.

## 6. Minimal Production Changes

Only `apps/web/components/game/phaser-host.tsx` changed in production. Its ownership retry now uses a single `window.setTimeout`, starting at 50 ms and doubling to a 500 ms maximum. The effect cleanup cancels the pending timer. After 6 seconds of continued `HostOwnedError`, the Host logs the error and displays the existing failure message. This bound is a failure-reporting limit, **not** a cleanup-completion signal. A successful retry is possible only when `createGame` accepts the host after adapter-verified release.

The factory and lifecycle adapter were read and tested but not modified. No public method, cleanup Promise, status, or callback was added.

## 7. R-07 Safety Verification

- Real Phaser Chromium regression still rejects a duplicate Game immediately after destroy request and at `DESTROY`; remount succeeds only after verified teardown.
- Adapter unit tests still verify incomplete, throwing, and stalled teardown keep the host locked, repeat destroy is idempotent, and an old Game cannot release a newer owner.
- The Host's 6-second bound changes only its loading/error state; it never clears adapter ownership, removes a canvas as proof, or weakens the positive teardown checks.
- No unhandled Promise rejection was observed in the existing browser regression; first-render ready and cancellation tests remained passing.

## 8. Retry and Error-State Behavior

When ownership is temporary, the Host remains loading and retries with backoff; the fixture reached ready after the fake module marked the host free, and created exactly one Game. When the module reports `HostCleanupError`, the next timer callback stops retrying and shows `Failed to initialize Phaser.`. When ownership never clears, the Host reports the same error after 6 seconds, retaining the host lock. Unmount cancels pending retry work. The actual adapter watchdog remains at five seconds and never releases ownership on elapsed time.

## 9. Background-Tab Behavior

A Chromium test suspended animation-frame callbacks while using the actual production Host. Before the fix, terminal failure was not surfaced; after the fix, the timer-based retry surfaced the error. This tests suspended frame scheduling, not a real OS-backgrounded tab. Browser timers can themselves be throttled in background tabs, so exact wall-clock error latency there remains unverified. No global visibility listener or production debug hook was added.

## 10. Test Results

| Test ID | Result | Evidence | Limitation |
| --- | --- | --- | --- |
| FIX-01 Normal mount/first render | PASS | Existing real-Phaser E2E loading → canvas/ready. | Chromium. |
| FIX-02 Normal unmount/remount | PASS | Existing E2E; canvas count returns to zero and then one. | DOM count supplemented by adapter tests. |
| FIX-03 Strict Mode replay | PASS | Existing fixture wraps actual Host in `StrictMode`. | Chromium fixture. |
| FIX-04 Temporarily owned host | PASS | Test-only owned → free module; Host recovers with one Game. | Module outcome simulated. |
| FIX-05 Cleanup beyond watchdog | PASS | Existing Vitest fake-timer adapter test retains lock at 5 s; new Host fixture shows error after simulated 5 s failure. | Failure injection, not a real Phaser stall. |
| FIX-06 Incomplete cleanup return | PASS | Existing adapter unit test keeps host locked and reports failure. | Mocked Phaser teardown. |
| FIX-07 Cleanup throws | PASS | Existing adapter unit test keeps host locked and reports failure. | Mocked Phaser teardown. |
| FIX-08 Suspended animation frames | PASS | New Host Chromium test failed before fix and passed after timer retry. | Actual background tab NOT RUN. |
| FIX-09 Unmount during retry | PASS | New Host Chromium test: no later attempts or error UI after unmount. | Fake owned module. |
| FIX-10 Late import after unmount | PASS | Existing real production Host E2E. | Chromium fixture. |
| FIX-11 Initialization failure | PASS | Existing real Host E2E shows approved failure text after module load failure. | Injected network failure. |
| FIX-12 Recovery after verified cleanup | PASS | Existing real-Phaser same-host factory test and new Host owned → free test. | Host fake test models release; real factory test verifies adapter release. |

The new hardening suite passed **6/6** after the final change. The two confirmed defects failed before the production fix and passed after it. Other entries represent existing regressions or test-only failure injection as labeled.

## 11. Regression Results

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm --filter @mfd/game typecheck` | 0 | PASS |
| `pnpm --filter @mfd/web typecheck` | 0 | PASS |
| `pnpm typecheck` | 0 | PASS; two workspace packages successful |
| `pnpm --filter @mfd/game test` | 0 | PASS; 11 unit tests |
| `pnpm --filter @mfd/web exec playwright test --config tests/e2e/hardening.config.cjs` | 0 | PASS; 6 Host hardening tests |
| `pnpm --filter @mfd/web build` | 0 | PASS; Next.js production build and TypeScript phase |
| `pnpm --filter @mfd/web test:e2e` | 0 | PASS; 6 real-Phaser Chromium tests |
| `pnpm --filter @mfd/web test:production` | 0 | PASS; built homepage Chromium test |
| `git diff --check` | 0 | PASS; line-ending warnings only |

The existing visual, responsive 16:9, Canvas fallback, normal cleanup/remount, delayed-import, and production SSR/hydration checks remained passing. No gameplay or direct dependency was added. Test-started servers on ports 3000, 5182, and 5183 were confirmed stopped.

## 12. Screenshot Baseline Status

The candidate `docs/reports/artifacts/T-02-hello-scene-candidate.png` remains **PENDING Owner approval**. The existing E2E test now skips writing it when present. SHA-256 before and after regression was identical: `63D90389565B11803A97FC881292E54B2882343D6D4B0D4448DCCFC683971F15`. No screenshot comparison was run or claimed PASS.

## 13. Remaining Risks

- Real background-tab timer throttling was not measured; suspended animation frames were simulated in Chromium.
- A permanently owned host shows an error after six seconds but stays owned. Recovery requires verified adapter cleanup; this is intentional fail-closed behavior.
- Private `runDestroy` behavior remains pinned to Phaser 3.90.0 and requires renewed verification before a version change.
- The new browser failure fixture simulates factory outcomes; it does not reproduce a real GPU/renderer teardown failure.

## 14. Owner Decisions Required

No new API or dependency decision is required for this fix. Owner review is still needed before publication. The original T-02 screenshot candidate still requires separate approval as a visual baseline. The six-second Host failure-reporting bound is documented here for review; it never authorizes host reuse.

## 15. Final Git Status

Branch remains `main` at `700c7498085fdd48b9051060c792f53f777bf2e8`. Changed files are `apps/web/components/game/phaser-host.tsx` and `apps/web/tests/e2e/phaser-host.spec.cjs`. New files are `apps/web/tests/e2e/hardening.config.cjs`, `apps/web/tests/e2e/hardening.spec.cjs`, `apps/web/tests/fixtures/hardening/fake-game.ts`, `apps/web/tests/fixtures/hardening/vite.config.ts`, and this report. The original T-02 implementation report and screenshot candidate were not modified.

Public `GameHandle` is unchanged. R-07 positive cleanup verification remains intact. Phaser remains exact `3.90.0`. The Hello Scene is unchanged. No new dependencies or gameplay were added. No commit, push, PR, or deployment occurred. Stop for Owner review.

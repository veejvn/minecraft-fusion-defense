# T-02 — Production Implementation Report

**Project:** Minecraft Fusion Defender  
**Date:** 2026-11-11 (Asia/Bangkok)  
**Scope:** Phaser Integration Foundation, five gated checkpoints  
**Implementation status:** Code and automated verification PASS; screenshot baseline approval PENDING.  
**Publication status:** Not authorized; no commit, push, PR, or deployment.

## 1. Executive Summary

T-02 now has a minimal `@mfd/game` package with the approved Hello Scene, a public `createGame(host): GameHandle` factory, a private Phaser 3.90.0 cleanup adapter, and a React Client Host on the existing homepage. The Host imports the package inside `useEffect`. The page retains the existing heading and placeholder. No gameplay was implemented.

Final checks passed: package/web/workspace typecheck, Next.js production build, 11 Vitest tests, six Chromium fixture tests, one Chromium test of the built homepage, and Stage 1 smoke tests M-01–M-05. A screenshot candidate was saved but is **not** an Owner-approved baseline, so screenshot comparison remains **PENDING**. Full T-02 acceptance and publication require Owner review.

## 2. Initial Repository State

- Repository: `D:\Code\game\minecraft-fusion-defense`.
- Branch: `main`; HEAD: `ec36e2d362d9d1e27acd191fd92a9e78a03b647b`.
- Initial working tree: clean (`git status --short` empty).
- Initial HEAD already contained the committed R-07 PoC and its report. No PoC file was overwritten.
- Root uses pnpm `10.20.0`; installed Node.js was `v24.19.0`.
- `packages/game` existed as an empty scaffold; `apps/web` contained the T-01 Next.js foundation.
- Notion connector and `notion-get-enabled-skills` were unavailable in this execution environment. This report is stored in the repository as requested, not in Notion.

## 3. CP-01 Results — Game Package and Hello Scene

**Status: PASS.** Created `@mfd/game` with package manifest, TypeScript configuration, a single public entry point, Game Factory, and internal Hello Scene. Phaser is a direct exact dependency at `3.90.0`; the web app links `@mfd/game` through `workspace:*` and Next transpiles the workspace package.

The Game Factory uses `Phaser.AUTO`, internal resolution `1280 × 720`, `Phaser.Scale.FIT`, horizontal centering, and the supplied host. The Hello Scene draws background `#1E293B` and centered white Arial `48px` text `Phaser Ready`. The public entry exports only `createGame` and the `GameHandle` type; it does not export the Scene or adapter.

`pnpm --filter @mfd/game typecheck` passed. Later Chromium evidence confirmed the visual output in both WebGL and Canvas fallback paths.

## 4. CP-02 Results — Lifecycle Adapter

**Status: PASS for tested paths.** The adapter lives only in `packages/game/src/core/lifecycle-adapter.ts`. It checks `Phaser.VERSION === '3.90.0'` and that the instance's private `runDestroy` method exists. It wraps that method on each Game instance, preserves the original method's return value, and never patches the global Phaser prototype.

Host ownership is held during active play, after `destroy(true)` is requested, and at `DESTROY`. The adapter releases it only after `runDestroy` returns and confirms the loop stopped, its scheduler/game references and Scene Manager game reference were cleared, the renderer game reference was cleared, `pendingDestroy` is false, and the canvas is no longer inside the host. If teardown throws or these checks fail, the owner remains locked and the error is logged. A 5-second watchdog reports a stalled cleanup and keeps the lock; elapsed time never counts as successful cleanup. Repeat `GameHandle.destroy()` calls are idempotent.

The ready Promise rejects with `GameInitializationCancelledError` if destruction happens before its first render. Rejections have a handler attached. A later destroy does not change an already resolved Promise.

Seven focused adapter unit tests and a real Chromium same-host factory test passed. In Chromium, a duplicate create was rejected immediately and at `DESTROY`; remount succeeded only after the old Game's canvas, loop, and renderer were cleaned. The private-method dependency is intentionally pinned to Phaser 3.90.0 and must be revalidated before a future Phaser upgrade.

## 5. CP-03 Results — Next.js React Host

**Status: PASS.** Added `apps/web/components/game/phaser-host.tsx` as a Client Component and placed it below the existing homepage content. It imports `@mfd/game` dynamically in `useEffect`, cancels creation after unmount, destroys its handle during cleanup, and handles Strict Mode effect replay. A host-ownership rejection schedules another attempt on the next animation frame; only the adapter's verified release permits creation. Cleanup failure is reported as an error rather than treated as a successful remount.

The Host shows `Loading Phaser...` during initialization, `Failed to initialize Phaser.` on failure, and logs technical errors. Its container is centered, at most 1280px wide, and preserves a 16:9 display area. Web typecheck and the built-homepage Chromium test passed. No production route or debug global was added.

## 6. CP-04 Results — Automated Tests

**Status: PASS for automated tests; screenshot baseline PENDING.** `vitest@3.2.4` is installed in `@mfd/game`. Eleven unit tests cover factory configuration/Hello Scene, first-render readiness, cancellation, duplicate ownership, idempotent destroy, normal cleanup, incomplete/throwing/stalled cleanup, missing private API, old-owner isolation, and construction failure.

The isolated Vite React fixture imports the **actual** production `PhaserHost`, which imports `@mfd/game`. It uses Vite `7.0.0` with automatic JSX transform; `@vitejs/plugin-react` was not installed. Six Chromium tests cover Strict Mode mount/unmount/remount, responsive 16:9 scaling, Canvas fallback, unmount before dynamic import finishes, module-import failure, and same-host ownership through real Phaser teardown. A separate Chromium test exercises the built production homepage.

The screenshot candidate is `docs/reports/artifacts/T-02-hello-scene-candidate.png` (1280 × 720). It was visually inspected: the dark background and centered white text match the approved Hello Scene. No snapshot baseline was approved and no tolerance was invented; screenshot comparison is **PENDING** Owner approval.

## 7. CP-05 Results — Final Verification

**Status: PASS for executed checks; baseline approval PENDING.** Final package, web, and workspace typechecks passed. The final Next.js 16.4.5 production build compiled, passed its TypeScript phase, and generated the static `/` route. Final tests passed: Vitest `11/11`, Vite-fixture Playwright `6/6`, built-homepage Playwright `1/1`.

Development server started on port 3000 and returned HTTP 200 HTML with the heading, placeholder, and loading markup. Production server started from the current build and returned the same required HTTP evidence. Both task-launched servers were stopped. `git diff --check` exited `0`; Git printed only line-ending conversion warnings.

## 8. Dependency Changes

| Package | Location | Declaration | Verification |
| --- | --- | --- | --- |
| `phaser` | `packages/game` dependencies | Exact `3.90.0` | Existing PoC metadata and installed package; browser Canvas/WebGL tests. |
| `vitest` | `packages/game` devDependencies | Exact `3.2.4` | Published metadata checked: Node `^18 || ^20 || >=22`; compatible with Node 24.19.0. |
| `@mfd/game` | `apps/web` dependencies | `workspace:*` | pnpm workspace link and Next build. |

The existing approved web test dependencies `@playwright/test@1.56.1` and `vite@7.0.0` were reused. No additional direct dependency or version change was introduced. `pnpm-lock.yaml` records the new workspace link and Vitest dependency graph. pnpm reported that it ignored the `esbuild` build script; the build and browser tests passed despite that warning.

## 9. Exact Files Created or Modified

| Path | Action | Purpose |
| --- | --- | --- |
| `packages/game/package.json` | Created | Package identity, exact Phaser/Vitest dependencies, scripts, public export. |
| `packages/game/tsconfig.json` | Created | Typecheck package source and tests. |
| `packages/game/src/index.ts` | Created | Minimal public API. |
| `packages/game/src/create-game.ts` | Created | Phaser Game Factory and ready/destroy handle. |
| `packages/game/src/scenes/hello-scene.ts` | Created | Approved Hello Scene. |
| `packages/game/src/core/lifecycle-adapter.ts` | Created | Private R-07 ownership and cleanup adapter. |
| `packages/game/tests/create-game.test.ts` | Created | Factory contract and readiness tests. |
| `packages/game/tests/lifecycle-adapter.test.ts` | Created | Ownership, teardown, failure tests. |
| `apps/web/components/game/phaser-host.tsx` | Created | Client Host and React lifecycle. |
| `apps/web/app/page.tsx` | Modified | Adds Host below unchanged heading/placeholder. |
| `apps/web/next.config.ts` | Modified | Transpiles `@mfd/game`. |
| `apps/web/package.json` | Modified | Workspace dependency and E2E scripts. |
| `apps/web/tests/fixtures/index.html` | Created | Isolated Vite fixture page. |
| `apps/web/tests/fixtures/main.tsx` | Created | Strict Mode mount/unmount harness using production Host. |
| `apps/web/tests/fixtures/vite.config.ts` | Created | Vite fixture configuration without React plugin. |
| `apps/web/tests/fixtures/factory-probe.ts` | Created | Browser-only import of the real factory for ownership test. |
| `apps/web/tests/e2e/playwright.config.cjs` | Created | Fixture Chromium runner. |
| `apps/web/tests/e2e/phaser-host.spec.cjs` | Created | Six fixture/adapter browser tests. |
| `apps/web/tests/e2e/production.config.cjs` | Created | Built-homepage Chromium runner. |
| `apps/web/tests/e2e/production-home.spec.cjs` | Created | Production homepage hydration smoke test. |
| `docs/reports/artifacts/T-02-hello-scene-candidate.png` | Created | Screenshot candidate, not an approved baseline. |
| `pnpm-lock.yaml` | Modified | Workspace/dependency lockfile. |
| `docs/reports/T-02-PRODUCTION-IMPLEMENTATION.md` | Created | This execution report. |

Next.js generated an untracked `apps/web/AGENTS.md` and changed `apps/web/next-env.d.ts` during dev. Both effects were removed/restored after verifying they came from this task; neither remains in the final diff. Ignored `.next`, Vite, Vitest, Playwright, and `node_modules` artifacts remain local.

## 10. Test Results and Evidence

| Command / request | Exit or HTTP | Status | Evidence / limitation |
| --- | --- | --- | --- |
| `pnpm --filter @mfd/game typecheck` | 0 | PASS | Source and tests typechecked. |
| `pnpm --filter @mfd/web typecheck` | 0 | PASS | Web and fixture TypeScript typechecked. |
| `pnpm typecheck` | 0 | PASS | Turbo: 2 successful packages. |
| `pnpm --filter @mfd/web build` | 0 | PASS | Next compiled, TypeScript passed, `/` generated. |
| `pnpm --filter @mfd/game test` | 0 | PASS | 11 tests, two files. Mock tests do not alone prove browser resource cleanup. |
| `pnpm --filter @mfd/web test:e2e` | 0 | PASS | Six Chromium tests, including real production adapter on same host. |
| `pnpm --filter @mfd/web test:production` | 0 | PASS | Built homepage hydrates, shows canvas, no page/console errors. |
| `pnpm --filter @mfd/web dev` | Ready; intentionally stopped | PASS | Next ready at port 3000 in 1464ms. |
| Development `Invoke-WebRequest http://localhost:3000/` | HTTP 200 | PASS | `text/html; charset=utf-8`; heading, placeholder, loading markup present. |
| `pnpm --filter @mfd/web start` | Ready; intentionally stopped | PASS | Production Next ready at port 3000 in 834ms. |
| Production `Invoke-WebRequest http://localhost:3000/` | HTTP 200 | PASS | `text/html; charset=utf-8`; heading, placeholder, loading markup present. |
| `git diff --check` | 0 | PASS | No whitespace errors; line-ending warnings only. |

Relevant corrected failures during implementation:

1. An initial `pnpm install --no-frozen-lockfile` attempt failed without a TTY; a TTY retry stalled on sandbox DNS. The authorized escalated install completed with exit `0`.
2. The first Next build failed because Phaser's ESM build has named exports but no default export. Three production imports were changed to `import * as Phaser from 'phaser'`; unit tests, typecheck, build, and browsers then passed.
3. The first fixture test missed a brief loading state. The test now deliberately delays the game module and verifies the visible loading text; no production behavior was weakened.
4. The first built-homepage browser test treated Next.js's empty built-in `role="alert"` live region as the Host's error. The test now checks the exact approved failure text and also checks browser/console errors. The production Host did not fail in that run.

## 11. Lifecycle Safety Assessment

| Invariant | Evidence | Status |
| --- | --- | --- |
| One Game per owned host | Unit duplicate test and real Chromium same-host test. | PASS for tested paths |
| Ownership persists through destroy request and `DESTROY` | Unit test and real browser factory observation. | PASS |
| Release only after verified cleanup | Adapter source checks; browser old Game canvas/loop/renderer cleared before remount. | PASS for Phaser 3.90.0 tested paths |
| Repeat destroy idempotent | Vitest. | PASS |
| Old owner cannot release newer owner | Vitest identity check. | PASS |
| Cleanup throw/incomplete/stall locks host and reports failure | Vitest (including 5-second watchdog). | PASS in mocked failure paths |
| Pre-boot behavior | Prior R-07 PoC in Chromium; production Host cancels late import. | PASS for tested paths; abnormal boot failures not exhaustive |

The approved adapter relies on private `runDestroy`; its version and method checks prevent silent use with a different Phaser version or missing internal method. The watchdog never releases ownership. Real-browser verification covered Chromium Canvas/WebGL paths and the current package version, not all browsers or future Phaser releases.

## 12. SSR and Responsive Assessment

The package is dynamically imported only inside Client Host `useEffect`. Next build and development/production HTML responses completed without server evaluation errors. Chromium verified hydration of the actual built homepage. At 1440px and 800px viewports, the canvas kept its 1280 × 720 internal dimensions, displayed at no more than 1280px wide, and retained a 16:9 displayed ratio. Phaser `AUTO` and Canvas fallback both reached ready.

## 13. Screenshot Baseline Status

**PENDING Owner approval.** Candidate: `docs/reports/artifacts/T-02-hello-scene-candidate.png`, 1280 × 720. It was captured after Host readiness and visually inspected. No approved baseline exists in this task; no pixel-diff PASS or tolerance is claimed.

## 14. Regression Status

The authoritative Stage 1 mapping from the Owner's corrected retest prompt was used:

| ID | Status | Evidence |
| --- | --- | --- |
| M-01 Development startup | PASS | `pnpm --filter @mfd/web dev`; ready at port 3000. |
| M-02 Development homepage HTTP | PASS | GET `/`: HTTP 200, HTML. |
| M-03 Development homepage rendering | PASS | Returned HTML contains original heading and placeholder; no server rendering error observed. This is HTML evidence, not a browser claim. |
| M-04 Production startup | PASS | Fresh build exit 0, then `pnpm --filter @mfd/web start` ready at port 3000. |
| M-05 Production homepage HTTP | PASS | GET `/`: HTTP 200 HTML with original heading and placeholder; no server rendering error observed. |

The existing R-07 PoC files were unchanged. Full gameplay tests were not run because gameplay is outside T-02.

## 15. Remaining Blockers and Owner Decisions

- **Screenshot baseline approval: PENDING.** Owner must review the candidate before it becomes a comparison baseline.
- **Publication: PENDING.** This prompt did not authorize staging, committing, pushing, PR creation, or deployment.
- **Future Phaser upgrade:** the private adapter must be revalidated before changing from exact `3.90.0`.
- **Watchdog policy:** 5 seconds is the implemented failure-detection threshold. Owner can review it; it does not affect the rule that cleanup must be verified before host reuse.

No blocker prevented the executed T-02 implementation or its automated checks. Full acceptance remains pending screenshot baseline and Owner review; the report does not claim publication approval.

## 16. Final Working Tree Status

Branch remains `main`; HEAD remains `ec36e2d362d9d1e27acd191fd92a9e78a03b647b`. `git diff --check` exited `0`. Final status contains only the T-02 modifications and untracked files listed in §9. The task-started dev, production, and Vite fixture servers are stopped; port 3000 no longer accepts a connection after the smoke tests.

No gameplay, Fusion, Defender, Enemy, wave, combat, or HUD implementation was added. No commit, push, PR, or deployment occurred. Stop here for Owner review.

### Checkpoint matrix

| Checkpoint | Status | Evidence | Remaining issue |
| --- | --- | --- | --- |
| CP-01 Package and Hello Scene | PASS | Package typecheck; browser visual candidate. | None in tested scope. |
| CP-02 Lifecycle adapter | PASS | Seven adapter unit tests; same-host Chromium teardown/remount. | Future Phaser versions require revalidation. |
| CP-03 React Host | PASS | Web typecheck; Strict Mode/remount and production homepage browser tests. | None in tested scope. |
| CP-04 Automated tests | PASS | 11 Vitest + six fixture + one production Chromium tests. | Screenshot baseline PENDING Owner approval. |
| CP-05 Final verification | PASS | Typecheck, build, smoke, Stage 1 M-01–M-05, final diff check. | Full acceptance PENDING Owner review. |

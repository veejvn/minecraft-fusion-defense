# T-02 R-07 — Controlled PoC Execution Report

**Project:** Minecraft Fusion Defender  
**Date:** 2026-11-11 (Asia/Bangkok)  
**Scope:** Phaser 3.90.0 cleanup lifecycle PoC only  
**Result:** PoC browser tests PASS; production R-07 completion contract requires Owner decision.

## 1. Executive Summary

Five Playwright tests passed in Chromium, covering POC-01–POC-10 and an additional WebGL teardown observation. Calling `game.destroy(true)` requests deferred teardown. Phaser emits `DESTROY` after Scene Manager cleanup but before renderer destruction, canvas removal, and game-loop destruction. Host ownership must therefore remain held at `DESTROY`.

The PoC confirmed completion by wrapping Phaser's private `runDestroy` method and observing its return. This is test instrumentation, not an approved production API. The PoC does not satisfy full T-02 acceptance criteria or authorize production implementation.

## 2. Initial Git Status and HEAD

- Repository: `D:\Code\game\minecraft-fusion-defense`
- Branch: `main`
- HEAD: `b87ec29b34062e35c4992a17283d2eb8b57ff729`
- Initial `git status --short`: empty (clean working tree).
- Environment: Windows, Node.js `v24.19.0`, pnpm `10.20.0`; root `packageManager` is `pnpm@10.20.0`.

## 3. Exact Files Created or Modified

| Path | Change |
| --- | --- |
| `apps/web/package.json` | Added three exact PoC dev dependency declarations. |
| `pnpm-lock.yaml` | Updated by pnpm for those declarations and their transitive dependency graph. |
| `apps/web/tests/poc/r07/index.html` | Isolated Vite fixture page. |
| `apps/web/tests/poc/r07/main.js` | Exposes Phaser to the isolated fixture only. |
| `apps/web/tests/poc/r07/playwright.config.cjs` | Chromium and local Vite test configuration. |
| `apps/web/tests/poc/r07/lifecycle.spec.cjs` | PoC lifecycle and ownership tests. |

Ignored verification artifacts include `apps/web/test-results/.last-run.json`, `apps/web/node_modules/.vite/`, `node_modules`, and the Playwright Chromium cache outside the repository. No production runtime file was edited.

## 4. Exact Dependencies Installed

| Direct dev dependency | Exact version | Published metadata / compatibility |
| --- | --- | --- |
| `phaser` | `3.90.0` | Depends on `eventemitter3` `^5.0.1`; no incompatible Node engine declared. |
| `@playwright/test` | `1.56.1` | Node `>=18`; depends on `playwright` `1.56.1`. |
| `vite` | `7.0.0` | Node `^20.19.0 || >=22.12.0`; compatible with Node `24.19.0`. |

`vitest@3.2.4` was not installed because browser lifecycle verification did not require it. No unapproved direct dependency was added. `pnpm install --no-frozen-lockfile` exited `0`; pnpm reported that it ignored the `esbuild` build script. Vite and Playwright subsequently ran successfully. `pnpm --filter @mfd/web exec playwright install chromium` exited `0` and installed Chromium `141.0.7390.37` (Playwright build `1194`).

## 5. Phaser Source Findings

Verified against installed Phaser 3.90.0 source:

- `src/core/Game.js`: `destroy(removeCanvas, noReturn)` sets `pendingDestroy`, `removeCanvas`, and `noReturn`; it does not synchronously remove the canvas.
- `step`/`headlessStep` call private `runDestroy` on a later loop step when `pendingDestroy` is set.
- `runDestroy` calls `scene.destroy()`, emits `DESTROY`, removes listeners, calls `renderer.destroy()`, removes the canvas and DOM container, calls `loop.destroy()`, then clears `pendingDestroy`.
- `src/renderer/canvas/CanvasRenderer.js`: `destroy()` clears the renderer's game, canvas, and context references.
- `src/renderer/webgl/WebGLRenderer.js`: `destroy()` clears WebGL resources and its `gl`, game, and canvas references.
- `src/core/TimeStep.js`: `destroy()` stops and destroys the frame scheduler.

These are source-code findings. The browser observations below independently confirm the ordering in the tested Chromium paths.

## 6. Lifecycle Event Timeline

For a rendered Canvas game, the recorded sequence was:

1. First Scene render: canvas present, loop running.
2. `destroy(true)` returns: `pendingDestroy=true`, canvas still present, loop still running.
3. `runDestroy` enters.
4. `DESTROY` fires: canvas still present, loop still running, renderer still references the game.
5. `runDestroy` returns: canvas absent, loop stopped, `pendingDestroy=false`, renderer references cleared.

`DESTROY` and cleanup completion are distinct milestones. Host reuse was allowed only after the instrumented return from `runDestroy`.

## 7. PoC Test Results

Final command: `pnpm --filter @mfd/web exec playwright test --config tests/poc/r07/playwright.config.cjs --timeout 20000`  
Exit code: `0`  
Output: `5 passed (11.9s)`  
Environment: Chromium headless on Windows; Canvas and WebGL renderers both observed.

| Test ID | Status | Evidence | Limitation |
| --- | --- | --- | --- |
| POC-01 | PASS | After first render, destroy request preceded `DESTROY`; cleanup followed it. | Chromium fixture. |
| POC-02 | PASS | Destroy before first render completed on a later loop step. | Chromium fixture. |
| POC-03 | PASS | Destroy immediately after construction while document was `loading`, in `preBoot`, and at `BOOT` before textures ready all completed. | Does not prove every abnormal boot/failure path. |
| POC-04 | PASS | Two calls to PoC handle `destroy()` produced one Phaser destroy request. | Idempotency belongs to PoC tracker. |
| POC-05 | PASS | Immediate remount was rejected; ownership remained held during cleanup and at `DESTROY`. | PoC tracker only. |
| POC-06 | PASS | Remount succeeded after observed `runDestroy` return. | Uses private-method instrumentation. |
| POC-07 | PASS | Two hosts remained independent; cleaning one did not release the other. | PoC tracker only. |
| POC-08 | PASS | Destroy before ready rejected the handled Promise; ready resolved after first Scene render and stayed resolved after later destroy. | No production GameHandle created. |
| POC-09 | PASS | At `DESTROY`, canvas/loop/renderer game reference remained; after teardown, canvas absent, loop stopped, renderer references cleared. | Completion observed through private-method wrapper. |
| POC-10 | PASS | With WebGL contexts unavailable, `AUTO` selected Canvas and completed cleanup. | Chromium headless fixture. |

An additional WebGL observation selected renderer type `2` (`Phaser.WEBGL`): at `DESTROY`, `gl` was present and the canvas remained; after teardown, `gl` was null, the canvas was absent, and the loop had stopped.

## 8. Cleanup Completion Evidence

The PoC's wrapper around `runDestroy` recorded the state immediately after the original private method returned. In both renderer paths, the canvas was absent and the loop stopped at that point. Canvas renderer game/canvas references and WebGL `gl` were cleared. At `DESTROY`, those resources were still present. Canvas disappearance alone was not used as the success criterion.

No public Phaser event after the complete teardown was identified. This remains the central production contract gap.

## 9. Pre-Boot Destruction Findings

When `document.readyState` was `loading`, the PoC called destroy immediately after `new Phaser.Game(...)`: `pendingDestroy=true`, no canvas, and no running loop. On later boot, Phaser created the Scene and then processed `runDestroy`; the final observed state was no canvas, stopped loop, and `pendingDestroy=false`. Destroy in the `preBoot` callback and in `BOOT` before textures were ready also completed in the fixture.

The 1.5-second watchdog in the test detects a missing completion; it is never treated as a cleanup signal. These successful reproductions do not establish behavior for all boot errors or indefinitely delayed startup.

## 10. Host Ownership and Remount Findings

The PoC-only `WeakMap` permits at most one game per host. It retains ownership from creation through destroy request and `DESTROY`, rejects immediate duplicate creation, and releases only after the instrumented `runDestroy` return. Repeated destroy requests are idempotent. Two independent hosts do not release each other's ownership.

## 11. R-06 Readiness Interaction

The PoC ready Promise resolves at the first render event from its corresponding Scene. Destroy before that event rejects the Promise with `ready-cancelled`, with a rejection handler attached. Destroy after resolution leaves the Promise resolved. This validates the tested interaction conceptually; it is not a production `GameHandle`.

## 12. Remaining Blockers

- Phaser's `DESTROY` event precedes renderer, canvas, and loop cleanup.
- The PoC completion signal wraps a private method. No supported public post-cleanup signal was proven.
- Abnormal boot failure and permanently stalled startup were not exhaustively tested. A watchdog cannot convert those cases into successful cleanup.

No production lifecycle implementation should proceed from this PoC without an Owner-approved completion contract.

## 13. Recommended Production Lifecycle Contract

Keep the host owned while the game is active and throughout requested teardown. Do not release ownership at `DESTROY`. Release it only after an explicitly defined and verified cleanup-completion signal; if that signal does not arrive, retain ownership and report failure. A timeout may report a stall but must not authorize remount. The concrete signal/adapter remains a proposal requiring Owner review.

## 14. Owner Decisions Required

1. Approve a production-safe way to confirm teardown completion after `DESTROY`.
2. Decide how the host reports and retains ownership when cleanup stalls or throws.
3. Separately authorize production T-02 implementation, if desired.

## 15. Final Working Tree Status

Final `git status --short --untracked-files=all`: modified `apps/web/package.json` and `pnpm-lock.yaml`; untracked the four PoC files listed in §3 and this report. `git diff --check` reported no whitespace error. The test-started Vite server was stopped; `curl.exe -I --max-time 2 http://127.0.0.1:5177/` could not connect afterward.

No production Game Factory or React Host was implemented. The homepage and gameplay were not changed. No commit, push, branch, or PR was created.

### Command and failure record

| Command | Exit / result | Relevant output |
| --- | --- | --- |
| `git status --short`; `git branch --show-current`; `git rev-parse HEAD` | `0` | Clean; `main`; `b87ec29b34062e35c4992a17283d2eb8b57ff729`. |
| `node --version`; `pnpm --version` | `0` | `v24.19.0`; `10.20.0`. |
| `pnpm view phaser@3.90.0 ...`; `pnpm view @playwright/test@1.56.1 ...`; `pnpm view vite@7.0.0 ...` | `0` after an initial network-stalled attempt was interrupted | Exact versions and engine/dependency metadata in §4. |
| `pnpm install --no-frozen-lockfile` | `0` | Workspace install completed; ignored `esbuild` build-script warning. |
| Initial `pnpm --filter @mfd/web exec playwright test --config tests/poc/r07/playwright.config.cjs` | Interrupted | Sandbox-local server reachability/port behavior prevented useful browser output. |
| Retried Playwright with existing server | `1` | `Port 5177 is already in use`; separate Vite session was stopped. |
| Playwright test before browser install | `1` | Chromium headless executable missing. |
| `pnpm --filter @mfd/web exec playwright install chromium` | `0` | Chromium and headless shell downloaded. |
| Focused and full Playwright runs after install | `0` | Final full run: five tests passed; browser logs in §6–§9. |
| `git diff --check` | `0` | No whitespace errors; Git printed line-ending conversion warnings. |

The failed setup attempts were environmental and did not produce a Phaser lifecycle failure. The final passing run used the installed browser and a test-started Vite server in one execution context.

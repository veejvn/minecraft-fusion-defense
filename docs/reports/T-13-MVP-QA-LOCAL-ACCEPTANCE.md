# T-13 — MVP QA & Local Acceptance Report (Automated Readiness)

**Project:** Minecraft Fusion Defense  
**Date:** 2026-11-23  
**Review status:** **AUTOMATED QA PASS — READY FOR OWNER ADJUSTMENTS, FINAL BALANCING & MANUAL PLAYTHROUGH SIGN-OFF**  
**Scope:** Automated verification across `@mfd/game`, `@mfd/game-data`, and `@mfd/web` against [ROADMAP.md](../product/ROADMAP.md) §2–§4 and [TESTING_STRATEGY.md](../development/TESTING_STRATEGY.md).

## 1. Automated QA Verification Matrix

| QA Area | Check / Evidence | Outcome |
| --- | --- | --- |
| **Base-only 5-Wave Victory (Fusion Optional)** | `packages/game/tests/mvp-qa-acceptance.test.ts`: fresh `CampaignController` (`iron_golem` + `skeleton` starter unlocks only, zero `fuseDefenders` calls) clears all 5 Waves, clears active checkpoint, and unlocks `snow_golem` + 3 Frost recipes | **PASS** |
| **All 15 Tier-2 Fusion Recipes** | `packages/game/tests/mvp-qa-acceptance.test.ts` + `battle-fusion.test.ts`: order-independent matching `[A, B]` == `[B, A]`, `0` Energy cost, cross-lane placement at Target Cell | **PASS** |
| **All 20 Special Abilities (`ABILITY_CATALOG.md v2.2`)** | `packages/game/tests/mvp-qa-acceptance.test.ts` + `battle-abilities.test.ts`: all 20 Defender abilities (`1` Crystal, `0s` CD) apply cleanly with deterministic outcomes & rollback safety | **PASS** |
| **Summon Cooldowns, Pause Freeze & Persistence** | `packages/game/tests/campaign-controller.test.ts` + `battle-persistence.test.ts`: `4s/5s/7s/6s/8s` base cooldowns, Pause freeze, `mfd.active_battle.v1` round-trip | **PASS** |
| **Progression Accumulation & Replay Idempotency** | `packages/game/tests/mvp-qa-acceptance.test.ts`: Defeat isolation, Victory replay kills accumulation (`>= 50` kills → `wolf`, `5` Victories → `blaze`, all 15 recipes) | **PASS** |
| **Game Data Schemas** | `pnpm --filter @mfd/game-data test` (`tests/validation.test.ts`, 25 tests) | **PASS** |
| **TypeScript & Production Next.js Build** | `pnpm typecheck` (`3/3` packages) & `pnpm build` (static `/` and `/playtest`) | **PASS** |
| **Host Lifecycle Contract (`T-02`)** | `pnpm --filter @mfd/web test:e2e` (`tests/e2e/phaser-host.spec.cjs`, 6 tests) | **PASS** |
| **Production Browser Flow, Assets, Drag-Drop & Responsive Viewports** | `pnpm --filter @mfd/web test:production` (`tests/e2e/production-home.spec.cjs`, 2 specs covering `1280×720` and `1366×768` single-viewport fit `scrollHeight <= innerHeight`, all 47-subset Collection `<img>` `naturalWidth > 0`, click & drag-and-drop summon + cooldown badge, Save/Resume reload, `/playtest`, 0 console/page/HTTP asset errors) | **PASS** |

## 2. Explicit Scope Pending Owner Input (`T-13` Sign-Off)

Because functional MVP gameplay mechanics and UI are complete and automated gates are green locally, the remaining items before locking `T-13` as finalized are Owner-driven product decisions:

1. **Owner-Identified Live Playtest Adjustments:** Two specific UI/gameplay tweaks noted by the Owner during live playtesting.
2. **Official Game Balancing (`Draft/Proposed/TBD` → `Confirmed`):** Reviewing `PlaytestPresetConfig` & `CAMPAIGN_BASE_COSTS` / `CAMPAIGN_BASE_COOLDOWNS` / Wave 1–5 compositions in `packages/game/src/playtest/playtest-presets.ts` and `packages/game/src/campaign/grassland-campaign-config.ts`, then locking official numbers in documentation (`GAME_BALANCING.md` / `ENTITY_CATALOG.md`).
3. **Owner Manual 5-Wave Playthrough & Repository Push:** Confirming visual quality, game feel, and balance across a full manual 5-Wave run on `http://localhost:3000`, followed by `git commit` + `git push` to verify remote GitHub Actions CI (`AC-20`).

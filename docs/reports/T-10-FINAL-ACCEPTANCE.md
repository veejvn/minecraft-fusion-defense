# T-10 — Final Technical Acceptance Report

**Project:** Minecraft Fusion Defense  
**Date:** 2026-11-21  
**Review status:** **19/20 GATES LOCAL PASS; AC-20 LOCAL PASS / REMOTE CI PENDING COMMIT & PUSH (Headless Scope; Production Ability Costs, Cooldowns & Balance Remain Draft/TBD)**  
**Scope:** Headless `packages/game` data-driven **Special Abilities & Effect Engine** covering all 12 MVP Special Ability archetypes (`blizzard`, `earthquake`, `arrow_storm`, `pack_frenzy`, `inferno`, `piercing_barrage`, `absolute_zero`, `glacial_fortress`, `wildfire_rush`, `meteor_arrow_rain`, `alpha_howl`, `iron_bastion`) across `AbilitySessionInput` fail-closed validation, atomic Power Crystal cost & cooldown enforcement, G09 unified damage pipeline (`Armor/Resistance → Redirect → Shield → HP`), Status Effect identity/refresh/stacking/immunity rules (`slow`, `stun`, `freeze`, `burn`, `buff`), Shield (`FR2`) & front-tile slow zone + 3×3 ally Redirect lifecycle, Multihit cadences (`FR3` Stun pause, target/death/Fusion cancellation), Lane/Falling Projectiles, Fusion/death cleanup, T-06 Enemy/Wave rewards, T-09 Wave completion/Victory, T-04 atomic rollback safety, Pause/Terminal guards, and optional `BattleRuntime` constructor backward compatibility.  
**Implementation location:** Local working tree on `main` (parent commit `ddd6d4f`, uncommitted — pending commit & push).  
**CI evidence:** Local `pnpm --filter @mfd/game test` (148/148), `pnpm --filter @mfd/game-data test` (25/25), `pnpm typecheck` (3/3), and `pnpm build` (`@mfd/web`, uncached) all **PASS**; remote GitHub Actions CI run is **PENDING** commit and push (`gh run list` latest run `44877738893` is for T-07 commit `6b0ee0b`).

## 1. Executive summary

Technical implementation and independent read-only audit against [T-10 Plan v1.0](../development/T-10-SPECIAL-ABILITIES-IMPLEMENTATION-PLAN.md) confirm that the T-10 changes implement all **10 Owner-approved technical decisions (`D-59`–`D-68 = A`)** and pass **AC-01–AC-19** plus the local checks of **AC-20** within the headless test-fixture boundary.

Because production Ability costs, cooldowns, damage multipliers, durations, and numeric balance remain **Draft/TBD** in [Ability Catalog](../game-design/ABILITY_CATALOG.md) (and `PGD-02 G09` remains labeled `Confirmed — Source Pending Verification`), `packages/game/src/abilities/*` contains zero hardcoded production balance values and instead executes purely from validated `AbilitySessionInput` definitions. `@mfd/game-data` runtime validation and datasets remain untouched, and tests verify all 12 MVP Special Ability archetypes through explicitly labeled test-only fixtures in `battle-abilities.test.ts`.

## 2. Implementation scope and contract compliance

T-10 adds four files and updates six existing files exclusively inside `packages/game`:

| File | Responsibility |
| --- | --- |
| `packages/game/src/abilities/ability-session.ts` | `ticksFromSeconds()`, typed `AbilityDefinition` & effect contracts, fail-closed `validateAbilitySession()`, cross-validation with `CombatSession` and `ResourceSession`, deep freeze (`D-59`, `D-61`, `AC-01`) |
| `packages/game/src/abilities/ability-state.ts` | `structuredClone`-safe `AbilityState`, `AbilityCommand`, status/shield/redirect/cadence/projectile structures, `isUnitDisabled()`, `getEnemySpeedModifiers()`, `getDefenderDamageModifiers()`, `getDefenderAttackSpeedMultiplier()` (`D-63`) |
| `packages/game/src/abilities/ability-engine.ts` | `applyAbilityCommand()` (`D-60`, `D-61`), `applyDamagePipeline()` (`D-62`: `Armor/Resistance → Redirect → Shield → HP`), `syncGlacialSlowZones()` (`D-64`), `stepAbilityTickPhase()` (`D-65`, `D-66`), `resolvePostMoveProjectileCrossings()`, `resolveCombatDeaths()`, `cleanupEntityAbilityState()` (`D-65`) |
| `packages/game/src/core/battle-state.ts` | Optional `readonly abilities?: AbilityState` field on `BattleState` |
| `packages/game/src/combat/combat-session.ts` | Optional mitigation/immunity fields (`armor`, `fireResistancePct`, `freezeImmune`, `freezeResistancePct`) and fail-closed validation on Defender/Enemy definitions |
| `packages/game/src/combat/combat-state.ts` | Speed transition anchor trackers (`lastMoveSpeed`, `lastAttackSpeed`) on `CombatEntityState` |
| `packages/game/src/combat/combat-engine.ts` | `isUnitDisabled()` stun/freeze gate, buff damage/attack-speed modifiers, `lastAttackSpeed`/`lastMoveSpeed` smooth anchor resets, `resolvePostMoveProjectileCrossings()`, routing attacks via `applyDamagePipeline()` and deaths via `resolveCombatDeaths()` |
| `packages/game/src/fusion/fusion-engine.ts` | `cleanupEntityAbilityState(..., 'fusion')` for both consumed input Defenders (`AC-13`) |
| `packages/game/src/systems/battle-runtime.ts` | Optional 6th constructor parameter `abilityInput?: AbilitySessionInput` (`D-68`), Pause/Terminal `activate-ability` enqueue guard (`D-67`), `stepAbilityTickPhase()` prior to `runCombatPhase()`, shared `enqueueEnemyReward()`, detached `snapshot().abilities` (omitted when `abilityInput` is absent) |
| `packages/game/tests/battle-abilities.test.ts` | 22 focused Vitest unit & integration tests (explicitly labeled test-only fixtures) covering `AC-01`–`AC-17` across all 12 MVP Special Abilities |

No changes were made to `apps/web`, `packages/game-data`, `packages/game/src/index.ts`, `packages/game/src/scenes/hello-scene.ts`, `package.json`, or `pnpm-lock.yaml` (`AC-18`).

## 3. Acceptance matrix — 20 gates

| Gate | Verdict | Evidence |
| --- | --- | --- |
| **AC-01** — Fail-closed validation of `AbilitySessionInput` & deep freeze | **PASS** | `validateAbilitySession()` enforces unique IDs, `CombatSession` Defender mapping, nonnegative finite durations/costs (`ResourceSession` guard when `cost > 0`), valid effect percentages/counts/radii, and recursive `Object.freeze`. Tested in `battle-abilities.test.ts` (L412–523). |
| **AC-02** — Power Crystal deduction, structured rejections & per-unit cooldowns | **PASS** | Verified Crystal-only deduction (Energy untouched), per-unit cooldown tracking & recovery, and atomic `REJECTED` outcomes (`insufficient-crystals`, `on-cooldown`, `invalid-owner`, `owner-dead`, `owner-disabled`, `ability-unavailable`, `invalid-target-cell`). Tested in `battle-abilities.test.ts` (L525–623). |
| **AC-03** — Activation eligibility (`requiresTarget` vs proactive self/ally abilities) | **PASS** | All 7 target-dependent abilities reject `no-target` without spending Crystals when ineligible; all 5 self/proactive abilities activate with 0 Enemies present. Tested in `battle-abilities.test.ts` (L625–690). |
| **AC-04** — Instant lane & 5-lane abilities (`blizzard`, `earthquake`, `inferno`, `absolute_zero`) | **PASS** | Verified same-lane Slow, physical armor-mitigated `3×` Earthquake + Stun, armor-piercing Fire `3×` Inferno reduced by `fireResistancePct` + Burn, and 5-lane Freeze. Tested in `battle-abilities.test.ts` (L692–787). |
| **AC-05** — Status identity, same-source refresh (`FR1`), strongest slow & Freeze resistance/immunity | **PASS** | Verified same-source refresh preserves `statusId` and increments `version`, strongest overlapping `slow` wins, `freezeImmune` skips Freeze, `freezeResistancePct` scales duration proportionally, and `freeze` coexists with `slow`/`stun`. Tested in `battle-abilities.test.ts` (L789–843). |
| **AC-06** — `burn` periodic 1.0s damage, AD snapshot, multi-source & post-caster-death persistence | **PASS** | Verified 1.0s periodic Fire ticks using snapshotted buffed Attack Damage, independent multi-source Burn timers, persistence after caster death/Fusion, and Burn application on 0 post-mitigation direct hit. Tested in `battle-abilities.test.ts` (L845–939). |
| **AC-07** — `pack_frenzy` & `alpha_howl` additive buff stacking & 3×3 ally persistence | **PASS** | Verified same-source refresh without stacking, additive stacking on base Attack Speed & Attack Damage across distinct casters, Alpha Wolf removal ending self-buff while surviving 3×3 allies retain theirs. Tested in `battle-abilities.test.ts` (L941–978). |
| **AC-08** — `glacial_fortress` 50% Shield, `(row, col + 1)` slow zone, `TC38` residual & `FR2` recast | **PASS** | Verified front-tile slow activation, immediate slow removal upon leaving zone while Shield intact, 5s residual Slow conversion when Shield breaks, `FR2` recast preserving `shieldId`/`creationOrder`, and oldest-first Shield absorption. Tested in `battle-abilities.test.ts` (L980–1059). |
| **AC-09** — `iron_bastion` persistent Shield & 8s 3×3 ally Redirect (`Armor/Res → Redirect → Shield → HP`) | **PASS** | Verified 100% Max HP Shield persists beyond 8s Redirect duration, Manhattan-nearest Guardian selection (tie-break lower `EntityId`), no Guardian Armor re-application, `shieldPiercing` preservation on both shares, and fatal redirected Guardian death without ally overflow. Tested in `battle-abilities.test.ts` (L1061–1138). |
| **AC-10** — `arrow_storm` & `wildfire_rush` multihit cadences (`FR3` Stun pause & cancellation) | **PASS** | Verified immediate shot #1 + `0.2s` intervals, Stun pausing `nextShotRemainingTicks` with zero burst on un-stun, target-loss/Fusion cancellation of unfired steps while fired arrows persist. Tested in `battle-abilities.test.ts` (L1140–1218). |
| **AC-11** — `piercing_barrage` 600% AD piercing projectile | **PASS** | Verified single merged arrow (`2×` speed, `600%` AD snapshot), unlimited same-lane pierce hitting each Enemy at most once via `hitEnemyIds`, post-shooter-death persistence, and edge despawn. Tested in `battle-abilities.test.ts` (L1220–1255). |
| **AC-12** — `meteor_arrow_rain` 3×3 area lock & falling flaming arrows | **PASS** | Verified 3×3 area locked on closest-to-base Enemy at activation, 8 falling arrows @ `0.2s` damaging & burning Enemies in impact tile after anchor death, and clean cancellation when 0 Enemies remain on board. Tested in `battle-abilities.test.ts` (L1257–1301). |
| **AC-13** — Fusion & death cleanup (zero inheritance onto Fusion output) | **PASS** | Verified consumed/dead Defender buffs, shields, redirects, front-tile zones, cooldowns, and unfired cadences are cleared without inheriting onto Fusion output. Tested in `battle-abilities.test.ts` (L1303–1359). |
| **AC-14** — Integration with T-06 rewards & T-09 Wave completion / Victory | **PASS** | Verified instant, Burn, and projectile kills trigger T-06 `enemy-reward` (Energy + Crystal cap 5 / Pending) and T-09 Wave transition / final Victory. Tested in `battle-abilities.test.ts` (L1361–1462). |
| **AC-15** — Pause & Terminal enqueue rejection + full timer freeze | **PASS** | Verified `activate-ability` rejects at enqueue time when Paused/Terminal, and Pause freezes all cooldowns, statuses, Burn timers, cadences, projectiles, and redirects. Tested in `battle-abilities.test.ts` (L1464–1511). |
| **AC-16** — Transaction rollback safety (`T-04`) | **PASS** | Verified atomic rollback of `crystals`, `entities`, `combat`, `abilities`, `waves`, and `queue` on `QUEUE_OVERFLOW` and mid-transaction `CONTRACT_ERROR` leading to `FAILED_STOP`. Tested in `battle-abilities.test.ts` (L1513–1638). |
| **AC-17** — Deterministic replay, snapshot isolation & backward compatibility | **PASS** | Verified identical replay across full multi-ability runs, deep isolation of `snapshot().abilities`, and `snapshot().abilities === undefined` when `abilityInput` is omitted (`126/126` prior tests untouched). Tested in `battle-abilities.test.ts` (L1640–1688). |
| **AC-18** — Authority boundary preservation (`@mfd/game-data` & test-only fixtures) | **PASS** | Verified via `git status --short` and `git diff --name-only`: zero edits to `packages/game-data/`, `packages/game/src/index.ts`, or `apps/web/`; all test fixtures explicitly labeled test-only. |
| **AC-19** — Full workspace verification | **PASS** | `@mfd/game` (`148/148`), `@mfd/game-data` (`25/25`), `pnpm typecheck` (`3/3`), and `pnpm build` (`@mfd/web`) all **PASS** after final edit. |
| **AC-20** — Clean workspace build & real remote CI parity | **LOCAL PASS / REMOTE CI PENDING** | Local `AC-19` build/typecheck/tests PASS cleanly after final edit; remote GitHub Actions CI run pending commit & push. |

## 4. Verification commands and evidence

Local checks executed after the final edit on the current working tree:

- `pnpm --filter @mfd/game test` → **PASS** (`9` test files, `148/148` tests: `lifecycle-adapter.test.ts` 7, `create-game.test.ts` 4, `battle-runtime.test.ts` 12, `battle-resources.test.ts` 21, `battle-combat.test.ts` 12, `battle-fusion.test.ts` 25, `battle-waves.test.ts` 16, `battle-abilities.test.ts` 22, `simulation-foundation.test.ts` 29)
- `pnpm --filter @mfd/game-data test` → **PASS** (`1` test file, `25/25` tests: `validation.test.ts`)
- `pnpm typecheck` → **PASS** (`3/3` packages: `@mfd/game-data`, `@mfd/game`, `@mfd/web`)
- `pnpm build` → **PASS** (`@mfd/web` Next.js production build, `0 cached`)
- Independent read-only audit (`research` subagent `T-10 Gate Auditor`) verified `D-59`–`D-68`, all edge cases (`applyDamagePipeline`, `glacial_fortress` zone/residual Slow, Fusion cleanup, smooth speed/stun anchors, `T-04`/`T-09` ordering, fail-closed `validateAbilitySession`, and `AC-18` scope boundary); non-blocking test assertion for `owner-dead` added and re-verified across all commands above.
- Remote CI: **PENDING** (changes are uncommitted on local `main`; latest remote CI run `44877738893` passed for T-07 `6b0ee0b`).

## 5. Non-blocking observations and remaining boundaries

1. **Remote CI gate (`AC-20`):** Commit and push T-08 (`061d2ee`), T-09 (`3378dd7`), T-10 implementation, and this acceptance report to GitHub `main`, then verify the resulting workflow run succeeds to close `AC-20` across T-08–T-10.
2. **Production ability & balance data still Draft/TBD:** Final `powerCrystalCost`, `cooldownSeconds`, damage multipliers, durations, and source provenance verification in [Ability Catalog](../game-design/ABILITY_CATALOG.md) / `PGD-02` remain separate from `T-10` runtime infrastructure.
3. **Downstream boundary:** `T-11` (Save & Resume / persistent progression), `T-12` (UI, assets & playable integration), and `T-13` (MVP QA) remain pending separate Owner plans and authorizations.

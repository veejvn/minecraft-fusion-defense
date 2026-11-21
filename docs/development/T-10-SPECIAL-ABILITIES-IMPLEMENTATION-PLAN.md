# T-10 Special Abilities Implementation Plan

Status: APPROVED v1.0 — OWNER DECISIONS D-59–D-68 CONFIRMED (OPTION A); READY FOR IMPLEMENTATION
Last Updated: 2026-11-21
Roadmapped Task: `T-10` — Special abilities (`docs/product/ROADMAP.md` §3A)
Dependencies: `T-04`, `T-05`, `T-06`, `T-07`, `T-08`, `T-09` (all complete and verified on `main`), plus explicitly approved executable ability/effect contracts (`docs/product/ROADMAP.md` §3A)

## 1. Objective & Scope

`T-10` delivers the headless, deterministic, data-driven **Special Abilities & Effect Engine** in `packages/game/src/abilities/` and integrates it into `BattleRuntime` (`packages/game/src/systems/battle-runtime.ts`) and `BattleState` (`packages/game/src/core/battle-state.ts`).

The engine executes all 12 MVP Special Ability archetypes and their 5 core runtime subsystems (`Status Effects`, `Shield & Damage Redirect`, `Multihit Cadences`, `Lane/Tile Projectiles`, and `Instant Lane/Area Damage`) while strictly respecting the repository's documentation and data authority boundaries:

- **Authority & Source-Verification Alignment (`docs/DOCUMENTATION_POLICY.md`):**
  - `docs/game-design/ABILITY_CATALOG.md` (Draft v1.0) defines the 12 canonical Special Ability IDs and their owner Defenders (`blizzard`, `earthquake`, `arrow_storm`, `pack_frenzy`, `inferno`, `piercing_barrage`, `absolute_zero`, `glacial_fortress`, `wildfire_rush`, `meteor_arrow_rain`, `alpha_howl`, `iron_bastion`) while keeping production numeric balance values (`powerCrystalCost`, `cooldownSeconds`, `effects`) in `Draft/TBD` status.
  - `docs/decisions/PGD-01-STEEL-GUARDIAN.md` confirms `steel_guardian` and `iron_bastion` at the product level.
  - `docs/decisions/PGD-02/systems/G08.md`, `docs/decisions/PGD-02/systems/G09.md`, `docs/decisions/PGD-02/contracts/G09-TECHNICAL-CONTRACT.md` (`TC1–TC50`, `FR1–FR25`), `docs/decisions/PGD-02/registers/G09-ABILITY-REGISTER.md`, and the two 2026-11-20 addenda (`ABILITY-CATALOG-G09-ADDENDUM-2026-11-20.md`, `STEEL-GUARDIAN-IRON-BASTION-G09-ADDENDUM-2026-11-20.md`) specify the complete executable contract for all 12 abilities under **`Confirmed — Source Pending Verification`**.
  - Per `docs/product/ROADMAP.md` §3A (*"do not bypass Game Data runtime validation to invent production Ability effects"*) and `D-24` (established in `T-06`–`T-09`), `T-10` implements **100% data-driven effect primitives** configured via injected `AbilitySessionInput` definitions. Zero production balance numbers are hardcoded inside the engine, `@mfd/game-data` and `packages/game/src/runtime.ts` fail-closed boundaries remain untouched, and automated tests verify all 12 G09 ability archetypes through explicitly labeled test-only fixtures.
- **In Scope (`T-10`):**
  - Headless ability session contract, validation, and structural freeze (`packages/game/src/abilities/ability-session.ts`).
  - Deterministic ability runtime state, active status effects (`slow`, `stun`, `freeze`, `burn`, `buff`), shields, front-tile slow zones, 3×3 ally damage redirects, scheduled multihit cadences, and active projectiles (`packages/game/src/abilities/ability-state.ts`).
  - Transaction-staged ability activation (`activate-ability`), per-tick ability/projectile/status resolution, G09 damage pipeline (`Armor/Resistance → Redirect → Shield → HP`), and entity death/Fusion lifecycle hooks (`packages/game/src/abilities/ability-engine.ts`).
  - Integration with `T-06` Power Crystals (`state.resources.crystals`), `T-07` Combat/Movement modifiers (`computeDamage`, `computeMoveSpeed`, attack speed, stun/freeze gates, death rewards), `T-08` Fusion cleanup (canceling unfired cadences and removing consumed Defender buffs/shields/auras while preserving fired projectiles and target statuses), and `T-09` Wave completion & terminal victory/defeat rules.
- **Out of Scope (`T-10`):**
  - Modifying `@mfd/game-data` schemas, datasets, or `packages/game/src/runtime.ts` fail-closed startup guards.
  - Phaser drag-and-drop Power Crystal UI, VFX, animations, or audio (`T-11` / `T-12`).

---

## 2. Confirmed Technical Decisions (`D-59` – `D-68` = Option A)

All 10 decisions below were confirmed by the Owner as **Option A** on `2026-11-21` to preserve deterministic simulation, backward compatibility with existing tests (`126/126`), and full fidelity with `PGD-02 G08/G09` (`TC1–TC50`, `FR1–FR25`).

### `D-59` — Engine Scope & Data-Driven G09 Effect Primitives (**CONFIRMED: Option A**)
- **Option A (Confirmed):** Implement the complete headless data-driven **Ability & Effect Engine** in `packages/game/src/abilities/` supporting all G08/G09 executable primitives configured via injected `AbilitySessionInput`:
  1. `instant-damage` (same-lane all enemies or target scopes, with optional `armorPiercing` / `shieldPiercing` and attached status application — e.g., `blizzard`, `earthquake`, `inferno`, `absolute_zero`).
  2. `status` (`slow`, `stun`, `freeze`, `burn`, `buff` — e.g., `blizzard`, `earthquake`, `pack_frenzy`, `inferno`, `absolute_zero`, `alpha_howl`).
  3. `shield` + optional front-tile slow zone (`glacial_fortress`) + optional 3×3 ally damage redirect (`iron_bastion`).
  4. `multihit` sequential cadence scheduler (`arrow_storm`, `wildfire_rush`, `meteor_arrow_rain`).
  5. `projectile` spawner for lane-traveling arrows (`arrow_storm`, `piercing_barrage` with unlimited pierce & per-projectile hit registry) and tile-locked falling arrows (`meteor_arrow_rain` 3×3 impact area).
  Zero balance constants are hardcoded in the engine; all parameters come from `AbilitySessionInput`, and `@mfd/game-data` fail-closed validation remains untouched.
- **Option B:** Implement only an activation/cost/cooldown shell without the G09 combat/projectile/redirect primitives.

### `D-60` — Activation Command, Power Crystal Cost & Cooldown Contract (**CONFIRMED: Option A**)
- **Option A (Confirmed):** Add internal command `{ type: 'activate-ability'; defenderId: EntityId; targetCell?: Cell }`. When dequeued in `PLAYING`:
  1. Verify `defenderId` exists on the Grid, is a living Defender in `battle.combat`, is not currently under `stun` or `freeze`, and owns a configured `abilityId` in `AbilitySessionInput`.
  2. Verify `battle.resources.crystals >= abilityDef.powerCrystalCost` (configurable integer `>= 0`, `1` in G09 fixtures) and the Defender's per-unit cooldown `cooldownRemainingTicks === 0` (`cooldownSeconds >= 0`, `0` in G09 fixtures).
  3. Verify target eligibility (`D-61`).
  4. Atomically deduct `powerCrystalCost` from `battle.resources.crystals`, set `cooldownRemainingTicks`, execute immediate activation effects / schedule cadence or projectiles inside `TransactionEngine.runStaged()`, and record `abilities.outcome = { eventId, status: 'APPLIED', defenderId, abilityId }`.
- **Option B:** Deduct Power Crystals at enqueue time before tick resolution.

### `D-61` — Activation Eligibility: Self/Proactive vs Target-Dependent Abilities (**CONFIRMED: Option A**)
- **Option A (Confirmed):** Follow `G09` (`TC4`, `TC26–TC50`): each ability definition in `AbilitySessionInput` specifies `requiresTarget: boolean` (and target scope):
  - **Target-dependent abilities (`requiresTarget: true`)** — `blizzard` (same-lane enemy), `earthquake` (same-lane enemy), `arrow_storm` (same-lane enemy in range), `inferno` (same-lane enemy), `absolute_zero` (any living enemy on board), `wildfire_rush` (enemy in melee range), `meteor_arrow_rain` (living enemy on board to anchor 3×3 area, or explicit valid `targetCell`): if no eligible enemy exists at activation, reject with `reason: 'no-target'` without spending Power Crystals or starting cooldown.
  - **Self / Ally / Proactive abilities (`requiresTarget: false`)** — `pack_frenzy`, `piercing_barrage`, `glacial_fortress`, `alpha_howl`, `iron_bastion`: may activate even when no Enemy is currently present on the lane or battlefield.
- **Option B:** Require an Enemy on the lane for every ability activation.

### `D-62` — Unified G09 Damage Pipeline Order (`Armor/Resistance → Redirect → Shield → HP`) (**CONFIRMED: Option A**)
- **Option A (Confirmed):** All damage applied to Defenders and Enemies flows through the G09 damage pipeline (`TC11–TC15`, `TC21–TC25`):
  1. **Armor / Resistance mitigation** (skipped if damage is `armorPiercing: true`, e.g., `inferno` direct hit).
  2. **Ally Damage Redirect** (for non-Guardian Defenders inside a living Steel Guardian's active `iron_bastion` 3×3 protection aura: redirect `redirectSharePct` (50%) of post-mitigation damage to the nearest eligible Steel Guardian by Manhattan distance on the Grid, tie-breaking by lowest `EntityId`; redirected damage does not re-apply Guardian Armor/Resistance and does not chain to another redirect).
  3. **Shield absorption** (skipped if `shieldPiercing: true`; absorbs from oldest active Shield first; excess damage carries over to remaining Shields then HP; excess redirected damage on a Steel Guardian can reduce Guardian HP to `0` and kill it without overflowing back to the protected ally).
  4. **HP reduction** (clamped at `0`, triggering Phase C death processing when `hp === 0`).
- **Option B:** Apply Shield before Armor/Resistance or allow redirected excess damage to bounce back to the protected ally.

### `D-63` — Status Effect Stacking, Refresh & Immunity Rules (`Slow`, `Stun`, `Freeze`, `Burn`, `Buff`) (**CONFIRMED: Option A**)
- **Option A (Confirmed):** Implement exact G09 status identity and stacking rules (`TC16–TC20`, `FR1`):
  - **Identity & Same-Source Refresh:** Status identity is `(targetEntityId, sourceEntityId, abilityId, kind)`. Reapplying from the same `(sourceEntityId, abilityId, kind)` refreshes duration and updates snapshot values (`version++`) without adding a duplicate stack.
  - **`slow`:** Modifies Enemy `computeMoveSpeed`. When multiple slows overlap, only the strongest active slow magnitude applies (no multiplicative or additive stacking across slows).
  - **`stun`:** Blocks movement, basic attacks, and pauses unfired multihit cadences (`FR3`). Effective while any active `stun` remains.
  - **`freeze`:** Blocks movement and basic attacks; coexists with `slow` and `stun`. Respects target `freezeImmune?: boolean` (rejects/skips Freeze application) and `freezeResistancePct?: number` (reduces Freeze duration proportionally: `duration * (1 - resistancePct)`).
  - **`burn`:** Deals periodic Fire damage every `1.0s` (`tickIntervalTicks = ticksPerSecond`) for `durationSeconds` (`5s` in G09). Snapshots the attacker's current effective Attack Damage (`baseDamage` or buffed damage per config) at application/refresh; distinct sources (`sourceEntityId + abilityId`) tick independently; persists even if the source Defender later dies or is fused.
  - **`buff` (`pack_frenzy`, `alpha_howl`):** Modifies Defender Attack Damage and Attack Speed. Same-source refreshes; distinct sources (e.g., `pack_frenzy` + `alpha_howl`, or two distinct `alpha_howl` casters) stack **additively against the recipient's base stats** (`effectiveDamage = baseDamage * (1 + sum(damageBonusPct))`, `effectiveAttackInterval = baseInterval / (1 + sum(attackSpeedBonusPct))`).
- **Option B:** Stack all statuses multiplicatively or collapse distinct Burn sources into one shared timer.

### `D-64` — Shield, Glacial Front-Tile Slow Zone & Iron Bastion Lifecycle (**CONFIRMED: Option A**)
- **Option A (Confirmed):** Follow `G09` (`TC21–TC24`, `TC38`, `TC48`, `FR2`):
  - **Same-Source Shield Recast (`FR2`):** When a Defender recasts its own Shield (`glacial_fortress` or `iron_bastion`), reset the Shield's `amount` to the new full value (`maxHp * shieldPct`) while **preserving its original `shieldId` and creation order** for oldest-first absorption.
  - **`glacial_fortress` Front-Tile Aura:** While Frost Guardian's `glacial_fortress` Shield has `amount > 0`, maintain a slow zone on `(row, col + 1)` (if within Grid bounds). Any Enemy occupying that tile (`Math.floor(x) === col + 1` on the same lane) receives the `-50%` zone Slow; an Enemy leaving the tile while the Shield is still active loses the zone Slow immediately; if the Shield breaks (`amount === 0`) while Enemies are currently slowed by the zone, convert their zone Slow into a `5s` residual Slow (`TC38`).
  - **`iron_bastion` Dual Lifecycle (`TC48`):** Steel Guardian's `100% Max HP` Shield has no time expiration (persists until broken or Guardian dies/fuses), whereas its 3×3 ally `50%` damage redirect aura expires after `8s` (`durationSeconds`) or immediately upon Guardian death/Fusion.
- **Option B:** Expire `iron_bastion` Shield after 8 seconds or apply `glacial_fortress` slow permanently on tile entry.

### `D-65` — Multihit Cadences, Projectiles & Entity Death / Fusion Lifecycle (**CONFIRMED: Option A**)
- **Option A (Confirmed):** Follow `G09` (`TC6–TC10`, `TC26–TC35`, `TC39`, `TC42`, `TC45`, `FR3`):
  - **Multihit Cadence Scheduling (`arrow_storm`, `wildfire_rush`, `meteor_arrow_rain`):** The first hit/arrow fires at activation tick (`t = 0`), and remaining `count - 1` hits fire every `intervalSeconds` (`0.2s`).
    - If the owner Defender becomes `stunned` or `frozen`, the cadence timer **pauses** and preserves its remaining delay (`FR3`), resuming one-by-one when the disabling status ends (never bursting queued hits in a single tick).
    - If the owner Defender **dies or is consumed by Fusion**, all **unfired** cadence hits are immediately cancelled.
    - For `arrow_storm` and `wildfire_rush`, each scheduled step re-acquires the valid target at that step's firing tick; if no eligible target exists in range at that step, the remaining unfired steps cancel cleanly (`TC26`, `TC39`).
    - For `meteor_arrow_rain`, activation locks the 3×3 area centered on the living Enemy closest to the player base (lowest `x`, tie-break: lowest `lane`, then lowest `EntityId`) clamped to the 5×9 Grid; each of the 8 scheduled arrows selects a deterministic impact tile within that locked 3×3 area and falls for `travelSeconds` (or resolves on impact tick), damaging and burning all Enemies on that tile even if the original anchor Enemy died (`TC42`).
  - **Projectiles (`arrow_storm`, `piercing_barrage`, `meteor_arrow_rain`):**
    - Once a projectile is spawned, it is independent of the owner Defender: **owner death or Fusion does NOT destroy already-fired projectiles**, and they retain the damage snapshot captured when fired (`TC9`, `TC28`).
    - `piercing_barrage` spawns 1 merged arrow (`600%` Attack Damage snapshot, `2×` projectile speed, unlimited pierce along the lane) with a per-projectile `hitEnemyIds` set so each Enemy on the lane is hit at most once before the projectile exits the battlefield at `col >= 9` (`TC31–TC35`).
  - **Fusion & Death Cleanup (`TC6–TC8`, `TC45`):**
    - When a Defender dies or is consumed as a Fusion input (`T-08`), remove all buffs, shields, redirect auras, front-tile zones, and unfired cadences owned by or residing on that Defender; **never transfer buffs, shields, or cooldowns to the Fusion output Defender**.
    - Already-applied statuses (`slow`, `stun`, `freeze`, `burn`) on surviving Enemies and `alpha_howl` buffs already applied to *other* surviving 3×3 ally Defenders persist for their remaining duration (`TC45`).
- **Option B:** Cancel in-flight projectiles when the owner Defender dies or transfer active buffs/shields onto the Fusion output unit.

### `D-66` — Per-Tick Resolution Order with T-07 Combat & T-09 Waves (**CONFIRMED: Option A**)
- **Option A (Confirmed):** Integrate `T-10` into `BattleRuntime.advance()`'s existing per-tick `executePhase(tick, ...)` deterministically:
  1. **Command Queue Phase (before `executePhase`):** Process queued `summon`, `fuse`, `wave-spawn`, and `activate-ability` events in FIFO order.
  2. **Tick Phase A0 (Ability Cadences, Projectiles & Status Timers):**
     - Advance active multihit cadences (pausing if owner is stunned/frozen; firing due hits/projectiles).
     - Advance active projectiles along their lane / impact timers and resolve hits through the `D-62` damage pipeline.
     - Advance active status durations (`slow`, `stun`, `freeze`, `burn`, `buff`) and redirect aura timers by `dt`; apply due `burn` periodic damage ticks (`1.0s` intervals) through the `D-62` damage pipeline; expire completed statuses/auras and trigger `glacial_fortress` shield-break residual slows when applicable.
  3. **Tick Phase A (Enemy Movement):** Existing T-07 Enemy movement, skipping Enemies with active `stun` or `freeze` and feeding active `slow` modifiers into `computeMoveSpeed()`.
  4. **Tick Phase B (Combat Attacks):** Existing T-07 Defender & Enemy attacks, skipping units with active `stun` or `freeze`, scaling Defender cooldown recovery / attack interval and damage via active `buff` modifiers (`computeDamage()`), and routing all attack damage through the `D-62` damage pipeline (`Armor/Resistance → Redirect → Shield → HP`).
  5. **Tick Phase C (Deaths, Rewards & Wave Completion):** Process all Defenders and Enemies with `hp <= 0` from any source (basic attack, instant ability, Burn tick, projectile, or redirected damage); clean up dead Defender ability state (`D-65`); award T-06 Enemy death rewards (`energy` + `crystals`); and run T-09 `checkWaveCompletion()` when no breach occurred.
- **Option B:** Run ability status ticks and projectile hits outside `TransactionEngine.executePhase()` or omit T-06/T-09 death-reward hooks on Burn/projectile kills.

### `D-67` — Pause, Terminal & Structured Rejection Semantics (**CONFIRMED: Option A**)
- **Option A (Confirmed):**
  - Calling `BattleRuntime.enqueue({ type: 'activate-ability', ... })` while `Paused` or `Terminal` rejects immediately at enqueue time without queueing or mutating state (matching `T-04`, `T-06`, `T-08`, `T-09`).
  - While `Paused`, zero cadence timers, projectile positions, status durations, Burn ticks, shield zones, redirect timers, or ability cooldowns advance (`TC3`).
  - Expected invalid activations during `PLAYING` (`invalid-owner`, `owner-dead`, `owner-disabled`, `ability-unavailable`, `insufficient-crystals`, `on-cooldown`, `no-target`, `invalid-target-cell`) return a structured rejection in `snapshot().abilities.outcome` (`status: 'REJECTED'`, `reason`) without spending Power Crystals, starting cooldown, mutating combat/grid state, or triggering `T-04` fail-stop rollback.
  - Unexpected internal invariants inside an approved activation or tick phase fail closed through `TransactionEngine` atomic rollback (`T-04`).
- **Option B:** Treat expected gameplay rejections (e.g. clicking an ability with 0 Power Crystals or no Enemy in lane) as fatal `EngineError` fail-stops.

### `D-68` — `BattleRuntime` Constructor & Snapshot Backward Compatibility (**CONFIRMED: Option A**)
- **Option A (Confirmed):** Add an optional 6th constructor parameter `abilityInput?: AbilitySessionInput` to `BattleRuntime`:
  - Cross-validate `abilityInput` at construction time against `resourceInput`, `combatInput`, and `fusionInput` (every configured Defender `abilityId` must exist in `abilityInput.abilities`; all costs, durations, intervals, and percentages must be finite non-negative numbers).
  - When `abilityInput` is omitted, `battle.abilities` and `snapshot().abilities` remain `undefined`, guaranteeing 100% backward compatibility with all 126 existing `@mfd/game` unit tests.
  - When `abilityInput` is provided, `snapshot().abilities` exposes a deep-cloned read-only `AbilityRuntimeSnapshot` (`cooldowns`, `statuses`, `shields`, `redirects`, `cadences`, `projectiles`, `outcome`).
- **Option B:** Require `abilityInput` in `BattleRuntime` constructor and update all existing test call sites.

---

## 3. Planned Module Architecture (`packages/game/src/abilities/`)

1. **`packages/game/src/abilities/ability-session.ts` (`T-10.1`)**
   - Defines `AbilitySessionInput`, `AbilityDefinition`, `AbilityEffectDefinition` union (`InstantDamageEffectDef`, `StatusEffectDef`, `ShieldEffectDef`, `RedirectEffectDef`, `MultihitEffectDef`, `ProjectileEffectDef`), and `AbilityTargetScope`.
   - Implements `validateAbilitySessionInput(input, combatInput?)` and `createAbilitySession(input, combatInput?)` with deep structural freeze.
2. **`packages/game/src/abilities/ability-state.ts` (`T-10.2`)**
   - Defines `AbilityRuntimeState`, `AbilityRuntimeSnapshot`, `AbilityValidationReason`, `AbilityCommandOutcome`, `ActiveStatusInstance`, `ActiveShieldInstance`, `ActiveRedirectAura`, `ActiveMultihitCadence`, and `ActiveProjectile`.
   - Implements `createInitialAbilityRuntimeState()`, `cloneAbilityRuntimeState()`, `snapshotAbilityRuntimeState()`, and modifier helpers (`getDefenderBuffModifiers()`, `getEnemySpeedModifiers()`, `isUnitDisabled()`).
3. **`packages/game/src/abilities/ability-engine.ts` (`T-10.3` & `T-10.4`)**
   - Implements `validateAbilityActivation()`, `executeAbilityActivation()`, `applyDamagePipeline()` (`Armor/Resistance → Redirect → Shield → HP`), `stepAbilityTickPhase()` (cadences, projectiles, status timers, Burn ticks, glacial front-tile slow zone, shield-break residual slows), and `cleanupEntityAbilityState(entityId, reason: 'death' | 'fusion')`.
4. **`packages/game/src/combat/combat-engine.ts` & `packages/game/src/fusion/fusion-engine.ts` (`T-10.5`)**
   - Connects T-07 `stepCombatPhase` to `ability-engine` hooks (unit disable check for `stun`/`freeze`, `computeMoveSpeed` with active `slow`s, `computeDamage` & attack speed with active `buff`s, and `applyDamagePipeline` for basic attacks).
   - Connects T-08 `executeFusionCommand` to `cleanupEntityAbilityState(inputId, 'fusion')` for both consumed input Defenders.
5. **`packages/game/src/core/battle-state.ts`, `packages/game/src/systems/battle-runtime.ts` & `packages/game/src/index.ts` (`T-10.5`)**
   - Adds `{ type: 'activate-ability'; defenderId: EntityId; targetCell?: Cell }` to `InternalBattleEventPayload`.
   - Wires `abilityInput?: AbilitySessionInput` into `BattleRuntime`, `BattleState`, `BattleSnapshot`, and package exports.
6. **`packages/game/tests/battle-abilities.test.ts` (`T-10.6`)**
   - Dedicated unit & integration test suite covering all 12 G09 Special Ability archetypes, status stacking/refresh/immunity, shield/redirect edge cases, multihit cadence pause/cancel, piercing projectiles, Fusion/death cleanup, Pause/Terminal guards, and T-06/T-09 death-reward & wave-completion integration using test-only fixtures.

---

## 4. Implementation Slices

| Slice | Deliverable | Owner / Agent Role |
|---|---|---|
| `T-10.1` | `ability-session.ts`: Data-driven contracts, fail-closed input validator, deep structural freeze | `ability-core-implementer` |
| `T-10.2` | `ability-state.ts`: Runtime state, deep clone/snapshot, status/buff/speed modifier selectors | `ability-core-implementer` |
| `T-10.3` | `ability-engine.ts` (Part 1): Activation validation, Crystal deduction, cooldowns, status stacking/refresh, Shield (`FR2`), glacial slow zone, and 3×3 Redirect damage pipeline (`D-62`–`D-64`) | `ability-core-implementer` |
| `T-10.4` | `ability-engine.ts` (Part 2): Multihit cadences (`FR3` Stun pause, death/Fusion cancel), projectiles (`arrow_storm`, `piercing_barrage`, `meteor_arrow_rain` 3×3 lock), Burn ticks, and entity cleanup (`D-65`) | `ability-core-implementer` |
| `T-10.5` | Runtime integration in `combat-engine.ts`, `fusion-engine.ts`, `battle-state.ts`, `battle-runtime.ts`, and `index.ts` (`D-66`–`D-68`) | `ability-runtime-integrator` |
| `T-10.6` | `packages/game/tests/battle-abilities.test.ts` covering `AC-01` through `AC-20` + full regression verification | `ability-test-author` & `T-10 Gate Auditor` |

---

## 5. Confirmed Acceptance Gates (`AC-01` – `AC-20`)

| Gate | Requirement | Verification Target |
|---|---|---|
| `AC-01` | Fail-closed validation of `AbilitySessionInput` (rejects missing ability IDs, negative costs/cooldowns/durations, invalid redirect shares, or unmapped Defender ability references; freezes session graph) | `battle-abilities.test.ts` |
| `AC-02` | Power Crystal cost & cooldown enforcement: valid `activate-ability` deducts `powerCrystalCost` atomically and starts cooldown; insufficient Crystals or active cooldown rejects without spending Crystals or mutating state | `battle-abilities.test.ts` |
| `AC-03` | Activation eligibility (`D-61`): target-dependent abilities reject with `reason: 'no-target'` when no eligible Enemy exists without spending Crystals; self/ally/proactive abilities (`pack_frenzy`, `piercing_barrage`, `glacial_fortress`, `alpha_howl`, `iron_bastion`) succeed with no Enemy present | `battle-abilities.test.ts` |
| `AC-04` | Instant lane/global abilities (`blizzard`, `earthquake`, `inferno` armor-piercing direct hit + Burn, `absolute_zero` 5-lane Freeze): damage and statuses apply deterministically | `battle-abilities.test.ts` |
| `AC-05` | Status stacking & refresh (`D-63`, `FR1`): same-source recast refreshes duration/version without stacking; overlapping `slow`s apply strongest magnitude only; Freeze respects `freezeImmune` and proportional `freezeResistancePct` | `battle-abilities.test.ts` |
| `AC-06` | `burn` periodic damage (`TC19`): ticks every `1.0s` Game Time using snapshotted Attack Damage; same-source refreshes; distinct sources tick independently; Burn persists after source Defender dies or is fused | `battle-abilities.test.ts` |
| `AC-07` | `buff` stacking (`pack_frenzy` + `alpha_howl`, `TC20`, `TC45`): same-source refreshes; distinct sources stack additively against base Attack Speed & Attack Damage; `alpha_howl` buffs 3×3 allies at activation and persists on surviving recipients after Alpha Wolf dies/fuses | `battle-abilities.test.ts` |
| `AC-08` | `glacial_fortress` Shield & front-tile slow zone (`TC38`, `FR2`): creates `50% Max HP` Shield + `(row, col + 1)` `-50%` Slow zone while Shield > 0; Enemy leaving zone loses zone Slow immediately; Shield breaking applies `5s` residual Slow; same-source recast resets Shield amount while preserving Shield ID/order | `battle-abilities.test.ts` |
| `AC-09` | `iron_bastion` Shield & 3×3 Redirect (`TC11–TC15`, `TC24–TC25`, `TC48`): `100% Max HP` Shield persists until broken; 3×3 ally redirect (`50%` post-mitigation damage to nearest Steel Guardian by Manhattan distance, tie-break lower `EntityId`) lasts `8s`; redirected damage absorbs into Guardian Shield then HP without re-applying Guardian Armor/Resistance and can kill Guardian without overflowing back to ally | `battle-abilities.test.ts` |
| `AC-10` | `arrow_storm` & `wildfire_rush` multihit cadences (`TC26–TC30`, `TC39`, `FR3`): 8 arrows / 5 melee hits at `0.2s` intervals; Stun on owner pauses cadence preserving remaining delay without burst on un-stun; owner death, Fusion, or lack of target cancels remaining unfired hits while already-fired arrows persist | `battle-abilities.test.ts` |
| `AC-11` | `piercing_barrage` projectile (`TC31–TC35`): fires 1 merged arrow (`600%` Attack Damage snapshot, `2×` speed, unlimited same-lane pierce), hits each Enemy at most once via per-projectile hit registry, and despawns at column boundary | `battle-abilities.test.ts` |
| `AC-12` | `meteor_arrow_rain` 3×3 area lock & falling arrows (`TC42–TC44`): locks 3×3 area centered on Enemy closest to base at activation; fires 8 falling flaming arrows `0.2s` apart into locked 3×3 tiles; each arrow damages and applies Burn to all Enemies in its impact tile even if the initial anchor Enemy dies | `battle-abilities.test.ts` |
| `AC-13` | Fusion & death cleanup (`TC6–TC8`, `D-65`): fusing or killing a Defender removes its active buffs, shields, redirect auras, front-tile slow zone, cooldowns, and unfired cadences; zero buffs or shields are inherited by the Fusion output Defender | `battle-abilities.test.ts` |
| `AC-14` | Integration with T-06 & T-09: Enemy kills caused by instant abilities, Burn ticks, or projectiles award T-06 death rewards (`energy` + `crystals` respecting cap 5) and trigger T-09 wave completion / final Victory when the last wave Enemy dies without breach | `battle-abilities.test.ts` |
| `AC-15` | Pause & Terminal guards (`D-67`): `activate-ability` rejects at enqueue time when `Paused` or `Terminal`; while `Paused`, zero status durations, Burn timers, cadences, projectiles, redirect timers, or cooldowns advance | `battle-abilities.test.ts` |
| `AC-16` | Transaction rollback safety (`T-04`): simulated invariant failure mid-ability activation or mid-tick rolls back `BattleState` (including `resources.crystals`, `combat`, `abilities`, `waves`) atomically and enters `FAILED_STOP` | `battle-abilities.test.ts` |
| `AC-17` | Deterministic replay & snapshot isolation: identical seeds, placements, and `activate-ability` commands produce identical snapshots; mutating returned `snapshot().abilities` never mutates internal runtime state; omitting `abilityInput` keeps all 126 existing `@mfd/game` tests passing | `battle-abilities.test.ts` |
| `AC-18` | Authority boundary preservation: `@mfd/game-data` datasets/validators and `packages/game/src/runtime.ts` fail-closed startup guards remain untouched; all T-10 tests use explicitly labeled test-only fixtures | `git diff` & `validation.test.ts` |
| `AC-19` | Full workspace verification: `pnpm --filter @mfd/game test`, `pnpm --filter @mfd/game-data test`, `pnpm typecheck`, and `pnpm build` all pass | Local CLI verification |
| `AC-20` | CI / clean workspace build & test parity | Local & GitHub Actions CI |
